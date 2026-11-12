import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFullDiaryDateMeta, toBanglaDigits } from '../utils/diaryDate';
import { getDiaryFont, getPaperTheme, TAG_COLORS } from '../constants/diaryThemes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPREAD_WIDTH = Math.min(SCREEN_WIDTH - 16, 760);
const SPINE_WIDTH = 18;
const LEAF_WIDTH = Math.floor((SPREAD_WIDTH - SPINE_WIDTH) / 2);
const RULE_HEIGHT = 28;

function isArabicOnlyLine(line) {
  const hasArabic = /[\u0600-\u06FF]/.test(line);
  const hasBangla = /[\u0980-\u09FF]/.test(line);
  return hasArabic && !hasBangla;
}

/**
 * Physical 2-Part Open Diary Spread Component
 * Displays an authentic open physical notebook with Left Page + Center Spine + Right Page.
 * Supports both 'edit' mode (for writing) and 'read' mode (for viewing).
 */
export default function PhysicalDiarySpread({
  entry,
  pageNumber = 1,
  totalPages = 1,
  mode = 'edit', // 'edit' | 'read'
  viewMode = 'spread', // 'spread' (2 parts) | 'focus-right' | 'focus-left'
  fontSize = 15,
  onChangeTitle,
  onChangeContent,
  onChangeReflection,
  onTogglePin,
  onPressDate,
  onToggleChecklistLine,
  contentInputRef,
  onSelectionChange,
  onToggleViewMode,
  onFlipNext,
  onFlipPrev,
  hasNextSpread = false,
  hasPrevSpread = false,
}) {
  const theme = getPaperTheme(entry?.paper_theme);
  const font = getDiaryFont(entry?.font_family);
  const tagStyle = TAG_COLORS[entry?.tag] || TAG_COLORS['সাধারণ'];
  const dateMeta = useMemo(
    () => getFullDiaryDateMeta(entry?.entry_date || entry?.created_at, entry?.hijri_date),
    [entry?.entry_date, entry?.created_at, entry?.hijri_date]
  );

  const leftPageNum = pageNumber % 2 === 0 ? pageNumber - 1 : pageNumber;
  const rightPageNum = leftPageNum + 1;

  const wordCount = useMemo(() => {
    const text = String(entry?.content || '').trim();
    return text ? text.split(/\s+/).length : 0;
  }, [entry?.content]);

  const renderReadLine = (line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <View key={idx} style={{ height: RULE_HEIGHT }} />;
    }

    if (trimmed.startsWith('☑ ') || trimmed.startsWith('[x] ')) {
      const label = trimmed.replace(/^(☑ |\[x\] )/, '');
      return (
        <TouchableOpacity
          key={idx}
          activeOpacity={0.7}
          onPress={() => onToggleChecklistLine?.(idx)}
          style={[styles.checkRow, { minHeight: RULE_HEIGHT }]}
        >
          <Ionicons name="checkbox" size={16} color="#059669" style={{ marginTop: 4 }} />
          <Text
            style={[
              styles.bodyText,
              {
                color: theme.mutedColor,
                fontFamily: font.fontFamily,
                fontSize: Math.max(13, fontSize - 2),
                lineHeight: RULE_HEIGHT,
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

    if (trimmed.startsWith('☐ ') || trimmed.startsWith('[ ] ')) {
      const label = trimmed.replace(/^(☐ |\[ \] )/, '');
      return (
        <TouchableOpacity
          key={idx}
          activeOpacity={0.7}
          onPress={() => onToggleChecklistLine?.(idx)}
          style={[styles.checkRow, { minHeight: RULE_HEIGHT }]}
        >
          <Ionicons name="square-outline" size={16} color={theme.accentColor} style={{ marginTop: 4 }} />
          <Text
            style={[
              styles.bodyText,
              {
                color: theme.textColor,
                fontFamily: font.fontFamily,
                fontSize: Math.max(13, fontSize - 2),
                lineHeight: RULE_HEIGHT,
                flex: 1,
              },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    }

    if (isArabicOnlyLine(trimmed)) {
      return (
        <Text
          key={idx}
          style={[
            styles.bodyText,
            {
              color: theme.textColor,
              fontFamily: 'Amiri-Regular',
              fontSize: Math.max(14, fontSize),
              lineHeight: RULE_HEIGHT + 2,
              textAlign: 'right',
              writingDirection: 'rtl',
            },
          ]}
        >
          {line}
        </Text>
      );
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
      return (
        <Text
          key={idx}
          style={[
            styles.bodyText,
            {
              color: theme.accentColor,
              fontFamily: font.boldFontFamily,
              fontSize: Math.max(13, fontSize - 1),
              lineHeight: RULE_HEIGHT,
            },
          ]}
        >
          {trimmed.slice(2, -2)}
        </Text>
      );
    }

    return (
      <Text
        key={idx}
        style={[
          styles.bodyText,
          {
            color: theme.textColor,
            fontFamily: font.fontFamily,
            fontSize: Math.max(13, fontSize - 2),
            lineHeight: RULE_HEIGHT,
          },
        ]}
      >
        {line}
      </Text>
    );
  };

  const isSpread = viewMode === 'spread';
  const showLeft = isSpread || viewMode === 'focus-left';
  const showRight = isSpread || viewMode === 'focus-right';

  return (
    <View style={styles.outerContainer}>
      {/* View Mode & Quick Flip Control Bar */}
      <View style={styles.topSpreadHeader}>
        <View style={styles.spreadBadge}>
          <Ionicons name="book-outline" size={14} color="#D97706" />
          <Text style={styles.spreadBadgeText}>
            খোলা ফিজিক্যাল ডায়েরি • পৃষ্ঠা {toBanglaDigits(leftPageNum)}-{toBanglaDigits(rightPageNum)}
          </Text>
        </View>

        <View style={styles.topActionControls}>
          {onToggleViewMode && (
            <TouchableOpacity
              onPress={onToggleViewMode}
              activeOpacity={0.8}
              style={[
                styles.viewToggleBtn,
                { backgroundColor: isSpread ? '#D9770618' : '#2563EB18', borderColor: isSpread ? '#D9770640' : '#2563EB40' },
              ]}
            >
              <Ionicons
                name={isSpread ? 'scan-outline' : 'albums-outline'}
                size={13}
                color={isSpread ? '#D97706' : '#2563EB'}
              />
              <Text style={[styles.viewToggleBtnText, { color: isSpread ? '#D97706' : '#2563EB' }]}>
                {isSpread ? 'জুম মোড' : '২ পার্ট ভিউ'}
              </Text>
            </TouchableOpacity>
          )}

          {hasPrevSpread && (
            <TouchableOpacity onPress={onFlipPrev} style={styles.quickFlipBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={15} color="#4B5563" />
            </TouchableOpacity>
          )}
          {hasNextSpread && (
            <TouchableOpacity onPress={onFlipNext} style={styles.quickFlipBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={15} color="#4B5563" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Physical Book Cover Frame (The Leather/Hardbound Desk Background) */}
      <View
        style={[
          styles.bookFrame,
          {
            backgroundColor: theme.spineColor,
            borderColor: theme.borderColor,
          },
        ]}
      >
        {/* Bookmark Ribbon Hanging from the Top Center */}
        <View style={styles.ribbonBookmark} pointerEvents="none">
          <View style={[styles.ribbonTail, { backgroundColor: '#DC2626' }]} />
          <View style={styles.ribbonFork} />
        </View>

        {/* The 2-Page Open Spread Container */}
        <View style={styles.pagesRow}>
          {/* ================= LEFT PAGE (PART 1) ================= */}
          {showLeft && (
            <View
              style={[
                styles.pageLeaf,
                styles.leftLeaf,
                {
                  backgroundColor: theme.paperBg,
                  borderColor: theme.borderColor,
                  width: isSpread ? LEAF_WIDTH : SPREAD_WIDTH,
                },
              ]}
            >
              {/* Left Page Inner Shadow (Curves into center spine) */}
              <View pointerEvents="none" style={styles.leftSpineShadow} />

              {/* Left Page Header: Day, 3-Calendars, Mood, Weather & Tag */}
              <View style={[styles.leafHeader, { backgroundColor: theme.headerBg, borderBottomColor: theme.lineColor }]}>
                <View style={styles.leafHeaderTop}>
                  <TouchableOpacity
                    disabled={!onPressDate}
                    onPress={onPressDate}
                    activeOpacity={0.7}
                    style={styles.dayBadge}
                  >
                    <Text style={[styles.dayText, { color: theme.accentColor, fontFamily: font.boldFontFamily }]}>
                      {dateMeta.weekday}
                    </Text>
                    {onPressDate && (
                      <Ionicons name="calendar-outline" size={12} color={theme.accentColor} style={{ marginLeft: 3 }} />
                    )}
                  </TouchableOpacity>

                  {/* Bookmark Pin */}
                  {onTogglePin ? (
                    <TouchableOpacity onPress={onTogglePin} activeOpacity={0.7} style={styles.pinBtn}>
                      <Ionicons
                        name={entry?.is_pinned ? 'bookmark' : 'bookmark-outline'}
                        size={17}
                        color={entry?.is_pinned ? '#DC2626' : theme.mutedColor}
                      />
                    </TouchableOpacity>
                  ) : entry?.is_pinned ? (
                    <Ionicons name="bookmark" size={15} color="#DC2626" />
                  ) : null}
                </View>

                {/* 3-Calendar Strip */}
                <TouchableOpacity
                  disabled={!onPressDate}
                  onPress={onPressDate}
                  activeOpacity={0.7}
                  style={styles.dateMetaStrip}
                >
                  <Text style={[styles.dateMetaText, { color: theme.textColor, fontFamily: font.fontFamily }]} numberOfLines={1}>
                    📅 {dateMeta.englishBn}
                  </Text>
                  <Text style={[styles.dateMetaText, { color: theme.mutedColor, fontFamily: font.fontFamily }]} numberOfLines={1}>
                    🌿 {dateMeta.banglaDate}
                  </Text>
                  <Text style={[styles.dateMetaText, { color: theme.mutedColor, fontFamily: font.fontFamily }]} numberOfLines={1}>
                    🌙 {dateMeta.hijriDate}
                  </Text>
                </TouchableOpacity>

                {/* Tag, Mood & Weather */}
                <View style={styles.tagMoodRow}>
                  <View style={[styles.tagPill, { backgroundColor: `${tagStyle.tagColor}15`, borderColor: `${tagStyle.tagColor}30` }]}>
                    <Text style={styles.tagPillEmoji}>{entry?.emoji || '📝'}</Text>
                    <Text style={[styles.tagPillText, { color: tagStyle.tagColor }]} numberOfLines={1}>
                      {entry?.tag || 'সাধারণ'}
                    </Text>
                  </View>

                  {entry?.mood ? (
                    <View style={[styles.tagPill, { backgroundColor: theme.paperBg, borderColor: theme.borderColor }]}>
                      <Text style={[styles.tagPillText, { color: theme.mutedColor }]} numberOfLines={1}>
                        {entry.mood}
                      </Text>
                    </View>
                  ) : null}

                  {entry?.weather ? (
                    <View style={[styles.tagPill, { backgroundColor: theme.paperBg, borderColor: theme.borderColor }]}>
                      <Text style={[styles.tagPillText, { color: theme.mutedColor }]} numberOfLines={1}>
                        {entry.weather}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Diary Title on Left Page */}
              <View style={[styles.titleBox, { borderBottomColor: theme.lineColor }]}>
                <Text style={[styles.fieldLabel, { color: theme.mutedColor }]}>ডায়েরির শিরোনাম</Text>
                {mode === 'edit' ? (
                  <TextInput
                    value={entry?.title || ''}
                    onChangeText={onChangeTitle}
                    placeholder="শিরোনাম লিখুন..."
                    placeholderTextColor={theme.mutedColor}
                    maxLength={100}
                    style={[
                      styles.titleInput,
                      {
                        color: theme.textColor,
                        fontFamily: font.boldFontFamily,
                        fontSize: isSpread ? 15 : 18,
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
                        fontSize: isSpread ? 15 : 18,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {entry?.title || 'শিরোনামহীন'}
                  </Text>
                )}
              </View>

              {/* Left Page Daily Amol / Reflection / Checklist Canvas */}
              <View style={styles.leftBodySection}>
                <View style={styles.reflectionHeaderRow}>
                  <Ionicons name="sparkles-outline" size={13} color={theme.accentColor} />
                  <Text style={[styles.reflectionTitle, { color: theme.accentColor }]}>
                    আজকের ভাবনা ও নিয়ত
                  </Text>
                </View>

                {mode === 'edit' ? (
                  <TextInput
                    value={entry?.reflection || ''}
                    onChangeText={onChangeReflection}
                    placeholder="আজকের বিশেষ দু‘আ, আমল বা শুকরিয়া..."
                    placeholderTextColor={theme.mutedColor}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled={false}
                    style={[
                      styles.reflectionInput,
                      {
                        color: theme.textColor,
                        fontFamily: font.fontFamily,
                        fontSize: isSpread ? 12 : 14,
                        lineHeight: RULE_HEIGHT - 4,
                      },
                    ]}
                  />
                ) : (
                  <Text
                    style={[
                      styles.reflectionReadText,
                      {
                        color: theme.textColor,
                        fontFamily: font.fontFamily,
                        fontSize: isSpread ? 12 : 14,
                        lineHeight: RULE_HEIGHT - 4,
                      },
                    ]}
                  >
                    {entry?.reflection || 'আজকের দিনটি আল্লাহর নিয়ামত ও কৃতজ্ঞতায় স্মরণীয় থাকুক।'}
                  </Text>
                )}

                {/* Left Page Ruled Watermark Lines */}
                <View pointerEvents="none" style={styles.leftWatermarkLines}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <View key={i} style={[styles.watermarkLine, { borderBottomColor: theme.lineColor }]} />
                  ))}
                </View>
              </View>

              {/* Left Page Footer */}
              <View style={[styles.leafFooter, { borderTopColor: theme.lineColor }]}>
                <Text style={[styles.pageFooterText, { color: theme.mutedColor }]}>
                  পৃষ্ঠা — {toBanglaDigits(leftPageNum)}
                </Text>
              </View>
            </View>
          )}

          {/* ================= CENTER BINDING SPINE ================= */}
          {isSpread && (
            <View
              style={[
                styles.spineBar,
                {
                  backgroundColor: theme.spineColor,
                  borderColor: theme.borderColor,
                  width: SPINE_WIDTH,
                },
              ]}
            >
              {/* Vertical Crease Gradient Shadow */}
              <View style={styles.spineCenterCrease} />

              {/* Spiral/Stitched Wire Rings */}
              {Array.from({ length: 14 }).map((_, idx) => (
                <View key={idx} style={styles.spineStitchGroup}>
                  <View style={[styles.spineStitchHole, { backgroundColor: theme.holeBg }]} />
                  <View style={[styles.spineStitchRing, { backgroundColor: '#78350F' }]} />
                  <View style={[styles.spineStitchHole, { backgroundColor: theme.holeBg }]} />
                </View>
              ))}
            </View>
          )}

          {/* ================= RIGHT PAGE (PART 2) ================= */}
          {showRight && (
            <View
              style={[
                styles.pageLeaf,
                styles.rightLeaf,
                {
                  backgroundColor: theme.paperBg,
                  borderColor: theme.borderColor,
                  width: isSpread ? LEAF_WIDTH : SPREAD_WIDTH,
                },
              ]}
            >
              {/* Right Page Inner Shadow (Curves into center spine) */}
              <View pointerEvents="none" style={styles.rightSpineShadow} />

              {/* Double Red Margin on the inner side */}
              <View
                pointerEvents="none"
                style={[
                  styles.doubleRedMargin,
                  {
                    borderLeftColor: theme.marginColor,
                    borderRightColor: theme.marginColor,
                  },
                ]}
              />

              {/* Right Page Header Strip */}
              <View style={[styles.rightHeaderStrip, { borderBottomColor: theme.lineColor }]}>
                <Text style={[styles.rightHeaderTitle, { color: theme.accentColor, fontFamily: font.boldFontFamily }]}>
                  মূল ডায়রি বিবরণী
                </Text>
                <Text style={[styles.wordCounterPill, { color: theme.mutedColor }]}>
                  {toBanglaDigits(wordCount)} শব্দ
                </Text>
              </View>

              {/* Right Ruled Lines Background */}
              <View style={styles.rightContentArea}>
                <View pointerEvents="none" style={styles.ruledLinesOverlay}>
                  {Array.from({ length: 22 }).map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.ruledLine,
                        {
                          height: RULE_HEIGHT,
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
                    placeholder="এখানে আপনার দিনলিপি, অভিজ্ঞতা ও বক্তব্য বিস্তারিত লিখুন..."
                    placeholderTextColor={theme.mutedColor}
                    multiline
                    textAlignVertical="top"
                    scrollEnabled={false}
                    style={[
                      styles.contentInput,
                      {
                        color: theme.textColor,
                        fontFamily: font.fontFamily,
                        fontSize: isSpread ? 13 : fontSize,
                        lineHeight: RULE_HEIGHT,
                        minHeight: RULE_HEIGHT * 18,
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

              {/* Right Page Footer */}
              <View style={[styles.leafFooter, { borderTopColor: theme.lineColor }]}>
                <Text style={[styles.pageFooterText, { color: theme.mutedColor }]}>
                  পৃষ্ঠা — {toBanglaDigits(rightPageNum)}
                </Text>
                {hasNextSpread && onFlipNext && (
                  <TouchableOpacity onPress={onFlipNext} style={styles.flipCornerHint} activeOpacity={0.7}>
                    <Text style={[styles.flipCornerText, { color: theme.accentColor }]}>পরবর্তী পাতা</Text>
                    <Ionicons name="arrow-forward" size={11} color={theme.accentColor} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  topSpreadHeader: {
    width: SPREAD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  spreadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  spreadBadgeText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  topActionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewToggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickFlipBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Outer Book Frame (Desk Background / Leather Border)
  bookFrame: {
    width: SPREAD_WIDTH,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 3,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  ribbonBookmark: {
    position: 'absolute',
    top: -2,
    left: SPREAD_WIDTH / 2 - 8,
    zIndex: 20,
    alignItems: 'center',
  },
  ribbonTail: {
    width: 16,
    height: 22,
    borderRadius: 1,
  },
  ribbonFork: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 6,
    borderLeftColor: '#DC2626',
    borderRightColor: '#DC2626',
    borderBottomColor: 'transparent',
  },

  pagesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pageLeaf: {
    flex: 1,
    borderWidth: 0.5,
    position: 'relative',
  },
  leftLeaf: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  rightLeaf: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    paddingLeft: 22, // Space for double red margin
    paddingRight: 8,
    paddingVertical: 8,
  },

  // Crease shadow for left leaf (darker on right edge)
  leftSpineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
    zIndex: 5,
  },
  // Crease shadow for right leaf (darker on left edge)
  rightSpineShadow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 14,
    backgroundColor: 'rgba(0,0,0,0.04)',
    zIndex: 5,
  },

  // Spine Bar (Center Seam)
  spineBar: {
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    zIndex: 10,
  },
  spineCenterCrease: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 8,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  spineStitchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  spineStitchHole: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    opacity: 0.9,
  },
  spineStitchRing: {
    width: 6,
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },

  // Left Leaf Header
  leafHeader: {
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  leafHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinBtn: {
    padding: 2,
  },
  dateMetaStrip: {
    gap: 1,
    marginBottom: 5,
  },
  dateMetaText: {
    fontSize: 10.5,
  },
  tagMoodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.8,
  },
  tagPillEmoji: {
    fontSize: 10,
  },
  tagPillText: {
    fontSize: 9.5,
    fontWeight: '600',
  },

  // Title Box
  titleBox: {
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 0.8,
  },
  fieldLabel: {
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '500',
  },
  titleInput: {
    padding: 0,
    margin: 0,
  },
  titleText: {
    fontWeight: '700',
  },

  // Left Reflection Area
  leftBodySection: {
    flex: 1,
    minHeight: 180,
    position: 'relative',
    paddingVertical: 4,
  },
  reflectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  reflectionTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  reflectionInput: {
    padding: 0,
    margin: 0,
    zIndex: 2,
  },
  reflectionReadText: {
    zIndex: 2,
  },
  leftWatermarkLines: {
    position: 'absolute',
    top: 26,
    left: 0,
    right: 0,
    bottom: 0,
  },
  watermarkLine: {
    height: RULE_HEIGHT - 4,
    borderBottomWidth: 0.5,
    opacity: 0.5,
  },

  // Double Red Margin
  doubleRedMargin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 14,
    width: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    zIndex: 4,
    opacity: 0.7,
  },

  // Right Leaf Header
  rightHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    marginBottom: 4,
    borderBottomWidth: 0.8,
  },
  rightHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  wordCounterPill: {
    fontSize: 10,
  },

  // Right Ruled Lines
  rightContentArea: {
    position: 'relative',
    minHeight: RULE_HEIGHT * 18,
    flex: 1,
  },
  ruledLinesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ruledLine: {
    borderBottomWidth: 0.75,
  },
  contentInput: {
    padding: 0,
    margin: 0,
    zIndex: 2,
  },
  readContentWrap: {
    zIndex: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bodyText: {},

  // Page Footers
  leafFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    marginTop: 6,
    borderTopWidth: 0.8,
  },
  pageFooterText: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  flipCornerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flipCornerText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
