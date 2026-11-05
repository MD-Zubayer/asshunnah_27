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
  TextInput,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import TopNavbar from '../../components/TopNavbar';
import articleService from '../../services/article-service';
import { useArticlesWebSocket } from '../../hooks/useArticlesWebSocket';
import { useAuth } from '../../context/AuthContext';
import { getDirectionStyle } from '../../utils/textDirection';
import ExpandableText from '../../components/ExpandableText';
import ShareOptionsModal from '../../components/ShareOptionsModal';
import { SHARE_BASE_URL } from '../../constants/api';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😆', label: 'Haha' },
  { type: 'wow', emoji: '😮', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Sad' },
  { type: 'angry', emoji: '😡', label: 'Angry' },
];

export default function ArticleScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, isGuest } = useAuth();

  // Article state
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  // Inline comment state
  const [commentingArticleId, setCommentingArticleId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [submittingComment, setSubmittingComment] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareArticle, setShareArticle] = useState(null);

  // AI Summary States
  const [summaryLoading, setSummaryLoading] = useState({});
  const [articleSummaries, setArticleSummaries] = useState({});
  const [showSummaries, setShowSummaries] = useState({});
  const [activeReactionPickerArticleId, setActiveReactionPickerArticleId] = useState(null);

  const handleToggleSummary = async (articleId) => {
    if (articleSummaries[articleId]) {
      setShowSummaries(prev => ({ ...prev, [articleId]: !prev[articleId] }));
      return;
    }
    setSummaryLoading(prev => ({ ...prev, [articleId]: true }));
    setShowSummaries(prev => ({ ...prev, [articleId]: true }));
    try {
      const res = await articleService.getArticleSummary(token, articleId);
      setArticleSummaries(prev => ({ ...prev, [articleId]: res.summary }));
    } catch (e) {
      console.error('Error fetching summary:', e);
      setArticleSummaries(prev => ({ ...prev, [articleId]: 'সারসংক্ষেপ তৈরি করতে সমস্যা হয়েছে।' }));
    } finally {
      setSummaryLoading(prev => ({ ...prev, [articleId]: false }));
    }
  };

  // WebSocket for real-time updates
  const { isConnected, subscribe } = useArticlesWebSocket();

  // Load articles
  const loadArticles = async (page, isRefresh = false, forceRefresh = false) => {
    // Allow guest users (no token) to load articles
    try {
      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      } else if (page && page > 1) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      const response = await articleService.getArticles(token, page || 1, forceRefresh);

      const results = response.results || response;
      const nextUrl = response.next;

      if (isRefresh) {
        setArticles(Array.isArray(results) ? results : []);
        setCurrentPage(2);
      } else {
        setArticles(prev => [...prev, ...(Array.isArray(results) ? results : [])]);
        setCurrentPage((page || 1) + 1);
      }

      setHasMore(nextUrl !== null && nextUrl !== undefined);
    } catch (err) {
      console.log('[ArticleScreen] Silent handle error:', err?.message || err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Initial load - load articles for both logged-in and guest users
  useEffect(() => {
    // 1. Fast load from local cache
    loadArticles(1, false, false).then(() => {
      // 2. Silent background update from server (Facebook-style Stale-While-Revalidate)
      loadArticles(1, true, true);
    });
  }, []);

  // WebSocket subscriptions
  useEffect(() => {
    const unsubNewArticle = subscribe('new_article', (data) => {
      setArticles(prev => [data.article, ...prev]);
    });

    const unsubLike = subscribe('article_liked', (data) => {
      setArticles(prev =>
        prev.map(article =>
          article.id === data.article_id
            ? { ...article, like_count: data.like_count }
            : article
        )
      );
    });

    const unsubComment = subscribe('new_comment', (data) => {
      setArticles(prev =>
        prev.map(article =>
          article.id === data.article_id
            ? { ...article, comment_count: data.comment_count }
            : article
        )
      );
    });

    return () => {
      unsubNewArticle();
      unsubLike();
      unsubComment();
    };
  }, [subscribe]);

  // Pull to refresh - force refresh to bypass cache and get fresh data
  const onRefresh = useCallback(() => {
    loadArticles(1, true, true); // forceRefresh = true to bypass cache
  }, [token]);

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadArticles(currentPage);
  }, [loadingMore, hasMore, currentPage, token]);

  // Handle react
  const handleReact = async (articleId, reactionType = 'like') => {
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const result = await articleService.reactToArticle(token, articleId, reactionType);
      setArticles(prev =>
        prev.map(article =>
          article.id === articleId
            ? { 
                ...article, 
                user_reaction: result.user_reaction, 
                reaction_counts: result.reaction_counts,
                reaction_count: result.reaction_count
              }
            : article
        )
      );
      setActiveReactionPickerArticleId(null);
    } catch (error) {
      console.error('Failed to react to article:', error);
    }
  };

  // Handle inline comment
  const handleInlineComment = async (articleId) => {
    if (!token) {
      router.push('/login');
      return;
    }

    const text = commentTexts[articleId]?.trim();
    if (!text) return;

    try {
      setSubmittingComment(true);
      const newComment = await articleService.createComment(token, articleId, text);

      // Clear comment text
      setCommentTexts(prev => ({ ...prev, [articleId]: '' }));

      // Update comment count
      setArticles(prev =>
        prev.map(article =>
          article.id === articleId
            ? { ...article, comment_count: article.comment_count + 1 }
            : article
        )
      );
    } catch (error) {
      console.error('Failed to post comment:', error);
      Alert.alert('Error', 'মন্তব্য পোস্ট করতে সমস্যা হয়েছে');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Toggle comment input
  const toggleCommentInput = (articleId) => {
    if (commentingArticleId === articleId) {
      setCommentingArticleId(null);
    } else {
      setCommentingArticleId(articleId);
    }
  };

  // Handle share
  const handleSharePress = (article) => {
    setShareArticle(article);
    setShowShareModal(true);
  };

  const handleShareSelect = async (platform) => {
    if (!shareArticle) return;
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      await articleService.trackShare(token, shareArticle.id, platform);
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  // Format time ago
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

  // Get user display name
  const getUserName = (article) => {
    const { first_name, last_name, email } = article.user;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return email.split('@')[0];
  };

  // Get user avatar initial
  const getUserInitial = (article) => {
    const name = getUserName(article);
    return name.charAt(0).toUpperCase() || 'ব';
  };

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

  // Render article card
  const renderArticleCard = (article) => (
    <TouchableOpacity
      key={article.id}
      activeOpacity={0.9}
      onPress={() => router.push(`/article-detail?id=${article.id}`)}
      style={[styles.articleCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      {/* Article Header */}
      <View style={[styles.articleHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View style={styles.articleUser}>
          {article.user.profile_image ? (
            <Image source={{ uri: article.user.profile_image }} style={styles.userAvatar} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarFallback, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.userAvatarText, { color: colors.primary }]}>
                {getUserInitial(article)}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{getUserName(article)}</Text>
            <Text style={[styles.postTime, { color: colors.textMuted }]}>
              {formatTimeAgo(article.created_at)}
            </Text>
          </View>
        </View>

        {/* AI summary button */}
        <TouchableOpacity 
          onPress={() => handleToggleSummary(article.id)}
          style={{ padding: 6, borderRadius: 20, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.08)' }}
        >
          <Ionicons 
            name={showSummaries[article.id] ? "sparkles" : "sparkles-outline"} 
            size={16} 
            color="#6366F1" 
          />
        </TouchableOpacity>
      </View>

      {/* Article Content - Expandable (Facebook-style) */}
      <ExpandableText
        text={article.content}
        initialLines={4}
        expandStep={4}
        colors={colors}
        style={styles.articleContent}
      />

      {/* AI Summary Card */}
      {showSummaries[article.id] && (
        <View style={{
          marginTop: 4,
          marginBottom: 8,
          marginHorizontal: 16,
          padding: 10,
          borderRadius: 8,
          backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.05)',
          borderLeftWidth: 3,
          borderLeftColor: '#6366F1',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="sparkles" size={12} color="#6366F1" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6366F1', letterSpacing: 0.5 }}>DEEPSEEK AI SUMMARY</Text>
          </View>
          {summaryLoading[article.id] ? (
            <ActivityIndicator size="small" color="#6366F1" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          ) : (
            <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              {articleSummaries[article.id]}
            </Text>
          )}
        </View>
      )}

      {/* Article Image */}
      {(article.image_url || article.image) && (
        <View style={styles.articleImageWrapper}>
          <Image
            source={{ uri: article.image_url || article.image }}
            style={styles.articleImage}
            contentFit="cover"
          />
        </View>
      )}

      {/* Stats Row */}
      <View style={[styles.statsRow, { borderBottomColor: colors.cardBorder }]}>
        <View style={styles.statsLeft}>
          {article.reaction_count > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {renderFacebookReactionBadges(article.reaction_counts)}
              <Text style={[styles.statsText, { color: colors.textMuted }]}>
                {articleService.formatCount(article.reaction_count)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.statsRight}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {article.comment_count > 0 && (
              <Text style={[styles.statsText, { color: colors.textMuted }]}>
                {articleService.formatCount(article.comment_count)} মন্তব্য
              </Text>
            )}
            {article.comment_count > 0 && (article.share_count > 0 || article.view_count > 0) && (
              <Text style={[styles.statsText, { color: colors.textMuted, marginHorizontal: 4 }]}>•</Text>
            )}
            {article.share_count > 0 ? (
              <Text style={[styles.statsText, { color: colors.textMuted }]}>
                {articleService.formatCount(article.share_count)} শেয়ার
              </Text>
            ) : article.view_count > 0 ? (
              <Text style={[styles.statsText, { color: colors.textMuted }]}>
                {articleService.formatCount(article.view_count)} ভিউ
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Floating Reaction Picker Drawer */}
      {activeReactionPickerArticleId === article.id && (
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
              onPress={() => handleReact(article.id, rx.type)}
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
              handleReact(article.id, article.user_reaction); // toggle off
            } else {
              handleReact(article.id, 'like'); // toggle on
            }
          }}
          onLongPress={() => {
            setActiveReactionPickerArticleId(article.id);
          }}
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
          onPress={() => toggleCommentInput(article.id)}
        >
          <Ionicons
            name={commentingArticleId === article.id ? 'chatbubble' : 'chatbubble-outline'}
            size={20}
            color={commentingArticleId === article.id ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.actionText, { color: commentingArticleId === article.id ? colors.primary : colors.textMuted }]}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleSharePress(article)}>
          <Ionicons name="share-social-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.actionText, { color: colors.textMuted }]}>Share</Text>
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
  );

  // Loading state
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TopNavbar />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavbar />

      <FlatList
        data={articles}
        renderItem={({ item }) => renderArticleCard(item)}
        keyExtractor={(item) => item.id.toString()}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <>
            {/* WebSocket Connection Status */}
            {isConnected && (
              <View style={[styles.wsIndicator, { backgroundColor: colors.primaryBg }]}>
                <View style={[styles.wsDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.wsText, { color: colors.primary }]}>Live</Text>
              </View>
            )}

            {/* Error State */}
            {error && articles.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
                <Text style={[styles.emptyText, { color: colors.text }]}>সমস্যা হয়েছে</Text>
                <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                  {error}
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => loadArticles(1)}
                >
                  <Text style={styles.retryBtnText}>আবার চেষ্টা করুন</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty State */}
            {articles.length === 0 && !loading && !error && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.text }]}>কোনো প্রবন্ধ নেই</Text>
                <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                  এখনো কোনো প্রবন্ধ প্রকাশিত হয়নি
                </Text>
              </View>
            )}
          </>
        }
        ListFooterComponent={
          <>
            {/* Loading More Indicator */}
            {loadingMore && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}

            {/* End of Feed */}
            {!hasMore && articles.length > 0 && (
              <View style={styles.endOfFeed}>
                <Text style={[styles.endOfFeedText, { color: colors.textMuted }]}>
                  সব প্রবন্ধ দেখানো হয়েছে
                </Text>
              </View>
            )}
          </>
        }
      />

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareSelect}
        url={shareArticle ? `${SHARE_BASE_URL}/article/${shareArticle.id}` : ''}
        message={shareArticle?.content?.substring(0, 100) || 'প্রবন্ধ পড়ুন'}
      />

      {/* Create Article FAB (only for logged-in users) */}
      {!isGuest && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/create-article')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // WebSocket indicator
  wsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  wsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Article Card
  articleCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 10,
  },
  articleUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  postTime: {
    fontSize: 12,
    marginTop: 2,
  },
  articleContent: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  articleImageWrapper: {
    width: Dimensions.get('window').width - 32,
    height: 250,
    marginTop: 8,
    alignSelf: 'center',
  },
  articleImage: {
    width: Dimensions.get('window').width - 32,
    height: 250,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionsCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionIcon: {
    marginRight: 4,
  },
  statsText: {
    fontSize: 13,
  },
  // Actions
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Inline Comment
  inlineCommentContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  inlineCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inlineCommentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  inlineSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
  },
  // Loading more
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfFeed: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfFeedText: {
    fontSize: 13,
  },
  // Retry button
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
    shadowRadius: 4,
  },
});