import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    useColorScheme,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import followService from '../services/follow-service';

export default function FollowersScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { userId, type } = useLocalSearchParams();
    const { token, user } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [followStates, setFollowStates] = useState({});
    const [followLoading, setFollowLoading] = useState({});

    const isFollowersList = type === 'followers';
    const title = isFollowersList ? 'ফলোয়ার' : 'ফলোয়িং';

    // Load followers or following list
    const loadUsers = async () => {
        if (!token || !userId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            let result;
            if (isFollowersList) {
                result = await followService.getFollowers(token, userId);
            } else {
                result = await followService.getFollowing(token, userId);
            }
            if (result.success) {
                const rawList = result.data || [];
                // Transform the data to have consistent format
                const userList = rawList.map(item => {
                    if (isFollowersList) {
                        // Followers: item has follower, follower_name, follower_image, follower_email
                        return {
                            id: item.follower,
                            name: item.follower_name,
                            email: item.follower_email,
                            profile_image: item.follower_image,
                            is_following: item.is_following_back,
                        };
                    } else {
                        // Following: item has following, following_name, following_image, following_email
                        return {
                            id: item.following,
                            name: item.following_name,
                            email: item.following_email,
                            profile_image: item.following_image,
                            is_following: item.is_following,
                        };
                    }
                });
                setUsers(userList);
                // Initialize follow states
                const states = {};
                userList.forEach(u => {
                    states[u.id] = u.is_following || false;
                });
                setFollowStates(states);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
            Alert.alert('ত্রুটি', 'তালিকা লোড করতে সমস্যা হয়েছে');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (token && userId) {
            loadUsers();
        }
    }, [token, userId, type]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadUsers();
    }, [token, userId, type]);

    // Handle follow/unfollow
    const handleFollowToggle = async (targetUserId) => {
        if (!token) {
            router.push('/login');
            return;
        }

        setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));
        try {
            const isCurrentlyFollowing = followStates[targetUserId];
            const result = await followService.toggleFollow(token, targetUserId, isCurrentlyFollowing);
            if (result.success) {
                setFollowStates(prev => ({
                    ...prev,
                    [targetUserId]: !isCurrentlyFollowing
                }));
            }
        } catch (err) {
            console.error('Follow toggle error:', err);
            Alert.alert('ত্রুটি', 'Follow করতে সমস্যা হয়েছে');
        } finally {
            setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
        }
    };

    const getUserName = (userObj) => {
        if (!userObj) return 'ব্যবহারকারী';
        // Use the name field from transformed data, or fall back to parsing
        if (userObj.name) return userObj.name;
        const name = `${userObj.first_name || ''} ${userObj.last_name || ''}`.trim();
        return name || (userObj.email ? userObj.email.split('@')[0] : 'ব্যবহারকারী');
    };

    const renderUserItem = ({ item }) => {
        const isFollowing = followStates[item.id];
        const isLoading = followLoading[item.id];
        const isSelf = user?.id === item.id;
        const userName = getUserName(item);

        return (
            <TouchableOpacity
                style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => router.push(`/user-profile?userId=${item.id}`)}
                activeOpacity={0.7}
            >
                <View style={styles.userAvatarContainer}>
                    {item.profile_image ? (
                        <Image source={{ uri: item.profile_image }} style={styles.userAvatar} contentFit="cover" />
                    ) : (
                        <View style={[styles.userAvatar, styles.avatarFallback, { backgroundColor: colors.primaryBg }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>
                                {userName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
                    {item.email && (
                        <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.email}
                        </Text>
                    )}
                </View>
                {!isSelf && (
                    <TouchableOpacity
                        style={[
                            styles.followButton,
                            {
                                backgroundColor: isFollowing ? colors.inputBg : colors.primary,
                                borderColor: isFollowing ? colors.cardBorder : colors.primary,
                            }
                        ]}
                        onPress={() => handleFollowToggle(item.id)}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color={isFollowing ? colors.textMuted : '#fff'} />
                        ) : (
                            <Text style={[styles.followButtonText, { color: isFollowing ? colors.text : '#fff' }]}>
                                {isFollowing ? 'Following' : 'Follow'}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                    {isFollowersList ? 'কোনো ফলোয়ার নেই' : 'কাউকে ফলো করছেন না'}
                </Text>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                </View>
                <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
            </View>

            <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={[
                    styles.listContent,
                    users.length === 0 && styles.emptyList
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
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
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    listContent: {
        padding: 16,
    },
    emptyList: {
        flex: 1,
        justifyContent: 'center',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
    },
    userAvatarContainer: {
        marginRight: 12,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '700',
    },
    userEmail: {
        fontSize: 13,
        marginTop: 2,
    },
    followButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    followButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
});