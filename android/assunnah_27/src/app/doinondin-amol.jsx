import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Share,
  useColorScheme,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/theme';
import { PAPER_THEMES, getPaperTheme } from '../constants/diaryThemes';
import { toBanglaDigits } from '../utils/diaryDate';
import {
  BOOK_META,
  AMOL_CHAPTERS,
  ASMAUL_HUSNA_DATA,
  getTotalAmolStats,
  formatAmolForDiaryOrShare,
} from '../data/dailyAmol';

const STORAGE_KEYS = {
  BOOKMARKS: '@assunnah_amol_bookmarks_v1',
  THEME: '@assunnah_amol_paper_theme_v1',
  FONT_SIZE: '@assunnah_amol_font_size_v1',
  HAJJ_CHECKLIST: '@assunnah_amol_hajj_checklist_v1',
};

const TABS_LIST = [
  ...AMOL_CHAPTERS.map((c) => ({
    id: c.id,
    label: c.shortTitle,
    chapterNumber: c.chapterNumber,
    title: c.title,
    icon: c.icon,
    color: c.color,
    pageRange: c.pageRange,
    count: c.items.length,
  })),
  {
    id: ASMAUL_HUSNA_DATA.id,
    label: ASMAUL_HUSNA_DATA.shortTitle,
    chapterNumber: ASMAUL_HUSNA_DATA.chapterNumber,
    title: ASMAUL_HUSNA_DATA.title,
    icon: ASMAUL_HUSNA_DATA.icon,
    color: ASMAUL_HUSNA_DATA.color,
    pageRange: ASMAUL_HUSNA_DATA.pageRange,
    count: ASMAUL_HUSNA_DATA.names.length,
  },
];

