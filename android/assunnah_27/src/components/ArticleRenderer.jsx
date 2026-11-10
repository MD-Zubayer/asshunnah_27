import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { getTextDirection } from '../utils/textDirection';
import { parseSocialEmbedUrl, extractSocialEmbeds } from '../utils/socialEmbed';
import SocialEmbedCard from './SocialEmbedCard';

/**
 * Checks if a string contains only emojis.
 */
function isOnlyEmojis(str) {
  const cleanStr = str.replace(/\s/g, '');
  if (!cleanStr) return false;
  const emojiRegex = /^[\u2000-\u3300\ud800-\udfff]+$/;
  return emojiRegex.test(cleanStr);
}

/**
 * Copies text to clipboard and shows an Alert.
 */
async function copyToClipboard(text, typeLabel) {
  try {
    await Clipboard.setStringAsync(text);
    Alert.alert('কপি হয়েছে', `${typeLabel} ক্লিপবোর্ডে কপি করা হয়েছে।`);
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
}

function openExternalUrl(url, e) {
  e?.stopPropagation?.();
  Linking.openURL(url).catch(() => {
    Alert.alert('ত্রুটি', 'লিংকটি খোলা যায়নি।');
  });
}

/**
 * Tokenizes inline Markdown elements:
 * - Markdown links: [label](https://...)
 * - Bold+Italic: ***text***
 * - Bold: **text** or __text__
 * - Italic: *text*
 * - Strikethrough: ~~text~~
 * - Highlight: ==text==
 * - Inline code: `code`
 * - Plain URLs: https://... / http://...
 * - Emails & Phone numbers
 */
function renderInlineContent(text, colors, isDark, keyPrefix, baseFontSize) {
  if (!text) return null;

  const tokenRegex =
    /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*\*\*.*?\*\*\*|\*\*.*?\*\*|__.*?__|~~.*?~~|==.*?==|\*[^*\n]+?\*|`[^`\n]+?`|https?:\/\/[^\s<>"'`\)\]]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,32}|\+?\d[\d\-\s]{7,}\d)/g;

  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'plain', value: text.slice(lastIdx, match.index) });
    }
    parts.push({ type: 'token', value: match[0] });
    lastIdx = tokenRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push({ type: 'plain', value: text.slice(lastIdx) });
  }

  return parts.map((item, index) => {
    const key = `${keyPrefix}-inline-${index}`;
    const part = item.value;

    if (item.type === 'plain') {
      return (
        <Text key={key} style={{ fontSize: baseFontSize }}>
          {part}
        </Text>
      );
    }

    // Markdown link [label](url)
    const mdLinkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (mdLinkMatch) {
      const label = mdLinkMatch[1];
      const url = mdLinkMatch[2];
      return (
        <Text
          key={key}
          style={{
            color: '#2563EB',
            textDecorationLine: 'underline',
            fontWeight: '600',
            fontSize: baseFontSize,
          }}
          onPress={(e) => openExternalUrl(url, e)}
          onLongPress={() => copyToClipboard(url, 'লিংক')}
        >
          {label}
        </Text>
      );
    }

    // Bold + Italic ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
      return (
        <Text key={key} style={{ fontWeight: '800', fontStyle: 'italic', fontSize: baseFontSize }}>
          {part.slice(3, -3)}
        </Text>
      );
    }

    // Bold **text** or __text__
    if (
      ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) &&
      part.length > 4
    ) {
      return (
        <Text key={key} style={{ fontWeight: '800', fontSize: baseFontSize }}>
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Strikethrough ~~text~~
    if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      return (
        <Text
          key={key}
          style={{
            textDecorationLine: 'line-through',
            color: colors?.textMuted || '#94A3B8',
            fontSize: baseFontSize,
          }}
        >
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Highlight ==text==
    if (part.startsWith('==') && part.endsWith('==') && part.length > 4) {
      return (
        <Text
          key={key}
          style={{
            backgroundColor: isDark ? 'rgba(250, 204, 21, 0.25)' : '#FEF08A',
            color: isDark ? '#FEF08A' : '#854D0E',
            fontWeight: '600',
            fontSize: baseFontSize,
          }}
        >
          {part.slice(2, -2)}
        </Text>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <Text key={key} style={{ fontStyle: 'italic', fontSize: baseFontSize }}>
          {part.slice(1, -1)}
        </Text>
      );
    }

    // Inline code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <Text
          key={key}
          style={{
            fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
            backgroundColor: isDark ? '#334155' : '#E2E8F0',
            color: isDark ? '#38BDF8' : '#0369A1',
            fontSize: baseFontSize - 1,
          }}
        >
          {` ${part.slice(1, -1)} `}
        </Text>
      );
    }

    // Plain URL
    if (/^https?:\/\//i.test(part)) {
      return (
        <Text
          key={key}
          style={{
            color: '#2563EB',
            textDecorationLine: 'underline',
            fontWeight: '600',
            fontSize: baseFontSize,
          }}
          onPress={(e) => openExternalUrl(part, e)}
          onLongPress={() => copyToClipboard(part, 'লিংক')}
        >
          {part}
        </Text>
      );
    }

    // Email
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,32}$/.test(part)) {
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

    // Phone number
    if (/^\+?\d[\d\-\s]{7,}\d$/.test(part)) {
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

    return (
      <Text key={key} style={{ fontSize: baseFontSize }}>
        {part}
      </Text>
    );
  });
}

