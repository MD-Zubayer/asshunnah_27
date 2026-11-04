/**
 * CommentInput - Facebook-style comment input
 * Text input with send button for posting comments
 */

import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { getTextDirection } from '../utils/textDirection';

export default function CommentInput({ 
  onSubmit, 
  placeholder = 'মন্তব্য লিখুন...',
  replyingTo = null,
  onCancelReply = null,
  currentUser = null,
  autoFocus = false
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
      {/* Reply indicator */}
      {replyingTo && (
        <View style={[styles.replyIndicator, { backgroundColor: colors.inputBg }]}>
          <Text style={[styles.replyText, { color: colors.textSecondary }]} numberOfLines={1}>
            <Text style={{ fontWeight: '700' }}>{replyingTo.user?.first_name || 'ব্যবহারকারী'}</Text>
            {' '}উত্তর দিচ্ছেন...
          </Text>
          <TouchableOpacity onPress={onCancelReply} style={styles.cancelReplyBtn}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        {/* User Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          {currentUser?.profile_image ? (
            <Image 
              source={{ uri: currentUser.profile_image }} 
              style={styles.avatarImage}
            />
          ) : (
            <Ionicons name="person" size={16} color={colors.primary} />
          )}
        </View>

        {/* Text Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <TextInput
            style={[styles.input, { color: colors.text, writingDirection: getTextDirection(text) }]}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            autoFocus={autoFocus}
            editable={!isSubmitting}
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: text.trim() ? colors.primary : colors.inputBg },
            !text.trim() && { borderColor: colors.inputBorder, borderWidth: 1 }
          ]}
          onPress={handleSubmit}
          disabled={!text.trim() || isSubmitting}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="send" 
            size={16} 
            color={text.trim() ? '#fff' : colors.textMuted} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  cancelReplyBtn: {
    padding: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 80,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});