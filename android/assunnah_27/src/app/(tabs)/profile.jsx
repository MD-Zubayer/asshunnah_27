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
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import articleService from '../../services/article-service';
import followService from '../../services/follow-service';
import ShareOptionsModal from '../../components/ShareOptionsModal';
import ExpandableText from '../../components/ExpandableText';
import { getImageUri } from '../../utils/image';

const DEFAULT_COVER = require('../../../assets/expo.icon/Assets/images/madrasa1.jpg');
const DEFAULT_AVATAR = require('../../../assets/expo.icon/Assets/images/icon.png');

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user, isGuest, uploadProfilePhoto, uploadCoverPhoto, fetchProfile } = useAuth();

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareArticle, setShareArticle] = useState(null);

  // Follow state
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('posts');

  // Load follow status
  const loadFollowStatus = async () => {
    if (!token || !user?.id) return;
    try {
      const result = await followService.getFollowStatus(token, user.id);
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
    if (!token || !user?.id) return;
    setFollowLoading(true);
    try {
      const result = await followService.toggleFollow(token, user.id, isFollowing);
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

  // Inline comment state
  const [commentingArticleId, setCommentingArticleId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [submittingComment, setSubmittingComment] = useState(false);

  const loadArticles = async (page, isRefresh = false, forceRefresh = false) => {
    if (!token || !user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      if (isRefresh) setRefreshing(true);
      else if (page > 1) setLoadingMore(true);
      else setLoading(true);

      const response = await articleService.getUserArticles(token, user.id, page, forceRefresh);
      const results = response.results || response;
      const hasNext = response.has_next;
      const fromCache = response.fromCache;

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
    if (token && user?.id) {
      loadArticles(1);
      loadFollowStatus();
      // Background sync profile info
      fetchProfile().catch(err => console.log('[Profile] Background profile sync failed:', err));
    }
    else setLoading(false);
  }, [token, user?.id]);

  const onRefresh = useCallback(() => loadArticles(1, true, true), [token, user?.id]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadArticles(currentPage);
  }, [loadingMore, hasMore, currentPage, token, user?.id]);

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
    if (!user) return 'ব্যবহারকারী';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    return name || (user.email ? user.email.split('@')[0] : 'ব্যবহারকারী');
  };

  const pickAndUploadPhoto = async (uploadFn, label) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('অনুমতি প্রয়োজন', 'গ্যালারি থেকে ছবি নির্বাচন করতে অনুমতি দিন।');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: label === 'cover' ? [16, 9] : [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const res = await uploadFn(result.assets[0].uri);
        if (!res.success) {
          Alert.alert('ত্রুটি', res.message || 'আপলোড ব্যর্থ হয়েছে');
        }
      }
    } catch (err) {
      console.error(`${label} upload error:`, err);
      Alert.alert('ত্রুটি', 'ছবি আপলোড করতে সমস্যা হয়েছে');
    }
  };

  const handleProfilePhotoUpload = () => pickAndUploadPhoto(uploadProfilePhoto, 'profile');
  const handleCoverPhotoUpload = () => pickAndUploadPhoto(uploadCoverPhoto, 'cover');

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>প্রোফাইল</Text>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Facebook-style Profile Card for Guest */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Cover Photo - Madrasah full image */}
            <View style={[styles.cover, { backgroundColor: colors.primary }]}>
              <Image source={DEFAULT_COVER} style={styles.coverImage} contentFit="cover" />
            </View>

            {/* Avatar - App icon */}
            <View style={styles.avatarRow}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.card }]}>
                <Image source={DEFAULT_AVATAR} style={styles.avatar} contentFit="cover" />
              </View>
            </View>

            {/* Name Section */}
            <View style={styles.infoSection}>
              <View style={styles.guestNameRow}>
                <Text style={[styles.name, { color: colors.text }]}>অতিথি ব্যবহারকারী</Text>
                <View style={styles.guestStatusBadge}>
                  <Ionicons name="eye-outline" size={12} color="#F59E0B" />
                  <Text style={styles.guestStatusBadgeText}>গেস্ট মোড</Text>
                </View>
              </View>
              <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
                জামিয়াতুস সুন্নাহ শিবচর, মাদারীপুর
              </Text>
            </View>

            {/* Guest Welcome & Action Card */}
            <View style={[styles.guestNoticeCard, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.08)' : 'rgba(5, 150, 105, 0.06)', borderColor: colors.cardBorder }]}>
              <View style={styles.guestNoticeHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={[styles.guestNoticeTitle, { color: colors.primary }]}>স্বাগতম আস-সুন্নাহ অ্যাপে</Text>
              </View>
              <Text style={[styles.guestNoticeBody, { color: colors.textSecondary }]}>
                আপনি বর্তমানে অতিথি হিসেবে অ্যাপটি দেখছেন। ডায়েরি লেখা, পোস্ট প্রকাশ, লাইক ও মন্তব্য করাসহ সকল সুযোগ-সুবিধা উপভোগ করতে অনুগ্রহ করে লগ ইন করুন অথবা একটি একাউন্ট খুলুন।
              </Text>

              <View style={styles.guestActionButtonsRow}>
                <TouchableOpacity
                  style={[styles.guestPrimaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/login')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.guestPrimaryBtnText}>লগ ইন করুন</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.guestSecondaryBtn, { borderColor: colors.primary }]}
                  onPress={() => router.push('/signup')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                  <Text style={[styles.guestSecondaryBtnText, { color: colors.primary }]}>নতুন একাউন্ট</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Explore Links */}
            <View style={styles.guestQuickLinksSection}>
              <Text style={[styles.guestQuickTitle, { color: colors.text }]}>মাদরাসার বিভিন্ন বিভাগ</Text>

              <TouchableOpacity
                style={[styles.guestLinkCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/muhaddisin')}
                activeOpacity={0.7}
              >
                <View style={[styles.guestLinkIcon, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
                  <Ionicons name="people-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.guestLinkTexts}>
                  <Text style={[styles.guestLinkName, { color: colors.text }]}>মুহাদ্দিস ও আসাতায়ে কেরাম</Text>
                  <Text style={[styles.guestLinkDesc, { color: colors.textSecondary }]}>হাদিসের কিতাবভিত্তিক ওস্তাদগণের শাজারাহ ও পরিচিতি</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.guestLinkCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/photo-gallery')}
                activeOpacity={0.7}
              >
                <View style={[styles.guestLinkIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                  <Ionicons name="images-outline" size={20} color="#10B981" />
                </View>
                <View style={styles.guestLinkTexts}>
                  <Text style={[styles.guestLinkName, { color: colors.text }]}>মাদরাসা ফটো গ্যালারি</Text>
                  <Text style={[styles.guestLinkDesc, { color: colors.textSecondary }]}>ক্যাম্পাস, দারুল হাদিস ও অন্যান্য চিত্রাবলি</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.guestLinkCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                onPress={() => router.push('/(tabs)/prayer')}
                activeOpacity={0.7}
              >
                <View style={[styles.guestLinkIcon, { backgroundColor: 'rgba(217, 119, 6, 0.12)' }]}>
                  <Ionicons name="time-outline" size={20} color="#D97706" />
                </View>
                <View style={styles.guestLinkTexts}>
                  <Text style={[styles.guestLinkName, { color: colors.text }]}>নামাজের সঠিক সময়সূচি</Text>
                  <Text style={[styles.guestLinkDesc, { color: colors.textSecondary }]}>ওয়াক্ত ও মাকরূহ সময়ের বিস্তারিত ক্যালেন্ডার</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>প্রোফাইল</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>প্রোফাইল</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
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
        {/* Facebook-style Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Cover Photo - Larger */}
          <TouchableOpacity
            style={[styles.cover, { backgroundColor: colors.primary }]}
            onPress={handleCoverPhotoUpload}
            activeOpacity={0.8}
          >
            {user?.cover_image ? (
              <Image source={{ uri: getImageUri(user.cover_image) }} style={styles.coverImage} contentFit="cover" />
            ) : (
              <Image source={DEFAULT_COVER} style={styles.coverImage} contentFit="cover" />
            )}
            <View style={styles.cameraBadgeCover}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Avatar - Overlapping cover, positioned left */}
          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={handleProfilePhotoUpload}
              activeOpacity={0.8}
              style={styles.avatarContainer}
            >
              {user?.profile_image ? (
                <Image source={{ uri: getImageUri(user.profile_image) }} style={styles.avatar} contentFit="cover" />
              ) : (
                <Image source={DEFAULT_AVATAR} style={styles.avatar} contentFit="cover" />
              )}
              <View style={styles.cameraBadgeAvatar}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Name Section - Left aligned */}
          <View style={styles.infoSection}>
            <Text style={[styles.name, { color: colors.text }]}>{getUserName()}</Text>
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
            </View>
          </View>

          {/* Bio Section - Dedicated prominent card */}
          {user?.bio ? (
            <View style={[styles.bioCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
              <View style={styles.bioHeader}>
                <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.bioLabel, { color: colors.primary }]}>বায়ো</Text>
              </View>
              <Text style={[styles.bioText, { color: colors.text }]}>{user.bio}</Text>
            </View>
          ) : null}

          {/* Stats Row - Left aligned */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/followers?userId=${user.id}&type=followers`)}
            >
              <Text style={[styles.statNum, { color: colors.text }]}>{followerCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ফলোয়ার</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/followers?userId=${user.id}&type=following`)}
            >
              <Text style={[styles.statNum, { color: colors.text }]}>{followingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ফলোয়িং</Text>
            </TouchableOpacity>

            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: colors.text }]}>{articles.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>পোস্ট</Text>
            </View>
          </View>

          {/* Action Buttons - Facebook style */}
          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.editBtnText}>সম্পাদনা</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
              <Ionicons name="share-outline" size={16} color={colors.text} />
              <Text style={[styles.shareBtnText, { color: colors.text }]}>শেয়ার</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar - Facebook style */}
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab, { borderBottomColor: activeTab === 'posts' ? colors.primary : 'transparent' }]}
            onPress={() => setActiveTab('posts')}
          >
            <Ionicons
              name={activeTab === 'posts' ? 'grid' : 'grid-outline'}
              size={20}
              color={activeTab === 'posts' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: activeTab === 'posts' ? colors.primary : colors.textMuted }]}>পোস্ট</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'about' && styles.activeTab, { borderBottomColor: activeTab === 'about' ? colors.primary : 'transparent' }]}
            onPress={() => setActiveTab('about')}
          >
            <Ionicons
              name={activeTab === 'about' ? 'information-circle' : 'information-circle-outline'}
              size={20}
              color={activeTab === 'about' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: activeTab === 'about' ? colors.primary : colors.textMuted }]}>পরিচিতি</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'photos' && styles.activeTab, { borderBottomColor: activeTab === 'photos' ? colors.primary : 'transparent' }]}
            onPress={() => setActiveTab('photos')}
          >
            <Ionicons
              name={activeTab === 'photos' ? 'images' : 'images-outline'}
              size={20}
              color={activeTab === 'photos' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: activeTab === 'photos' ? colors.primary : colors.textMuted }]}>ছবি</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'posts' && (
          <>
            {articles.map((article) => (
              <TouchableOpacity
                key={article.id}
                activeOpacity={0.9}
                onPress={() => router.push(`/article-detail?id=${article.id}`)}
                style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                {/* Post Header - User Info */}
                <View style={styles.postHeader}>
                  {user?.profile_image ? (
                    <Image source={{ uri: getImageUri(user.profile_image) }} style={styles.postAvatar} contentFit="cover" />
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
                {article.image_url && typeof article.image_url === 'string' && <Image source={{ uri: article.image_url }} style={styles.postImage} contentFit="cover" />}
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
                <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/create-article')}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 6 }}>পোস্ট তৈরি করুন</Text>
                </TouchableOpacity>
              </View>
            )}

            {loadingMore && <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />}
            {!hasMore && articles.length > 0 && (
              <Text style={[styles.endText, { color: colors.textMuted }]}>সব পোস্ট দেখানো হয়েছে</Text>
            )}
          </>
        )}

        {activeTab === 'about' && (
          <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Bio Section */}
            {user?.bio && (
              <>
                <View style={styles.aboutRow}>
                  <Ionicons name="document-text-outline" size={20} color={colors.textMuted} />
                  <View style={styles.aboutInfo}>
                    <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>বায়ো</Text>
                    <Text style={[styles.aboutValue, { color: colors.text }]}>{user.bio}</Text>
                  </View>
                </View>
                <View style={[styles.aboutDivider, { backgroundColor: colors.cardBorder }]} />
              </>
            )}

            <View style={styles.aboutRow}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
              <View style={styles.aboutInfo}>
                <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>ইমেইল</Text>
                <Text style={[styles.aboutValue, { color: colors.text }]}>{user?.email || '-'}</Text>
              </View>
            </View>

            <View style={[styles.aboutDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.aboutRow}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <View style={styles.aboutInfo}>
                <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>ধরন</Text>
                <Text style={[styles.aboutValue, { color: colors.text }]}>
                  {user?.profile_type === 'takmil_student' ? 'তাকমিল ছাত্র' :
                    user?.profile_type === 'non_takmil_student' ? 'নন-তাকমিল ছাত্র' : 'ছাত্র'}
                </Text>
              </View>
            </View>

            {user?.district && (
              <>
                <View style={[styles.aboutDivider, { backgroundColor: colors.cardBorder }]} />
                <View style={styles.aboutRow}>
                  <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                  <View style={styles.aboutInfo}>
                    <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>জেলা</Text>
                    <Text style={[styles.aboutValue, { color: colors.text }]}>{user.district}</Text>
                  </View>
                </View>
              </>
            )}

            {user?.upazila && (
              <>
                <View style={[styles.aboutDivider, { backgroundColor: colors.cardBorder }]} />
                <View style={styles.aboutRow}>
                  <Ionicons name="navigate-outline" size={20} color={colors.textMuted} />
                  <View style={styles.aboutInfo}>
                    <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>উপজেলা</Text>
                    <Text style={[styles.aboutValue, { color: colors.text }]}>{user.upazila}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {activeTab === 'photos' && (
          <View style={styles.photosContainer}>
            {articles.filter(a => a.image_url).length > 0 ? (
              <View style={styles.photosGrid}>
                {articles.filter(a => a.image_url).map((article) => (
                  <TouchableOpacity
                    key={article.id}
                    style={styles.photoItem}
                    onPress={() => router.push(`/article-detail?id=${article.id}`)}
                  >
                    <Image source={{ uri: article.image_url }} style={styles.photoImage} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>কোনো ছবি নেই</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/create-article')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  settingsBtn: { padding: 8 },
  scrollContent: { paddingHorizontal: 0, paddingTop: 0 },
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  guestCard: { borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, width: '100%', maxWidth: 340 },
  guestTitle: { fontSize: 20, fontWeight: '800', marginVertical: 12, color: '#0F172A' },
  guestBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },

  // Guest Profile Card Extensions
  guestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  guestStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  guestStatusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  guestSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  guestNoticeCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  guestNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  guestNoticeTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  guestNoticeBody: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  guestActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  guestPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  guestPrimaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  guestSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  guestSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  guestQuickLinksSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  guestQuickTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  guestLinkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  guestLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestLinkTexts: {
    flex: 1,
  },
  guestLinkName: {
    fontSize: 14,
    fontWeight: '700',
  },
  guestLinkDesc: {
    fontSize: 11,
    marginTop: 2,
  },

  // Facebook-style Profile Card
  profileCard: {
    marginBottom: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  // Cover Photo - Larger (Facebook style)
  cover: {
    width: '100%',
    height: 200,
    position: 'relative',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  coverImage: {
    width: '100%',
    height: '100%'
  },
  cameraBadgeCover: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8
  },

  // Avatar Row - Overlapping cover
  avatarRow: {
    paddingHorizontal: 16,
    marginTop: -50,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff'
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff'
  },
  cameraBadgeAvatar: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#1877F2',
    borderRadius: 14,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff'
  },

  // Info Section - Left aligned
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4
  },
  bio: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  email: {
    fontSize: 14,
  },

  // Bio Card - Dedicated prominent section
  bioCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },

  // Stats Row - Left aligned, Facebook style
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800'
  },
  statLabel: {
    fontSize: 13,
    marginTop: 2
  },

  // Action Buttons - Facebook style
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  editBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  addFriendBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  addFriendBtnText: {
    fontSize: 15,
    fontWeight: '600'
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '600'
  },

  // Tab Bar - Facebook style
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // About Card
  aboutCard: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  aboutInfo: {
    flex: 1,
  },
  aboutLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  aboutDivider: {
    height: 1,
  },

  // Posts
  postCard: {
    marginHorizontal: 0,
    marginTop: 8,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 0,
    borderBottomWidth: 1,
  },

  // Post Header
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  postAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: '700'
  },
  postHeaderInfo: {
    marginLeft: 10,
    flex: 1
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '700'
  },
  postTimeSmall: {
    fontSize: 12,
    marginTop: 2
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 10
  },
  postImage: {
    width: '100%',
    height: 250,
    marginTop: 8
  },
  postStats: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1
  },
  postStatsText: {
    fontSize: 13
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  postActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10
  },

  // Inline Comment
  inlineCommentContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1
  },
  inlineCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8
  },
  inlineCommentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80
  },
  inlineSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20
  },
  endText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20
  },

  // Photos Tab
  photosContainer: {
    padding: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  photoItem: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4
  },
});