export default function ArticleRenderer({
  text,
  colors,
  isDark: explicitIsDark,
  compact = false,
  maxBlocks = null,
  maxEmbeds = null,
}) {
  const isDark =
    explicitIsDark ??
    (colors?.background === '#0B0F19' ||
      colors?.background === '#0f172a' ||
      colors?.background === '#121212' ||
      colors?.background === '#1E293B');

  if (!text) return null;

  // 1. Separate fenced code blocks ```lang ... ``` from normal blocks
  const rawBlocks = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      rawBlocks.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }
    rawBlocks.push({
      type: 'code',
      lang: match[1] ? match[1].toUpperCase() : 'CODE',
      content: match[2].trim(),
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    rawBlocks.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  let renderedBlockCount = 0;
  let renderedEmbedCount = 0;
  const seenEmbedKeys = new Set();

  const canRenderMoreBlocks = () => maxBlocks === null || renderedBlockCount < maxBlocks;
  const canRenderMoreEmbeds = () => maxEmbeds === null || renderedEmbedCount < maxEmbeds;

  const markEmbedRendered = (embed) => {
    const k = embed.platform === 'youtube' ? `yt:${embed.videoId}` : `fb:${embed.url}`;
    if (seenEmbedKeys.has(k)) return false;
    seenEmbedKeys.add(k);
    renderedEmbedCount++;
    return true;
  };

  // 2. Render blocks
  return (
    <View style={styles.container}>
      {rawBlocks.map((block, bIdx) => {
        if (!canRenderMoreBlocks()) return null;

        if (block.type === 'code') {
          renderedBlockCount++;
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
                <Text style={[styles.codeHeaderTitle, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                  {block.lang || 'CODE'}
                </Text>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    copyToClipboard(block.content, 'কোড');
                  }}
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

        const lines = block.content.split('\n');
        return lines.map((line, lIdx) => {
          if (!canRenderMoreBlocks()) return null;

          const key = `text-${bIdx}-${lIdx}`;
          const trimmedLine = line.trim();

          if (!trimmedLine) {
            return compact ? null : <View key={key} style={styles.emptyLine} />;
          }

          // Standalone YouTube / Facebook URL line -> directly render embed card
          const standaloneEmbed = parseSocialEmbedUrl(trimmedLine);
          if (standaloneEmbed) {
            if (!canRenderMoreEmbeds()) return null;
            if (!markEmbedRendered(standaloneEmbed)) return null;
            renderedBlockCount++;
            return (
              <SocialEmbedCard
                key={`${key}-embed`}
                embed={standaloneEmbed}
                colors={colors}
                isDark={isDark}
                compact={compact}
              />
            );
          }

          renderedBlockCount++;

          const direction = getTextDirection(line);
          const isArabic = direction === 'rtl';

          const baseFontSize = compact ? (isArabic ? 19 : 15) : isArabic ? 21 : 16;
          const baseLineHeight = compact ? (isArabic ? 30 : 22.5) : isArabic ? 36 : 25;
          const textStyle = {
            writingDirection: direction,
            textAlign: isArabic ? 'right' : 'left',
            color: colors?.text || '#0F172A',
            lineHeight: baseLineHeight,
          };

          // Horizontal Rule (---, ***, ___)
          if (/^([-*_])\1{2,}$/.test(trimmedLine)) {
            return (
              <View
                key={key}
                style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
              />
            );
          }

          // Headers (# to ######)
          const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const headerContent = headerMatch[2];
            const headerSizes = compact ? [21, 19, 17, 16, 15, 14] : [25, 22, 19, 17, 16, 15];
            const fontSize = isArabic ? headerSizes[level - 1] + 3 : headerSizes[level - 1];

            return (
              <View
                key={key}
                style={[
                  level <= 2 && !compact && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                    paddingBottom: 4,
                  },
                  { marginTop: compact ? 4 : 10, marginBottom: compact ? 4 : 6 },
                ]}
              >
                <Text
                  style={[
                    textStyle,
                    {
                      fontWeight: '800',
                      fontSize,
                      lineHeight: Math.round(fontSize * 1.38),
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    },
                  ]}
                >
                  {renderInlineContent(headerContent, colors, isDark, key, fontSize)}
                </Text>
              </View>
            );
          }

          // Blockquotes (>)
          if (trimmedLine.startsWith('>')) {
            const quoteContent = trimmedLine.substring(1).trim();
            return (
              <View
                key={key}
                style={[
                  styles.quoteContainer,
                  isArabic ? styles.quoteRtl : styles.quoteLtr,
                  {
                    borderLeftColor: isArabic ? undefined : colors?.primary || '#059669',
                    borderRightColor: isArabic ? colors?.primary || '#059669' : undefined,
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  },
                ]}
              >
                <Text style={[textStyle, { fontStyle: 'italic', color: colors?.textSecondary || '#64748B' }]}>
                  {renderInlineContent(quoteContent, colors, isDark, key, baseFontSize)}
                </Text>
              </View>
            );
          }

          // Task List (- [ ] / - [x])
          const taskMatch = trimmedLine.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
          if (taskMatch) {
            const checked = taskMatch[1].toLowerCase() === 'x';
            const taskContent = taskMatch[2];
            return (
              <View
                key={key}
                style={[
                  styles.listItemContainer,
                  { flexDirection: isArabic ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={checked ? '#10B981' : colors?.textMuted || '#94A3B8'}
                  style={{ marginTop: 3 }}
                />
                <Text
                  style={[
                    textStyle,
                    {
                      flex: 1,
                      marginLeft: isArabic ? 0 : 8,
                      marginRight: isArabic ? 8 : 0,
                      textDecorationLine: checked ? 'line-through' : 'none',
                      color: checked ? colors?.textMuted || '#94A3B8' : colors?.text || '#0F172A',
                    },
                  ]}
                >
                  {renderInlineContent(taskContent, colors, isDark, key, baseFontSize)}
                </Text>
              </View>
            );
          }

          // Bullet Lists (-, *, +)
          const listMatch = trimmedLine.match(/^([-*+])\s+(.*)$/);
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
                <Text style={[styles.bullet, { color: colors?.primary || '#059669', fontSize: baseFontSize }]}>
                  •
                </Text>
                <Text style={[textStyle, { flex: 1, marginLeft: isArabic ? 0 : 8, marginRight: isArabic ? 8 : 0 }]}>
                  {renderInlineContent(listContent, colors, isDark, key, baseFontSize)}
                </Text>
              </View>
            );
          }

          // Numbered Lists (1. , 2. )
          const numMatch = trimmedLine.match(/^(\d+[.)])\s+(.*)$/);
          if (numMatch) {
            const numMarker = numMatch[1];
            const numContent = numMatch[2];
            return (
              <View
                key={key}
                style={[
                  styles.listItemContainer,
                  { flexDirection: isArabic ? 'row-reverse' : 'row' },
                ]}
              >
                <Text style={[styles.bullet, { color: colors?.primary || '#059669', fontSize: baseFontSize - 1 }]}>
                  {numMarker}
                </Text>
                <Text style={[textStyle, { flex: 1, marginLeft: isArabic ? 0 : 8, marginRight: isArabic ? 8 : 0 }]}>
                  {renderInlineContent(numContent, colors, isDark, key, baseFontSize)}
                </Text>
              </View>
            );
          }

          // Emoji-only line
          if (isOnlyEmojis(trimmedLine)) {
            return (
              <Text
                key={key}
                style={[
                  textStyle,
                  {
                    fontSize: compact ? 32 : 40,
                    lineHeight: compact ? 42 : 52,
                    textAlign: isArabic ? 'right' : 'left',
                    marginVertical: compact ? 4 : 10,
                  },
                ]}
              >
                {trimmedLine}
              </Text>
            );
          }

          // Paragraph (with optional inline embeds discovered inside the line)
          const inlineEmbeds = extractSocialEmbeds(line);
          return (
            <View key={key}>
              <Text style={[styles.paragraph, compact && { marginBottom: 6 }, textStyle]}>
                {renderInlineContent(line, colors, isDark, key, baseFontSize)}
              </Text>
              {inlineEmbeds.map((emb, eIdx) => {
                if (!canRenderMoreEmbeds()) return null;
                if (!markEmbedRendered(emb)) return null;
                return (
                  <SocialEmbedCard
                    key={`${key}-inline-embed-${eIdx}`}
                    embed={emb}
                    colors={colors}
                    isDark={isDark}
                    compact={compact}
                  />
                );
              })}
            </View>
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
    marginBottom: 8,
  },
  emptyLine: {
    height: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 10,
  },
  quoteContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
    borderRadius: 6,
    width: '100%',
  },
  quoteLtr: {
    borderLeftWidth: 4,
  },
  quoteRtl: {
    borderRightWidth: 4,
  },
  listItemContainer: {
    alignItems: 'flex-start',
    marginVertical: 3,
    width: '100%',
  },
  bullet: {
    fontWeight: 'bold',
    lineHeight: 24,
  },
  codeBlockContainer: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
    gap: 6,
  },
  codeHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    flex: 1,
  },
  copyBtn: {
    padding: 4,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    padding: 12,
  },
});
