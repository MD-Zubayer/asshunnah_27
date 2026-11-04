import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDirectionStyle } from '../utils/textDirection';

export default function CommentItem({ comment, colors, onReply, onDelete, isOwner, depth = 0 }) {
  const [showReplies, setShowReplies] = useState(false);

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

  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <View style={[styles.container, { marginLeft: depth * 20 }]}>
      <View style={styles.commentRow}>
        {/* Avatar */}
        {comment.user.profile_image ? (
          <Image source={{ uri: comment.user.profile_image }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {getUserName(comment.user).charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.commentContent}>
          {/* Comment Bubble */}
          <View style={[styles.bubble, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.authorName, { color: colors.text }]}>
              {getUserName(comment.user)}
            </Text>
            <Text style={[styles.commentText, { color: colors.text }, getDirectionStyle(comment.text)]}>{comment.text}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatTimeAgo(comment.created_at)}
            </Text>

            {depth < 2 && (
              <TouchableOpacity onPress={() => onReply(comment)} style={styles.actionButton}>
                <Text style={[styles.actionText, { color: colors.textMuted }]}>উত্তর দিন</Text>
              </TouchableOpacity>
            )}

            {isOwner && (
              <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
                <Text style={[styles.actionText, { color: '#EF4444' }]}>মুছুন</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Show Replies Toggle */}
          {hasReplies && (
            <TouchableOpacity
              onPress={() => setShowReplies(!showReplies)}
              style={styles.repliesToggle}
            >
              <Ionicons
                name={showReplies ? 'chevron-down' : 'chevron-forward'}
                size={14}
                color={colors.primary}
              />
              <Text style={[styles.repliesText, { color: colors.primary }]}>
                {showReplies ? 'উত্তর লুকান' : `${comment.reply_count} টি উত্তর দেখুন`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Nested Replies */}
          {showReplies && hasReplies && (
            <View style={styles.repliesContainer}>
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  colors={colors}
                  onReply={onReply}
                  onDelete={onDelete}
                  isOwner={isOwner}
                  depth={depth + 1}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingLeft: 4,
    gap: 12,
  },
  timeText: {
    fontSize: 11,
  },
  actionButton: {
    paddingVertical: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
    gap: 4,
  },
  repliesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  repliesContainer: {
    marginTop: 8,
  },
});