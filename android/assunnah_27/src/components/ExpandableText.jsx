/**
 * ExpandableText - Facebook-style expandable text component
 * Supports Markdown formatting and YouTube/Facebook embeds directly in feed & expanded view.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { getDirectionStyle } from '../utils/textDirection';
import { hasMarkdownOrEmbeds, extractSocialEmbeds } from '../utils/socialEmbed';
import ArticleRenderer from './ArticleRenderer';

// Enable LayoutAnimation on Android if not in New Architecture
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    if (!global.RN$Bridgeless && !global.__nativeFabricPageToRootNodesMap) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  } catch (_e) {
    // Ignore error
  }
}

export default function ExpandableText({
  text,
  initialLines = 4,
  expandStep = 4,
  colors,
  style,
  onToggle,
}) {
  const [expandedLines, setExpandedLines] = useState(initialLines);
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);
  const [plainNeedsExpansion, setPlainNeedsExpansion] = useState(false);
  const [measured, setMeasured] = useState(false);

  const isRichContent = useMemo(() => hasMarkdownOrEmbeds(text), [text]);

  const richNeedsExpansion = useMemo(() => {
    if (!text || !isRichContent) return false;
    const nonEmptyLines = text.split('\n').filter((l) => l.trim().length > 0);
    const embeds = extractSocialEmbeds(text);
    return nonEmptyLines.length > initialLines || text.length > 260 || embeds.length > 1;
  }, [text, isRichContent, initialLines]);

  const needsExpansion = isRichContent ? richNeedsExpansion : plainNeedsExpansion;

  // Measure plain text to determine if expansion is needed
  const handleTextLayout = useCallback(
    (event) => {
      if (measured || isRichContent) return;

      const { height } = event.nativeEvent.layout;
      const lineHeight = 22.5;
      const totalLines = Math.ceil(height / lineHeight);

      if (totalLines > initialLines) {
        setPlainNeedsExpansion(true);
      }
      setMeasured(true);
    },
    [initialLines, measured, isRichContent]
  );

  const handleExpand = useCallback(
    (e) => {
      e?.stopPropagation?.();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      if (isFullyExpanded) {
        setExpandedLines(initialLines);
        setIsFullyExpanded(false);
      } else if (isRichContent) {
        const nonEmptyCount = text.split('\n').filter((l) => l.trim().length > 0).length;
        const newLines = expandedLines + expandStep;
        if (newLines >= nonEmptyCount) {
          setExpandedLines(9999);
          setIsFullyExpanded(true);
        } else {
          setExpandedLines(newLines);
        }
      } else {
        setExpandedLines(expandedLines + expandStep);
      }

      onToggle?.();
    },
    [expandedLines, expandStep, initialLines, isFullyExpanded, isRichContent, text, onToggle]
  );

  const handleShowFull = useCallback(
    (e) => {
      e?.stopPropagation?.();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedLines(9999);
      setIsFullyExpanded(true);
      onToggle?.();
    },
    [onToggle]
  );

  const handleCollapse = useCallback(
    (e) => {
      e?.stopPropagation?.();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedLines(initialLines);
      setIsFullyExpanded(false);
      onToggle?.();
    },
    [initialLines, onToggle]
  );

  if (!text) return null;

  const directionStyle = getDirectionStyle(text);

  return (
    <View style={styles.container}>
      {isFullyExpanded ? (
        <ArticleRenderer text={text} colors={colors} />
      ) : isRichContent ? (
        <ArticleRenderer
          text={text}
          colors={colors}
          compact
          maxBlocks={expandedLines}
          maxEmbeds={1}
        />
      ) : (
        <Text
          style={[styles.text, { color: colors.text }, directionStyle, style, { lineHeight: 22.5 }]}
          numberOfLines={expandedLines}
          onLayout={handleTextLayout}
        >
          {text}
        </Text>
      )}

      {/* Read More / Show Less buttons */}
      {needsExpansion && !isFullyExpanded && (
        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={handleExpand} style={styles.readMoreBtn} activeOpacity={0.7}>
            <Text style={[styles.readMoreText, { color: colors.primary }]}>আরো দেখুন</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShowFull} style={styles.readMoreBtn} activeOpacity={0.7}>
            <Text style={[styles.readMoreText, { color: colors.textMuted }]}>পুরোটা পড়ুন</Text>
          </TouchableOpacity>
        </View>
      )}

      {isFullyExpanded && needsExpansion && (
        <TouchableOpacity onPress={handleCollapse} style={styles.readMoreBtn} activeOpacity={0.7}>
          <Text style={[styles.readMoreText, { color: colors.primary }]}>সংক্ষিপ্ত করুন</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  text: {
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  readMoreBtn: {
    paddingVertical: 4,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
