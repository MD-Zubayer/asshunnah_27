import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/theme';
import articleService from '../services/article-service';
import followService from '../services/follow-service';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, SHARE_BASE_URL } from '../constants/api';
import CommentItem from '../components/CommentItem';
import ShareOptionsModal from '../components/ShareOptionsModal';
import { getDirectionStyle } from '../utils/textDirection';
import { getImageUri } from '../utils/image';
import StyledPostContent from '../components/StyledPostContent';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😆', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
];

export default function ArticleDetailScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id || params.articleId;
  const { token, user, isGuest } = useAuth();

  const [article, setArticle] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Refs for scrolling to comment input
  const scrollViewRef = useRef(null);
  const commentInputRef = useRef(null);

  // UGC Moderation States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('ভুল বা বিভ্রান্তিকর ফতোয়া / তথ্য');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleReportArticle = async () => {
    setSubmittingReport(true);
    try {
      await fetch(`${API_BASE_URL}/api/reports/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Token ${token}` } : {}),
        },
        body: JSON.stringify({
          report_type: 'article',
          target_id: String(id),
          target_user: article?.user?.id || null,
          reason: reportReason,
          description: reportDetails.trim(),
        }),
      });

      setShowReportModal(false);
      setReportDetails('');
      Alert.alert(
        'রিপোর্ট গৃহীত হয়েছে',
        'আপনার অভিযোগটি সাফল্যের সাথে গ্রহণ করা হয়েছে। মডারেশন টিম দ্রুত এটি পর্যালোচনা করে ব্যবস্থা নেবে। জাযাকাল্লাহু খাইরান।'
      );
    } catch (_err) {
      setShowReportModal(false);
      Alert.alert('রিপোর্ট পাঠানো হয়েছে', 'ধন্যবাদ, আপনার অভিযোগটি আমাদের টিমের কাছে পাঠানো হয়েছে।');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Load follow status for article author
  const loadFollowStatus = async (authorId) => {
    if (!token || !user?.id || authorId === user.id) return;
    try {
      const result = await followService.getFollowStatus(token, authorId);
      if (result.success) {
        setIsFollowing(result.is_following || false);
      }
    } catch (err) {
      console.error('Failed to load follow status:', err);
    }
  };

  // Handle follow/unfollow author
  const handleFollowToggle = async () => {
    if (!token || !article?.user?.id) {
      router.push('/login');
      return;
    }

    setFollowLoading(true);
    try {
      const result = await followService.toggleFollow(token, article.user.id, isFollowing);
      if (result.success) {
        setIsFollowing(!isFollowing);
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      Alert.alert('ত্রুটি', 'Follow করতে সমস্যা হয়েছে');
    } finally {
      setFollowLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadArticle();
    }
  }, [id]);

  // Track dwell time (>10s) on unmount
  useEffect(() => {
    if (!token || !id) return;
    const startTime = Date.now();
    return () => {
      const duration = (Date.now() - startTime) / 1000;
      if (duration >= 10) {
        articleService.logDwellTime(token, parseInt(id)).catch(err => {
          console.warn('[Dwell] Failed to log dwell time:', err.message);
        });
      }
    };
  }, [id, token]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const data = await articleService.getArticleDetail(token, parseInt(id));
      setArticle(data);

      // Load follow status for article author
      if (token && data?.user?.id && data.user.id !== user?.id) {
        loadFollowStatus(data.user.id);
      }

      // Load comments
      try {
        const commentsData = await articleService.getComments(token, parseInt(id));
        setComments(commentsData || []);
      } catch (commentError) {
        console.warn('Failed to load comments:', commentError);
      }
    } catch (error) {
      console.error('Failed to load article:', error);
      Alert.alert('Error', 'প্রবন্ধ লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (reactionType = 'like') => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const result = await articleService.reactToArticle(token, parseInt(id), reactionType);
      setArticle(prev => ({
        ...prev,
        user_reaction: result.user_reaction,
        reaction_counts: result.reaction_counts,
        reaction_count: result.reaction_count,
      }));
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Failed to react to article:', error);
    }
  };

  const handleComment = async () => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const newComment = await articleService.createComment(
        token,
        parseInt(id),
        commentText.trim(),
        replyTo?.id
      );

      if (replyTo) {
        // Add as reply
        setComments(prev =>
          prev.map(c =>
            c.id === replyTo.id
              ? { ...c, replies: [...c.replies, newComment], reply_count: c.reply_count + 1 }
              : c
          )
        );
      } else {
        // Add as top-level comment
        setComments(prev => [newComment, ...prev]);
      }

      setCommentText('');
      setReplyTo(null);

      // Update comment count
      setArticle(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
    } catch (error) {
      console.error('Failed to post comment:', error);
      Alert.alert('Error', 'মন্তব্য পোস্ট করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async (platform) => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      await articleService.trackShare(token, parseInt(id), platform);
      Alert.alert('Success', 'শেয়ার করা হয়েছে!');
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'মুছে ফেলুন',
      'আপনি কি এই প্রবন্ধটি মুছে ফেলতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছুন',
          style: 'destructive',
          onPress: async () => {
            try {
              await articleService.deleteArticle(token, parseInt(id));
              router.back();
            } catch (error) {
              console.error('Failed to delete:', error);
              Alert.alert('Error', 'মুছে ফেলতে সমস্যা হয়েছে');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    if (days < 7) return `${days} দিন আগে`;
    return date.toLocaleDateString('bn-BD');
  };

  const getUserName = (userObj) => {
    if (!userObj) return 'ব্যবহারকারী';
    const { first_name, last_name, email } = userObj;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return email?.split('@')[0] || 'ব্যবহারকারী';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </View>
    );
  }

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>প্রবন্ধ পাওয়া যায়নি</Text>
      </View>
    );
  }

  const renderFacebookReactionBadges = (reactionCounts) => {
    if (!reactionCounts) return null;
    const badges = [];
    
    if (reactionCounts.like > 0) badges.push({ emoji: '👍', bg: '#1877F2' });
    if (reactionCounts.love > 0) badges.push({ emoji: '❤️', bg: '#F2385A' });
    
    let yellowEmoji = null;
    if (reactionCounts.haha > 0) yellowEmoji = '😆';
    else if (reactionCounts.wow > 0) yellowEmoji = '😮';
    else if (reactionCounts.sad > 0) yellowEmoji = '😢';
    else if (reactionCounts.angry > 0) yellowEmoji = '😡';
    
    if (yellowEmoji) {
      badges.push({ emoji: yellowEmoji, bg: '#F5C33B' });
    }

    const visibleBadges = badges.slice(0, 3);
    if (visibleBadges.length === 0) return null;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 6 }}>
        {visibleBadges.map((badge, idx) => (
          <View
            key={idx}
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: badge.bg,
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: idx > 0 ? -5 : 0,
              borderWidth: 1.5,
              borderColor: isDark ? '#1E293B' : '#FFFFFF',
              zIndex: 3 - idx,
            }}
          >
            <Text style={{ fontSize: 11, color: '#fff', textAlign: 'center', lineHeight: 14 }}>{badge.emoji}</Text>
          </View>
        ))}
      </View>
    );
  };

  const isOwner = user?.id === article.user.id;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>প্রবন্ধ</Text>
        {isOwner ? (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setShowReportModal(true)} style={styles.deleteButton} activeOpacity={0.7}>
            <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Article Header */}
        <View style={styles.articleHeader}>
          <TouchableOpacity
            onPress={() => router.push(`/user-profile?userId=${article.user.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            {article.user.profile_image ? (
              <Image source={{ uri: getImageUri(article.user.profile_image) }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.avatarFallback, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {getUserName(article.user).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={[styles.authorName, { color: colors.text }]}>{getUserName(article.user)}</Text>
              <Text style={[styles.postTime, { color: colors.textMuted }]}>
                {formatTimeAgo(article.created_at)}
              </Text>
            </View>
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity
              style={[styles.followButton, {
                backgroundColor: isFollowing ? colors.inputBg : colors.primary,
                borderColor: isFollowing ? colors.cardBorder : colors.primary
              }]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? colors.textMuted : '#fff'} />
              ) : (
                <Text style={[styles.followButtonText, {
                  color: isFollowing ? colors.text : '#fff'
                }]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Article Content - Facebook-style short theme / auto-large / Markdown */}
        <StyledPostContent article={article} colors={colors} isDark={isDark} mode="detail" />

        {/* Article Image */}
        {(article.image_url || article.image) && (
          <Image
            source={{ uri: article.image_url || article.image }}
            style={styles.articleImage}
            resizeMode="contain"
          />
        )}

        {/* Stats */}
        <View style={[styles.statsContainer, { borderBottomColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={styles.statsLeft}>
              {article.reaction_count > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {renderFacebookReactionBadges(article.reaction_counts)}
                  <Text style={[styles.statsText, { color: colors.textMuted }]}>
                    {article.reaction_count}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.statsRight}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {article.comment_count > 0 && (
                  <Text style={[styles.statsText, { color: colors.textMuted }]}>
                    {article.comment_count} মন্তব্য
                  </Text>
                )}
                {article.comment_count > 0 && (article.share_count > 0 || article.view_count > 0) && (
                  <Text style={[styles.statsText, { color: colors.textMuted, marginHorizontal: 4 }]}>•</Text>
                )}
                {article.share_count > 0 ? (
                  <Text style={[styles.statsText, { color: colors.textMuted }]}>
                    {article.share_count} শেয়ার
                  </Text>
                ) : article.view_count > 0 ? (
                  <Text style={[styles.statsText, { color: colors.textMuted }]}>
                    {article.view_count} ভিউ
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Floating Reaction Picker Drawer */}
        {showReactionPicker && (
          <View style={{
            position: 'absolute',
            bottom: 50,
            left: 16,
            flexDirection: 'row',
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderRadius: 30,
            paddingHorizontal: 8,
            paddingVertical: 6,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            zIndex: 9999,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}>
            {REACTIONS.map((rx) => (
              <TouchableOpacity
                key={rx.type}
                style={{ paddingHorizontal: 6, paddingVertical: 2 }}
                onPress={() => handleReact(rx.type)}
              >
                <Text style={{ fontSize: 22 }}>{rx.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (article.user_reaction) {
                handleReact(article.user_reaction); // toggle off
              } else {
                handleReact('like'); // toggle on
              }
            }}
            onLongPress={() => setShowReactionPicker(true)}
            delayLongPress={300}
            activeOpacity={0.7}
          >
            {article.user_reaction ? (
              <Text style={{ fontSize: 18, marginRight: 4 }}>
                {article.user_reaction === 'like' && '👍'}
                {article.user_reaction === 'love' && '❤️'}
                {article.user_reaction === 'haha' && '😆'}
                {article.user_reaction === 'wow' && '😮'}
                {article.user_reaction === 'sad' && '😢'}
                {article.user_reaction === 'angry' && '😡'}
              </Text>
            ) : (
              <Ionicons name="heart-outline" size={22} color={colors.textMuted} style={{ marginRight: 4 }} />
            )}
            <Text style={[
              styles.actionText, 
              { 
                color: article.user_reaction ? 
                  (article.user_reaction === 'love' ? '#EF4444' : 
                   article.user_reaction === 'like' ? '#2563EB' : '#F59E0B') : colors.textMuted,
                fontWeight: article.user_reaction ? 'bold' : 'normal'
              }
            ]}>
              {article.user_reaction ? 
                (article.user_reaction === 'like' ? 'লাইক' :
                 article.user_reaction === 'love' ? 'লাভ' :
                 article.user_reaction === 'haha' ? 'হা হা' :
                 article.user_reaction === 'wow' ? 'ওয়াও' :
                 article.user_reaction === 'sad' ? 'স্যাড' :
                 article.user_reaction === 'angry' ? 'এংগ্রি' : 'লাইক') : 'পছন্দ'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Scroll to bottom and focus comment input
              scrollViewRef.current?.scrollToEnd({ animated: true });
              setTimeout(() => {
                commentInputRef.current?.focus();
              }, 300);
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.actionText, { color: colors.textMuted }]}>Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => setShowShareModal(true)}>
            <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.actionText, { color: colors.textMuted }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Share Options Modal */}
        <ShareOptionsModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShare={(platform) => handleShare(platform)}
          url={`${SHARE_BASE_URL}/article/${id}`}
          message={article?.content?.substring(0, 100) || 'প্রবন্ধ পড়ুন'}
        />

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={[styles.commentsTitle, { color: colors.text }]}>
            মন্তব্য ({article.comment_count})
          </Text>

          {comments.length === 0 ? (
            <View style={styles.emptyComments}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyCommentsText, { color: colors.textMuted }]}>
                এখনো কোনো মন্তব্য নেই
              </Text>
            </View>
          ) : (
            comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                colors={colors}
                onReply={(c) => setReplyTo(c)}
                onDelete={() => { }}
                isOwner={user?.id === comment.user.id}
              />
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Comment Input */}
      <View style={[styles.commentInputContainer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder, paddingBottom: Math.max(insets.bottom, 12) }]}>
        {replyTo && (
          <View style={[styles.replyIndicator, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.replyText, { color: colors.textSecondary }]}>
              {getUserName(replyTo.user)} কে উত্তর দিচ্ছেন
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            ref={commentInputRef}
            style={[styles.commentInput, { backgroundColor: colors.inputBg, color: colors.text }]}
            placeholder="মন্তব্য লিখুন..."
            placeholderTextColor={colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: commentText.trim() ? colors.primary : colors.inputBg }]}
            onPress={handleComment}
            disabled={!commentText.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color={commentText.trim() ? '#fff' : colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Article Modal (UGC Safety) */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flag" size={22} color="#EF4444" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>প্রবন্ধ রিপোর্ট করুন</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.reportSub, { color: colors.textSecondary }]}>
              এই প্রবন্ধটিতে কোনো ভুল বা আপত্তিকর বিষয় থাকলে আমাদের জানান:
            </Text>

            {[
              'ভুল বা বিভ্রান্তিকর ফতোয়া / তথ্য',
              'আপত্তিকর বা অশালীন ভাষা',
              'ধর্মীয় অনুভূতিতে আঘাত / বিদ্বেষ',
              'স্প্যাম, বাণিজ্যিক বিজ্ঞাপন বা কপিরাইট',
              'অন্যান্য সমস্যা'
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  {
                    borderColor: reportReason === reason ? colors.primary : colors.cardBorder,
                    backgroundColor: reportReason === reason ? (isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5') : colors.inputBg
                  }
                ]}
                onPress={() => setReportReason(reason)}
              >
                <Ionicons
                  name={reportReason === reason ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={reportReason === reason ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.reasonOptionText, { color: colors.text }]}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={[styles.reportInput, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]}
              placeholder="অতিরিক্ত বিস্তারিত বিবরণ (ঐচ্ছিক)..."
              placeholderTextColor={colors.textMuted}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={300}
            />

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setShowReportModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>বাতিল</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleReportArticle}
                disabled={submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>রিপোর্ট পাঠান</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
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
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  deleteButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  postTime: {
    fontSize: 13,
    marginTop: 2,
  },
  articleContent: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 16,
  },
  articleImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  statsContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentsText: {
    fontSize: 14,
    marginTop: 12,
  },
  commentInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 13,
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  reportSub: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  reasonOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  reportInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
    marginTop: 6,
    marginBottom: 16,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});