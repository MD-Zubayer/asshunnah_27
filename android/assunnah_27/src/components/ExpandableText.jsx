/**
 * ExpandableText - Facebook-style expandable text component
 * Shows truncated text with "Read More" / "Show Less" toggle
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { getDirectionStyle } from '../utils/textDirection';
import ArticleRenderer from './ArticleRenderer';

// Enable LayoutAnimation on Android if not in New Architecture
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    // Only execute if not running under the New Architecture (Fabric) where it warns/no-ops
    if (!global.RN$Bridgeless && !global.__nativeFabricPageToRootNodesMap) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  } catch (e) {
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
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [measured, setMeasured] = useState(false);

  // Measure text to determine if expansion is needed
  const handleTextLayout = useCallback((event) => {
    if (measured) return;
    
    const { height } = event.nativeEvent.layout;
    // Approximate line height from font size (15 * 1.5 = 22.5)
    const lineHeight = 22.5;
    const totalLines = Math.ceil(height / lineHeight);
    
    if (totalLines > initialLines) {
      setNeedsExpansion(true);
    }
    setMeasured(true);
  }, [initialLines, measured]);

  const handleExpand = useCallback((e) => {
    e?.stopPropagation?.();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (isFullyExpanded) {
      // Collapse back to initial
      setExpandedLines(initialLines);
      setIsFullyExpanded(false);
    } else {
      // Expand by step
      const newLines = expandedLines + expandStep;
      // Check if we should fully expand (if remaining text is small)
      // We'll fully expand when the user clicks and the text fits
      setExpandedLines(newLines);
    }
    
    onToggle?.();
  }, [expandedLines, expandStep, initialLines, isFullyExpanded, onToggle]);

  const handleShowFull = useCallback((e) => {
    e?.stopPropagation?.();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLines(9999);
    setIsFullyExpanded(true);
    onToggle?.();
  }, [onToggle]);

  const handleCollapse = useCallback((e) => {
    e?.stopPropagation?.();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedLines(initialLines);
    setIsFullyExpanded(false);
    onToggle?.();
  }, [initialLines, onToggle]);

  if (!text) return null;

  const directionStyle = getDirectionStyle(text);

  return (
    <View style={styles.container}>
      {isFullyExpanded ? (
        <ArticleRenderer text={text} colors={colors} />
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
          <TouchableOpacity 
            onPress={handleExpand} 
            style={styles.readMoreBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.readMoreText, { color: colors.primary }]}>
              আরো দেখুন
            </Text>
          </TouchableOpacity>

          {/* Show full text option */}
          <TouchableOpacity 
            onPress={handleShowFull} 
            style={styles.readMoreBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.readMoreText, { color: colors.textMuted }]}>
              পুরোটা পড়ুন
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isFullyExpanded && needsExpansion && (
        <TouchableOpacity 
          onPress={handleCollapse} 
          style={styles.readMoreBtn}
          activeOpacity={0.7}
        >
          <Text style={[styles.readMoreText, { color: colors.primary }]}>
            সংক্ষিপ্ত করুন
          </Text>
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