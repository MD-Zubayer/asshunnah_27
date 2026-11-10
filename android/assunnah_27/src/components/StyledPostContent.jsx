import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getShortPostTypography } from '../constants/postThemes';
import { getTextDirection } from '../utils/textDirection';
import { hasMarkdownOrEmbeds, extractSocialEmbeds } from '../utils/socialEmbed';
import ExpandableText from './ExpandableText';
import ArticleRenderer from './ArticleRenderer';
import SocialEmbedCard from './SocialEmbedCard';

/**
 * Decorative watermark icons for themed short posts
 */
export function ThemeDecorOverlay({ pattern, color = '#FFFFFF' }) {
  if (!pattern) return null;

  const iconName =
    pattern === 'moon' ? 'moon' :
    pattern === 'sparkles' ? 'sparkles' :
    pattern === 'sunny' ? 'sunny' :
    pattern === 'water' ? 'water' :
    pattern === 'star' ? 'star' :
    pattern === 'flower' ? 'rose' :
    pattern === 'leaf' ? 'leaf' :
    pattern === 'book' ? 'book' :
    pattern === 'heart' ? 'heart' : 'sparkles';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Ionicons
        name={iconName}
        size={88}
        color={color}
        style={{ position: 'absolute', top: -12, right: -10, opacity: 0.12 }}
      />
      <Ionicons
        name={iconName}
        size={56}
        color={color}
        style={{ position: 'absolute', bottom: -8, left: 10, opacity: 0.1 }}
      />
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1.5,
          borderColor: color,
          opacity: 0.14,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 18,
          right: 22,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: color,
          opacity: 0.08,
        }}
      />
    </View>
  );
}

/**
 * Renders an article/post's text content with:
 * - Facebook-style colorful gradient/patterned card if `background_theme` is set
 * - Auto-enlarged text if short post without image
 * - Standard ExpandableText / ArticleRenderer for long posts or posts with images
 */
export default function StyledPostContent({
  article,
  colors,
  isDark,
  mode = 'feed', // 'feed' | 'detail'
  textStyle,
}) {
  const text = article?.content || '';
  const hasImage = Boolean(article?.image_url || article?.image);
  const typo = getShortPostTypography(text, hasImage, article?.background_theme);
  const isRich = hasMarkdownOrEmbeds(text);
  const embeds = extractSocialEmbeds(text);

  // 1. Facebook-style Colored/Themed Short Post
  if (typo.isThemed && typo.theme) {
    const dir = getTextDirection(text);
    const isArabic = dir === 'rtl';

    return (
      <View>
        <LinearGradient
          colors={typo.theme.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.themedCard}
        >
          <ThemeDecorOverlay pattern={typo.theme.pattern} color={typo.theme.accentDecor || typo.theme.textColor} />
          <Text
            style={[
              styles.themedText,
              {
                color: typo.theme.textColor,
                fontSize: typo.fontSize,
                lineHeight: typo.lineHeight,
                fontWeight: typo.fontWeight,
                writingDirection: dir,
                fontFamily: isArabic ? 'Amiri-Regular' : undefined,
              },
            ]}
          >
            {text.trim()}
          </Text>
        </LinearGradient>
        {embeds.length > 0 && (
          <View style={{ paddingHorizontal: 14 }}>
            {embeds.map((emb, idx) => (
              <SocialEmbedCard key={`themed-emb-${idx}`} embed={emb} colors={colors} isDark={isDark} compact={mode === 'feed'} />
            ))}
          </View>
        )}
      </View>
    );
  }

  // 2. Plain Short Post (only when NO markdown & NO embeddable links)
  if (typo.isShortAuto && !isRich) {
    const dir = getTextDirection(text);
    const isArabic = dir === 'rtl';
    return (
      <View style={mode === 'feed' ? styles.plainShortWrapFeed : styles.plainShortWrapDetail}>
        <Text
          style={[
            {
              color: colors.text,
              fontSize: isArabic ? typo.fontSize + 2 : typo.fontSize,
              lineHeight: isArabic ? typo.lineHeight + 4 : typo.lineHeight,
              fontWeight: typo.fontWeight,
              writingDirection: dir,
              textAlign: isArabic ? 'right' : 'left',
            },
          ]}
        >
          {text.trim()}
        </Text>
      </View>
    );
  }

  // 3. Markdown / Embedded / Long / Image Post
  if (mode === 'detail') {
    return (
      <View style={{ paddingHorizontal: 2 }}>
        <ArticleRenderer text={text} colors={colors} isDark={isDark} />
      </View>
    );
  }

  return (
    <ExpandableText
      text={text}
      initialLines={4}
      expandStep={4}
      colors={colors}
      style={textStyle}
    />
  );
}

const styles = StyleSheet.create({
  themedCard: {
    minHeight: 230,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  themedText: {
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.14)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  plainShortWrapFeed: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 12,
  },
  plainShortWrapDetail: {
    paddingVertical: 6,
    marginBottom: 8,
  },
});
