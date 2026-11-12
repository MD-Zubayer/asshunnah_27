import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PhysicalDiaryPage from './PhysicalDiaryPage';
import { toBanglaDigits, getFullDiaryDateMeta } from '../utils/diaryDate';
import { getPaperTheme } from '../constants/diaryThemes';

function parseDiaryEntry(entry) {
  if (!entry) return entry;
  const raw = String(entry.content || '');
  const regex = /^\*\*আজকের ভাবনা ও নিয়ত:\*\*\n([\s\S]*?)\n\n---\n\n([\s\S]*)$/;
  const match = raw.match(regex);
  if (match) {
    return {
      ...entry,
      reflection: match[1].trim(),
      content: match[2].trim(),
    };
  }
  return entry;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH - 24;

/**
 * Interactive Physical Book Page-Flipper
 * - Smooth 3D perspective page turn on swipe or button tap (1 page at a time)
 * - Rapid cascade multi-page flip (+5 / -5, or dragging the Page Edge Scrubber)
 * - Quick Index Modal to jump to any page
 */
export default function DiaryBookFlipper({
  entries,
  initialIndex = 0,
  fontSize = 17,
  onIndexChange,
  onTogglePin,
  onToggleChecklistLine,
  colors,
}) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, Math.max(0, entries.length - 1)))
  );
  const [underIndex, setUnderIndex] = useState(currentIndex);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [scrubberPreviewIdx, setScrubberPreviewIdx] = useState(null);
  const [scrubberWidth, setScrubberWidth] = useState(PAGE_WIDTH - 40);

  const flipAngle = useSharedValue(0); // 0 = flat, -110 = turned left (next), +110 = turned right (prev)
  const cascadeTimerRef = useRef(null);

  useEffect(() => {
    if (currentIndex >= entries.length && entries.length > 0) {
      setCurrentIndex(entries.length - 1);
      setUnderIndex(entries.length - 1);
    }
  }, [entries.length, currentIndex]);

  useEffect(() => {
    return () => {
      if (cascadeTimerRef.current) clearInterval(cascadeTimerRef.current);
    };
  }, []);

  const notifyIndex = useCallback(
    (idx) => {
      setCurrentIndex(idx);
      setUnderIndex(idx);
      flipAngle.value = 0;
      setIsFlipping(false);
      onIndexChange?.(idx);
    },
    [onIndexChange, flipAngle]
  );

  // Flip exactly 1 page forward or backward with realistic 3D curl
  const flipSinglePage = useCallback(
    (direction) => {
      if (isFlipping || entries.length <= 1) return;
      const target = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (target < 0 || target >= entries.length) return;

      setIsFlipping(true);
      setUnderIndex(target);

      const destAngle = direction === 'next' ? -135 : 135;
      flipAngle.value = withTiming(
        destAngle,
        { duration: 580, easing: Easing.bezier(0.25, 1, 0.45, 1) },
        (finished) => {
          if (finished) {
            runOnJS(notifyIndex)(target);
          }
        }
      );
    },
    [isFlipping, entries.length, currentIndex, flipAngle, notifyIndex]
  );

  // Rapid cascade multi-page flip (like thumbing through multiple physical pages at once)
  const flipToTargetPage = useCallback(
    (targetIdx) => {
      const clamped = Math.max(0, Math.min(entries.length - 1, targetIdx));
      if (clamped === currentIndex || isFlipping) return;

      const diff = clamped - currentIndex;
      const absDiff = Math.abs(diff);

      if (absDiff === 1) {
        flipSinglePage(diff > 0 ? 'next' : 'prev');
        return;
      }

      setIsFlipping(true);
      const direction = diff > 0 ? 'next' : 'prev';
      const stepsToAnimate = Math.min(absDiff, 5); // swift 3-5 visual sheet flips
      const stepIndices = [];
      for (let s = 1; s <= stepsToAnimate; s++) {
        const mapped = Math.round(currentIndex + (diff * s) / stepsToAnimate);
        stepIndices.push(mapped);
      }
      stepIndices[stepIndices.length - 1] = clamped;

      let stepPos = 0;
      const runNextLeaf = () => {
        if (stepPos >= stepIndices.length) {
          notifyIndex(clamped);
          return;
        }
        const nextIdx = stepIndices[stepPos];
        setUnderIndex(nextIdx);
        const angle = direction === 'next' ? -92 : 92;

        flipAngle.value = withSequence(
          withTiming(angle, { duration: 115, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1 }, (finished) => {
            if (finished) {
              stepPos += 1;
              runOnJS(setCurrentIndex)(nextIdx);
              if (stepPos < stepIndices.length) {
                runOnJS(runNextLeaf)();
              } else {
                runOnJS(notifyIndex)(clamped);
              }
            }
          })
        );
      };

      runNextLeaf();
    },
    [currentIndex, entries.length, isFlipping, flipSinglePage, flipAngle, notifyIndex]
  );

  // Interactive Pan Gesture on the page (drag to curl & turn like a real paper leaf)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      if (isFlipping || entries.length <= 1) return;
      // Map drag translation to natural flip angle (-135 to 135)
      const ratio = e.translationX / PAGE_WIDTH;
      const clampedRatio = Math.max(-1, Math.min(1, ratio));

      // Resistance at first or last page
      if (clampedRatio < 0 && currentIndex >= entries.length - 1) {
        flipAngle.value = clampedRatio * 15;
      } else if (clampedRatio > 0 && currentIndex <= 0) {
        flipAngle.value = clampedRatio * 15;
      } else {
        flipAngle.value = clampedRatio * 135;
        const previewTarget = clampedRatio < 0 ? currentIndex + 1 : currentIndex - 1;
        if (previewTarget >= 0 && previewTarget < entries.length) {
          runOnJS(setUnderIndex)(previewTarget);
        }
      }
    })
    .onEnd((e) => {
      if (isFlipping || entries.length <= 1) return;
      const shouldNext =
        (e.translationX < -PAGE_WIDTH * 0.2 || e.velocityX < -400) &&
        currentIndex < entries.length - 1;
      const shouldPrev =
        (e.translationX > PAGE_WIDTH * 0.2 || e.velocityX > 400) &&
        currentIndex > 0;

      if (shouldNext) {
        runOnJS(setIsFlipping)(true);
        runOnJS(setUnderIndex)(currentIndex + 1);
        flipAngle.value = withTiming(
          -135,
          { duration: 420, easing: Easing.bezier(0.25, 1, 0.45, 1) },
          (fin) => {
            if (fin) runOnJS(notifyIndex)(currentIndex + 1);
          }
        );
      } else if (shouldPrev) {
        runOnJS(setIsFlipping)(true);
        runOnJS(setUnderIndex)(currentIndex - 1);
        flipAngle.value = withTiming(
          135,
          { duration: 420, easing: Easing.bezier(0.25, 1, 0.45, 1) },
          (fin) => {
            if (fin) runOnJS(notifyIndex)(currentIndex - 1);
          }
        );
      } else {
        flipAngle.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });
        runOnJS(setUnderIndex)(currentIndex);
      }
    });

  // Scrubber gesture for flipping multiple pages smoothly at once
  const scrubberGesture = Gesture.Pan()
    .onBegin((e) => {
      if (entries.length <= 1) return;
      const ratio = Math.max(0, Math.min(1, e.x / Math.max(1, scrubberWidth)));
      const idx = Math.round(ratio * (entries.length - 1));
      runOnJS(setScrubberPreviewIdx)(idx);
    })
    .onUpdate((e) => {
      if (entries.length <= 1) return;
      const ratio = Math.max(0, Math.min(1, e.x / Math.max(1, scrubberWidth)));
      const idx = Math.round(ratio * (entries.length - 1));
      runOnJS(setScrubberPreviewIdx)(idx);
    })
    .onEnd((e) => {
      if (entries.length <= 1) return;
      const ratio = Math.max(0, Math.min(1, e.x / Math.max(1, scrubberWidth)));
      const idx = Math.round(ratio * (entries.length - 1));
      runOnJS(setScrubberPreviewIdx)(null);
      runOnJS(flipToTargetPage)(idx);
    })
    .onFinalize(() => {
      runOnJS(setScrubberPreviewIdx)(null);
    });

  // Animated 3D realistic physical curling leaf style
  const topPageAnimatedStyle = useAnimatedStyle(() => {
    const angle = flipAngle.value; // negative = flipping to next (curling left), positive = flipping to prev (curling right)
    const isTurningNext = angle < 0;

    // Anchor hinge pinned at the left binding spine when turning next, or right edge when turning prev
    const pivotX = isTurningNext ? -PAGE_WIDTH / 2 : PAGE_WIDTH / 2;

    // Soft cylindrical paper curl (skew & horizontal compression arch)
    const curlSkew = interpolate(
      angle,
      [-135, -75, -30, 0, 30, 75, 135],
      [0, -7.5, -4.5, 0, 4.5, 7.5, 0],
      Extrapolation.CLAMP
    );

    const curlScale = interpolate(
      Math.abs(angle),
      [0, 50, 90, 135],
      [1, 0.985, 0.965, 0.94],
      Extrapolation.CLAMP
    );

    // Arch translation (simulates the paper arching towards the viewer as it bends)
    const archLift = interpolate(
      Math.abs(angle),
      [0, 65, 135],
      [0, -18, 0],
      Extrapolation.CLAMP
    );

    // Page opacity: stays fully visible and bends, then gently fades out as it completes 135 deg flat on left stack
    const opacity = interpolate(
      Math.abs(angle),
      [0, 95, 125, 135],
      [1, 1, 0.75, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { perspective: 1200 },
        { translateX: pivotX },
        { rotateY: `${angle}deg` },
        { translateY: archLift },
        { skewY: `${curlSkew}deg` },
        { translateX: -pivotX },
        { scale: curlScale },
      ],
    };
  });

  // Dynamic cylindrical curl highlight & shadow overlay on the bending paper
  const curlShadowStyle = useAnimatedStyle(() => {
    const absDeg = Math.abs(flipAngle.value);
    const shadowOpacity = interpolate(
      absDeg,
      [0, 35, 75, 120, 135],
      [0, 0.35, 0.6, 0.25, 0],
      Extrapolation.CLAMP
    );
    return { opacity: shadowOpacity };
  });

  // Smooth, subtle reveal on the underlying page as the top sheet rolls away
  const underPageStyle = useAnimatedStyle(() => {
    const absDeg = Math.abs(flipAngle.value);
    const scale = interpolate(absDeg, [0, 90], [0.985, 1], Extrapolation.CLAMP);
    const opacity = interpolate(absDeg, [0, 15, 90], [0.88, 0.96, 1], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  if (!entries || entries.length === 0) return null;

  const activeEntry = entries[currentIndex] || entries[0];
  const underEntry = entries[underIndex] || activeEntry;
  const activeTheme = getPaperTheme(activeEntry?.paper_theme);
  const previewEntry = scrubberPreviewIdx !== null ? entries[scrubberPreviewIdx] : null;

  return (
    <View style={styles.wrapper}>
      {/* Book Pages Stage */}
      <View style={styles.stage}>
        {/* Underneath Target Page (Always mounted at bottom layer to reveal during curl) */}
        <Animated.View pointerEvents="none" style={[styles.underPageLayer, underPageStyle]}>
          <PhysicalDiaryPage
            entry={underEntry}
            pageNumber={underIndex + 1}
            totalPages={entries.length}
            mode="read"
            fontSize={fontSize}
            scrollEnabled={false}
          />
        </Animated.View>

        {/* Active Top Page with Swipe-to-Flip Gesture */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.topPageLayer, topPageAnimatedStyle]}>
            <PhysicalDiaryPage
              entry={activeEntry}
              pageNumber={currentIndex + 1}
              totalPages={entries.length}
              mode="read"
              fontSize={fontSize}
              scrollEnabled={true}
              onTogglePin={() => onTogglePin?.(activeEntry)}
              onToggleChecklistLine={(lineIdx) => onToggleChecklistLine?.(activeEntry, lineIdx)}
            />
            {/* Dynamic Fold Shadow */}
            <Animated.View pointerEvents="none" style={[styles.curlShadowOverlay, curlShadowStyle]} />
          </Animated.View>
        </GestureDetector>
      </View>

      {/* Bottom Book Navigation & Multi-Page Scrubber */}
      <View
        style={[
          styles.navDock,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            paddingBottom: Math.max(14, insets.bottom + 8),
          },
        ]}
      >
        {/* Floating Scrubber Preview Bubble */}
        {previewEntry && (
          <View style={[styles.scrubberTooltip, { backgroundColor: activeTheme.accentColor }]}>
            <Text style={styles.scrubberTooltipPage}>
              পৃষ্ঠা {toBanglaDigits(scrubberPreviewIdx + 1)} / {toBanglaDigits(entries.length)}
            </Text>
            <Text style={styles.scrubberTooltipTitle} numberOfLines={1}>
              {previewEntry.title}
            </Text>
          </View>
        )}

        {/* Page Edge Rapid Scrubber (Multi-page drag flip) */}
        {entries.length > 1 && (
          <GestureDetector gesture={scrubberGesture}>
            <View
              style={styles.scrubberArea}
              onLayout={(e) => setScrubberWidth(e.nativeEvent.layout.width)}
            >
              <View style={[styles.scrubberTrack, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                {/* Subtle page-edge tick marks */}
                <View style={styles.ticksRow}>
                  {Array.from({ length: Math.min(entries.length, 20) }).map((_, i) => (
                    <View key={i} style={[styles.pageTick, { backgroundColor: colors.textMuted }]} />
                  ))}
                </View>
                {/* Filled Progress */}
                <View
                  style={[
                    styles.scrubberFill,
                    {
                      backgroundColor: `${activeTheme.accentColor}30`,
                      width: `${(((scrubberPreviewIdx ?? currentIndex) + 1) / entries.length) * 100}%`,
                    },
                  ]}
                />
                {/* Thumb */}
                <View
                  style={[
                    styles.scrubberThumb,
                    {
                      backgroundColor: activeTheme.accentColor,
                      left: `${((scrubberPreviewIdx ?? currentIndex) / Math.max(1, entries.length - 1)) * 90}%`,
                    },
                  ]}
                >
                  <Ionicons name="book" size={11} color="#fff" />
                </View>
              </View>
              <Text style={[styles.scrubberHint, { color: colors.textMuted }]}>
                স্লাইড করে একসাথে অনেক পৃষ্ঠা উল্টান
              </Text>
            </View>
          </GestureDetector>
        )}

        {/* Control Buttons: -5 | -1 | Index Pill | +1 | +5 */}
        <View style={styles.navButtonsRow}>
          <TouchableOpacity
            onPress={() => flipToTargetPage(currentIndex - 5)}
            disabled={currentIndex === 0 || isFlipping}
            style={[styles.jumpBtn, { backgroundColor: colors.inputBg, opacity: currentIndex === 0 ? 0.35 : 1 }]}
          >
            <Text style={[styles.jumpBtnText, { color: colors.text }]}>«৫</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => flipSinglePage('prev')}
            disabled={currentIndex === 0 || isFlipping}
            style={[styles.stepBtn, { backgroundColor: colors.inputBg, opacity: currentIndex === 0 ? 0.35 : 1 }]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
            <Text style={[styles.stepBtnText, { color: colors.text }]}>পূর্বের</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowIndexModal(true)}
            style={[styles.indexPill, { backgroundColor: `${activeTheme.accentColor}15`, borderColor: `${activeTheme.accentColor}40` }]}
          >
            <Ionicons name="list-outline" size={14} color={activeTheme.accentColor} />
            <Text style={[styles.indexPillText, { color: activeTheme.accentColor }]}>
              {toBanglaDigits(currentIndex + 1)} / {toBanglaDigits(entries.length)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => flipSinglePage('next')}
            disabled={currentIndex >= entries.length - 1 || isFlipping}
            style={[styles.stepBtn, { backgroundColor: colors.inputBg, opacity: currentIndex >= entries.length - 1 ? 0.35 : 1 }]}
          >
            <Text style={[styles.stepBtnText, { color: colors.text }]}>পরবর্তী</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => flipToTargetPage(currentIndex + 5)}
            disabled={currentIndex >= entries.length - 1 || isFlipping}
            style={[styles.jumpBtn, { backgroundColor: colors.inputBg, opacity: currentIndex >= entries.length - 1 ? 0.35 : 1 }]}
          >
            <Text style={[styles.jumpBtnText, { color: colors.text }]}>৫»</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table of Contents / Page Index Modal */}
      <Modal
        visible={showIndexModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIndexModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.indexModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.indexModalHeader}>
              <Text style={[styles.indexModalTitle, { color: colors.text }]}>
                📖 ডায়েরির সূচিপত্র ({toBanglaDigits(entries.length)} পৃষ্ঠা)
              </Text>
              <TouchableOpacity onPress={() => setShowIndexModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.indexList} showsVerticalScrollIndicator={false}>
              {entries.map((item, idx) => {
                const isCurrent = idx === currentIndex;
                const dMeta = getFullDiaryDateMeta(item.entry_date || item.created_at, item.hijri_date);
                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    onPress={() => {
                      setShowIndexModal(false);
                      flipToTargetPage(idx);
                    }}
                    style={[
                      styles.indexRow,
                      {
                        backgroundColor: isCurrent ? `${activeTheme.accentColor}12` : 'transparent',
                        borderBottomColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={[styles.indexPageBadge, { backgroundColor: isCurrent ? activeTheme.accentColor : colors.inputBg }]}>
                      <Text style={[styles.indexPageNum, { color: isCurrent ? '#fff' : colors.text }]}>
                        {toBanglaDigits(idx + 1)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.indexRowTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.emoji || '📝'} {item.title}
                      </Text>
                      <Text style={[styles.indexRowDate, { color: colors.textSecondary }]}>
                        {dMeta.englishBn} • {dMeta.weekday}
                      </Text>
                    </View>
                    {item.is_pinned && <Ionicons name="bookmark" size={16} color="#DC2626" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  stage: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  underPageLayer: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingTop: 8,
    overflow: 'hidden',
  },
  topPageLayer: {
    flex: 1,
    position: 'relative',
  },
  pageScrollContent: {
    paddingBottom: 20,
  },
  curlShadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    borderRadius: 14,
  },
  navDock: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    position: 'relative',
  },
  scrubberTooltip: {
    position: 'absolute',
    top: -54,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    maxWidth: '85%',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  scrubberTooltipPage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrubberTooltipTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrubberArea: {
    marginBottom: 10,
  },
  scrubberTrack: {
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    opacity: 0.35,
  },
  pageTick: {
    width: 1.5,
    height: 10,
    borderRadius: 1,
  },
  scrubberFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  scrubberThumb: {
    position: 'absolute',
    width: 24,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  scrubberHint: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  jumpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  jumpBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  indexPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  indexPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  indexModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '75%',
    padding: 18,
  },
  indexModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  indexModalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  indexList: {
    maxHeight: 420,
  },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderRadius: 10,
  },
  indexPageBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexPageNum: {
    fontSize: 12,
    fontWeight: '900',
  },
  indexRowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  indexRowDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
