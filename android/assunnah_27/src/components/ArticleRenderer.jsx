import React from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getTextDirection } from '../utils/textDirection';

/**
 * Checks if a string contains only emojis.
 */
function isOnlyEmojis(str) {
  const cleanStr = str.replace(/\s/g, '');
  if (!cleanStr) return false;
  
  // Safe emoji check supporting standard unicode emoji ranges and surrogate pairs
  // \u2000-\u3300 covers miscellaneous symbols, shapes, dingbats, and CJK symbols
  // \ud800-\udfff covers all UTF-16 surrogate pairs (where all modern emojis reside)
  const emojiRegex = /^[\u2000-\u3300\ud800-\udfff]+$/;
  return emojiRegex.test(cleanStr);
}

/**
 * Copies text to clipboard and shows an Alert
 */
async function copyToClipboard(text, typeLabel) {
  try {
    await Clipboard.setStringAsync(text);
    Alert.alert('কপি হয়েছে', `${typeLabel} ক্লিপবোর্ডে কপি করা হয়েছে।`);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
}

/**
 * Tokenizes a line of text to handle inline elements:
 * - Bold (**text**)
 * - Italic (*text*)
 * - Inline code (`text`)
 * - Emails (email@domain.com)
 * - Phone numbers (e.g. +8801700000000)
 */
function renderInlineContent(text, colors, isDark, keyPrefix, baseFontSize) {
  if (!text) return null;

  // Regex to match emails, phone numbers, bold, italic, and inline code
  // Email: matches standard email patterns
  // Phone: matches numbers with spaces/hyphens/plus, minimum 8 digits to avoid short number matches
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,32}|\+?\d[\d\-\s]{7,}\d)/g;

  const parts = text.split(tokenRegex);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-inline-${index}`;

    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={key} style={{ fontWeight: '700', fontSize: baseFontSize }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={key} style={{ fontStyle: 'italic', fontSize: baseFontSize }}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text
          key={key}
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            backgroundColor: isDark ? '#334155' : '#E2E8F0',
            color: isDark ? '#38BDF8' : '#0369A1',
            paddingHorizontal: 4,
            borderRadius: 4,
            fontSize: baseFontSize - 1,
          }}
        >
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Email Check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,32}$/;
    if (emailRegex.test(part)) {
      return (
        <Text
          key={key}
          style={{
            color: '#3B82F6',
            textDecorationLine: 'underline',
            fontWeight: '600',
            fontSize: baseFontSize,
          }}
          onLongPress={() => copyToClipboard(part, 'ইমেইল এড্রেস')}
        >
          {part}
        </Text>
      );
    }

    // Phone / Number check (minimum 8 digits, starts with optional +)
    const phoneRegex = /^\+?\d[\d\-\s]{7,}\d$/;
    if (phoneRegex.test(part)) {
      return (
        <Text
          key={key}
          style={{
            color: '#10B981',
            textDecorationLine: 'underline',
            fontWeight: '600',
            fontSize: baseFontSize,
          }}
          onLongPress={() => copyToClipboard(part, 'ফোন নম্বর/সংখ্যা')}
        >
          {part}
        </Text>
      );
    }

    // Normal Text
    return <Text key={key} style={{ fontSize: baseFontSize }}>{part}</Text>;
  });
}

export default function ArticleRenderer({ text, colors, isDark: explicitIsDark }) {
  const isDark = explicitIsDark ?? (colors.background === '#0f172a' || colors.background === '#121212' || colors.background === '#1E293B');
  
  if (!text) return null;

  // 1. Separate code blocks from normal blocks
  const blocks = [];
  const codeBlockRegex = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    blocks.push({
      type: 'code',
      content: match[1].trim(),
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    blocks.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // 2. Render each block
  return (
    <View style={styles.container}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'code') {
          return (
            <View
              key={`code-${bIdx}`}
              style={[
                styles.codeBlockContainer,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.codeHeader}>
                <Ionicons name="code-slash" size={14} color={isDark ? '#9CA3AF' : '#64748B'} />
                <Text style={[styles.codeHeaderTitle, { color: isDark ? '#9CA3AF' : '#64748B' }]}>CODE SNIPPET</Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={() => copyToClipboard(block.content, 'কোড')}
                >
                  <Ionicons name="copy-outline" size={14} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <Text
                  style={[
                    styles.codeText,
                    {
                      color: isDark ? '#38BDF8' : '#0F172A',
                    },
                  ]}
                >
                  {block.content}
                </Text>
              </ScrollView>
            </View>
          );
        }

        // Process lines in text block
        const lines = block.content.split('\n');
        return lines.map((line, lIdx) => {
          const key = `text-${bIdx}-${lIdx}`;
          const trimmedLine = line.trim();

          if (!trimmedLine) {
            return <View key={key} style={styles.emptyLine} />;
          }

          // Check primary language & direction
          const direction = getTextDirection(line);
          const isArabic = direction === 'rtl';

          // Base font configurations based on language
          const baseFontSize = isArabic ? 21 : 16;
          const baseLineHeight = isArabic ? 36 : 24;
          const textStyle = {
            writingDirection: direction,
            textAlign: isArabic ? 'right' : 'left',
            color: colors.text,
            lineHeight: baseLineHeight,
          };

          // A. Headers (# to ######)
          const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const headerContent = headerMatch[2];
            const headerSizes = [28, 24, 21, 18, 16, 14];
            const fontSize = isArabic ? headerSizes[level - 1] + 4 : headerSizes[level - 1];

            return (
              <Text
                key={key}
                style={[
                  textStyle,
                  {
                    fontWeight: '800',
                    fontSize,
                    marginTop: 14,
                    marginBottom: 6,
                    color: isDark ? '#F8FAFC' : '#0F172A',
                  },
                ]}
              >
                {renderInlineContent(headerContent, colors, isDark, key, fontSize)}
              </Text>
            );
          }

          // B. Blockquotes (>)
          if (trimmedLine.startsWith('>')) {
            const quoteContent = trimmedLine.substring(1).trim();
            return (
              <View
                key={key}
                style={[
                  styles.quoteContainer,
                  {
                    borderLeftColor: colors.primary || '#008080',
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    alignSelf: isArabic ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <Text style={[textStyle, { fontStyle: 'italic', color: colors.textSecondary }]}>
                  {renderInlineContent(quoteContent, colors, isDark, key, baseFontSize)}
                </Text>
              </View>
            );
          }

          // C. Bullet Lists (- or *)
          const listMatch = trimmedLine.match(/^([\-\*])\s+(.*)$/);
          if (listMatch) {
            const listContent = listMatch[2];
            return (
              <View
                key={key}
                style={[
                  styles.listItemContainer,
                  { flexDirection: isArabic ? 'row-reverse' : 'row' },
                ]}
              >
                <Text style={[styles.bullet, { color: colors.primary || '#008080', fontSize: baseFontSize }]}>
                  {isArabic ? '•' : '•'}
                </Text>
                <Text style={[textStyle, { flex: 1, marginLeft: isArabic ? 0 : 8, marginRight: isArabic ? 8 : 0 }]}>
                  {renderInlineContent(listContent, colors, isDark, key, baseFontSize)}
                </Text>
              </View>
            );
          }

          // D. Emojis only
          if (isOnlyEmojis(trimmedLine)) {
            return (
              <Text
                key={key}
                style={[
                  textStyle,
                  {
                    fontSize: 40,
                    lineHeight: 52,
                    textAlign: isArabic ? 'right' : 'left',
                    marginVertical: 10,
                  },
                ]}
              >
                {trimmedLine}
              </Text>
            );
          }

          // E. Normal Paragraph
          return (
            <Text key={key} style={[styles.paragraph, textStyle]}>
              {renderInlineContent(line, colors, isDark, key, baseFontSize)}
            </Text>
          );
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  paragraph: {
    marginBottom: 10,
  },
  emptyLine: {
    height: 8,
  },
  quoteContainer: {
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 10,
    borderRadius: 4,
    width: '100%',
  },
  listItemContainer: {
    alignItems: 'flex-start',
    marginVertical: 4,
    width: '100%',
  },
  bullet: {
    fontWeight: 'bold',
    width: 14,
  },
  codeBlockContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9CA3AF',
    paddingBottom: 6,
  },
  codeHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 6,
    flex: 1,
  },
  copyBtn: {
    padding: 4,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 14,
    lineHeight: 20,
  },
});
