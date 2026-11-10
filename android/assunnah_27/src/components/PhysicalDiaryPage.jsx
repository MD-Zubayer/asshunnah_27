import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFullDiaryDateMeta, toBanglaDigits } from '../utils/diaryDate';
import { getDiaryFont, getPaperTheme, TAG_COLORS } from '../constants/diaryThemes';

const RULE_HEIGHT = 32;
const TOTAL_BG_LINES = 26;

function isArabicOnlyLine(line) {
  const hasArabic = /[\u0600-\u06FF]/.test(line);
  const hasBangla = /[\u0980-\u09FF]/.test(line);
  return hasArabic && !hasBangla;
}

/**
 * Physical Ruled Diary Page Component
 * Supports both 'read' mode and 'edit' mode with authentic notebook lines,
 * double red margin, 3-calendar header, binding spine, and handwriting/custom fonts.
 */
export default function PhysicalDiaryPage({
  entry,
  pageNumber = 1,
  totalPages = 1,
  mode = 'read', // 'read' | 'edit'
  fontSize = 17,
  onChangeTitle,
  onChangeContent,
  onTogglePin,
  onPressDate,
  onToggleChecklistLine,
  contentInputRef,
  onSelectionChange,
  scrollEnabled = true,
}) {
  const theme = getPaperTheme(entry?.paper_theme);
  const font = getDiaryFont(entry?.font_family);
  const tagStyle = TAG_COLORS[entry?.tag] || TAG_COLORS['সাধারণ'];
  const dateMeta = useMemo(
    () => getFullDiaryDateMeta(entry?.entry_date || entry?.created_at, entry?.hijri_date),
    [entry?.entry_date, entry?.created_at, entry?.hijri_date]
  );

  const lineHeight = mode === 'edit' ? RULE_HEIGHT : Math.max(28, Math.round(fontSize * 1.85));
  const bgLinesCount = Math.max(TOTAL_BG_LINES, Math.ceil((entry?.content?.split('\n')?.length || 12) + 8));

  const renderReadLine = (line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <View key={idx} style={{ height: lineHeight }} />;
    }

    // Checklist done
    if (trimmed.startsWith('☑ ') || trimmed.startsWith('[x] ')) {
      const label = trimmed.replace(/^(☑ |\[x\] )/, '');
      return (
        <TouchableOpacity
          key={idx}
          activeOpacity={0.7}
          onPress={() => onToggleChecklistLine?.(idx)}
          style={[styles.checkRow, { minHeight: lineHeight }]}
        >
          <Ionicons name="checkbox" size={18} color="#059669" style={{ marginTop: 4 }} />
          <Text
            style={[
              styles.bodyText,
              {
                color: theme.mutedColor,
                fontFamily: font.fontFamily,
                fontSize,
                lineHeight,
                textDecorationLine: 'line-through',
                flex: 1,
              },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    }

    // Checklist todo
    if (trimmed.startsWith('☐ ') || trimmed.startsWith('[ ] ')) {
      const label = trimmed.replace(/^(☐ |\[ \] )/, '');
      return (
        <TouchableOpacity
          key={idx}
          activeOpacity={0.7}
          onPress={() => onToggleChecklistLine?.(idx)}
          style={[styles.checkRow, { minHeight: lineHeight }]}
        >
          <Ionicons name="square-outline" size={18} color={theme.accentColor} style={{ marginTop: 4 }} />
          <Text
            style={[
              styles.bodyText,
              {
                color: theme.textColor,
                fontFamily: font.fontFamily,
                fontSize,
                lineHeight,
                flex: 1,
              },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    }

    // Arabic-only line
    if (isArabicOnlyLine(trimmed)) {
      return (
        <Text
          key={idx}
          style={[
            styles.bodyText,
            {
              color: theme.textColor,
              fontFamily: 'Amiri-Regular',
              fontSize: fontSize + 2,
              lineHeight: lineHeight + 4,
              textAlign: 'right',
              writingDirection: 'rtl',
            },
          ]}
        >
          {line}
        </Text>
      );
    }

    // Bold heading line **text**
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      return (
        <Text
          key={idx}
          style={[
            styles.bodyText,
            {
              color: theme.accentColor,
              fontFamily: font.boldFontFamily,
              fontSize: fontSize + 1,
              lineHeight,
            },
          ]}
        >
          {trimmed.slice(2, -2)}
        </Text>
      );
    }

    // Regular handwritten/styled line
    return (
      <Text
        key={idx}
        style={[
          styles.bodyText,
          {
            color: theme.textColor,
            fontFamily: font.fontFamily,
            fontSize,
            lineHeight,
          },
        ]}
      >
        {line}
      </Text>
    );
  };

  const pageContent = (
    <View style={styles.pageStackWrapper}>
      {/* Stacked paper edge shadow on the right (physical book depth) */}
      <View style={[styles.pageStackBack2, { backgroundColor: theme.spineColor, borderColor: theme.borderColor }]} />
      <View style={[styles.pageStackBack1, { backgroundColor: theme.headerBg, borderColor: theme.borderColor }]} />

      {/* Main Physical Paper Sheet */}
      <View style={[styles.paperSheet, { backgroundColor: theme.paperBg, borderColor: theme.borderColor }]}>
        {/* Left Spiral/Binding Holes */}
        <View style={[styles.bindingStrip, { borderRightColor: theme.lineColor }]}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.holeGroup}>
              <View style={[styles.bindingHole, { backgroundColor: theme.holeBg, borderColor: theme.borderColor }]} />
              <View style={[styles.bindingRing, { backgroundColor: theme.spineColor }]} />
            </View>
          ))}
        </View>

        {/* Double Red Vertical Margin Line */}
        <View pointerEvents="none" style={[styles.doubleMargin, { borderLeftColor: theme.marginColor, borderRightColor: theme.marginColor }]} />

        {/* Physical Diary Header (Date, Day, Hijri, Bangla, Page #, Bookmark) */}
        <View style={[styles.diaryHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.marginColor }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              activeOpacity={onPressDate ? 0.7 : 1}
              disabled={!onPressDate}
              onPress={onPressDate}
              style={styles.weekdayWrap}
            >
              <Text style={[styles.weekdayText, { color: theme.accentColor, fontFamily: font.boldFontFamily }]}>
                {dateMeta.weekday}
              </Text>
              {onPressDate && (
                <Ionicons name="calendar-outline" size={14} color={theme.accentColor} style={{ marginLeft: 5 }} />
              )}
            </TouchableOpacity>

            <View style={styles.headerRightGroup}>
              <View style={[styles.pageNumPill, { borderColor: theme.borderColor, backgroundColor: theme.paperBg }]}>
                <Text style={[styles.pageNumText, { color: theme.mutedColor }]}>
                  পৃষ্ঠা {toBanglaDigits(entry?.page_number || pageNumber)}
                  {totalPages > 1 ? `/${toBanglaDigits(totalPages)}` : ''}
                </Text>
              </View>

              {onTogglePin ? (
                <TouchableOpacity onPress={onTogglePin} activeOpacity={0.7} style={styles.ribbonBtn}>
                  <Ionicons
                    name={entry?.is_pinned ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    color={entry?.is_pinned ? '#DC2626' : theme.mutedColor}
                  />
                </TouchableOpacity>
              ) : entry?.is_pinned ? (
                <Ionicons name="bookmark" size={20} color="#DC2626" style={{ marginLeft: 4 }} />
              ) : null}
            </View>
          </View>

          {/* 3-Calendar Date Strip */}
          <TouchableOpacity
            activeOpacity={onPressDate ? 0.7 : 1}
            disabled={!onPressDate}
            onPress={onPressDate}
            style={styles.datesStrip}
          >
            <Text style={[styles.dateItem, { color: theme.textColor, fontFamily: font.fontFamily }]}>
              📅 {dateMeta.englishBn}
            </Text>
            <Text style={[styles.dateDot, { color: theme.mutedColor }]}>•</Text>
            <Text style={[styles.dateItem, { color: theme.mutedColor, fontFamily: font.fontFamily }]}>
              🌿 {dateMeta.banglaDate}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.hijriItem, { color: theme.mutedColor, fontFamily: font.fontFamily }]}>
            🌙 {dateMeta.hijriDate}
          </Text>

          {/* Tag, Mood & Weather Badges */}
          <View style={styles.metaBadgesRow}>
            <View style={[styles.miniBadge, { backgroundColor: `${tagStyle.tagColor}18`, borderColor: `${tagStyle.tagColor}35` }]}>
              <Text style={styles.miniBadgeEmoji}>{entry?.emoji || '📝'}</Text>
              <Text style={[styles.miniBadgeText, { color: tagStyle.tagColor }]}>{entry?.tag || 'সাধারণ'}</Text>
            </View>
            {entry?.mood ? (
              <View style={[styles.miniBadge, { backgroundColor: theme.paperBg, borderColor: theme.borderColor }]}>
                <Text style={[styles.miniBadgeText, { color: theme.mutedColor }]}>অনুভূতি: {entry.mood}</Text>
              </View>
            ) : null}
            {entry?.weather ? (
              <View style={[styles.miniBadge, { backgroundColor: theme.paperBg, borderColor: theme.borderColor }]}>
                <Text style={[styles.miniBadgeText, { color: theme.mutedColor }]}>{entry.weather}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Diary Title Area */}
        <View style={[styles.titleSection, { borderBottomColor: theme.lineColor }]}>
          {mode === 'edit' ? (
            <TextInput
              value={entry?.title || ''}
              onChangeText={onChangeTitle}
              placeholder="আজকের শিরোনাম লিখুন..."
              placeholderTextColor={theme.mutedColor}
              maxLength={120}
              style={[
                styles.titleInput,
                {
                  color: theme.textColor,
                  fontFamily: font.boldFontFamily,
                  fontSize: Math.min(24, fontSize + 4),
                },
              ]}
            />
          ) : (
            <Text
              style={[
                styles.titleText,
                {
                  color: theme.textColor,
                  fontFamily: font.boldFontFamily,
                  fontSize: Math.min(24, fontSize + 4),
                },
              ]}
            >
              {entry?.title || 'শিরোনামহীন'}
            </Text>
          )}
        </View>

        {/* Ruled Lines Background + Content */}
        <View style={styles.ruledBodyContainer}>
          {/* Horizontal Notebook Lines */}
          <View pointerEvents="none" style={styles.ruledLinesOverlay}>
            {Array.from({ length: bgLinesCount }).map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.ruledLine,
                  {
                    height: lineHeight,
                    borderBottomColor: theme.lineColor,
                  },
                ]}
              />
            ))}
          </View>

          {mode === 'edit' ? (
            <TextInput
              ref={contentInputRef}
              value={entry?.content || ''}
              onChangeText={onChangeContent}
              onSelectionChange={onSelectionChange}
              placeholder="কলম ধরুন... আজকের দিনটি কেমন কাটলো? মনের কথা, আমল বা চিন্তাধারা লিখুন..."
              placeholderTextColor={theme.mutedColor}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              style={[
                styles.contentInput,
                {
                  color: theme.textColor,
                  fontFamily: font.fontFamily,
                  fontSize,
                  lineHeight: RULE_HEIGHT,
                  minHeight: RULE_HEIGHT * 14,
                },
              ]}
            />
          ) : (
            <View style={styles.readContentWrap}>
              {String(entry?.content || '')
                .split('\n')
                .map((line, idx) => renderReadLine(line, idx))}
            </View>
          )}
        </View>

        {/* Physical Page Footer */}
        <View style={[styles.diaryFooter, { borderTopColor: theme.lineColor }]}>
          <Text style={[styles.footerNote, { color: theme.mutedColor }]}>
            জামিয়াতুস সুন্নাহ ব্যক্তিগত ডায়েরি
          </Text>
          <Text style={[styles.footerNote, { color: theme.mutedColor }]}>
            পৃষ্ঠা — {toBanglaDigits(entry?.page_number || pageNumber)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!scrollEnabled) {
    return pageContent;
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollWrap}
    >
      {pageContent}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollWrap: {
    paddingBottom: 24,
  },
  pageStackWrapper: {
    position: 'relative',
    paddingRight: 6,
    paddingBottom: 6,
  },
  pageStackBack2: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
  },
  pageStackBack1: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  paperSheet: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  bindingStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 24,
    borderRightWidth: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 14,
    zIndex: 3,
  },
  holeGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bindingHole: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
  },
  bindingRing: {
    position: 'absolute',
    left: -4,
    width: 11,
    height: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
  doubleMargin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 42,
    width: 4,
    borderLeftWidth: 1.5,
    borderRightWidth: 1,
    opacity: 0.7,
    zIndex: 2,
  },
  diaryHeader: {
    paddingLeft: 54,
    paddingRight: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weekdayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 17,
    letterSpacing: 0.2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNumPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageNumText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ribbonBtn: {
    padding: 2,
  },
  datesStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  dateItem: {
    fontSize: 13,
  },
  dateDot: {
    fontSize: 12,
  },
  hijriItem: {
    fontSize: 13,
    marginTop: 1,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniBadgeEmoji: {
    fontSize: 11,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  titleSection: {
    paddingLeft: 54,
    paddingRight: 16,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
  },
  titleInput: {
    padding: 0,
    margin: 0,
  },
  titleText: {
    lineHeight: 30,
  },
  ruledBodyContainer: {
    position: 'relative',
    minHeight: RULE_HEIGHT * 12,
  },
  ruledLinesOverlay: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  ruledLine: {
    borderBottomWidth: 1,
    width: '100%',
  },
  contentInput: {
    paddingLeft: 54,
    paddingRight: 16,
    paddingTop: 2,
    paddingBottom: 24,
  },
  readContentWrap: {
    paddingLeft: 54,
    paddingRight: 16,
    paddingTop: 2,
    paddingBottom: 28,
  },
  bodyText: {
    letterSpacing: 0.1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  diaryFooter: {
    paddingLeft: 54,
    paddingRight: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 11,
    fontWeight: '600',
  },
});
