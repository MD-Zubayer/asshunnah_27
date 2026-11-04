import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    useColorScheme,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import articleService from '../services/article-service';
import followService from '../services/follow-service';
import { API_ENDPOINTS } from '../constants/api';
import ShareOptionsModal from '../components/ShareOptionsModal';
import ExpandableText from '../components/ExpandableText';
import { API_BASE_URL } from '../constants/api';

export default function UserProfileScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { userId, fuzalayeName } = useLocalSearchParams();
    const { token, user } = useAuth();

    const [profileUser, setProfileUser] = useState(null);
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareArticle, setShareArticle] = useState(null);
    const [notFound, setNotFound] = useState(false);

    // Follow state
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Comment state
    const [commentingArticleId, setCommentingArticleId] = useState(null);
    const [commentTexts, setCommentTexts] = useState({});
    const [submittingComment, setSubmittingComment] = useState(false);

    // Resolved user ID (from fuzalayeName lookup or direct userId)
    const [resolvedUserId, setResolvedUserId] = useState(userId || null);

    // Lookup user by fuzalaye name
    const lookupUserByName = async (name) => {
        try {
            const response = await fetch(API_ENDPOINTS.userByFuzalayeName(name), {
                method: 'GET',
                headers: token ? { 'Authorization': `Token ${token}` } : {},
            });
            const data = await response.json();
            if (response.ok && data.found && data.user) {
                setProfileUser(data.user);
                setResolvedUserId(data.user.id);
                return data.user.id;
            } else {
                setNotFound(true);
                return null;
            }
        } catch (err) {
            console.error('Failed to lookup user by name:', err);
            setNotFound(true);
            return null;
        }
    };

    // Load profile user info
    const loadProfileUser = async (overrideUserId) => {
        const uid = overrideUserId || resolvedUserId;
        if (!token || !uid) return;
        try {
            // Use the follow status endpoint to get user info
            const result = await followService.getFollowStatus(token, uid);
            if (result.success) {
                setProfileUser(result.user || { id: uid });
                setFollowerCount(result.follower_count || 0);
                setFollowingCount(result.following_count || 0);
                setIsFollowing(result.is_following || false);
            }
        } catch (err) {
            console.error('Failed to load profile user:', err);
        }
    };

    // Load follow status
    const loadFollowStatus = async (overrideUserId) => {
        const uid = overrideUserId || resolvedUserId;
        if (!token || !uid) return;
        try {
            const result = await followService.getFollowStatus(token, uid);
            if (result.success) {
                setFollowerCount(result.follower_count || 0);
                setFollowingCount(result.following_count || 0);
                setIsFollowing(result.is_following || false);
            }
        } catch (err) {
            console.error('Failed to load follow status:', err);
        }
    };

    // Handle follow/unfollow
    const handleFollowToggle = async () => {
        if (!token) {
            router.push('/login');
            return;
        }
        setFollowLoading(true);
        try {
            const result = await followService.toggleFollow(token, resolvedUserId, isFollowing);
            if (result.success) {
                setIsFollowing(!isFollowing);
                if (!isFollowing) {
                    setFollowerCount(prev => prev + 1);
                } else {
                    setFollowerCount(prev => Math.max(0, prev - 1));
                }
            }
        } catch (err) {
            console.error('Follow toggle error:', err);
            Alert.alert('ত্রুটি', 'Follow করতে সমস্যা হয়েছে');
        } finally {
            setFollowLoading(false);
        }
    };

    // Load articles
    const loadArticles = async (page, isRefresh = false, overrideUserId) => {
        const uid = overrideUserId || resolvedUserId;
        if (!token || !uid) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        try {
            if (isRefresh) setRefreshing(true);
            else if (page > 1) setLoadingMore(true);
            else setLoading(true);

            const response = await articleService.getUserArticles(token, uid, page);
            const results = response.results || response;
            const hasNext = response.has_next;

            if (isRefresh) {
                setArticles(Array.isArray(results) ? results : []);
                setCurrentPage(2);
            } else {
                setArticles(prev => [...prev, ...(Array.isArray(results) ? results : [])]);
                setCurrentPage(page + 1);
            }
            setHasMore(hasNext !== false && hasNext != null);
        } catch (err) {
            console.error('Failed to load user articles:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (fuzalayeName && !userId) {
                // Lookup user by fuzalaye name first
                setLoading(true);
                const lookedUpId = await lookupUserByName(fuzalayeName);
                if (lookedUpId && token) {
                    await loadProfileUser(lookedUpId);
                    await loadFollowStatus(lookedUpId);
                    await loadArticles(1, false, lookedUpId);
                } else {
                    setLoading(false);
                }
            } else if (token && userId) {
                setResolvedUserId(userId);
                await loadProfileUser(userId);
                await loadFollowStatus(userId);
                await loadArticles(1, false, userId);
            } else {
                setLoading(false);
            }
        };
        init();
    }, [token, userId, fuzalayeName]);

    const onRefresh = useCallback(() => {
        loadArticles(1, true);
        loadFollowStatus();
    }, [token, resolvedUserId]);

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        loadArticles(currentPage);
    }, [loadingMore, hasMore, currentPage, token, resolvedUserId]);

    const handleLike = async (articleId) => {
        if (!token) return;
        setArticles(prev =>
            prev.map(a => a.id === articleId ? { ...a, is_liked: !a.is_liked, like_count: a.like_count + (a.is_liked ? -1 : 1) } : a)
        );
        try {
            const result = await articleService.toggleLike(token, articleId);
            setArticles(prev =>
                prev.map(a => a.id === articleId ? { ...a, is_liked: result.liked, like_count: result.like_count } : a)
            );
        } catch (e) {
            console.error('Like error:', e);
            setArticles(prev =>
                prev.map(a => a.id === articleId ? { ...a, is_liked: !a.is_liked, like_count: a.like_count + (a.is_liked ? -1 : 1) } : a)
            );
        }
    };

    const toggleCommentInput = (articleId) => {
        if (commentingArticleId === articleId) {
            setCommentingArticleId(null);
        } else {
            setCommentingArticleId(articleId);
        }
    };

    const handleInlineComment = async (articleId) => {
        if (!token) return;
        const text = commentTexts[articleId]?.trim();
        if (!text) return;

        try {
            setSubmittingComment(true);
            const newComment = await articleService.createComment(token, articleId, text);
            setCommentTexts(prev => ({ ...prev, [articleId]: '' }));
            setCommentingArticleId(null);
            setArticles(prev =>
                prev.map(a =>
                    a.id === articleId
                        ? { ...a, comment_count: a.comment_count + 1 }
                        : a
                )
            );
        } catch (error) {
            console.error('Failed to post comment:', error);
            Alert.alert('Error', 'মন্তব্য পোস্ট করতে সমস্যা হয়েছে');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleSharePress = (article) => {
        setShareArticle(article);
        setShowShareModal(true);
    };

    const handleShareSelect = async (platform) => {
        if (!shareArticle || !token) return;
        try { await articleService.trackShare(token, shareArticle.id, platform); }
        catch (e) { console.error('Share error:', e); }
    };

    const formatTimeAgo = (dateString) => {
        const diff = Date.now() - new Date(dateString).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'এইমাত্র';
        if (mins < 60) return `${mins} মিনিট আগে`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} ঘন্টা আগে`;
        const days = Math.floor(hrs / 24);
        if (days < 7) return `${days} দিন আগে`;
        return new Date(dateString).toLocaleDateString('bn-BD');
    };

    const getUserName = () => {
        if (!profileUser) return 'ব্যবহারকারী';
        const name = `${profileUser.first_name || ''} ${profileUser.last_name || ''}`.trim();
        return name || (profileUser.email ? profileUser.email.split('@')[0] : 'ব্যবহারকারী');
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>প্রোফাইল</Text>
                </View>
                <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{getUserName()}</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                onScroll={({ nativeEvent }) => {
                    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 200) loadMore();
                }}
                scrollEventThrottle={400}
            >
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    {/* Cover Photo */}
                    <View style={[styles.cover, { backgroundColor: colors.primary }]}>
                        {profileUser?.cover_image ? (
                            <Image source={profileUser.cover_image} style={styles.coverImage} contentFit="cover" />
                        ) : null}
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarWrap}>
                        {profileUser?.profile_image ? (
                            <Image source={profileUser.profile_image} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarText}>{getUserName().charAt(0).toUpperCase()}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.name, { color: colors.text }]}>{getUserName()}</Text>

                    <View style={styles.statsRow}>
                        <TouchableOpacity
                            style={styles.stat}
                            onPress={() => router.push(`/followers?userId=${resolvedUserId}&type=followers`)}
                        >
                            <Text style={[styles.statNum, { color: colors.text }]}>{followerCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ফলোয়ার</Text>
                        </TouchableOpacity>
                        <View style={[styles.statDiv, { backgroundColor: colors.cardBorder }]} />
                        <View style={styles.stat}>
                            <Text style={[styles.statNum, { color: colors.text }]}>{articles.length}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>পোস্ট</Text>
                        </View>
                        <View style={[styles.statDiv, { backgroundColor: colors.cardBorder }]} />
                        <TouchableOpacity
                            style={styles.stat}
                            onPress={() => router.push(`/followers?userId=${resolvedUserId}&type=following`)}
                        >
                            <Text style={[styles.statNum, { color: colors.text }]}>{followingCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ফলোয়িং</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Follow Button */}
                    <View style={styles.actionBtns}>
                        <TouchableOpacity
                            style={[
                                styles.followBtn,
                                {
                                    backgroundColor: isFollowing ? colors.inputBg : colors.primary,
                                    borderColor: isFollowing ? colors.cardBorder : colors.primary
                                }
                            ]}
                            onPress={handleFollowToggle}
                            disabled={followLoading}
                        >
                            {followLoading ? (
                                <ActivityIndicator size="small" color={isFollowing ? colors.textMuted : '#fff'} />
                            ) : (
                                <>
                                    <Ionicons
                                        name={isFollowing ? 'checkmark-circle' : 'person-add'}
                                        size={16}
                                        color={isFollowing ? colors.text : '#fff'}
                                    />
                                    <Text style={[styles.followBtnText, { color: isFollowing ? colors.text : '#fff' }]}>
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.messageBtn, { backgroundColor: colors.backgroundElement }]}
                            onPress={async () => {
                                if (!token) {
                                    router.push('/login');
                                    return;
                                }
                                try {
                                    const response = await fetch(API_ENDPOINTS.CHAT_GET_OR_CREATE_ROOM, {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Token ${token}`,
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ user_id: resolvedUserId })
                                    });
                                    if (response.ok) {
                                        const room = await response.json();
                                        router.push({
                                            pathname: '/chat-conversation',
                                            params: { roomId: room.id, otherUserName: getUserName(), otherUserId: resolvedUserId }
                                        });
                                    } else {
                                        Alert.alert('ত্রুটি', 'চ্যাট শুরু করা সম্ভব হয়নি');
                                    }
                                } catch (e) {
                                    console.error('Error starting chat from profile:', e);
                                    Alert.alert('ত্রুটি', 'সার্ভারে কানেক্ট করা সম্ভব হয়নি');
                                }
                            }}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.text} />
                            <Text style={[styles.messageBtnText, { color: colors.text }]}>মেসেজ</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Posts Header */}
                <View style={[styles.postsHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Ionicons name="document-text" size={18} color={colors.primary} />
                    <Text style={[styles.postsHeaderText, { color: colors.text }]}>পোস্ট</Text>
                </View>

                {/* Posts */}
                {articles.map((article) => (
                    <TouchableOpacity
                        key={article.id}
                        activeOpacity={0.9}
                        onPress={() => router.push(`/article-detail?id=${article.id}`)}
                        style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    >
                        {/* Post Header */}
                        <View style={styles.postHeader}>
                            {profileUser?.profile_image ? (
                                <Image source={profileUser.profile_image} style={styles.postAvatar} contentFit="cover" />
                            ) : (
                                <View style={[styles.postAvatar, styles.postAvatarFallback, { backgroundColor: colors.primaryBg }]}>
                                    <Text style={[styles.postAvatarText, { color: colors.primary }]}>
                                        {getUserName().charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.postHeaderInfo}>
                                <Text style={[styles.postUserName, { color: colors.text }]}>{getUserName()}</Text>
                                <Text style={[styles.postTimeSmall, { color: colors.textMuted }]}>
                                    {formatTimeAgo(article.created_at)}
                                </Text>
                            </View>
                        </View>
                        <ExpandableText text={article.content} initialLines={4} expandStep={4} colors={colors} style={styles.postContent} />
                        {article.image_url && <Image source={article.image_url} style={styles.postImage} contentFit="cover" />}
                        <View style={[styles.postStats, { borderBottomColor: colors.cardBorder }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {article.like_count > 0 && <Ionicons name="heart" size={14} color="#EF4444" style={{ marginRight: 4 }} />}
                                <Text style={[styles.postStatsText, { color: colors.textMuted }]}>
                                    {article.like_count > 0 && `${article.like_count}`}
                                    {article.like_count > 0 && article.comment_count > 0 && ' · '}
                                    {article.comment_count > 0 && `${article.comment_count} মন্তব্য`}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.postActions}>
                            <TouchableOpacity style={styles.postActionBtn} onPress={() => handleLike(article.id)}>
                                <Ionicons name={article.is_liked ? 'heart' : 'heart-outline'} size={20} color={article.is_liked ? '#EF4444' : colors.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.postActionBtn} onPress={() => toggleCommentInput(article.id)}>
                                <Ionicons
                                    name={commentingArticleId === article.id ? 'chatbubble' : 'chatbubble-outline'}
                                    size={20}
                                    color={commentingArticleId === article.id ? colors.primary : colors.textMuted}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.postActionBtn} onPress={() => handleSharePress(article)}>
                                <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        {/* Inline Comment Input */}
                        {commentingArticleId === article.id && (
                            <View style={[styles.inlineCommentContainer, { backgroundColor: colors.inputBg, borderTopColor: colors.cardBorder }]}>
                                <View style={styles.inlineCommentRow}>
                                    <TextInput
                                        style={[styles.inlineCommentInput, { backgroundColor: colors.card, color: colors.text }]}
                                        placeholder="মন্তব্য লিখুন..."
                                        placeholderTextColor={colors.textMuted}
                                        value={commentTexts[article.id] || ''}
                                        onChangeText={(text) => setCommentTexts(prev => ({ ...prev, [article.id]: text }))}
                                        multiline
                                        maxLength={500}
                                        autoFocus
                                    />
                                    <TouchableOpacity
                                        style={[styles.inlineSendButton, { backgroundColor: (commentTexts[article.id]?.trim() && !submittingComment) ? colors.primary : colors.cardBorder }]}
                                        onPress={() => handleInlineComment(article.id)}
                                        disabled={!commentTexts[article.id]?.trim() || submittingComment}
                                    >
                                        {submittingComment ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Ionicons name="send" size={16} color={(commentTexts[article.id]?.trim()) ? '#fff' : colors.textMuted} />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}

                {articles.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>কোনো পোস্ট নেই</Text>
                    </View>
                )}

                {loadingMore && <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />}
                {!hasMore && articles.length > 0 && (
                    <Text style={[styles.endText, { color: colors.textMuted }]}>সব পোস্ট দেখানো হয়েছে</Text>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <ShareOptionsModal
                visible={showShareModal}
                onClose={() => setShowShareModal(false)}
                onShare={handleShareSelect}
                url={shareArticle ? `${API_BASE_URL}/article/${shareArticle.id}` : ''}
                message={shareArticle?.content?.substring(0, 100) || ''}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'transparent' },
    backButton: { padding: 4, marginRight: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
    // Profile Card
    profileCard: { borderRadius: 16, marginBottom: 16, alignItems: 'center', overflow: 'hidden', borderWidth: 1 },
    cover: { width: '100%', height: 120, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    avatarWrap: { marginTop: -40, marginBottom: 12 },
    avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
    avatarFallback: { justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
    name: { fontSize: 22, fontWeight: '800', marginBottom: 16 },
    statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingVertical: 16, width: '100%' },
    stat: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 12, marginTop: 2 },
    statDiv: { width: 1, height: 32 },
    actionBtns: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16, width: '100%' },
    followBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6, borderWidth: 1 },
    followBtnText: { fontSize: 14, fontWeight: '700' },
    messageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
    messageBtnText: { fontSize: 14, fontWeight: '600' },
    // Posts
    postsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1 },
    postsHeaderText: { fontSize: 16, fontWeight: '700' },
    postCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1 },
    postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
    postAvatar: { width: 40, height: 40, borderRadius: 20 },
    postAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
    postAvatarText: { fontSize: 16, fontWeight: '700' },
    postHeaderInfo: { marginLeft: 10, flex: 1 },
    postUserName: { fontSize: 14, fontWeight: '700' },
    postTimeSmall: { fontSize: 12, marginTop: 2 },
    postContent: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 10 },
    postImage: { width: '100%', height: 250, marginTop: 8 },
    postStats: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
    postStatsText: { fontSize: 13 },
    postActions: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4 },
    postActionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
    // Inline Comment
    inlineCommentContainer: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
    inlineCommentRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
    inlineCommentInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 80 },
    inlineSendButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    // Empty
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 18, fontWeight: '700', marginTop: 16 },
    endText: { fontSize: 13, textAlign: 'center', paddingVertical: 20 },
});