function TasbihBadge({ counterKey, targetCount, countsMap, onIncrement, onReset, paper }) {
  const current = countsMap[counterKey] || 0;
  const completed = current >= targetCount;

  return (
    <View
      style={[
        styles.tasbihRow,
        {
          backgroundColor: completed ? '#05966918' : `${paper.accentColor}10`,
          borderColor: completed ? '#05966950' : `${paper.accentColor}30`,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onIncrement(counterKey, targetCount)}
        style={styles.tasbihTapBtn}
      >
        <Ionicons
          name={completed ? 'checkmark-circle' : 'finger-print-outline'}
          size={18}
          color={completed ? '#059669' : paper.accentColor}
        />
        <Text
          style={[
            styles.tasbihText,
            { color: completed ? '#059669' : paper.accentColor },
          ]}
        >
          তাসবীহ গণনা: {toBanglaDigits(current)} / {toBanglaDigits(targetCount)} বার
          {completed ? ' (সম্পন্ন ✓)' : ' • ট্যাপ করুন'}
        </Text>
      </TouchableOpacity>
      {current > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onReset(counterKey)}
          style={styles.tasbihResetBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="refresh" size={16} color={paper.mutedColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function DoinondinAmolScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const flatListRef = useRef(null);

  const initialChapter =
    params?.chapter && typeof params.chapter === 'string'
      ? params.chapter
      : 'ch1-morning-evening';
  const initialQuery =
    params?.q && typeof params.q === 'string' ? params.q : '';

  const [activeTab, setActiveTab] = useState(initialChapter);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [paperThemeId, setPaperThemeId] = useState(isDark ? 'night' : 'cream');
  const [fontSize, setFontSize] = useState(16);
  const [bookmarks, setBookmarks] = useState([]);
  const [tasbihCounts, setTasbihCounts] = useState({});
  const [hajjChecked, setHajjChecked] = useState({});
  const [showTocModal, setShowTocModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const stats = useMemo(() => getTotalAmolStats(), []);
  const paper = useMemo(() => getPaperTheme(paperThemeId), [paperThemeId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [savedBookmarks, savedTheme, savedFont, savedHajj] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS),
          AsyncStorage.getItem(STORAGE_KEYS.THEME),
          AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE),
          AsyncStorage.getItem(STORAGE_KEYS.HAJJ_CHECKLIST),
        ]);
        if (!mounted) return;
        if (savedBookmarks) {
          const parsed = JSON.parse(savedBookmarks);
          if (Array.isArray(parsed)) setBookmarks(parsed);
        }
        if (savedTheme && PAPER_THEMES[savedTheme]) {
          setPaperThemeId(savedTheme);
        }
        if (savedFont) {
          const num = Number(savedFont);
          if (!Number.isNaN(num) && num >= 13 && num <= 24) setFontSize(num);
        }
        if (savedHajj) {
          const parsedHajj = JSON.parse(savedHajj);
          if (parsedHajj && typeof parsedHajj === 'object') setHajjChecked(parsedHajj);
        }
      } catch (e) {
        console.log('[Amol] Load prefs error:', e.message);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleBookmark = async (itemId) => {
    setBookmarks((prev) => {
      const exists = prev.includes(itemId);
      const next = exists ? prev.filter((id) => id !== itemId) : [...prev, itemId];
      AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const changePaperTheme = (themeId) => {
    setPaperThemeId(themeId);
    AsyncStorage.setItem(STORAGE_KEYS.THEME, themeId).catch(() => {});
  };

  const updateFontSize = (delta) => {
    setFontSize((prev) => {
      const next = Math.max(13, Math.min(22, prev + delta));
      AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(next)).catch(() => {});
      return next;
    });
  };

  const incrementTasbih = (key, target) => {
    Vibration.vibrate(15);
    setTasbihCounts((prev) => {
      const cur = prev[key] || 0;
      const nextVal = cur + 1;
      if (nextVal === target) {
        Vibration.vibrate([0, 40, 60, 40]);
      }
      return { ...prev, [key]: nextVal };
    });
  };

  const resetTasbih = (key) => {
    setTasbihCounts((prev) => ({ ...prev, [key]: 0 }));
  };

  const toggleHajjChecklist = (index) => {
    setHajjChecked((prev) => {
      const next = { ...prev, [index]: !prev[index] };
      AsyncStorage.setItem(STORAGE_KEYS.HAJJ_CHECKLIST, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  const handleShareItem = async (item, chapterTitle) => {
    try {
      const text = `${formatAmolForDiaryOrShare(item, chapterTitle)}\n\n— দৈনন্দিন আমল ও দু‘আসমূহ (আস-সুন্নাহ অ্যাপ)`;
      await Share.share({ message: text, title: item.title });
    } catch (e) {
      console.log('[Amol] Share error:', e.message);
    }
  };

  const handleSaveToDiary = (item, chapterTitle) => {
    const formatted = formatAmolForDiaryOrShare(item, chapterTitle);
    router.push({
      pathname: '/create-diary',
      params: {
        title: item.title,
        content: formatted,
        tag: chapterTitle.includes('নামায') || chapterTitle.includes('আমল') ? 'আমল' : 'দোয়া',
        mood: 'প্রশান্ত',
      },
    });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Build displayed list items depending on search, favorites, Asmaul Husna, or selected chapter
  const { activeChapterObj, displayedItems, matchedNames } = useMemo(() => {
    if (normalizedQuery) {
      const foundItems = [];
      AMOL_CHAPTERS.forEach((ch) => {
        ch.items.forEach((item) => {
          const subText = Array.isArray(item.subItems)
            ? item.subItems
                .map((s) => `${s.label || ''} ${s.arabic || ''} ${s.pronunciation || ''} ${s.meaning || ''} ${s.fazilat || ''} ${s.reference || ''}`)
                .join(' ')
            : '';
          const checkText = Array.isArray(item.checklistItems) ? item.checklistItems.join(' ') : '';
          const haystack = `${ch.title} ${item.title || ''} ${item.arabic || ''} ${item.pronunciation || ''} ${item.meaning || ''} ${item.extraContent || ''} ${item.fazilat || ''} ${item.note || ''} ${item.reference || ''} ${subText} ${checkText}`.toLowerCase();
          if (haystack.includes(normalizedQuery)) {
            foundItems.push({ ...item, _chapterTitle: ch.title, _chapterColor: ch.color });
          }
        });
      });

      const namesMatch = ASMAUL_HUSNA_DATA.names.filter((n) =>
        `${n.arabic} ${n.pronunciation} ${n.meaning} ${n.no}`.toLowerCase().includes(normalizedQuery)
      );

      return {
        activeChapterObj: null,
        displayedItems: foundItems,
        matchedNames: namesMatch,
      };
    }

    if (activeTab === 'favorites') {
      const favs = [];
      AMOL_CHAPTERS.forEach((ch) => {
        ch.items.forEach((item) => {
          if (bookmarks.includes(item.id)) {
            favs.push({ ...item, _chapterTitle: ch.title, _chapterColor: ch.color });
          }
        });
      });
      return { activeChapterObj: null, displayedItems: favs, matchedNames: [] };
    }

    if (activeTab === ASMAUL_HUSNA_DATA.id) {
      return {
        activeChapterObj: ASMAUL_HUSNA_DATA,
        displayedItems: [],
        matchedNames: ASMAUL_HUSNA_DATA.names,
      };
    }

    const ch = AMOL_CHAPTERS.find((c) => c.id === activeTab) || AMOL_CHAPTERS[0];
    return {
      activeChapterObj: ch,
      displayedItems: ch.items.map((item) => ({
        ...item,
        _chapterTitle: ch.title,
        _chapterColor: ch.color,
      })),
      matchedNames: [],
    };
  }, [activeTab, normalizedQuery, bookmarks]);

  const handleSelectChapter = (tabId) => {
    setActiveTab(tabId);
    setShowTocModal(false);
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const renderAsmaulHusnaGrid = (namesList, showHeaderIntro) => (
    <View style={styles.asmaSection}>
      {showHeaderIntro && (
        <View style={[styles.introCard, { backgroundColor: paper.paperBg, borderColor: paper.borderColor }]}>
          <Text style={[styles.introBannerTitle, { color: paper.accentColor }]}>
            {ASMAUL_HUSNA_DATA.title}
          </Text>
          <Text style={[styles.introBannerText, { color: paper.textColor, fontSize: fontSize - 1 }]}>
            {ASMAUL_HUSNA_DATA.hadithNote}
          </Text>
          <View style={[styles.specialBox, { backgroundColor: `${paper.accentColor}12`, borderColor: `${paper.accentColor}30` }]}>
            <Text style={[styles.specialBoxLabel, { color: paper.accentColor }]}>বিশেষ আমল ও বৈশিষ্ট্য (পৃষ্ঠা ১৫১):</Text>
            <Text style={[styles.introBannerText, { color: paper.textColor, fontSize: fontSize - 1 }]}>
              {ASMAUL_HUSNA_DATA.specialAmol}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.namesGrid}>
        {namesList.map((n) => (
          <View
            key={n.no}
            style={[
              styles.nameCard,
              {
                backgroundColor: paper.paperBg,
                borderColor: paper.borderColor,
              },
            ]}
          >
            <View style={styles.nameCardTop}>
              <View style={[styles.nameNoBadge, { backgroundColor: `${ASMAUL_HUSNA_DATA.color}18` }]}>
                <Text style={[styles.nameNoText, { color: ASMAUL_HUSNA_DATA.color }]}>
                  {toBanglaDigits(n.no)}
                </Text>
              </View>
              <Text style={[styles.nameArabic, { color: paper.textColor, fontSize: fontSize + 8 }]}>
                {n.arabic}
              </Text>
            </View>
            <Text style={[styles.namePron, { color: paper.accentColor, fontSize: fontSize - 1 }]}>
              {n.pronunciation}
            </Text>
            <Text style={[styles.nameMeaning, { color: paper.mutedColor, fontSize: fontSize - 2 }]}>
              {n.meaning}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderAmolCard = ({ item }) => {
    const isBookmarked = bookmarks.includes(item.id);
    const accent = item._chapterColor || paper.accentColor;

    return (
      <View
        style={[
          styles.amolCard,
          {
            backgroundColor: paper.paperBg,
            borderColor: paper.borderColor,
          },
        ]}
      >
        {/* Left binding accent strip */}
        <View style={[styles.cardLeftAccent, { backgroundColor: accent }]} />

        <View style={styles.cardInner}>
          {/* Header Row */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.numberBadge, { backgroundColor: `${accent}18`, borderColor: `${accent}40` }]}>
              <Text style={[styles.numberBadgeText, { color: accent }]}>{item.number}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {normalizedQuery || activeTab === 'favorites' ? (
                <Text style={[styles.chapterTagMini, { color: accent }]} numberOfLines={1}>
                  {item._chapterTitle}
                </Text>
              ) : null}
              <Text style={[styles.cardTitle, { color: paper.textColor, fontSize: fontSize + 1 }]}>
                {item.title}
              </Text>
            </View>
            {item.page ? (
              <View style={[styles.pagePill, { backgroundColor: paper.headerBg, borderColor: paper.borderColor }]}>
                <Text style={[styles.pagePillText, { color: paper.mutedColor }]}>
                  পৃ. {toBanglaDigits(item.page)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Main Arabic Block */}
          {item.arabic ? (
            <View style={[styles.arabicBox, { backgroundColor: paper.headerBg, borderColor: paper.borderColor }]}>
              <Text
                selectable
                style={[
                  styles.arabicText,
                  {
                    color: paper.textColor,
                    fontSize: fontSize + 6,
                    lineHeight: (fontSize + 6) * 1.75,
                  },
                ]}
              >
                {item.arabic}
              </Text>
            </View>
          ) : null}

          {/* Main Tasbih Counter if count is set */}
          {item.count ? (
            <TasbihBadge
              counterKey={item.id}
              targetCount={item.count}
              countsMap={tasbihCounts}
              onIncrement={incrementTasbih}
              onReset={resetTasbih}
              paper={paper}
            />
          ) : null}

          {/* Pronunciation */}
          {item.pronunciation ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.fieldLabel, { color: accent }]}>উচ্চারণ:</Text>
              <Text
                selectable
                style={[
                  styles.fieldBody,
                  { color: paper.textColor, fontSize, lineHeight: fontSize * 1.58 },
                ]}
              >
                {item.pronunciation}
              </Text>
            </View>
          ) : null}

          {/* Meaning */}
          {item.meaning ? (
            <View style={styles.sectionBlock}>
              <Text style={[styles.fieldLabel, { color: '#059669' }]}>অর্থ / বিবরণ:</Text>
              <Text
                selectable
                style={[
                  styles.fieldBody,
                  { color: paper.textColor, fontSize, lineHeight: fontSize * 1.58 },
                ]}
              >
                {item.meaning}
              </Text>
            </View>
          ) : null}

          {/* Extra Content (Adab lists, Badha lists etc.) */}
          {item.extraContent ? (
            <View style={[styles.extraBox, { backgroundColor: paper.headerBg, borderColor: paper.borderColor }]}>
              <Text
                selectable
                style={[
                  styles.fieldBody,
                  { color: paper.textColor, fontSize: fontSize - 0.5, lineHeight: fontSize * 1.6 },
                ]}
              >
                {item.extraContent}
              </Text>
            </View>
          ) : null}

          {/* Checklist Items (e.g. Hajj packing list p. 144) */}
          {Array.isArray(item.checklistItems) && item.checklistItems.length > 0 ? (
            <View style={styles.checklistWrap}>
              {item.checklistItems.map((ci, cIdx) => {
                const isDone = Boolean(hajjChecked[cIdx]);
                return (
                  <TouchableOpacity
                    key={cIdx}
                    activeOpacity={0.75}
                    onPress={() => toggleHajjChecklist(cIdx)}
                    style={[
                      styles.checklistItem,
                      {
                        backgroundColor: isDone ? '#05966914' : paper.headerBg,
                        borderColor: isDone ? '#05966945' : paper.borderColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isDone ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={isDone ? '#059669' : paper.accentColor}
                    />
                    <Text
                      style={[
                        styles.checklistItemText,
                        {
                          color: isDone ? paper.mutedColor : paper.textColor,
                          fontSize,
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        },
                      ]}
                    >
                      {ci}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Sub-items */}
          {Array.isArray(item.subItems) && item.subItems.length > 0 ? (
            <View style={styles.subItemsWrap}>
              {item.subItems.map((sub, sIdx) => (
                <View
                  key={sIdx}
                  style={[
                    styles.subItemCard,
                    { backgroundColor: paper.headerBg, borderColor: paper.borderColor },
                  ]}
                >
                  {sub.label ? (
                    <View style={styles.subLabelRow}>
                      <View style={[styles.subDot, { backgroundColor: accent }]} />
                      <Text style={[styles.subLabel, { color: accent, fontSize: fontSize - 0.5 }]}>
                        {sub.label}
                      </Text>
                    </View>
                  ) : null}

                  {sub.arabic ? (
                    <Text
                      selectable
                      style={[
                        styles.arabicText,
                        {
                          color: paper.textColor,
                          fontSize: fontSize + 5,
                          lineHeight: (fontSize + 5) * 1.75,
                          marginTop: 6,
                        },
                      ]}
                    >
                      {sub.arabic}
                    </Text>
                  ) : null}

                  {sub.count ? (
                    <TasbihBadge
                      counterKey={`${item.id}-sub-${sIdx}`}
                      targetCount={sub.count}
                      countsMap={tasbihCounts}
                      onIncrement={incrementTasbih}
                      onReset={resetTasbih}
                      paper={paper}
                    />
                  ) : null}

                  {sub.pronunciation ? (
                    <Text
                      selectable
                      style={[
                        styles.fieldBody,
                        { color: paper.textColor, fontSize: fontSize - 0.5, lineHeight: fontSize * 1.55, marginTop: 6 },
                      ]}
                    >
                      <Text style={{ fontWeight: '800', color: accent }}>উচ্চারণ: </Text>
                      {sub.pronunciation}
                    </Text>
                  ) : null}

                  {sub.meaning ? (
                    <Text
                      selectable
                      style={[
                        styles.fieldBody,
                        { color: paper.textColor, fontSize: fontSize - 0.5, lineHeight: fontSize * 1.55, marginTop: 4 },
                      ]}
                    >
                      <Text style={{ fontWeight: '800', color: '#059669' }}>অর্থ: </Text>
                      {sub.meaning}
                    </Text>
                  ) : null}

                  {sub.fazilat ? (
                    <View style={[styles.miniFazilatBox, { borderLeftColor: '#059669' }]}>
                      <Text style={[styles.fieldBody, { color: paper.mutedColor, fontSize: fontSize - 1, lineHeight: fontSize * 1.5 }]}>
                        <Text style={{ fontWeight: '800', color: '#059669' }}>ফযীলত: </Text>
                        {sub.fazilat}
                      </Text>
                    </View>
                  ) : null}

                  {sub.note ? (
                    <Text style={[styles.noteText, { color: '#B45309', fontSize: fontSize - 1, marginTop: 4 }]}>
                      বি.দ্র.: {sub.note}
                    </Text>
                  ) : null}

                  {sub.reference ? (
                    <Text style={[styles.refMini, { color: paper.mutedColor }]}>
                      📚 {sub.reference}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {/* Fazilat */}
          {item.fazilat ? (
            <View style={[styles.fazilatBox, { backgroundColor: '#05966912', borderColor: '#05966930' }]}>
              <Text style={[styles.fazilatTitle, { color: '#059669' }]}>ফযীলত ও উপকারিতা:</Text>
              <Text
                selectable
                style={[
                  styles.fieldBody,
                  { color: paper.textColor, fontSize: fontSize - 0.5, lineHeight: fontSize * 1.55 },
                ]}
              >
                {item.fazilat}
              </Text>
            </View>
          ) : null}

          {/* Note */}
          {item.note ? (
            <View style={[styles.noteBox, { backgroundColor: '#D9770614', borderColor: '#D9770635' }]}>
              <Text style={[styles.noteTitle, { color: '#B45309' }]}>বি.দ্র.:</Text>
              <Text style={[styles.fieldBody, { color: paper.textColor, fontSize: fontSize - 0.5, lineHeight: fontSize * 1.5 }]}>
                {item.note}
              </Text>
            </View>
          ) : null}

          {/* Reference & Actions Footer */}
          <View style={[styles.cardFooter, { borderTopColor: paper.borderColor }]}>
            <View style={{ flex: 1 }}>
              {item.reference ? (
                <Text style={[styles.refBadgeText, { color: paper.mutedColor }]}>
                  📚 {item.reference}
                </Text>
              ) : null}
            </View>
            <View style={styles.actionBtnsRow}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => toggleBookmark(item.id)}
                style={[styles.iconActionBtn, { backgroundColor: isBookmarked ? '#DC262618' : paper.headerBg }]}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={isBookmarked ? '#DC2626' : paper.mutedColor}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleShareItem(item, item._chapterTitle)}
                style={[styles.iconActionBtn, { backgroundColor: paper.headerBg }]}
              >
                <Ionicons name="share-social-outline" size={16} color={paper.mutedColor} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSaveToDiary(item, item._chapterTitle)}
                style={[styles.diarySaveBtn, { backgroundColor: `${accent}16`, borderColor: `${accent}40` }]}
              >
                <Ionicons name="create-outline" size={14} color={accent} />
                <Text style={[styles.diarySaveBtnText, { color: accent }]}>ডায়েরিতে নিন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderListHeader = () => {
    if (normalizedQuery) {
      return (
        <View style={{ marginBottom: 12 }}>
          <View style={[styles.searchResultBanner, { backgroundColor: paper.headerBg, borderColor: paper.borderColor }]}>
            <Text style={[styles.searchResultText, { color: paper.textColor }]}>
              “{searchQuery}” অনুসন্ধানে পাওয়া গেছে: {toBanglaDigits(displayedItems.length)}টি বিষয়
              {matchedNames.length > 0 ? ` ও ${toBanglaDigits(matchedNames.length)}টি আল্লাহর নাম` : ''}
            </Text>
          </View>
          {matchedNames.length > 0 && renderAsmaulHusnaGrid(matchedNames, false)}
        </View>
      );
    }

    if (activeTab === 'favorites') {
      return (
        <View style={[styles.introCard, { backgroundColor: paper.paperBg, borderColor: paper.borderColor }]}>
          <Text style={[styles.introBannerTitle, { color: '#DC2626' }]}>
            ★ প্রিয় ও সংরক্ষিত আমলসমূহ ({toBanglaDigits(bookmarks.length)})
          </Text>
          <Text style={[styles.introBannerText, { color: paper.mutedColor, fontSize: fontSize - 1 }]}>
            নিয়মিত পাঠ করার জন্য যে কোনো দু‘আ বা আমলের বুকমার্ক আইকনে ট্যাপ করে এখানে সংরক্ষণ করে রাখুন।
          </Text>
        </View>
      );
    }

    if (activeChapterObj && activeChapterObj.id !== ASMAUL_HUSNA_DATA.id) {
      return (
        <View style={[styles.introCard, { backgroundColor: paper.paperBg, borderColor: paper.borderColor }]}>
          <View style={styles.introHeaderRow}>
            <Text style={[styles.introChapterBadge, { color: activeChapterObj.color, backgroundColor: `${activeChapterObj.color}16` }]}>
              {activeChapterObj.chapterNumber}
            </Text>
            <Text style={[styles.introPageText, { color: paper.mutedColor }]}>
              মূল কিতাব: পৃষ্ঠা {activeChapterObj.pageRange}
            </Text>
          </View>
          <Text style={[styles.introBannerTitle, { color: paper.textColor }]}>
            {activeChapterObj.title}
          </Text>
          {activeChapterObj.introNote ? (
            <Text style={[styles.introBannerText, { color: paper.mutedColor, fontSize: fontSize - 1 }]}>
              {activeChapterObj.introNote}
            </Text>
          ) : null}
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} onPress={() => setShowInfoModal(true)} style={styles.headerCenter}>
          <Text style={[styles.headerSubtitle, { color: '#059669' }]} numberOfLines={1}>
            কুরআন ও হাদীসে বর্ণিত • {toBanglaDigits(stats.totalDuasCount)}+ দু‘আ ও আমল
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {BOOK_META.title}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setShowTocModal(true)}
          style={[styles.headerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="list-outline" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setShowSettingsModal(true)}
          style={[styles.headerBtn, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="color-palette-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={18} color="#059669" />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="যেকোনো দু‘আ, আমল, ফযীলত বা আল্লাহর নাম খুঁজুন..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Chapter Filter Pills */}
      {!normalizedQuery && (
        <View style={styles.tabsOuter}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectChapter('favorites')}
              style={[
                styles.tabChip,
                {
                  backgroundColor: activeTab === 'favorites' ? '#DC2626' : colors.card,
                  borderColor: activeTab === 'favorites' ? '#DC2626' : colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="bookmark"
                size={14}
                color={activeTab === 'favorites' ? '#FFFFFF' : '#DC2626'}
              />
              <Text
                style={[
                  styles.tabChipText,
                  { color: activeTab === 'favorites' ? '#FFFFFF' : colors.text },
                ]}
              >
                প্রিয় ({toBanglaDigits(bookmarks.length)})
              </Text>
            </TouchableOpacity>

            {TABS_LIST.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => handleSelectChapter(tab.id)}
                  style={[
                    styles.tabChip,
                    {
                      backgroundColor: active ? tab.color : colors.card,
                      borderColor: active ? tab.color : colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={active ? '#FFFFFF' : tab.color}
                  />
                  <Text
                    style={[
                      styles.tabChipText,
                      { color: active ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content */}
      {!normalizedQuery && activeTab === ASMAUL_HUSNA_DATA.id ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, paddingTop: 6 }}
          showsVerticalScrollIndicator={false}
        >
          {renderAsmaulHusnaGrid(ASMAUL_HUSNA_DATA.names, true)}
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderAmolCard}
          ListHeaderComponent={renderListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          ListEmptyComponent={
            matchedNames.length > 0 ? null : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>{activeTab === 'favorites' ? '🔖' : '📖'}</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {activeTab === 'favorites'
                    ? 'এখনো কোনো প্রিয় আমল সংরক্ষণ করা হয়নি'
                    : 'খুঁজে পাওয়া যায়নি'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  {activeTab === 'favorites'
                    ? 'যেকোনো দু‘আ বা আমলের নিচে থাকা বুকমার্ক আইকনে ট্যাপ করুন'
                    : 'অন্য কোনো শব্দ দিয়ে খুঁজে দেখুন'}
                </Text>
              </View>
            )
          }
        />
      )}

      {/* Table of Contents Modal */}
      <Modal
        visible={showTocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTocModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>📖 কিতাবের সূচীপত্র</Text>
              <TouchableOpacity onPress={() => setShowTocModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TABS_LIST.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    activeOpacity={0.8}
                    onPress={() => handleSelectChapter(tab.id)}
                    style={[
                      styles.tocItem,
                      {
                        backgroundColor: isSelected ? `${tab.color}15` : colors.background,
                        borderColor: isSelected ? tab.color : colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={[styles.tocIconBox, { backgroundColor: `${tab.color}18` }]}>
                      <Ionicons name={tab.icon} size={18} color={tab.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tocChNum, { color: tab.color }]}>
                        {tab.chapterNumber} • পৃষ্ঠা {tab.pageRange}
                      </Text>
                      <Text style={[styles.tocTitle, { color: colors.text }]}>{tab.title}</Text>
                    </View>
                    <Text style={[styles.tocCount, { color: colors.textMuted }]}>
                      {toBanglaDigits(tab.count)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Theme & Font Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowSettingsModal(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>পড়ার সেটিংস</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.settingSectionLabel, { color: colors.textSecondary }]}>কাগজের ধরন</Text>
            <View style={styles.themeGrid}>
              {Object.values(PAPER_THEMES).map((pt) => {
                const selected = paperThemeId === pt.id;
                return (
                  <TouchableOpacity
                    key={pt.id}
                    activeOpacity={0.8}
                    onPress={() => changePaperTheme(pt.id)}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: pt.paperBg,
                        borderColor: selected ? pt.accentColor : pt.borderColor,
                        borderWidth: selected ? 2.5 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.themeOptionText, { color: pt.textColor }]}>{pt.label}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={16} color={pt.accentColor} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.settingSectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              অক্ষরের আকার ({toBanglaDigits(fontSize)} pt)
            </Text>
            <View style={styles.fontControls}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => updateFontSize(-1)}
                style={[styles.fontBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.fontBtnText, { color: colors.text }]}>A- ছোট</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => updateFontSize(1)}
                style={[styles.fontBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.fontBtnText, { color: colors.text }]}>A+ বড়</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Book Info Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.infoCard, { backgroundColor: paper.paperBg, borderColor: paper.borderColor }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: paper.accentColor }]}>কিতাব ও উচ্চারণ নির্দেশিকা</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <Ionicons name="close" size={22} color={paper.textColor} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.infoArabic, { color: paper.textColor }]}>{BOOK_META.arabicTitle}</Text>
              <Text style={[styles.infoHeading, { color: paper.textColor }]}>{BOOK_META.title}</Text>
              <Text style={[styles.infoMeta, { color: paper.mutedColor }]}>
                সংকলনে: {BOOK_META.compiler}{'\n'}
                সম্পাদনায়: {BOOK_META.editor}{'\n'}
                সহযোগিতায়: {BOOK_META.assistants.join(', ')}{'\n'}
                প্রকাশনায়: {BOOK_META.publisher}
              </Text>
              <View style={[styles.infoGuideBox, { backgroundColor: paper.headerBg, borderColor: paper.borderColor }]}>
                <Text style={[styles.infoGuideTitle, { color: paper.accentColor }]}>
                  {BOOK_META.pronunciationGuide.title}
                </Text>
                <Text style={[styles.infoGuideBody, { color: paper.textColor }]}>
                  {BOOK_META.pronunciationGuide.note}
                </Text>
                {BOOK_META.pronunciationGuide.symbols.map((s, idx) => (
                  <Text key={idx} style={[styles.symbolRow, { color: paper.textColor }]}>
                    {s.arabic}  —  {s.symbol}   (যেমন: {s.example})
                  </Text>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
  },
  tabsOuter: {
    paddingVertical: 4,
  },
  tabsScrollContent: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 6,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 42,
  },
  introCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  introHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  introChapterBadge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  introPageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  introBannerTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  introBannerText: {
    lineHeight: 22,
    fontWeight: '500',
  },
  amolCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardLeftAccent: {
    width: 4.5,
  },
  cardInner: {
    flex: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  numberBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  numberBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  chapterTagMini: {
    fontSize: 10.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardTitle: {
    fontWeight: '800',
    lineHeight: 23,
  },
  pagePill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pagePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  arabicBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  arabicText: {
    fontFamily: 'Amiri-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tasbihRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
    marginTop: 2,
  },
  tasbihTapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tasbihText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  tasbihResetBtn: {
    paddingLeft: 10,
  },
  sectionBlock: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '900',
    marginBottom: 2,
  },
  fieldBody: {
    fontWeight: '500',
  },
  extraBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  checklistWrap: {
    gap: 6,
    marginBottom: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  checklistItemText: {
    flex: 1,
    fontWeight: '600',
  },
  subItemsWrap: {
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  subItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
  },
  subLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  subDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subLabel: {
    flex: 1,
    fontWeight: '800',
  },
  miniFazilatBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginTop: 6,
  },
  noteText: {
    fontWeight: '600',
  },
  refMini: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  fazilatBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  fazilatTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 3,
  },
  noteBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    gap: 8,
  },
  refBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diarySaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 9,
    height: 32,
  },
  diarySaveBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  asmaSection: {
    marginBottom: 16,
  },
  specialBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  specialBoxLabel: {
    fontSize: 12.5,
    fontWeight: '900',
    marginBottom: 4,
  },
  namesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  nameCard: {
    width: '48.6%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
  },
  nameCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nameNoBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  nameNoText: {
    fontSize: 11,
    fontWeight: '900',
  },
  nameArabic: {
    fontFamily: 'Amiri-Regular',
    textAlign: 'right',
    writingDirection: 'rtl',
    flex: 1,
  },
  namePron: {
    fontWeight: '800',
    marginBottom: 2,
  },
  nameMeaning: {
    fontWeight: '600',
    lineHeight: 18,
  },
  searchResultBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  searchResultText: {
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    marginBottom: 8,
  },
  tocIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tocChNum: {
    fontSize: 11,
    fontWeight: '800',
  },
  tocTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  tocCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  settingsCard: {
    margin: 20,
    marginBottom: 40,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  settingSectionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeOption: {
    width: '48%',
    borderRadius: 12,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  fontControls: {
    flexDirection: 'row',
    gap: 10,
  },
  fontBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 11,
    alignItems: 'center',
  },
  fontBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  infoCard: {
    margin: 18,
    marginBottom: 34,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  infoArabic: {
    fontFamily: 'Amiri-Regular',
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 6,
  },
  infoHeading: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoMeta: {
    fontSize: 12.5,
    lineHeight: 20,
    marginBottom: 12,
  },
  infoGuideBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  infoGuideTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  infoGuideBody: {
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 8,
  },
  symbolRow: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
});
