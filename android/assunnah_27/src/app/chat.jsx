import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, useColorScheme, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../constants/api';
import { getCache, setCache } from '../services/cacheService';
import { getImageUri } from '../utils/image';

export default function ChatDashboardScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchBlocked = async () => {
      try {
        const raw = await AsyncStorage.getItem('@blocked_users_list');
        if (active && raw) setBlockedUsers(JSON.parse(raw));
      } catch (_e) {}
    };
    fetchBlocked();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchUsers();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const loadInitialData = async () => {
    try {
      // 1. Try loading from cache first
      const cachedRooms = await getCache('chat_rooms_list');
      const cachedUsers = await getCache('chat_suggested_users');
      
      if (cachedRooms.exists && cachedRooms.data) {
        setChatRooms(cachedRooms.data);
      }
      if (cachedUsers.exists && cachedUsers.data) {
        setSuggestedUsers(cachedUsers.data);
      }
      if (cachedRooms.exists || cachedUsers.exists) {
        setLoading(false);
      } else {
        setLoading(true);
      }

      // 2. Fetch fresh data from backend
      const [roomsRes, usersRes] = await Promise.all([
        fetch(API_ENDPOINTS.CHAT_ROOMS, { headers: { 'Authorization': `Token ${token}` } }),
        fetch(API_ENDPOINTS.CHAT_USERS, { headers: { 'Authorization': `Token ${token}` } })
      ]);

      if (roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setChatRooms(roomsData);
        setCache('chat_rooms_list', roomsData, 60);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setSuggestedUsers(usersData);
        setCache('chat_suggested_users', usersData, 60);
      }
    } catch (e) {
      console.error('Error loading initial chat data:', e);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setSearching(true);
      const response = await fetch(`${API_ENDPOINTS.CHAT_USERS}?search=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error('Error searching users:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async (targetUser) => {
    try {
      const response = await fetch(API_ENDPOINTS.CHAT_GET_OR_CREATE_ROOM, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: targetUser.id })
      });
      if (response.ok) {
        const room = await response.json();
        setSearchQuery('');
        setSearchResults([]);
        // Reload list so it appears in recent chats
        loadInitialData();
        router.push({
          pathname: '/chat-conversation',
          params: { 
            roomId: room.id, 
            otherUserName: targetUser.name, 
            otherUserId: targetUser.id,
            otherUserProfileImage: getImageUri(targetUser.profile_image) || ''
          }
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        Alert.alert('ত্রুটি', errData.error || 'চ্যাটরুম তৈরি করা সম্ভব হয়নি');
      }
    } catch (e) {
      console.error('Error starting chat:', e);
      Alert.alert('ত্রুটি', 'সার্ভারের সাথে কানেক্ট করা সম্ভব হয়নি');
    }
  };

  const getOtherParticipant = (room) => {
    return room.participants.find(p => p.id !== user?.id) || { name: 'ব্যবহারকারী', profile_image: null };
  };

  // Render Horizontal Active Now avatar bubble
  const renderActiveUser = (item) => {
    const avatarUri = getImageUri(item.profile_image);
    return (
      <TouchableOpacity key={item.id} onPress={() => handleStartChat(item)} style={styles.activeUserBubble}>
        <View style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.activeAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.activeAvatar, styles.fallbackAvatar, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="person" size={24} color={colors.textSecondary} />
            </View>
          )}
          {item.is_online && <View style={styles.activeDot} />}
        </View>
        <Text style={[styles.activeUserName, { color: colors.text }]} numberOfLines={1}>
          {item.name.split(' ')[0]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>চ্যাটস</Text>
        <TouchableOpacity onPress={loadInitialData} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="reload" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Messenger-style Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="খুঁজুন..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Active Now Section (Only visible when not searching) */}
          {searchQuery.length === 0 && suggestedUsers.length > 0 && (
            <View style={styles.activeSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>সক্রিয় ইউজার</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeScrollContent}>
                {suggestedUsers.map(renderActiveUser)}
              </ScrollView>
            </View>
          )}

          {/* User Search Results */}
          {searchQuery.length > 0 ? (
            <View style={styles.listSection}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>খোঁজার ফলাফল</Text>
              {searching ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
              ) : searchResults.length > 0 ? (
                searchResults.map(item => {
                  const itemAvatar = getImageUri(item.profile_image);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleStartChat(item)}
                      style={styles.chatRow}
                    >
                      {itemAvatar ? (
                        <Image
                          source={{ uri: itemAvatar }}
                          style={styles.avatar}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.avatar, styles.fallbackAvatar, { backgroundColor: colors.inputBg }]}>
                          <Ionicons name="person" size={22} color={colors.textSecondary} />
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.profile_type === 'takmil_student' ? 'তাকমিল ছাত্র' : 'মুসল্লি'}</Text>
                      </View>
                      <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>কোনো ব্যবহারকারী পাওয়া যায়নি</Text>
              )}
            </View>
          ) : (
            <>
              {/* Recent Conversations */}
              <View style={styles.listSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>সাম্প্রতিক চ্যাট</Text>
                {chatRooms.length > 0 ? (
                  chatRooms.map(item => {
                    const otherUser = getOtherParticipant(item);
                    const lastMsg = item.last_message;
                    const otherAvatar = getImageUri(otherUser.profile_image);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => router.push({
                          pathname: '/chat-conversation',
                          params: { 
                            roomId: item.id, 
                            otherUserName: otherUser.name, 
                            otherUserId: otherUser.id,
                            otherUserProfileImage: otherAvatar || ''
                          }
                        })}
                        style={styles.chatRow}
                      >
                        <View style={styles.avatarWrapper}>
                          {otherAvatar ? (
                            <Image
                              source={{ uri: otherAvatar }}
                              style={styles.avatar}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={[styles.avatar, styles.fallbackAvatar, { backgroundColor: colors.inputBg }]}>
                              <Ionicons name="person" size={22} color={colors.textSecondary} />
                            </View>
                          )}
                          {otherUser.is_online && <View style={styles.activeDot} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={[styles.userName, { color: colors.text, fontWeight: item.unread_count > 0 ? '700' : '500' }]}>
                              {otherUser.name}
                            </Text>
                            {blockedUsers.some(id => String(id) === String(otherUser.id)) && (
                              <View style={{ backgroundColor: '#EF444422', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>ব্লকড</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.lastMessage, { color: item.unread_count > 0 ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                            {lastMsg ? lastMsg.content : 'কোনো বার্তা নেই'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {lastMsg && (
                            <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4 }}>
                              {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          )}
                          {item.unread_count > 0 && (
                            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.unreadText}>{item.unread_count}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>কোনো সাম্প্রতিক চ্যাট নেই।</Text>
                )}
              </View>

              {/* Suggested Users to Start Chats */}
              {suggestedUsers.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>পরামর্শকৃত ইউজার</Text>
                  {suggestedUsers.map(item => {
                    const itemAvatar = getImageUri(item.profile_image);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => handleStartChat(item)}
                        style={styles.chatRow}
                      >
                        {itemAvatar ? (
                          <Image
                            source={{ uri: itemAvatar }}
                            style={styles.avatar}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.avatar, styles.fallbackAvatar, { backgroundColor: colors.inputBg }]}>
                            <Ionicons name="person" size={22} color={colors.textSecondary} />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.profile_type === 'takmil_student' ? 'তাকমিল ছাত্র' : 'মুসল্লি'}</Text>
                        </View>
                        <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  activeSection: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  activeScrollContent: {
    paddingHorizontal: 12,
  },
  activeUserBubble: {
    alignItems: 'center',
    width: 72,
    marginHorizontal: 4,
  },
  avatarWrapper: {
    position: 'relative',
  },
  activeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#111827',
  },
  activeUserName: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  listSection: {
    marginTop: 16,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  fallbackAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 12,
    marginTop: 3,
  },
  unreadBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 20,
  },
});
