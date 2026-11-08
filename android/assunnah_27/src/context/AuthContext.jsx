import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, WS_BASE_URL } from '../constants/api';
import { setCache, getCache, CacheKeys } from '../services/cacheService';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { Animated, View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { getImageUri } from '../utils/image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  if (typeof Notifications?.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldShowBadge: true,
      }),
    });
  }
  if (typeof Notifications?.setNotificationChannelAsync === 'function') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#059669',
      sound: true,
    }).catch(() => {});
    Notifications.setNotificationChannelAsync('incoming-calls', {
      name: 'Incoming Calls',
      importance: Notifications.AndroidImportance.MAX,
      sound: true,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#10B981',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    }).catch(() => {});
  }
} catch (e) {
  console.warn('[Presence] Failed to require expo-notifications:', e);
  Notifications = null;
}

export const incomingCallHandlerRef = { current: null };
export let globalLogout = () => {};

// Intercept global fetch to handle 401 Unauthorized
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    console.warn('[Global Fetch Interceptor] 401 Unauthorized detected. Auto-logging out.');
    if (globalLogout) {
      globalLogout();
    }
  }
  return response;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [redirectAfterLogout, setRedirectAfterLogout] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Custom In-App Notification states
  const [activeNotification, setActiveNotification] = useState(null);
  const [isInCallScreen, setIsInCallScreen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-180)).current;
  const presenceSocketRef = useRef(null);

  const showInAppNotification = (notificationData) => {
    setActiveNotification(notificationData);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 5 seconds if not an incoming call
    if (notificationData.notificationType !== 'call') {
      setTimeout(() => {
        hideInAppNotification();
      }, 5000);
    }
  };

  const hideInAppNotification = () => {
    Animated.timing(slideAnim, {
      toValue: -180,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveNotification(null);
    });
  };

  const handleBannerPress = () => {
    if (!activeNotification) return;
    const { roomId, notificationType, callType, senderId, title } = activeNotification;
    hideInAppNotification();

    if (notificationType === 'call') {
      if (incomingCallHandlerRef.current) {
        incomingCallHandlerRef.current.onAcceptCall();
      } else {
        router.push({
          pathname: '/call',
          params: {
            roomId,
            otherUserId: senderId,
            otherUserName: title.replace('ইনকামিং ', '').replace(' কল', ''),
            callType,
            isIncoming: 'true',
          }
        });
      }
    } else {
      router.push({
        pathname: '/chat-conversation',
        params: {
          roomId,
          otherUserName: title,
          otherUserId: senderId
        }
      });
    }
  };

  const handleDeclineCall = () => {
    if (!activeNotification) return;
    if (incomingCallHandlerRef.current) {
      incomingCallHandlerRef.current.onDeclineCall();
    }
    hideInAppNotification();
  };

  // Request notifications permission and handle clicks on app mount
  useEffect(() => {
    if (!Notifications) return;

    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (err) {
        console.warn("Failed to request notification permission:", err);
      }
    };
    requestPermissions();

    let subscription;
    try {
      subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data && data.notificationType === 'call') {
          router.push({
            pathname: '/call',
            params: {
              roomId: data.roomId,
              otherUserId: data.senderId,
              otherUserName: 'কল এসেছে',
              callType: data.callType,
              isIncoming: 'true'
            }
          });
        } else if (data && data.roomId) {
          router.push({
            pathname: '/chat-conversation',
            params: {
              roomId: data.roomId,
              otherUserName: response.notification.request.content.title,
              otherUserId: data.senderId
            }
          });
        }
      });
    } catch (err) {
      console.warn("Failed to subscribe to notification responses:", err);
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Global Presence WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectPresence = () => {
      if (!token || !user) return;

      const wsUrl = `${WS_BASE_URL}/ws/presence/?user_id=${user.id}`;
      ws = new WebSocket(wsUrl);
      presenceSocketRef.current = ws;

      ws.onopen = () => {
        console.log('[Presence] Global presence socket connected');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'incoming_notification') {
            if (data.notification_type === 'call_cancel') {
              hideInAppNotification();
              if (incomingCallHandlerRef.current) {
                incomingCallHandlerRef.current.onCallCancel();
              }
              if (isInCallScreen) {
                router.replace('/(tabs)');
              }
              return;
            }

            const notificationData = {
              title: data.title,
              body: data.body,
              roomId: data.room_id,
              senderId: data.sender_id,
              notificationType: data.notification_type,
              callType: data.call_type,
              senderImage: data.sender_image
            };

            // Show custom drop-down notification banner in-app
            showInAppNotification(notificationData);

            // Setup incoming call inside CallContext
            if (data.notification_type === 'call') {
              if (incomingCallHandlerRef.current) {
                incomingCallHandlerRef.current.onIncomingCall(
                  data.room_id,
                  data.sender_id,
                  data.sender_name || 'ব্যবহারকারী',
                  data.call_type,
                  data.sender_image
                );
              }
            }

            // Trigger native local notification banner if package is available
            if (Notifications) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: data.title,
                  body: data.body,
                  data: {
                    roomId: data.room_id,
                    senderId: data.sender_id,
                    notificationType: data.notification_type,
                    callType: data.call_type
                  },
                  channelId: data.notification_type === 'call' ? 'incoming-calls' : 'default',
                },
                trigger: null,
              });
            } else {
              console.log('[Presence] Notifications module not available to trigger banner (received:', data.title, ')');
            }
          }
        } catch (e) {
          console.error('[Presence] Error parsing ws message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Presence] Global presence socket disconnected, reconnecting in 5s...');
        if (token && user) {
          reconnectTimeout = setTimeout(connectPresence, 5000);
        }
      };

      ws.onerror = (e) => {
        console.warn('[Presence] Global presence socket error:', e);
      };
    };

    if (token && user) {
      connectPresence();
    }

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [token, user]);

  // Load cached auth state on app start
  useEffect(() => {
    const loadCachedAuth = async () => {
      try {
        // Load cached token
        const tokenCache = await getCache(CacheKeys.AUTH_TOKEN);
        if (tokenCache.exists && !tokenCache.expired && tokenCache.data) {
          setToken(tokenCache.data);

          // Load cached user profile
          const userCache = await getCache(CacheKeys.USER_PROFILE);
          if (userCache.exists && userCache.data) {
            setUser(userCache.data);
          }

          // Silent background sync
          fetchProfileBackground(tokenCache.data);
        }
      } catch (error) {
        console.error('[AuthContext] Cache load error:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadCachedAuth();
  }, []);

  // Cache user profile whenever it changes
  useEffect(() => {
    if (user) {
      setCache(CacheKeys.USER_PROFILE, user, 30).catch(console.error);
    }
  }, [user]);

  // Cache token whenever it changes
  useEffect(() => {
    if (token) {
      setCache(CacheKeys.AUTH_TOKEN, token, 60 * 24 * 7).catch(console.error); // 7 days
    } else {
      // Clear auth cache when token is null (logout)
      const clearAuthCache = async () => {
        await Promise.all([
          import('../services/cacheService').then(m => m.deleteCache(CacheKeys.AUTH_TOKEN)),
          import('../services/cacheService').then(m => m.deleteCache(CacheKeys.USER_PROFILE)),
        ]).catch(console.error);
      };
      clearAuthCache();
    }
  }, [token]);

  // Fetch fresh profile from server
  const fetchProfile = async (overrideToken) => {
    const tokenToUse = overrideToken || token;
    if (!tokenToUse) return null;
    try {
      const response = await fetch(API_ENDPOINTS.PROFILE, {
        headers: {
          'Authorization': `Token ${tokenToUse}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        return data;
      }
    } catch (error) {
      console.error('[AuthContext] Profile fetch error:', error);
    }
    return null;
  };

  // Perform silent background sync
  const fetchProfileBackground = async (overrideToken) => {
    try {
      await fetchProfile(overrideToken);
    } catch (error) {
      console.log('[AuthContext] Background profile sync error:', error);
    }
  };

  const signup = async (profileType, data) => {
    setIsLoading(true);
    try {
      const endpoint = profileType === 'takmil_student'
        ? API_ENDPOINTS.SIGNUP_TAKMIL
        : API_ENDPOINTS.SIGNUP_NON_TAKMIL;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        setIsGuest(false);
        setToken(result.token);
        setUser(result.user);
        return { success: true, message: result.message };
      }

      // Read the body as text once and try to JSON-parse it
      const text = await response.text();
      let errorMessage;
      try {
        errorMessage = JSON.parse(text);
      } catch (e) {
        errorMessage = text || `HTTP ${response.status}`;
      }

      return { success: false, message: errorMessage };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: error.message || 'নেটওয়ার্ক সংযোগ ত্রুটি' };
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const result = await response.json();
        setIsGuest(false);
        setToken(result.token);
        setUser(result.user);
        return { success: true, message: result.message };
      }

      // Read the body as text once and try to JSON-parse it
      const text = await response.text();
      let errorMessage;
      try {
        errorMessage = JSON.parse(text);
      } catch (e) {
        errorMessage = text || `HTTP ${response.status}`;
      }

      return { success: false, message: errorMessage };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'নেটওয়ার্ক সংযোগ ত্রুটি' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (token) {
        await fetch(API_ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      setIsGuest(false);
      setRedirectAfterLogout(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    globalLogout = logout;
  }, [token]);

  const loginAsGuest = () => {
    setIsGuest(true);
    setToken(null);
    setUser(null);
    setRedirectAfterLogout(false);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  const requestPasswordReset = async (email) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_RESET_REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = text || `HTTP ${response.status}`;
      }

      if (response.ok) {
        return { success: true, message: result.message || result, dev_otp: result.dev_otp };
      }
      return { success: false, message: result };
    } catch (error) {
      console.error('Request password reset error:', error);
      return { success: false, message: error.message || 'নেটওয়ার্ক সংযোগ ত্রুটি' };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPasswordReset = async (email, otp) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_RESET_VERIFY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = text || `HTTP ${response.status}`;
      }

      if (response.ok) {
        return { success: true, message: result.message || result };
      }
      return { success: false, message: result };
    } catch (error) {
      console.error('Verify password reset error:', error);
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const uploadProfilePhoto = (imageUri) => {
    if (!token) return Promise.resolve({ success: false, message: 'Not authenticated' });
    setIsLoading(true);

    const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_ENDPOINTS.UPLOAD_PROFILE_PHOTO);
      xhr.setRequestHeader('Authorization', `Token ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200) {
            setUser(data.data);
            resolve({ success: true, message: data.message });
          } else {
            resolve({ success: false, message: data.error || 'Upload failed' });
          }
        } catch (e) {
          resolve({ success: false, message: 'Upload failed' });
        }
        setIsLoading(false);
      };

      xhr.onerror = () => {
        console.error('Upload profile photo error: Network error');
        resolve({ success: false, message: 'নেটওয়ার্ক সংযোগ ত্রুটি' });
        setIsLoading(false);
      };

      const formData = new FormData();
      formData.append('profile_image', {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'profile_image.jpg',
      });

      xhr.send(formData);
    });
  };

  const uploadCoverPhoto = (imageUri) => {
    if (!token) return Promise.resolve({ success: false, message: 'Not authenticated' });
    setIsLoading(true);

    const fileUri = imageUri.startsWith('file://') ? imageUri : `file://${imageUri}`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_ENDPOINTS.UPLOAD_COVER_PHOTO);
      xhr.setRequestHeader('Authorization', `Token ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200) {
            setUser(data.data);
            resolve({ success: true, message: data.message });
          } else {
            resolve({ success: false, message: data.error || 'Upload failed' });
          }
        } catch (e) {
          resolve({ success: false, message: 'Upload failed' });
        }
        setIsLoading(false);
      };

      xhr.onerror = () => {
        console.error('Upload cover photo error: Network error');
        resolve({ success: false, message: 'নেটওয়ার্ক সংযোগ ত্রুটি' });
        setIsLoading(false);
      };

      const formData = new FormData();
      formData.append('cover_image', {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'cover_image.jpg',
      });

      xhr.send(formData);
    });
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const confirmPasswordReset = async (email, otp, password, passwordConfirm) => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PASSWORD_RESET_CONFIRM, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp,
          password,
          password_confirm: passwordConfirm,
        }),
      });
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        result = text || `HTTP ${response.status}`;
      }

      if (response.ok) {
        return { success: true, message: result.message || result };
      }
      return { success: false, message: result };
    } catch (error) {
      console.error('Confirm password reset error:', error);
      return { success: false, message: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isGuest,
    isInitialized,
    signup,
    login,
    logout,
    loginAsGuest,
    exitGuestMode,
    requestPasswordReset,
    verifyPasswordReset,
    confirmPasswordReset,
    uploadProfilePhoto,
    uploadCoverPhoto,
    updateUser,
    fetchProfile,
    fetchProfileBackground,
    isSignedIn: !!token || isGuest,
    redirectAfterLogout,
    setRedirectAfterLogout,
    isInCallScreen,
    setIsInCallScreen,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {activeNotification && (
        <Animated.View style={[styles.notificationContainer, { top: insets.top + 8, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={handleBannerPress}
            style={[
              styles.notificationCard,
              {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.96)' : '#FFFFFF',
                borderColor: activeNotification.notificationType === 'call'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : (isDark ? 'rgba(51, 65, 85, 0.8)' : '#E2E8F0'),
              }
            ]}
          >
            {/* Left Avatar / Icon with active status indicator */}
            <View style={styles.avatarContainer}>
              {activeNotification.senderImage ? (
                <Image
                  source={{ uri: getImageUri(activeNotification.senderImage) }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <View style={[
                  styles.iconFallback,
                  {
                    backgroundColor: activeNotification.notificationType === 'call'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : (isDark ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)'),
                  }
                ]}>
                  <Ionicons
                    name={activeNotification.notificationType === 'call'
                      ? (activeNotification.callType === 'video' ? 'videocam' : 'call')
                      : 'chatbubble-ellipses'}
                    size={20}
                    color={activeNotification.notificationType === 'call' ? '#10B981' : '#2563EB'}
                  />
                </View>
              )}
              {activeNotification.notificationType === 'call' && (
                <View style={styles.pulsingDot} />
              )}
            </View>

            {/* Middle Content */}
            <View style={styles.textContainer}>
              {/* Type Badge */}
              <View style={styles.badgeRow}>
                <View style={[
                  styles.typeBadge,
                  {
                    backgroundColor: activeNotification.notificationType === 'call'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.1)')
                  }
                ]}>
                  <Text style={[
                    styles.typeBadgeText,
                    { color: activeNotification.notificationType === 'call' ? '#10B981' : '#2563EB' }
                  ]}>
                    {activeNotification.notificationType === 'call'
                      ? (activeNotification.callType === 'video' ? '📹 ভিডিও কল আসছে' : '📞 অডিও কল আসছে')
                      : '💬 নতুন বার্তা'}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.notificationTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                numberOfLines={1}
              >
                {activeNotification.title || (activeNotification.notificationType === 'call' ? 'ইনকামিং কল' : 'নতুন বার্তা')}
              </Text>
              
              <Text
                style={[styles.notificationBody, { color: isDark ? '#94A3B8' : '#64748B' }]}
                numberOfLines={1}
              >
                {activeNotification.body || (activeNotification.notificationType === 'call' ? 'কথা বলতে রিসিভ করুন' : 'বার্তাটি দেখুন')}
              </Text>
            </View>

            {/* Action Buttons */}
            {activeNotification.notificationType === 'call' ? (
              <View style={styles.callActionsContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeclineCall();
                  }}
                  style={styles.declineCallBtn}
                >
                  <Ionicons name="call" size={17} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleBannerPress}
                  style={styles.acceptCallBtn}
                >
                  <Ionicons name="call" size={17} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.viewMessagePill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
                <Ionicons name="chevron-forward" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </AuthContext.Provider>
  );
};

const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
  },
  notificationCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  iconFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulsingDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 1,
    letterSpacing: -0.2,
  },
  notificationBody: {
    fontSize: 12,
    fontWeight: '500',
  },
  callActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  declineCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  acceptCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  viewMessagePill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
