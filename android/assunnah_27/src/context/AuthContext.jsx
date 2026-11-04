import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_ENDPOINTS, WS_BASE_URL } from '../constants/api';
import { setCache, getCache, CacheKeys } from '../services/cacheService';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        <Animated.View style={[styles.notificationContainer, { top: insets.top + 10, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleBannerPress} style={styles.notificationCard}>
            <View style={[styles.iconWrapper, { backgroundColor: activeNotification.notificationType === 'call' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons
                name={activeNotification.notificationType === 'call' ? 'call' : 'chatbubble-ellipses'}
                size={20}
                color={activeNotification.notificationType === 'call' ? '#10B981' : '#3B82F6'}
              />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.notificationTitle} numberOfLines={1}>{activeNotification.title}</Text>
              <Text style={styles.notificationBody} numberOfLines={2}>{activeNotification.body}</Text>
            </View>
            {activeNotification.notificationType === 'call' ? (
              <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={handleDeclineCall} style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBannerPress} style={[styles.actionBtn, { backgroundColor: '#10B981', marginLeft: 8 }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.chevronWrapper}>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
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
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  notificationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  notificationTitle: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  notificationBody: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  chevronWrapper: {
    padding: 4,
  },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
