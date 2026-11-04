import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  useColorScheme, BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useCall } from '../context/CallContext';
import { RTCView } from 'react-native-webrtc';
import { Image } from 'expo-image';
import { getImageUri } from '../utils/image';

export default function CallScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [swapStreams, setSwapStreams] = React.useState(false);

  const {
    otherUserName,
    callType,
    isIncoming,
    callStatus,
    duration,
    isMuted,
    isCameraOff,
    isSpeakerOn,
    setIsSpeakerOn,
    pulseScale,
    localStream,
    remoteStream,
    acceptCall,
    declineCall,
    hangupCall,
    toggleMute,
    toggleCamera,
    minimizeCall,
    hasHungUp,
    otherUserProfileImage,
    isRingtoneMuted,
    toggleRingtoneMute,
    hasHistory
  } = useCall();

  const callStatusRef = useRef(callStatus);
  callStatusRef.current = callStatus;

  // Intercept Back press to MINIMIZE the call instead of ending it
  useEffect(() => {
    const onBackPress = () => {
      minimizeCall();
      if (hasHistory) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
      return true; // Stop default back handler unmounting
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      backHandler.remove();
      // If CallScreen unmounts but the call is still active (e.g. via swipe or header back) and not terminating, minimize it
      if (callStatusRef.current !== 'idle' && !hasHungUp.current) {
        minimizeCall();
      }
    };
  }, [minimizeCall, hasHistory]);

  // Safety net: dismiss CallScreen if callStatus becomes 'idle'
  useEffect(() => {
    if (callStatus === 'idle') {
      if (hasHistory) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [callStatus, hasHistory]);

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Top Secure Badge */}
      <View style={styles.topHeader}>
        <View style={styles.secureCallRow}>
          <Ionicons name="lock-closed" size={12} color="#10B981" />
          <Text style={styles.secureCallText}>End-to-End Encrypted</Text>
        </View>
        
        {callStatus === 'connected' && (
          <View style={styles.connectionQualityBadge}>
            <View style={styles.greenPulseDot} />
            <Text style={styles.qualityText}>Secure Line</Text>
          </View>
        )}
      </View>

      {/* Main Stream Area */}
      <View style={styles.mainStreamContainer}>
        {callType === 'video' && callStatus === 'connected' ? (
          <View style={styles.videoLayoutWrapper}>
            {/* Full Screen Stream */}
            <View style={styles.fullScreenStream}>
              {swapStreams ? (
                // Local in Fullscreen
                localStream && !isCameraOff ? (
                  <RTCView streamURL={localStream.toURL()} style={styles.rtcViewStyle} objectFit="cover" />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Ionicons name="videocam-off-outline" size={40} color="#9CA3AF" />
                    <Text style={styles.placeholderLabel}>আপনার ক্যামেরা বন্ধ আছে</Text>
                  </View>
                )
              ) : (
                // Remote in Fullscreen
                remoteStream ? (
                  <RTCView streamURL={remoteStream.toURL()} style={styles.rtcViewStyle} objectFit="cover" />
                ) : (
                  <View style={[styles.streamActiveSurface, { backgroundColor: '#0F172A' }]}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={[styles.streamLabel, { marginTop: 12 }]}>{otherUserName} এর লাইভ ভিডিও সংযোগ হচ্ছে...</Text>
                  </View>
                )
              )}
            </View>

            {/* PIP Stream */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSwapStreams(!swapStreams)}
              style={styles.pipFloatingWindow}
            >
              {swapStreams ? (
                // Remote in PIP
                remoteStream ? (
                  <RTCView streamURL={remoteStream.toURL()} style={styles.rtcViewStyle} objectFit="cover" />
                ) : (
                  <View style={styles.pipPlaceholder}>
                    <Ionicons name="person" size={16} color="#9CA3AF" />
                  </View>
                )
              ) : (
                // Local in PIP
                localStream && !isCameraOff ? (
                  <RTCView streamURL={localStream.toURL()} style={styles.rtcViewStyle} objectFit="cover" />
                ) : (
                  <View style={styles.pipPlaceholder}>
                    <Ionicons name="videocam-off-outline" size={16} color="#9CA3AF" />
                  </View>
                )
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Audio Call or Connecting Layout
          <View style={styles.audioCallingCenter}>
            <View style={styles.wavesContainer}>
              {callStatus !== 'incoming' && (
                <>
                  <View style={[styles.waveCircle, { transform: [{ scale: pulseScale }], opacity: 0.15 }]} />
                  <View style={[styles.waveCircle, { transform: [{ scale: pulseScale * 1.2 }], opacity: 0.08 }]} />
                </>
              )}
              <View style={styles.avatarCircle}>
                {otherUserProfileImage ? (
                  <Image
                    source={{ uri: getImageUri(otherUserProfileImage) }}
                    style={{ width: '100%', height: '100%', borderRadius: 48 }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="person" size={50} color="#9CA3AF" />
                )}
              </View>
            </View>
            
            <Text style={styles.callerName}>{otherUserName}</Text>
            {callStatus === 'incoming' && (
              <Text style={styles.callStateText}>ইনকামিং {callType === 'video' ? 'ভিডিও' : 'অডিও'} কল...</Text>
            )}
            {(callStatus === 'ringing' || callStatus === 'connecting') && (
              <Text style={styles.callStateText}>সংযোগ করা হচ্ছে...</Text>
            )}
            {callStatus === 'connected' && (
              <View style={styles.durationRow}>
                <Ionicons name="time-outline" size={14} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.durationValue}>{formatDuration(duration)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Action Bar controls */}
      <View style={[styles.actionsSection, { paddingBottom: insets.bottom + 24 }]}>
        {callStatus === 'incoming' ? (
          <View style={styles.incomingContainer}>
            <TouchableOpacity onPress={declineCall} style={[styles.roundActionBtn, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="close" size={30} color="#fff" />
              <Text style={styles.btnLabel}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleRingtoneMute} style={[styles.roundActionBtn, { backgroundColor: '#4B5563', marginHorizontal: 20 }]}>
              <Ionicons name={isRingtoneMuted ? 'volume-mute' : 'volume-medium'} size={30} color="#fff" />
              <Text style={styles.btnLabel}>{isRingtoneMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={acceptCall} style={[styles.roundActionBtn, { backgroundColor: '#10B981' }]}>
              <Ionicons name={callType === 'video' ? 'videocam' : 'checkmark'} size={30} color="#fff" />
              <Text style={styles.btnLabel}>Answer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activeCallControls}>
            <TouchableOpacity
              onPress={toggleMute}
              style={[styles.utilityControlBtn, isMuted && styles.utilityControlBtnActive]}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={22} color="#fff" />
            </TouchableOpacity>

            {callType === 'video' && (
              <TouchableOpacity
                onPress={toggleCamera}
                style={[styles.utilityControlBtn, isCameraOff && styles.utilityControlBtnActive]}
              >
                <Ionicons name={isCameraOff ? 'videocam-off' : 'videocam'} size={22} color="#fff" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setIsSpeakerOn(!isSpeakerOn)}
              style={[styles.utilityControlBtn, isSpeakerOn && styles.utilityControlBtnActive]}
            >
              <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-medium'} size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={hangupCall} style={[styles.roundActionBtn, { backgroundColor: '#EF4444', width: 56, height: 56 }]}>
              <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topHeader: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  secureCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureCallText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  connectionQualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  qualityText: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  mainStreamContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoLayoutWrapper: {
    width: '92%',
    height: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#334155',
  },
  fullScreenStream: {
    flex: 1,
  },
  streamActiveSurface: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteAvatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  streamLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  pipFloatingWindow: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#1E293B',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pipPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioCallingCenter: {
    alignItems: 'center',
  },
  wavesContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  waveCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 70,
    backgroundColor: '#3B82F6',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  callerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  callStateText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationValue: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '700',
  },
  actionsSection: {
    width: '100%',
    alignItems: 'center',
  },
  incomingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '75%',
  },
  activeCallControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
  },
  roundActionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  btnLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    position: 'absolute',
    bottom: -18,
  },
  utilityControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityControlBtnActive: {
    backgroundColor: '#475569',
  },
  rtcViewStyle: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
