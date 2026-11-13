import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, useColorScheme,
  Alert, Clipboard, Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useCall } from '../context/CallContext';
import * as ImagePicker from 'expo-image-picker';
import { API_ENDPOINTS, WS_CHAT } from '../constants/api';
import { getCache, setCache } from '../services/cacheService';
import { getImageUri } from '../utils/image';
import * as FileSystem from 'expo-file-system/legacy';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync
} from 'expo-audio';

// Custom Voice Message Player Component (WhatsApp Style)
function VoiceMessagePlayer({ audioUrl, isMe, colors }) {
  const [localUri, setLocalUri] = useState(null);

  useEffect(() => {
    let active = true;
    const prepareAudio = async () => {
      try {
        if (!audioUrl) return;

        // If it's already a local file, use it directly
        if (audioUrl.startsWith('file://') || audioUrl.startsWith('content://')) {
          if (active) setLocalUri(audioUrl);
          return;
        }

        const normalizedUrl = getImageUri(audioUrl);
        const filename = normalizedUrl.split('/').pop() || 'temp.m4a';
        const localPath = `${FileSystem.cacheDirectory}${filename}`;

        // Check if file already exists in cache
        const fileInfo = await FileSystem.getInfoAsync(localPath);
        if (fileInfo.exists) {
          if (active) setLocalUri(localPath);
          return;
        }

        // If not, download it
        const { uri } = await FileSystem.downloadAsync(normalizedUrl, localPath);
        if (active) setLocalUri(uri);
      } catch (err) {
        console.error('Failed to cache audio file:', err);
        Alert.alert('Cache Error', `Failed to cache audio: ${err.message || err}`);
        // Fallback to normalizedUrl if download fails
        if (active) setLocalUri(getImageUri(audioUrl));
      }
    };

    prepareAudio();
    return () => {
      active = false;
    };
  }, [audioUrl]);

  if (!localUri) {
    return (
      <View style={[styles.voicePlayerContainer, { paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={isMe ? '#fff' : colors.primary} />
      </View>
    );
  }

  return <VoiceMessagePlayerInner localUri={localUri} isMe={isMe} colors={colors} />;
}

function VoiceMessagePlayerInner({ localUri, isMe, colors }) {
  const player = useAudioPlayer(localUri);
  const status = useAudioPlayerStatus(player);

  const loadAndPlaySound = async () => {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (status.playing) {
        player.pause();
      } else {
        if (status.currentTime >= status.duration) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (error) {
      console.error('Failed to load or play sound:', error);
      Alert.alert('Playback Error', `Failed to play: ${error.message || error}`);
    }
  };

  const formatTime = (secs) => {
    const totalSeconds = Math.floor(secs);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const duration = status.duration || 0;
  const currentTime = status.currentTime || 0;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={styles.voicePlayerContainer}>
      <TouchableOpacity
        onPress={loadAndPlaySound}
        style={[
          styles.playPauseBtn,
          { backgroundColor: isMe ? 'rgba(255, 255, 255, 0.25)' : colors.primary }
        ]}
      >
        <Ionicons
          name={status.playing ? 'pause' : 'play'}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>
      
      <View style={styles.voiceProgressWrap}>
        <View style={[styles.progressBarBg, { backgroundColor: isMe ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)' }]}>
          <View style={[
            styles.progressBarFill, 
            { 
              width: `${progressPercent}%`, 
              backgroundColor: isMe ? '#fff' : colors.primary 
            }
          ]} />
        </View>
        <Text style={[styles.voiceDurationText, { color: isMe ? '#cbd5e1' : colors.textSecondary }]}>
          {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '0:00'}
        </Text>
      </View>
    </View>
  );
}

export default function ChatConversationScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors?.[isDark ? 'dark' : 'light'] || Colors?.light || { primary: '#EC4899' };
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId, otherUserName, otherUserId, otherUserProfileImage } = useLocalSearchParams();
  const { token, user } = useAuth();
  const { initiateCall } = useCall();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  
  // Audio Recording States & Hooks
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);

  // Edit & Reply States
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Bottom Sheet Modal Options
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [locallyDeletedMsgIds, setLocallyDeletedMsgIds] = useState(new Set());
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState(null);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // UGC Safety States (Block & Report)
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('আপত্তিকর বা অশালীন বার্তা');
  const [reportDetails, setReportDetails] = useState('');
  const [isGuidelinesModalVisible, setIsGuidelinesModalVisible] = useState(false);

  useEffect(() => {
    if (!otherUserId) return;
    let active = true;
    const checkBlocked = async () => {
      try {
        const raw = await AsyncStorage.getItem('@blocked_users_list');
        const list = raw ? JSON.parse(raw) : [];
        if (active) {
          const uidStr = String(otherUserId);
          setIsUserBlocked(list.some((id) => String(id) === uidStr));
        }
      } catch (_e) {
        // fallback
      }
    };
    checkBlocked();
    return () => {
      active = false;
    };
  }, [otherUserId]);

  const handleToggleBlock = () => {
    setIsMenuVisible(false);
    const targetState = !isUserBlocked;
    const title = targetState ? 'ইউজারকে ব্লক করবেন?' : 'ইউজারকে আনব্লক করবেন?';
    const msg = targetState
      ? `${otherUserName || 'এই ব্যবহারকারী'}-কে ব্লক করলে তিনি আপনাকে আর কোনো বার্তা বা কল পাঠাতে পারবেন না।`
      : `${otherUserName || 'এই ব্যবহারকারী'}-কে আনব্লক করতে চান?`;

    Alert.alert(title, msg, [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: targetState ? 'হ্যাঁ, ব্লক করুন' : 'আনব্লক করুন',
        style: targetState ? 'destructive' : 'default',
        onPress: async () => {
          try {
            const raw = await AsyncStorage.getItem('@blocked_users_list');
            let list = raw ? JSON.parse(raw) : [];
            const uidStr = String(otherUserId);
            if (targetState) {
              if (!list.includes(uidStr)) list.push(uidStr);
            } else {
              list = list.filter((id) => String(id) !== uidStr);
            }
            await AsyncStorage.setItem('@blocked_users_list', JSON.stringify(list));
            setIsUserBlocked(targetState);
            Alert.alert(
              targetState ? 'ইউজার ব্লক করা হয়েছে' : 'ইউজার আনব্লক করা হয়েছে',
              targetState
                ? 'এই ব্যবহারকারীর সাথে বার্তা ও কল সফলভাবে বন্ধ করা হয়েছে।'
                : 'এখন থেকে স্বাভাবিকভাবে বার্তা আদান-প্রদান করতে পারবেন।'
            );
          } catch (_err) {
            Alert.alert('ত্রুটি', 'অপারেশন সম্পন্ন করা যায়নি।');
          }
        },
      },
    ]);
  };

  const handleReportSubmit = () => {
    setIsReportModalVisible(false);
    setReportDetails('');
    Alert.alert(
      'রিপোর্ট গৃহীত হয়েছে',
      'আপনার অভিযোগটি সাফল্যের সাথে গ্রহণ করা হয়েছে। আমাদের মডারেশন টিম ২৪ ঘণ্টার মধ্যে পর্যালোচনা করে প্রয়োজনীয় ব্যবস্থা গ্রহণ করবে। জাযাকাল্লাহু খাইরান।',
      [{ text: 'ঠিক আছে' }]
    );
  };

  const pickAndSendImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('অনুমতি প্রয়োজন', 'ছবি পাঠানোর জন্য গ্যালারির অনুমতি প্রয়োজন।');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(asset => asset.uri);
        uploadImageMessage(uris);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const uploadImageMessage = (uris) => {
    const formData = new FormData();
    
    uris.forEach((uri) => {
      const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      const filename = fileUri.split('/').pop() || 'chat_image.jpg';
      const ext = filename.split('.').pop().toLowerCase();
      const type = ext === 'png' ? 'image/png' : 'image/jpeg';
      
      formData.append('images', {
        uri: fileUri,
        name: filename,
        type: type,
      });
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_ENDPOINTS.chatRoomUploadImage(roomId));
      xhr.setRequestHeader('Authorization', `Token ${token}`);

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const responseData = JSON.parse(xhr.responseText);
            resolve(responseData);
          } catch (err) {
            reject(err);
          }
        } else {
          console.error('Image upload failed with status:', xhr.status);
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = (err) => {
        console.error('Image upload error:', err);
        reject(err);
      };

      xhr.send(formData);
    });
  };

  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    const loadDeletedMessages = async () => {
      try {
        const cachedDeleted = await AsyncStorage.getItem(`@deleted_msgs_${roomId}`);
        if (cachedDeleted) {
          setLocallyDeletedMsgIds(new Set(JSON.parse(cachedDeleted)));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadDeletedMessages();
  }, [roomId]);

  const handleDeleteForMe = async (messageId) => {
    try {
      const updatedSet = new Set(locallyDeletedMsgIds);
      updatedSet.add(messageId);
      setLocallyDeletedMsgIds(updatedSet);
      await AsyncStorage.setItem(`@deleted_msgs_${roomId}`, JSON.stringify(Array.from(updatedSet)));

      // Remove from active state immediately
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMessageOptions = (message) => {
    setDeleteTargetMessage(message);
    setIsDeleteModalVisible(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadMessages();
      markAsRead();
    }, [roomId])
  );

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      // 1. Try loading from cache first
      const cached = await getCache(`chat_messages_${roomId}`);
      if (cached.exists && cached.data) {
        setMessages(cached.data);
        setLoading(false);
      } else if (messages.length === 0) {
        setLoading(true);
      }

      // 2. Fetch fresh data from backend (limit 30, offset 0)
      const response = await fetch(`${API_ENDPOINTS.chatRoomMessages(roomId)}?limit=30&offset=0`, {
        headers: {
          'Authorization': `Token ${token}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        const isFirstLoad = messages.length === 0;
        setMessages(prev => {
          const isIdentical = prev.length === data.length && prev.every((m, idx) => m.id === data[idx].id && m.content === data[idx].content);
          if (isIdentical) return prev;
          return data;
        });
        setOffset(0);
        setHasMore(data.length >= 30);
        setCache(`chat_messages_${roomId}`, data, 60);
        
        if (isFirstLoad) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        }
      }
    } catch (e) {
      console.error('Error loading messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextOffset = offset + 30;
      const response = await fetch(`${API_ENDPOINTS.chatRoomMessages(roomId)}?limit=30&offset=${nextOffset}`, {
        headers: {
          'Authorization': `Token ${token}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setMessages(prev => [...data, ...prev]);
          setOffset(nextOffset);
          setHasMore(data.length >= 30);
        } else {
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error('Error loading more messages:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    if (contentOffset.y <= 10 && !loadingMore && hasMore) {
      loadMoreMessages();
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(API_ENDPOINTS.chatRoomMarkRead(roomId), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        }
      });
    } catch (e) {
      console.error('Error marking messages as read:', e);
    }
  };

  const connectWebSocket = () => {
    if (!user) return;
    const wsUrl = `${WS_CHAT(roomId)}?user_id=${user?.id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to room:', roomId);
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'query_status', sender_id: user?.id }));
        }
      }, 500);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message') {
        const newMsg = data.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          const updated = [...prev, newMsg];
          setCache(`chat_messages_${roomId}`, updated, 60);
          return updated;
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        
        if (newMsg.sender !== user?.id) {
          markAsRead();
        }
      } else if (data.type === 'message_update') {
        setMessages((prev) => {
          const updated = prev.map((m) => {
            if (m.id === data.message_id) {
              if (data.event === 'edit') {
                return { ...m, content: data.content, is_edited: true };
              } else if (data.event === 'delete') {
                return { ...m, content: 'বার্তাটি মুছে ফেলা হয়েছে', is_deleted: true };
              }
            }
            return m;
          });
          setCache(`chat_messages_${roomId}`, updated, 60);
          return updated;
        });
      } else if (data.type === 'messages_read') {
        setMessages((prev) => {
          const updated = prev.map((m) => {
            if (data.message_ids.includes(m.id)) {
              return { ...m, is_read: true };
            }
            return m;
          });
          setCache(`chat_messages_${roomId}`, updated, 60);
          return updated;
        });
      } else if (data.type === 'user_status') {
        if (data.user_id === parseInt(otherUserId, 10)) {
          setIsOtherUserOnline(data.status === 'online');
        }
      }
    };

    ws.onerror = (e) => {
      console.warn('WebSocket error:', e);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsOtherUserOnline(false);
    };

    socketRef.current = ws;
  };

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status === 'granted') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });

        await recorder.prepareToRecordAsync();
        recorder.record();
        
        setIsRecording(true);
        setRecordingDuration(0);
        
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else {
        Alert.alert('অনুমতি প্রয়োজন', 'ভয়েস মেসেজ পাঠাতে মাইক্রোফোনের অনুমতি প্রয়োজন।');
      }
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      if (!isRecording) return;
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      
      await recorder.stop();
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
      const uri = recorder.uri;

      if (uri) {
        uploadVoiceMessage(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const cancelRecording = async () => {
    try {
      if (!isRecording) return;
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      await recorder.stop();
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  };

  const uploadVoiceMessage = (uri) => {
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    const formData = new FormData();
    formData.append('audio', {
      uri: fileUri,
      name: 'voice_message.m4a',
      type: 'audio/m4a',
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_ENDPOINTS.chatRoomUploadAudio(roomId));
      xhr.setRequestHeader('Authorization', `Token ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          console.error('Audio upload failed with status:', xhr.status);
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        console.error('Network error during audio upload');
        reject(new Error('Network error'));
      };

      xhr.send(formData);
    }).catch(error => {
      console.error('Error uploading audio:', error);
    });
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
      const payload = {
        type: 'edit_message',
        message_id: editingMessage.id,
        content: inputText.trim(),
      };
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
        setInputText('');
        setEditingMessage(null);
      }
    } else {
      const payload = {
        type: 'chat_message',
        sender_id: user?.id,
        content: inputText.trim(),
        parent_id: replyToMessage ? replyToMessage.id : null,
      };

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(payload));
        setInputText('');
        setReplyToMessage(null);
      } else {
        console.warn('Socket not open, attempting reconnection...');
        connectWebSocket();
      }
    }
  };

  const startCall = (callType) => {
    if (isUserBlocked) {
      Alert.alert('ব্লক করা আছে', 'এই ব্যবহারকারী ব্লক থাকায় কল করা সম্ভব নয়। কথা বলতে চাইলে আনব্লক করুন।');
      return;
    }
    initiateCall(roomId, otherUserId, otherUserName, callType, otherUserProfileImage);
  };

  const handleMessageLongPress = (item) => {
    if (item.is_deleted) return;
    setSelectedMessage(item);
    setIsOptionsModalVisible(true);
  };

  const formatRecordingDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMessages = messages.filter(m => !locallyDeletedMsgIds.has(m.id));

  const renderMessageItem = ({ item, index }) => {
    const isMe = item.sender === user?.id;
    const isLastMessage = index === filteredMessages.length - 1;

    const isCallLog = item.content && (
      item.content.startsWith('📞') || 
      item.content.startsWith('📴') || 
      item.content.startsWith('🚫')
    );

    if (isCallLog) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={[styles.systemMessageBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons
              name={item.content.includes('📞') ? 'call' : (item.content.includes('📴') ? 'call-outline' : 'ban')}
              size={13}
              color={colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.systemMessageText, { color: colors.textSecondary }]}>
              {item.content} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
        {!isMe && (
          <View style={[styles.avatarContainer, { backgroundColor: colors.inputBg }]}>
            {otherUserProfileImage ? (
              <Image
                source={{ uri: getImageUri(otherUserProfileImage) }}
                style={styles.messageAvatar}
                contentFit="cover"
              />
            ) : (
              <Ionicons name="person" size={16} color={colors.textSecondary} />
            )}
          </View>
        )}
        <View style={{ maxWidth: '75%' }}>
          {/* Reply Context Inside Bubble */}
          {item.parent_detail && (
            <View style={[
              styles.replyBubbleContext,
              {
                backgroundColor: isMe ? 'rgba(255, 255, 255, 0.15)' : colors.inputBg,
                borderColor: colors.cardBorder
              }
            ]}>
              <Text style={[styles.replyContextName, { color: isMe ? '#e2e8f0' : colors.textSecondary }]} numberOfLines={1}>
                {item.parent_detail.sender_name}
              </Text>
              <Text style={[styles.replyContextText, { color: isMe ? '#cbd5e1' : colors.textMuted }]} numberOfLines={1}>
                {item.parent_detail.is_deleted ? 'বার্তাটি মুছে ফেলা হয়েছে' : item.parent_detail.content}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onLongPress={() => handleMessageLongPress(item)}
            activeOpacity={item.is_deleted ? 1 : 0.85}
            style={[
              styles.messageBubble,
              {
                backgroundColor: item.is_deleted 
                  ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)')
                  : item.image_file 
                    ? 'transparent'
                    : (isMe ? colors.primary : colors.card),
                borderColor: item.image_file && !item.is_deleted ? 'transparent' : colors.cardBorder,
                borderWidth: item.is_deleted ? 1 : 0,
                borderStyle: item.is_deleted ? 'dashed' : 'solid',
                borderBottomRightRadius: isMe ? 2 : 12,
                borderBottomLeftRadius: isMe ? 12 : 2,
                paddingHorizontal: item.image_file && !item.is_deleted ? 0 : 12,
                paddingVertical: item.image_file && !item.is_deleted ? 0 : 8,
              }
            ]}
          >
            {item.is_deleted ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.65 }}>
                <Ionicons 
                  name="ban-outline" 
                  size={14} 
                  color={isMe ? '#fff' : colors.textSecondary} 
                />
                <Text style={[
                  styles.messageText,
                  {
                    color: isMe ? '#fff' : colors.textSecondary,
                    fontStyle: 'italic',
                  }
                ]}>
                  {isMe ? 'আপনি এই বার্তাটি মুছে ফেলেছেন' : 'এই বার্তাটি মুছে ফেলা হয়েছে'}
                </Text>
              </View>
            ) : item.image_file ? ( (() => {
              let imageList = [];
              if (item.image_file.startsWith('[')) {
                try {
                  imageList = JSON.parse(item.image_file);
                } catch (e) {
                  imageList = [item.image_file];
                }
              } else {
                imageList = [item.image_file];
              }

              if (imageList.length > 1) {
                return (
                  <TouchableOpacity 
                    onPress={() => {
                      setViewerImages(imageList.map(img => getImageUri(img)));
                      setViewerIndex(0);
                    }}
                    style={{ width: 220, height: 180 }}
                  >
                    {imageList.slice(0, 3).reverse().map((imgUrl, imgIndex) => {
                      const actualIndex = Math.min(imageList.length, 3) - 1 - imgIndex;
                      const offsetLeft = actualIndex * 12;
                      const offsetTop = actualIndex * 8;
                      const rotation = `${(actualIndex - 1) * 3}deg`;
                      const isTopCard = actualIndex === 0;

                      return (
                        <View
                          key={imgUrl}
                          style={{
                            position: 'absolute',
                            left: offsetLeft,
                            top: offsetTop,
                            width: 190,
                            height: 160,
                            transform: [{ rotate: rotation }],
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.15,
                            shadowRadius: 4,
                            elevation: 3,
                            backgroundColor: colors.card,
                            borderRadius: 12,
                          }}
                        >
                          <Image
                            source={{ uri: getImageUri(imgUrl) }}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: 12,
                            }}
                            contentFit="cover"
                          />
                          {isTopCard && imageList.length > 3 && (
                            <View style={{
                              ...StyleSheet.absoluteFillObject,
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              borderRadius: 12,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}>
                              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                                +{imageList.length - 3}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity onPress={() => {
                  setViewerImages([getImageUri(imageList[0])]);
                  setViewerIndex(0);
                }}>
                  <Image
                    source={{ uri: getImageUri(imageList[0]) }}
                    style={{ 
                      width: 220, 
                      height: 180, 
                      borderRadius: 12,
                      borderBottomRightRadius: isMe ? 2 : 12,
                      borderBottomLeftRadius: isMe ? 12 : 2,
                    }}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              );
            })()
            ) : item.audio_file ? (
              // Audio Voice Message Player bubble
              <VoiceMessagePlayer
                audioUrl={item.audio_file}
                isMe={isMe}
                colors={colors}
              />
            ) : (
              // Standard Text Message content
              <Text style={[
                styles.messageText,
                {
                  color: isMe ? '#fff' : colors.text,
                }
              ]}>
                {item.content}
              </Text>
            )}

            <View style={styles.bubbleFooter}>
              {item.is_edited && !item.is_deleted && (
                <Text style={[styles.editedLabel, { color: isMe ? '#cbd5e1' : colors.textMuted }]}>
                  (সম্পাদিত)
                </Text>
              )}
              <Text style={[styles.messageTime, { color: isMe ? '#cbd5e1' : colors.textMuted }]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Seen Status under last message */}
          {isLastMessage && isMe && (
            <Text style={[styles.seenLabel, { color: colors.textMuted }]}>
              {item.is_read ? 'Seen' : 'Sent'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.cardBorder, backgroundColor: colors.card, paddingTop: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => otherUserId && router.push(`/user-profile?id=${otherUserId}`)}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 }}
        >
          <View style={styles.headerAvatarWrapper}>
            {otherUserProfileImage ? (
              <Image
                source={{ uri: getImageUri(otherUserProfileImage) }}
                style={styles.headerAvatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.headerAvatar, { backgroundColor: colors.inputBg, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={18} color={colors.textSecondary} />
              </View>
            )}
            {isOtherUserOnline && <View style={styles.headerActiveDot} />}
          </View>
          
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{otherUserName}</Text>
            <Text style={{ fontSize: 10, color: isOtherUserOnline ? '#10B981' : colors.textMuted, fontWeight: '600' }}>
              {isOtherUserOnline ? 'অনলাইন' : 'অফলাইন'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => startCall('audio')} style={[styles.callBtn, { marginRight: 10 }]}>
            <Ionicons name="call-outline" size={22} color={isUserBlocked ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => startCall('video')} style={[styles.callBtn, { marginRight: 8 }]}>
            <Ionicons name="videocam-outline" size={24} color={isUserBlocked ? colors.textMuted : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.callBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Blocked User Top Warning Banner */}
      {isUserBlocked && (
        <View style={[styles.blockedBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEF2F2', borderBottomColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA' }]}>
          <View style={styles.blockedBannerLeft}>
            <Ionicons name="ban" size={16} color="#EF4444" />
            <Text style={[styles.blockedBannerText, { color: isDark ? '#FCA5A5' : '#991B1B' }]} numberOfLines={1}>
              আপনি এই ব্যবহারকারীকে ব্লক করেছেন
            </Text>
          </View>
          <TouchableOpacity onPress={handleToggleBlock} style={styles.unblockBannerBtn}>
            <Text style={styles.unblockBannerBtnText}>আনব্লক</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message List */}
      {filteredMessages.length === 0 && loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredMessages}
          keyExtractor={(item, index) => item.id ? item.id.toString() : `msg-${index}`}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          maxToRenderPerBatch={12}
          windowSize={11}
          initialNumToRender={15}
        />
      )}

      {/* Reply or Edit Preview Bar */}
      {replyToMessage && (
        <View style={[styles.previewBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
              {replyToMessage.sender === user?.id ? 'নিজেকে রিপ্লাই দিচ্ছেন' : `${otherUserName}-কে রিপ্লাই দিচ্ছেন`}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{replyToMessage.content}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyToMessage(null)}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {editingMessage && (
        <View style={[styles.previewBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>বার্তা সম্পাদনা করছেন</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{editingMessage.content}</Text>
          </View>
          <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Box / Audio Recording Container */}
      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {isUserBlocked ? (
          <View style={[styles.blockedInputNotice, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.blockedNoticeText, { color: colors.textSecondary }]}>
              ব্যবহারকারী ব্লক থাকায় বার্তা পাঠানো যাবে না।
            </Text>
            <TouchableOpacity onPress={handleToggleBlock} style={styles.inlineUnblockBtn}>
              <Text style={styles.inlineUnblockBtnText}>আনব্লক</Text>
            </TouchableOpacity>
          </View>
        ) : isRecording ? (
          // Recording Live Overlay
          <View style={[styles.recordingOverlay, { backgroundColor: colors.inputBg }]}>
            <View style={styles.recordingRow}>
              <View style={styles.redPulseDot} />
              <Text style={[styles.recordingTimeText, { color: colors.text }]}>
                রেকর্ডিং হচ্ছে: {formatRecordingDuration(recordingDuration)}
              </Text>
            </View>
            <View style={styles.recordingActions}>
              <TouchableOpacity onPress={cancelRecording} style={styles.cancelRecordingBtn}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopAndSendRecording} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
            <TouchableOpacity onPress={pickAndSendImage} style={{ marginRight: 8, padding: 4 }}>
              <Ionicons name="image-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TextInput
              placeholder="বার্তা লিখুন..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              style={[styles.textInput, { color: colors.text }]}
            />
            {inputText.trim() ? (
              <TouchableOpacity onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name={editingMessage ? "checkmark" : "send"} size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              // Mic Icon for Voice Messaging
              <TouchableOpacity onPress={startRecording} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="mic" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Options Bottom Sheet Modal */}
      <Modal
        visible={isOptionsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOptionsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOptionsModalVisible(false)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={[styles.bottomSheetIndicator, { backgroundColor: colors.cardBorder }]} />
            
            <Text style={[styles.bottomSheetTitle, { color: colors.textSecondary }]}>বার্তা অপশন</Text>

            <TouchableOpacity
              onPress={() => {
                if (selectedMessage) {
                  Clipboard.setString(selectedMessage.content);
                  setIsOptionsModalVisible(false);
                }
              }}
              style={styles.sheetItem}
            >
              <Ionicons name="copy-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: colors.text }]}>কপি করুন</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (selectedMessage) {
                  setReplyToMessage(selectedMessage);
                  setEditingMessage(null);
                  setIsOptionsModalVisible(false);
                }
              }}
              style={styles.sheetItem}
            >
              <Ionicons name="arrow-undo-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: colors.text }]}>উত্তর দিন (Reply)</Text>
            </TouchableOpacity>

            {selectedMessage && selectedMessage.sender === user?.id && !selectedMessage.is_deleted && !selectedMessage.audio_file && (
              <TouchableOpacity
                onPress={() => {
                  setEditingMessage(selectedMessage);
                  setReplyToMessage(null);
                  setInputText(selectedMessage.content);
                  setIsOptionsModalVisible(false);
                }}
                style={styles.sheetItem}
              >
                <Ionicons name="create-outline" size={20} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.sheetItemText, { color: colors.text }]}>সম্পাদনা করুন (Edit)</Text>
              </TouchableOpacity>
            )}

            {selectedMessage && !selectedMessage.is_deleted && (
              <TouchableOpacity
                onPress={() => {
                  setIsOptionsModalVisible(false);
                  setTimeout(() => {
                    handleDeleteMessageOptions(selectedMessage);
                  }, 300);
                }}
                style={styles.sheetItem}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                <Text style={[styles.sheetItemText, { color: '#EF4444' }]}>মুছে ফেলুন (Delete)</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Delete Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.deleteModalOverlay}
          activeOpacity={1}
          onPress={() => setIsDeleteModalVisible(false)}
        >
          <View style={[styles.deleteDialog, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.deleteDialogHeader}>
              <Ionicons name="trash-bin-outline" size={28} color="#EF4444" style={{ marginBottom: 8 }} />
              <Text style={[styles.deleteDialogTitle, { color: colors.text }]}>বার্তা মুছে ফেলুন</Text>
              <Text style={[styles.deleteDialogSub, { color: colors.textSecondary }]}>
                আপনি কি নিশ্চিতভাবে এই বার্তাটি মুছে ফেলতে চান?
              </Text>
            </View>

            <View style={styles.deleteDialogButtons}>
              {deleteTargetMessage && deleteTargetMessage.sender === user?.id && (
                <TouchableOpacity
                  style={[styles.dialogBtn, styles.dialogBtnDanger, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setIsDeleteModalVisible(false);
                    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                      socketRef.current.send(JSON.stringify({
                        type: 'delete_message',
                        message_id: deleteTargetMessage.id
                      }));
                    }
                  }}
                >
                  <Text style={styles.dialogBtnTextLight}>সকলের জন্য মুছে ফেলুন</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: '#EF4444' }]}
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  handleDeleteForMe(deleteTargetMessage.id);
                }}
              >
                <Text style={[styles.dialogBtnText, { color: '#EF4444' }]}>আমার জন্য মুছে ফেলুন</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={[styles.dialogBtnText, { color: colors.textSecondary }]}>বাতিল</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Full-Screen Image Viewer Modal */}
      <Modal
        visible={viewerImages.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerImages([])}
      >
        <View style={styles.imageViewerOverlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeViewerBtn}
            onPress={() => setViewerImages([])}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Left Arrow */}
          {viewerImages.length > 1 && viewerIndex > 0 && (
            <TouchableOpacity
              style={[styles.navArrowBtn, { left: 16 }]}
              onPress={() => setViewerIndex(prev => prev - 1)}
            >
              <Ionicons name="chevron-back" size={30} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Image */}
          {viewerImages.length > 0 && (
            <Image
              source={{ uri: viewerImages[viewerIndex] }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}

          {/* Right Arrow */}
          {viewerImages.length > 1 && viewerIndex < viewerImages.length - 1 && (
            <TouchableOpacity
              style={[styles.navArrowBtn, { right: 16 }]}
              onPress={() => setViewerIndex(prev => prev + 1)}
            >
              <Ionicons name="chevron-forward" size={30} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Image Index Indicator */}
          {viewerImages.length > 1 && (
            <Text style={styles.viewerIndexText}>
              {viewerIndex + 1} / {viewerImages.length}
            </Text>
          )}
        </View>
      </Modal>

      {/* 3-Dot UGC Header Menu Modal */}
      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={[styles.bottomSheetIndicator, { backgroundColor: colors.cardBorder }]} />
            <Text style={[styles.bottomSheetTitle, { color: colors.textSecondary }]}>চ্যাট অপশন ও নিরাপত্তা</Text>

            <TouchableOpacity
              onPress={() => {
                setIsMenuVisible(false);
                setIsReportModalVisible(true);
              }}
              style={styles.sheetItem}
            >
              <Ionicons name="flag-outline" size={20} color="#DC2626" style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: '#DC2626', fontWeight: '600' }]}>রিপোর্ট করুন (Report User)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleToggleBlock}
              style={styles.sheetItem}
            >
              <Ionicons name={isUserBlocked ? "lock-open-outline" : "ban-outline"} size={20} color={isUserBlocked ? "#10B981" : "#EF4444"} style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: isUserBlocked ? "#10B981" : "#EF4444", fontWeight: '600' }]}>
                {isUserBlocked ? 'আনব্লক করুন (Unblock)' : 'ব্লক করুন (Block User)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsMenuVisible(false);
                setIsGuidelinesModalVisible(true);
              }}
              style={styles.sheetItem}
            >
              <Ionicons name="book-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
              <Text style={[styles.sheetItemText, { color: colors.text }]}>ইসলামিক আদব ও কমিউনিটি গাইডলাইন</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsMenuVisible(false)}
              style={[styles.sheetItem, { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 8, justifyContent: 'center' }]}
            >
              <Text style={[styles.sheetItemText, { color: colors.textSecondary, textAlign: 'center' }]}>বাতিল</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsReportModalVisible(false)}
        >
          <View style={[styles.reportModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.reportHeader}>
              <Ionicons name="alert-circle-outline" size={26} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={[styles.reportTitle, { color: colors.text }]}>ব্যবহারকারী রিপোর্ট করুন</Text>
            </View>
            <Text style={[styles.reportSub, { color: colors.textSecondary }]}>
              অনাকাঙ্ক্ষিত বা নীতিবিরোধী আচরণের সুনির্দিষ্ট কারণ নির্বাচন করুন:
            </Text>

            {['আপত্তিকর বা অশালীন বার্তা', 'স্প্যাম বা প্রতারণামূলক কার্যকলাপ', 'হয়রানি বা ক্ষতিকর অসদাচরণ', 'অন্যান্য'].map((reason) => (
              <TouchableOpacity
                key={reason}
                onPress={() => setReportReason(reason)}
                style={[
                  styles.reasonOption,
                  { borderColor: reportReason === reason ? colors.primary : colors.cardBorder, backgroundColor: reportReason === reason ? (isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5') : 'transparent' }
                ]}
              >
                <Ionicons
                  name={reportReason === reason ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={reportReason === reason ? colors.primary : colors.textMuted}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.reasonText, { color: colors.text, fontWeight: reportReason === reason ? '700' : '500' }]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              placeholder="অভিযোগের বিস্তারিত বিবরণ লিখুন (ঐচ্ছিক)..."
              placeholderTextColor={colors.textMuted}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              numberOfLines={3}
              style={[styles.reportInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]}
            />

            <View style={styles.reportActions}>
              <TouchableOpacity
                onPress={() => setIsReportModalVisible(false)}
                style={[styles.reportCancelBtn, { backgroundColor: colors.inputBg }]}
              >
                <Text style={[styles.reportCancelText, { color: colors.textSecondary }]}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReportSubmit}
                style={[styles.reportSubmitBtn, { backgroundColor: '#DC2626' }]}
              >
                <Text style={styles.reportSubmitText}>রিপোর্ট জমা দিন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Islamic Community Guidelines Modal */}
      <Modal
        visible={isGuidelinesModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsGuidelinesModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsGuidelinesModalVisible(false)}
        >
          <View style={[styles.guidelinesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="shield-checkmark" size={26} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.guidelinesTitle, { color: colors.text }]}>ইসলামিক আদব ও গাইডলাইন</Text>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={[styles.guidelinesAyah, { color: colors.primary }]}>
                يَا أَيُّهَا الَّذِينَ آمَنُوا لَا يَسْخَرْ قَوْمٌ مِّن قَوْمٍ
              </Text>
              <Text style={[styles.guidelinesAyahMeaning, { color: colors.textSecondary }]}>
                &ldquo;হে মুমিনগণ! কোনো সম্প্রদায় যেন অপর কোনো সম্প্রদায়কে উপহাস না করে...&rdquo; (সূরা আল-হুজুরাত: ১১)
              </Text>

              <Text style={[styles.guidelinesBody, { color: colors.text }]}>
                ১. পারস্পরিক কুশল বিনিময় এবং সালাম দিয়ে কথা শুরু করুন।{'\n'}
                ২. কোনো প্রকার অশ্লীল, মানহানিকর, ব্যঙ্গাত্মক বা উস্কানিমূলক বার্তা আদান-প্রদান সম্পূর্ণ নিষিদ্ধ।{'\n'}
                ৩. কোনো অনাকাঙ্ক্ষিত বা সন্দেহজনক কার্যকলাপ দেখলে ৩-ডট মেনু থেকে তাৎক্ষণিক &apos;রিপোর্ট&apos; এবং &apos;ব্লক&apos; সুবিধা ব্যবহার করুন।
              </Text>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setIsGuidelinesModalVisible(false)}
              style={[styles.guidelinesCloseBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.guidelinesCloseBtnText}>আলহামদুলিল্লাহ, বুঝেছি</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  backBtn: {
    padding: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  headerAvatarWrapper: {
    position: 'relative',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerActiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  replyBubbleContext: {
    borderLeftWidth: 3.5,
    borderLeftColor: '#3B82F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 0.5,
  },
  replyContextName: {
    fontSize: 10,
    fontWeight: '700',
  },
  replyContextText: {
    fontSize: 11,
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  editedLabel: {
    fontSize: 8.5,
  },
  messageTime: {
    fontSize: 8.5,
  },
  seenLabel: {
    fontSize: 9,
    textAlign: 'right',
    marginTop: 2,
    marginRight: 2,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 0.5,
  },
  inputContainer: {
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  // Voice Message Styles
  voicePlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    width: 200,
  },
  playPauseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceProgressWrap: {
    flex: 1,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    position: 'relative',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  voiceDurationText: {
    fontSize: 9.5,
    fontWeight: '600',
  },
  // Audio Recording Overlay Styles
  recordingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 8,
  },
  recordingTimeText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelRecordingBtn: {
    padding: 6,
    marginRight: 12,
  },
  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  bottomSheetIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(156, 163, 175, 0.15)',
  },
  sheetItemText: {
    fontSize: 14,
    fontWeight: '600',
  },
  systemMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  systemMessageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  systemMessageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteDialog: {
    width: '85%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  deleteDialogHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  deleteDialogSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  deleteDialogButtons: {
    width: '100%',
    gap: 10,
  },
  dialogBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnDanger: {
    backgroundColor: '#EF4444',
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dialogBtnTextLight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
  navArrowBtn: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerIndexText: {
    position: 'absolute',
    bottom: 40,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  blockedBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  blockedBannerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unblockBannerBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unblockBannerBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  blockedInputNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    width: '100%',
  },
  blockedNoticeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inlineUnblockBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  inlineUnblockBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  reportModalCard: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'center',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  reportSub: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 13,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
    marginTop: 6,
    marginBottom: 16,
    height: 70,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
  },
  reportCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  reportSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportSubmitText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  guidelinesCard: {
    width: '90%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'center',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  guidelinesAyah: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 6,
  },
  guidelinesAyahMeaning: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 14,
    lineHeight: 18,
  },
  guidelinesBody: {
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 16,
  },
  guidelinesCloseBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  guidelinesCloseBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
