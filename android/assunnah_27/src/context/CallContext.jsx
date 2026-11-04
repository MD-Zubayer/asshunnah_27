import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import { API_ENDPOINTS, WS_CHAT } from '../constants/api';
import { useAuth, incomingCallHandlerRef } from './AuthContext';

let RTCPeerConnection;
let RTCIceCandidate;
let RTCSessionDescription;
let mediaDevices;

try {
  const WebRTC = require('react-native-webrtc');
  RTCPeerConnection = WebRTC.RTCPeerConnection;
  RTCIceCandidate = WebRTC.RTCIceCandidate;
  RTCSessionDescription = WebRTC.RTCSessionDescription;
  mediaDevices = WebRTC.mediaDevices;
} catch (_error) {
  console.warn('WebRTC native module not found. Call features will be disabled.');
  RTCPeerConnection = class RTCPeerConnection {};
  RTCIceCandidate = class RTCIceCandidate {};
  RTCSessionDescription = class RTCSessionDescription {};
  mediaDevices = {
    getUserMedia: () => Promise.reject(new Error('WebRTC not available')),
    enumerateDevices: () => Promise.resolve([]),
  };
}

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const CallContext = createContext();

export const CallProvider = ({ children }) => {
  const router = useRouter();
  const { token, user } = useAuth();

  // Active Call Meta
  const [roomId, setRoomId] = useState(null);
  const [otherUserId, setOtherUserId] = useState(null);
  const [otherUserName, setOtherUserName] = useState('');
  const [callType, setCallType] = useState('audio'); // 'audio' or 'video'
  const [isIncoming, setIsIncoming] = useState(false);
  const [otherUserProfileImage, setOtherUserProfileImage] = useState(null);

  const [isRingtoneMuted, setIsRingtoneMuted] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);

  // Calling States
  const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'incoming', 'ringing', 'connecting', 'connected'
  const [duration, setDuration] = useState(0);
  const durationRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);
  const [callId, setCallId] = useState(null);

  // WebRTC Media Streams
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  // Connection Refs
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const peerConnection = useRef(null);
  const hasHungUp = useRef(false);
  const isCleaningUp = useRef(false);

  // WebRTC Handshake Refs
  const iceCandidatesQueue = useRef([]);
  const isRemoteDescriptionSet = useRef(false);
  const isNegotiating = useRef(false);
  const connectionTimeoutRef = useRef(null);
  const ongoingNotificationIdRef = useRef(null);
  const roomIdRef = useRef(roomId);
  const otherUserNameRef = useRef(otherUserName);
  const ringtonePlayerRef = useRef(null);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    otherUserNameRef.current = otherUserName;
  }, [otherUserName]);

  // Track callStatus in ref for interval/callbacks
  const callStatusRef = useRef(callStatus);
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Duration Timer Effect
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const nextVal = prev + 1;
          durationRef.current = nextVal;
          return nextVal;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const startRingtone = async () => {
    try {
      if (ringtonePlayerRef.current) {
        ringtonePlayerRef.current.release();
        ringtonePlayerRef.current = null;
      }
      setIsRingtoneMuted(false);
      const player = createAudioPlayer('https://api-assunnah-27.newsmartagent.com/media/calling.mp3');
      ringtonePlayerRef.current = player;
      player.loop = true;
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      player.play();
    } catch (e) {
      console.warn('Failed to start ringtone:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtonePlayerRef.current) {
      try {
        ringtonePlayerRef.current.pause();
        ringtonePlayerRef.current.release();
      } catch (e) {
        console.warn('Failed to stop ringtone:', e);
      }
      ringtonePlayerRef.current = null;
    }
  };

  const toggleRingtoneMute = () => {
    if (ringtonePlayerRef.current) {
      if (isRingtoneMuted) {
        ringtonePlayerRef.current.play();
        setIsRingtoneMuted(false);
      } else {
        ringtonePlayerRef.current.pause();
        setIsRingtoneMuted(true);
      }
    }
  };

  useEffect(() => {
    if (callStatus === 'incoming' && isIncoming) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => {
      stopRingtone();
    };
  }, [callStatus, isIncoming]);

  // Audio wave pulse animation
  useEffect(() => {
    if (callStatus === 'ringing' || callStatus === 'incoming' || callStatus === 'connecting') {
      pulseTimerRef.current = setInterval(() => {
        setPulseScale(prev => (prev === 1 ? 1.25 : 1));
      }, 800);
    } else {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
    }
    return () => {
      if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
    };
  }, [callStatus]);


  const showOngoingCallNotification = async () => {
    try {
      await Notifications.setNotificationChannelAsync('ongoing-call', {
        name: 'Ongoing Call',
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
        vibrationPattern: null,
      });

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'ongoing_call',
          body: `চলমান কল • ${otherUserNameRef.current}`,
          sticky: true,
          ongoing: true,
          data: { roomId: roomIdRef.current, screen: 'call' }
        },
        trigger: null,
      });
      ongoingNotificationIdRef.current = id;
    } catch (e) {
      console.warn('Failed to show ongoing call notification:', e);
    }
  };

  const dismissOngoingCallNotification = async () => {
    if (ongoingNotificationIdRef.current) {
      try {
        await Notifications.dismissNotificationAsync(ongoingNotificationIdRef.current);
        ongoingNotificationIdRef.current = null;
      } catch (e) {
        console.warn('Failed to dismiss ongoing call notification:', e);
      }
    }
  };

  const initiateCall = async (targetRoomId, targetUserId, targetUserName, type, profileImage = null) => {
    if (!token || !user) return;
    if (callStatus !== 'idle') {
      Alert.alert('ব্যস্ত', 'আপনি ইতিমধ্যে অন্য একটি কলে যুক্ত আছেন বা ডায়াল করছেন।');
      return;
    }
    hasHungUp.current = false;
    isCleaningUp.current = false;
    setHasHistory(true);
    setRoomId(targetRoomId);
    setOtherUserId(targetUserId);
    setOtherUserName(targetUserName);
    setOtherUserProfileImage(profileImage);
    setCallType(type);
    setIsIncoming(false);
    setCallStatus('ringing');
    setIsMinimized(false);
    setDuration(0);
    durationRef.current = 0;

    // Setup local media
    await setupLocalStreamAndConnect(targetRoomId, targetUserId, type, false);
    
    // Redirect to call screen
    router.navigate('/call');
  };

  const receiveCall = async (targetRoomId, targetUserId, targetUserName, type, senderImage = null) => {
    hasHungUp.current = false;
    isCleaningUp.current = false;
    setHasHistory(false);
    setRoomId(targetRoomId);
    setOtherUserId(targetUserId);
    setOtherUserName(targetUserName);
    setOtherUserProfileImage(senderImage);
    setCallType(type);
    setIsIncoming(true);
    setCallStatus('incoming');
    setIsMinimized(false);
    setDuration(0);
    durationRef.current = 0;

    // Setup local media
    await setupLocalStreamAndConnect(targetRoomId, targetUserId, type, true);
  };

  const setupLocalStreamAndConnect = async (targetRoomId, targetUserId, type, incoming) => {
    try {
      // Set audio mode for VoIP communication to activate system hardware echo cancellation
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldRouteThroughEarpiece: type === 'audio',
      });

      const isVideo = type === 'video';
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? {
          facingMode: 'user',
          width: 640,
          height: 480,
          frameRate: 30
        } : false
      });
      setLocalStream(stream);

      // Initialize WebRTC Peer Connection
      const pc = new RTCPeerConnection(configuration);
      
      // Add local stream tracks to connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal('candidate', event.candidate);
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const handleConnected = () => {
        if (callStatusRef.current === 'connected') return;
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        setCallStatus('connected');
        showOngoingCallNotification();
        if (!incoming && callId) {
          updateCallRecord('connected');
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('WebRTC Connection State changed:', state);
        if (state === 'connected') {
          handleConnected();
        } else if (state === 'failed' || state === 'disconnected') {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          cleanupCall('missed');
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('WebRTC ICE Connection State changed:', state);
        if (state === 'connected' || state === 'completed') {
          handleConnected();
        }
      };

      peerConnection.current = pc;

      // Connect signaling WebSocket
      connectWebSocket(targetRoomId, type, incoming);
      if (!incoming) {
        createCallRecord(targetUserId, type);
      }
    } catch (e) {
      console.error('Failed to setup stream:', e);
      Alert.alert('অ্যাক্সেস এরর', 'ক্যামেরা বা মাইক্রোফোন চালু করা সম্ভব হয়নি।');
      cleanupCall('missed');
    }
  };

  const connectWebSocket = (targetRoomId, type, incoming) => {
    const wsUrl = `${WS_CHAT(targetRoomId)}?user_id=${user.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Websocket connected for call signaling');
      if (!incoming) {
        ws.send(JSON.stringify({
          type: 'call_signal',
          sender_id: user.id,
          signal_type: 'initiate',
          call_type: type,
          payload: null
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'call_signal' && String(data.sender_id) !== String(user.id)) {
        handleIncomingSignal(data);
      }
    };

    ws.onclose = () => {
      console.log('Websocket call connection closed');
    };

    socketRef.current = ws;
  };

  const createCallRecord = async (targetUserId, type) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHAT_CALLS, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callee: targetUserId,
          call_type: type,
          status: 'ringing'
        })
      });
      if (response.ok) {
        const record = await response.json();
        setCallId(record.id);
        sendSignal('call_id_update', { call_id: record.id });
      }
    } catch (e) {
      console.error('Error creating call record:', e);
    }
  };

  const updateCallRecord = async (finalStatus, callDuration = 0) => {
    if (!callId) return;
    try {
      const baseUrl = API_ENDPOINTS.CHAT_CALLS.endsWith('/') 
        ? API_ENDPOINTS.CHAT_CALLS.slice(0, -1) 
        : API_ENDPOINTS.CHAT_CALLS;
      await fetch(`${baseUrl}/${callId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: finalStatus,
          duration: callDuration
        })
      });
    } catch (e) {
      console.error('Error updating call record:', e);
    }
  };

  const sendSignal = (signalType, payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'call_signal',
        sender_id: user.id,
        signal_type: signalType,
        call_type: callType,
        payload
      }));
    }
  };

  const processQueuedCandidates = async (pc) => {
    isRemoteDescriptionSet.current = true;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding queued ICE candidate:', err);
      }
    }
  };

  const handleIncomingSignal = async (data) => {
    const pc = peerConnection.current;
    if (!pc) return;

    try {
      switch (data.signal_type) {
        case 'initiate':
          break;
        case 'accept':
          if (!isIncoming) {
            if (isNegotiating.current) {
              console.warn('[WebRTC] Already negotiating accept, ignoring duplicate signal.');
              break;
            }
            isNegotiating.current = true;
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              sendSignal('offer', offer);
            } finally {
              isNegotiating.current = false;
            }
          }
          break;
        case 'offer':
          if (pc.signalingState !== 'stable') {
            console.warn('[WebRTC] Ignoring duplicate/invalid offer. State:', pc.signalingState);
            break;
          }
          if (isNegotiating.current) {
            console.warn('[WebRTC] Already negotiating offer, ignoring duplicate.');
            break;
          }
          isNegotiating.current = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
            await processQueuedCandidates(pc);
            if (pc.signalingState === 'have-remote-offer') {
              const answer = await pc.createAnswer();
              if (pc.signalingState === 'have-remote-offer') {
                await pc.setLocalDescription(answer);
                sendSignal('answer', answer);
                setCallStatus('connecting');
              } else {
                console.warn('[WebRTC] State changed while creating answer. State:', pc.signalingState);
              }
            } else {
              console.warn('[WebRTC] Unexpected signaling state after remote offer:', pc.signalingState);
            }
          } catch (sdpErr) {
            console.error('[WebRTC] Error processing offer sdp:', sdpErr);
          } finally {
            isNegotiating.current = false;
          }
          break;
        case 'answer':
          if (pc.signalingState !== 'have-local-offer') {
            console.warn('[WebRTC] Ignoring duplicate/invalid answer. State:', pc.signalingState);
            break;
          }
          if (isNegotiating.current) {
            console.warn('[WebRTC] Already negotiating answer, ignoring duplicate.');
            break;
          }
          isNegotiating.current = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
            await processQueuedCandidates(pc);
            setCallStatus('connecting');
          } catch (ansErr) {
            console.error('[WebRTC] Error processing answer:', ansErr);
          } finally {
            isNegotiating.current = false;
          }
          break;
        case 'candidate':
          if (data.payload) {
            const candidate = new RTCIceCandidate(data.payload);
            if (isRemoteDescriptionSet.current) {
              await pc.addIceCandidate(candidate);
            } else {
              iceCandidatesQueue.current.push(candidate);
            }
          }
          break;
        case 'reject':
          cleanupCall('rejected');
          break;
        case 'hangup':
          cleanupCall('completed');
          break;
        case 'call_id_update':
          if (data.payload && data.payload.call_id) {
            setCallId(data.payload.call_id);
          }
          break;
        default:
          break;
      }
    } catch (err) {
      console.error('Error handling signaling message:', err);
    }
  };

  const acceptCall = () => {
    setCallStatus('connecting');
    sendSignal('accept', null);

    // 10 second safety handshake timer
    connectionTimeoutRef.current = setTimeout(() => {
      const state = peerConnection.current ? peerConnection.current.connectionState : '';
      if (state !== 'connected') {
        Alert.alert('সংযোগ ব্যর্থ', 'কল সংযোগ করা সম্ভব হয়নি।');
        cleanupCall('missed');
      }
    }, 10000);
    
    // Redirect to call screen
    router.navigate('/call');
  };

  const declineCall = () => {
    hasHungUp.current = true;
    sendSignal('reject', null);
    cleanupCall('rejected');
  };

  const hangupCall = () => {
    hasHungUp.current = true;
    sendSignal(callStatusRef.current === 'connected' ? 'hangup' : 'reject', null);
    cleanupCall(callStatusRef.current === 'connected' ? 'completed' : 'missed');
  };

  const cleanupCall = (finalStatus = 'completed') => {
    if (isCleaningUp.current) return;
    isCleaningUp.current = true; // Synchronously prevent duplicate cleanups
    hasHungUp.current = true;
    dismissOngoingCallNotification();
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (pulseTimerRef.current) clearInterval(pulseTimerRef.current);
    if (socketRef.current) socketRef.current.close();

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);

    // Reset VoIP Audio Mode to normal media playback state
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    }).catch(err => console.warn('Failed to reset audio mode:', err));

    // Reset WebRTC Queue States
    isRemoteDescriptionSet.current = false;
    iceCandidatesQueue.current = [];

    if (callStatusRef.current === 'connected') {
      updateCallRecord(finalStatus, durationRef.current);
    } else if (callStatusRef.current !== 'idle') {
      updateCallRecord(finalStatus, 0);
    }

    const wasMinimized = isMinimized;
    setCallStatus('idle');
    setIsMinimized(false);
    if (!wasMinimized) {
      if (hasHistory) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isCameraOff;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const minimizeCall = () => {
    setIsMinimized(true);
    if (callType === 'video' && localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = false;
      });
    }
  };

  const restoreCall = () => {
    setIsMinimized(false);
    if (callType === 'video' && localStream && !isCameraOff) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = true;
      });
    }
    router.navigate('/call');
  };

  // Register global incoming call listeners
  useEffect(() => {
    incomingCallHandlerRef.current = {
      onIncomingCall: (targetRoomId, targetUserId, targetUserName, type, senderImage) => {
        if (callStatusRef.current !== 'idle') {
          console.log('[WebRTC] Already in a call, ignoring incoming call request from:', targetUserId);
          return;
        }
        receiveCall(targetRoomId, targetUserId, targetUserName, type, senderImage);
      },
      onCallCancel: () => {
        cleanupCall('missed');
      },
      onAcceptCall: () => {
        acceptCall();
      },
      onDeclineCall: () => {
        declineCall();
      }
    };
    return () => {
      incomingCallHandlerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <CallContext.Provider value={{
      roomId,
      otherUserId,
      otherUserName,
      callType,
      isIncoming,
      callStatus,
      duration,
      isMuted,
      isCameraOff,
      isSpeakerOn,
      setIsSpeakerOn,
      isMinimized,
      pulseScale,
      localStream,
      remoteStream,
      initiateCall,
      receiveCall,
      acceptCall,
      declineCall,
      hangupCall,
      cleanupCall,
      toggleMute,
      toggleCamera,
      minimizeCall,
      restoreCall,
      hasHungUp,
      otherUserProfileImage,
      isRingtoneMuted,
      toggleRingtoneMute,
      hasHistory
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
