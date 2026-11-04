/**
 * ArticleInteractionBar - Facebook-style interaction bar
 * Shows like, comment, share counts and action buttons
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { formatCount } from '../services/article-service';
import ShareOptionsModal from './ShareOptionsModal';

export default function ArticleInteractionBar({
  article,
  onLike,
  onComment,
  onShare,
  isLiked: isLikedProp,
  shareUrl,
  shareMessage,
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [showShareModal, setShowShareModal] = useState(false);
  
  const isLiked = isLikedProp !== undefined ? isLikedProp : article?.is_liked;
  const likeCount = article?.like_count || 0;
  const commentCount = article?.comment_count || 0;
  const viewCount = article?.view_count || 0;
  const shareCount = article?.share_count || 0;

  const handleSharePress = () => {
    setShowShareModal(true);
  };

  const handleShareSelect = (platform) => {
    onShare?.(platform);
  };

  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={[styles.statsRow, { borderBottomColor: colors.cardBorder }]}>
        <View style={styles.statsLeft}>
          {likeCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.likeIcon, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="heart" size={10} color="#fff" />
              </View>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {formatCount(likeCount)}
              </Text>
            </View>
          )}
          {commentCount > 0 && (
            <TouchableOpacity style={styles.statItem} onPress={onComment}>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {formatCount(commentCount)} টি মন্তব্য
              </Text>
            </TouchableOpacity>
          )}
          {shareCount > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {formatCount(shareCount)} শেয়ার
              </Text>
            </View>
          )}
        </View>
        {viewCount > 0 && (
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.statTextSmall, { color: colors.textMuted }]}>
              {formatCount(viewCount)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, isLiked && styles.actionButtonActive]}
          onPress={onLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#EF4444' : colors.textSecondary}
          />
          <Text
            style={[
              styles.actionText,
              { color: colors.textSecondary },
              isLiked && { color: '#EF4444' },
            ]}
          >
            পছন্দ
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onComment}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            মন্তব্য
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSharePress}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            শেয়ার
          </Text>
        </TouchableOpacity>
      </View>

      {/* Share Options Modal */}
      <ShareOptionsModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShareSelect}
        url={shareUrl}
        message={shareMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statTextSmall: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});