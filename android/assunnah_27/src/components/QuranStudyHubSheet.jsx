import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/theme';
import { getQuranPageInfo } from '../data/quranIndex';
import { getRootForWord } from '../data/quranWordRoots';
import quranService, { DEFAULT_KITABS, BUILTIN_LUGHAT_ENTRIES } from '../services/quranService';
import quranWordMorphMap from '../data/quranWordMorphMap.json';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Convert English numbers to Bengali numerals
const toBn = (num) => {
  if (num === undefined || num === null) return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bn[d]);
};

// Representative page ayahs fallback
const PAGE_AYAH_MAPPINGS = {
  2: {
    surahId: 1,
    surahNameBangla: 'আল-ফাতিহা',
    ayahs: [
      { number: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', trans: 'পরম করুণাময় অসীম দয়ালু আল্লাহর নামে।' },
      { number: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', trans: 'সকল প্রশংসা বিশ্বজগতের প্রতিপালক আল্লাহর জন্য।' },
      { number: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', trans: 'যিনি নিতান্ত মেহেরবান ও দয়ালু।' },
      { number: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', trans: 'প্রতিফল দিবসের মালিক।' },
      { number: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', trans: 'আমরা কেবল তোমারই ‘ইবাদাত করি এবং কেবল তোমারই কাছে সাহায্য চাই।' },
      { number: 6, arabic: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', trans: 'আমাদেরকে সরল পথ প্রদর্শন কর।' },
      { number: 7, arabic: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', trans: 'তাদের পথ, যাদেরকে তুমি অনুগ্রহ দান করেছ, তাদের পথ নয় যারা ক্রোধের পাত্র ও পথভ্রষ্ট হয়েছে।' },
    ],
  },
  3: {
    surahId: 2,
    surahNameBangla: 'আল-বাকারা',
    ayahs: [
      { number: 1, arabic: 'الم', trans: 'আলিফ-লাম-মীম।' },
      { number: 2, arabic: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ هُدًى لِلْمُتَّقِينَ', trans: 'এ সেই কিতাব যাতে কোন সন্দেহ নেই, মুত্তাকীদের জন্য পথ প্রদর্শক।' },
      { number: 3, arabic: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ', trans: 'যারা অদৃশ্যের উপর ঈমান আনে, সালাত কায়েম করে এবং যা দিয়েছি তা থেকে ব্যয় করে।' },
      { number: 4, arabic: 'وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنْزِلَ إِلَيْكَ وَمَا أُنْزِلَ مِنْ قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ', trans: 'এবং যারা আপনার প্রতি ও পূর্ববর্তীদের প্রতি অবতীর্ণ কিতাবে ঈমান আনে এবং আখিরাতে দৃঢ় বিশ্বাস রাখে।' },
      { number: 5, arabic: 'أُولَٰئِكَ عَلَىٰ هُدًى مِنْ رَبِّهِمْ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ', trans: 'তারাই নিজেদের প্রতিপালকের হিদায়াতের উপর রয়েছে এবং তারাই সফলকাম।' },
    ],
  },
};

/**
 * Tokenize Tafsir HTML or plain text into semantic chunks for readable color coding
 */
function parseTafsirTokens(raw) {
  if (!raw) return [];
  const text = String(raw)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  if (/<span\s+class=/i.test(text)) {
    const tokens = [];
    const spanRegex = /<span\s+class="([^"]+)">([\s\S]*?)<\/span>/gi;
    let lastIndex = 0;
    let match;

    while ((match = spanRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const intermediate = text.substring(lastIndex, match.index).replace(/<[^>]+>/g, '');
        if (intermediate) parsePlainArabTokens(intermediate, tokens);
      }

      const cls = match[1];
      const inner = match[2].replace(/<[^>]+>/g, '').trim();

      if (cls.includes('arabic') || cls.includes('qpc-hafs')) {
        tokens.push({ type: 'ayah', text: inner });
      } else if (cls.includes('blue')) {
        tokens.push({ type: 'speaker', text: inner });
      } else if (cls.includes('reference') || cls.includes('brown')) {
        tokens.push({ type: 'ref', text: inner });
      } else {
        tokens.push({ type: 'prose', text: inner });
      }
      lastIndex = spanRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).replace(/<[^>]+>/g, '');
      if (remaining) parsePlainArabTokens(remaining, tokens);
    }
    return tokens;
  }

  const tokens = [];
  parsePlainArabTokens(text.replace(/<[^>]+>/g, ''), tokens);
  return tokens;
}

function parsePlainArabTokens(text, tokens) {
  const pattern = /(﴿[^﴾]+﴾|\[[^\]]+\])/g;
  let lastIdx = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parseSpeakerAndProse(text.substring(lastIdx, match.index), tokens);
    }
    const tokenStr = match[0];
    if (tokenStr.startsWith('﴿')) {
      tokens.push({ type: 'ayah', text: tokenStr });
    } else if (tokenStr.startsWith('[')) {
      tokens.push({ type: 'ref', text: tokenStr });
    }
    lastIdx = pattern.lastIndex;
  }

  if (lastIdx < text.length) {
    parseSpeakerAndProse(text.substring(lastIdx), tokens);
  }
}

function parseSpeakerAndProse(chunk, tokens) {
  const speakerRegex = /(قال [^:：\n]+[:：]|وقوله[:：]|عن [^:：\n]+[:：]|روى [^:：\n]+[:：]|وأخرج [^:：\n]+[:：])/g;
  let lastIdx = 0;
  let match;

  while ((match = speakerRegex.exec(chunk)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ type: 'prose', text: chunk.substring(lastIdx, match.index) });
    }
    tokens.push({ type: 'speaker', text: match[0] });
    lastIdx = speakerRegex.lastIndex;
  }

  if (lastIdx < chunk.length) {
    tokens.push({ type: 'prose', text: chunk.substring(lastIdx) });
  }
}

export default function QuranStudyHubSheet({
  visible,
  onClose,
  currentPage = 2,
  initialTab = 'translation', // 'translation' | 'tafsir' | 'tahqeeq'
  initialAyahNumber = null,
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const pageInfo = useMemo(() => getQuranPageInfo(currentPage), [currentPage]);

  // Main Tab: 'translation' | 'tafsir' | 'tahqeeq'
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sub-slugs for Translation & Tafsir
  const [activeTransSlug, setActiveTransSlug] = useState('trans-muhiuddin');
  const [activeTafsirSlug, setActiveTafsirSlug] = useState('tafsir-ibn-kathir');
  const [activeLughatSlug, setActiveLughatSlug] = useState('al-mujam-al-waseet');
  const [tafsirFontSize, setTafsirFontSize] = useState(16);

  // Dynamic Ayahs for the current page
  const [pageData, setPageData] = useState(null);
  const [loadingPage, setLoadingPage] = useState(false);

  // Selected Ayah (number & details)
  const [selectedAyahNumber, setSelectedAyahNumber] = useState(initialAyahNumber || 1);
  const [ayahStudyData, setAyahStudyData] = useState(null);
  const [loadingAyah, setLoadingAyah] = useState(false);

  // Selected Word for Tahqeeq / Lughat
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const [lughatData, setLughatData] = useState(null);
  const [loadingLughat, setLoadingLughat] = useState(false);

  const [copiedToast, setCopiedToast] = useState(false);

  // Sync initial tab when opening
  useEffect(() => {
    if (visible && initialTab) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Load Page Ayahs
  useEffect(() => {
    let isMounted = true;
    if (visible && currentPage) {
      const load = async () => {
        setLoadingPage(true);
        try {
          const res = await quranService.getPageAyahs(currentPage);
          if (!isMounted) return;
          if (res && res.ayahs && res.ayahs.length > 0) {
            setPageData(res);
            if (!initialAyahNumber) {
              setSelectedAyahNumber(res.ayahs[0].number);
            }
          }
        } catch (_err) {
          // fallback
        } finally {
          if (isMounted) setLoadingPage(false);
        }
      };
      Promise.resolve().then(load);
    }
    return () => {
      isMounted = false;
    };
  }, [visible, currentPage]);

  // Unified Ayahs List for current page
  const currentAyahsList = useMemo(() => {
    if (pageData && pageData.ayahs && pageData.ayahs.length > 0) {
      return pageData.ayahs;
    }
    if (PAGE_AYAH_MAPPINGS[currentPage]) {
      return PAGE_AYAH_MAPPINGS[currentPage].ayahs;
    }
    return [
      {
        number: 1,
        arabic: pageInfo.para.arabic || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        trans: `পারা ${pageInfo.para.id}: ${pageInfo.para.bangla}`,
      },
    ];
  }, [pageData, currentPage, pageInfo]);

  const currentSurahId = pageData?.surahId || pageInfo.surah.id;

  // Active Ayah Object
  const currentAyah = useMemo(() => {
    const found = currentAyahsList.find((a) => a.number === selectedAyahNumber);
    return found || currentAyahsList[0] || { number: 1, arabic: '', trans: '' };
  }, [currentAyahsList, selectedAyahNumber]);

  // Words list of active Ayah
  const wordsOfActiveAyah = useMemo(() => {
    if (!currentAyah || !currentAyah.arabic) return [];
    return currentAyah.arabic.split(/\s+/).filter(Boolean);
  }, [currentAyah]);

  // Fetch Ayah Study Details (Translations + Tafsirs) whenever selectedAyahNumber changes
  useEffect(() => {
    let isMounted = true;
    if (visible && currentSurahId && selectedAyahNumber) {
      const fetchStudy = async () => {
        setLoadingAyah(true);
        try {
          const data = await quranService.getAyahStudy(currentSurahId, selectedAyahNumber);
          if (!isMounted) return;
          setAyahStudyData(data);
        } catch (_err) {
          // ignore
        } finally {
          if (isMounted) setLoadingAyah(false);
        }
      };
      Promise.resolve().then(fetchStudy);
    }
    return () => {
      isMounted = false;
    };
  }, [visible, currentSurahId, selectedAyahNumber]);

  // Fetch Lughat for selected word
  const activeWordText = wordsOfActiveAyah[selectedWordIndex] || wordsOfActiveAyah[0] || '';

  const activeWordMorph = useMemo(() => {
    if (!activeWordText) return null;
    const morphKey = `${currentSurahId}:${selectedAyahNumber}:${selectedWordIndex + 1}`;
    const morph = quranWordMorphMap[morphKey];
    const root = morph?.r || getRootForWord(activeWordText) || activeWordText;
    return {
      root: root.replace(/\s+/g, ''),
      lemma: morph?.l || '',
      pos: morph?.p || '',
    };
  }, [activeWordText, currentSurahId, selectedAyahNumber, selectedWordIndex]);

  useEffect(() => {
    let isMounted = true;
    if (visible && activeTab === 'tahqeeq' && activeWordMorph?.root) {
      const fetchLughat = async () => {
        setLoadingLughat(true);
        try {
          const res = await quranService.getWordLughat({
            surah: currentSurahId,
            ayah: selectedAyahNumber,
            position: selectedWordIndex + 1,
            root: activeWordMorph.root,
            kitab_slug: activeLughatSlug,
          });
          if (!isMounted) return;
          setLughatData(res);
        } catch (_err) {
          // fallback
        } finally {
          if (isMounted) setLoadingLughat(false);
        }
      };
      Promise.resolve().then(fetchLughat);
    }
    return () => {
      isMounted = false;
    };
  }, [visible, activeTab, currentSurahId, selectedAyahNumber, selectedWordIndex, activeWordMorph, activeLughatSlug]);

  // Kitabs list
  const transKitabs = DEFAULT_KITABS.filter((k) => k.category === 'TRANSLATION');
  const tafsirKitabs = DEFAULT_KITABS.filter((k) => k.category === 'TAFSIR');

  const getActiveTranslationText = () => {
    if (ayahStudyData?.translations?.length > 0) {
      const found = ayahStudyData.translations.find((t) => t.kitab_slug === activeTransSlug);
      if (found) return found.translation_text;
    }
    if (currentAyah?.trans) return currentAyah.trans;
    return 'বাংলা অনুবাদ প্রস্তুত হচ্ছে...';
  };

  const getActiveTafsirText = () => {
    if (ayahStudyData?.tafsirs?.length > 0) {
      const found = ayahStudyData.tafsirs.find((t) => t.kitab_slug === activeTafsirSlug);
      if (found) return found.tafsir_raw || found.tafsir_text;
    }
    return 'প্রামাণ্য তাফসীর প্রস্তুত হচ্ছে...';
  };

  const handleCopyAyah = async () => {
    const textToCopy = `﴿${currentAyah.arabic}﴾\n\n[সূরা ${pageInfo.surah.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nঅনুবাদ: ${getActiveTranslationText()}`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleShareAyah = async () => {
    const textToShare = `﴿${currentAyah.arabic}﴾\n\n[সূরা ${pageInfo.surah.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nঅনুবাদ: ${getActiveTranslationText()}\n\n— জামিয়া ইসলামিয়া ইমদাদিয়া হাফেজী কুরআন অ্যাপ`;
    await Share.share({ message: textToShare });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheetContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          {/* Drag Handle & Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.pagePill}>
                  <Text style={styles.pagePillText}>পৃষ্ঠা {toBn(currentPage)}</Text>
                </View>
                <View>
                  <Text style={[styles.surahTitle, { color: colors.text }]}>
                    {pageInfo.surah.nameBangla} ({pageInfo.surah.nameArabic})
                  </Text>
                  <Text style={styles.paraSubtitle}>
                    পারা {toBn(pageInfo.para.id)} • {pageInfo.para.bangla}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ayah Horizontal Selector */}
          <View style={styles.ayahSelectorWrapper}>
            <Text style={[styles.selectorLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              পৃষ্ঠার আয়াতসমূহ:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.ayahChipsRow}
            >
              {currentAyahsList.map((item) => {
                const isActive = item.number === selectedAyahNumber;
                return (
                  <TouchableOpacity
                    key={item.number}
                    style={[
                      styles.ayahChip,
                      isActive && styles.ayahChipActive,
                      {
                        backgroundColor: isActive
                          ? '#059669'
                          : isDark
                          ? '#334155'
                          : '#F1F5F9',
                      },
                    ]}
                    onPress={() => {
                      setSelectedAyahNumber(item.number);
                      setSelectedWordIndex(0);
                    }}
                  >
                    <Text
                      style={[
                        styles.ayahChipText,
                        { color: isActive ? '#FFFFFF' : isDark ? '#E2E8F0' : '#475569' },
                      ]}
                    >
                      আয়াত {toBn(item.number)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Ayah Arabic Banner Card */}
          <View
            style={[
              styles.arabicBanner,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.arabicBannerTop}>
              <View style={styles.ayahNumberCircle}>
                <Text style={styles.ayahNumberCircleText}>{toBn(currentAyah.number)}</Text>
              </View>
              <View style={styles.actionIconsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleCopyAyah}>
                  <Ionicons
                    name={copiedToast ? 'checkmark-circle' : 'copy-outline'}
                    size={18}
                    color={copiedToast ? '#059669' : colors.textMuted}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleShareAyah}>
                  <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.ayahArabicText, { color: isDark ? '#F1F5F9' : '#047857' }]}>
              {currentAyah.arabic}
            </Text>
          </View>

          {/* Main 3 Navigation Tabs (No AI Icons!) */}
          <View style={[styles.mainTabBar, { borderBottomColor: isDark ? '#334155' : '#E5E7EB' }]}>
            {[
              { id: 'translation', label: 'তরজমা (অনুবাদ)', icon: 'document-text-outline' },
              { id: 'tafsir', label: 'প্রামাণ্য তাফসীর', icon: 'book-outline' },
              { id: 'tahqeeq', label: 'তাহকীক ও লোগাত', icon: 'search-outline' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.mainTabItem,
                    isActive && styles.mainTabItemActive,
                    { borderBottomColor: isActive ? '#059669' : 'transparent' },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={17}
                    color={isActive ? '#059669' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.mainTabText,
                      { color: isActive ? '#059669' : colors.textMuted, fontWeight: isActive ? '700' : '600' },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ========================================================
              TAB 1: 📄 তরজমা (Translations)
              ======================================================== */}
          {activeTab === 'translation' && (
            <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={true}>
              {/* Kitab Selector Chips */}
              <View style={styles.kitabSelectorRow}>
                {transKitabs.map((k) => {
                  const isSel = activeTransSlug === k.slug;
                  return (
                    <TouchableOpacity
                      key={k.slug}
                      style={[
                        styles.kitabChip,
                        isSel && styles.kitabChipActive,
                        {
                          backgroundColor: isSel
                            ? 'rgba(5, 150, 105, 0.12)'
                            : isDark
                            ? '#334155'
                            : '#F1F5F9',
                          borderColor: isSel ? '#059669' : 'transparent',
                        },
                      ]}
                      onPress={() => setActiveTransSlug(k.slug)}
                    >
                      <Text
                        style={[
                          styles.kitabChipText,
                          { color: isSel ? '#059669' : isDark ? '#E2E8F0' : '#475569' },
                        ]}
                      >
                        {k.name_bangla}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Translation Display Card */}
              <View
                style={[
                  styles.translationCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FAFAF9',
                    borderColor: isDark ? '#334155' : '#E5E7EB',
                  },
                ]}
              >
                <View style={styles.translationCardHeader}>
                  <Text style={[styles.translatorName, { color: '#059669' }]}>
                    {transKitabs.find((k) => k.slug === activeTransSlug)?.name_bangla || 'বিশুদ্ধ বাংলা তরজমা'}
                  </Text>
                  <Text style={styles.translatorAuthor}>
                    {transKitabs.find((k) => k.slug === activeTransSlug)?.description || ''}
                  </Text>
                </View>

                {loadingAyah ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                      তরজমা লোড হচ্ছে...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.translationBodyText, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
                    {getActiveTranslationText()}
                  </Text>
                )}
              </View>

              {/* Comparison Section: Show other translations preview */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                অন্যান্য অনুবাদকদের তরজমা:
              </Text>

              {transKitabs
                .filter((k) => k.slug !== activeTransSlug)
                .map((otherK) => {
                  const otherText =
                    ayahStudyData?.translations?.find((t) => t.kitab_slug === otherK.slug)?.translation_text ||
                    '';
                  return (
                    <View
                      key={otherK.slug}
                      style={[
                        styles.otherTransCard,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                    >
                      <Text style={[styles.otherTransTitle, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                        {otherK.name_bangla}
                      </Text>
                      <Text style={[styles.otherTransText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                        {otherText || currentAyah.trans}
                      </Text>
                    </View>
                  );
                })}
            </ScrollView>
          )}

          {/* ========================================================
              TAB 2: 📖 তাফসীর (Classical Tafsirs)
              ======================================================== */}
          {activeTab === 'tafsir' && (
            <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={true}>
              {/* Tafsir Kitab Selector */}
              <View style={styles.kitabSelectorRow}>
                {tafsirKitabs.map((k) => {
                  const isSel = activeTafsirSlug === k.slug;
                  return (
                    <TouchableOpacity
                      key={k.slug}
                      style={[
                        styles.kitabChip,
                        isSel && styles.kitabChipActive,
                        {
                          backgroundColor: isSel
                            ? 'rgba(5, 150, 105, 0.12)'
                            : isDark
                            ? '#334155'
                            : '#F1F5F9',
                          borderColor: isSel ? '#059669' : 'transparent',
                        },
                      ]}
                      onPress={() => setActiveTafsirSlug(k.slug)}
                    >
                      <Text
                        style={[
                          styles.kitabChipText,
                          { color: isSel ? '#059669' : isDark ? '#E2E8F0' : '#475569' },
                        ]}
                      >
                        {k.name_bangla}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Font Size Adjuster Controls */}
              <View style={styles.fontSizeBar}>
                <Text style={[styles.fontSizeLabel, { color: colors.textMuted }]}>হরফের সাইজ:</Text>
                <TouchableOpacity
                  style={styles.fontBtn}
                  onPress={() => setTafsirFontSize((prev) => Math.max(13, prev - 1))}
                >
                  <Text style={[styles.fontBtnText, { color: colors.text }]}>A-</Text>
                </TouchableOpacity>
                <Text style={[styles.fontSizeCurrent, { color: colors.text }]}>
                  {toBn(tafsirFontSize)}
                </Text>
                <TouchableOpacity
                  style={styles.fontBtn}
                  onPress={() => setTafsirFontSize((prev) => Math.min(26, prev + 1))}
                >
                  <Text style={[styles.fontBtnText, { color: colors.text }]}>A+</Text>
                </TouchableOpacity>
              </View>

              {/* Tafsir Content Card */}
              <View
                style={[
                  styles.tafsirCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FAFAF9',
                    borderColor: isDark ? '#334155' : '#E5E7EB',
                  },
                ]}
              >
                <View style={styles.tafsirCardHeader}>
                  <Text style={[styles.tafsirKitabArabic, { color: '#059669' }]}>
                    {tafsirKitabs.find((k) => k.slug === activeTafsirSlug)?.name_arabic}
                  </Text>
                  <Text style={[styles.tafsirAuthorName, { color: colors.textMuted }]}>
                    {tafsirKitabs.find((k) => k.slug === activeTafsirSlug)?.author}
                  </Text>
                </View>

                {loadingAyah ? (
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                      তাফসীর লোড হচ্ছে...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.tafsirTokensWrapper}>
                    {parseTafsirTokens(getActiveTafsirText()).map((tok, idx) => {
                      if (tok.type === 'ayah') {
                        return (
                          <Text
                            key={idx}
                            style={[
                              styles.tokenAyah,
                              { fontSize: tafsirFontSize + 2, lineHeight: (tafsirFontSize + 2) * 1.7 },
                            ]}
                          >
                            {tok.text}{' '}
                          </Text>
                        );
                      }
                      if (tok.type === 'speaker') {
                        return (
                          <Text
                            key={idx}
                            style={[
                              styles.tokenSpeaker,
                              { fontSize: tafsirFontSize, lineHeight: tafsirFontSize * 1.6 },
                            ]}
                          >
                            {tok.text}{' '}
                          </Text>
                        );
                      }
                      if (tok.type === 'ref') {
                        return (
                          <Text
                            key={idx}
                            style={[
                              styles.tokenRef,
                              { fontSize: tafsirFontSize - 2, lineHeight: tafsirFontSize * 1.5 },
                            ]}
                          >
                            {tok.text}{' '}
                          </Text>
                        );
                      }
                      return (
                        <Text
                          key={idx}
                          style={[
                            styles.tokenProse,
                            {
                              fontSize: tafsirFontSize,
                              lineHeight: tafsirFontSize * 1.65,
                              color: isDark ? '#E2E8F0' : '#1F2937',
                            },
                          ]}
                        >
                          {tok.text}{' '}
                        </Text>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* ========================================================
              TAB 3: 🔍 তাহকীক ও লোগাত (Morphology & Al-Mu'jam al-Waseet)
              ======================================================== */}
          {activeTab === 'tahqeeq' && (
            <ScrollView style={styles.tabContentScroll} showsVerticalScrollIndicator={true}>
              <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 8 }]}>
                আয়াতের শব্দসমূহ (যেকোনো শব্দে ট্যাপ করে মূল ধাতু ও লোগাত দেখুন):
              </Text>

              {/* Clickable Words Chips */}
              <View style={styles.wordsGridWrap}>
                {wordsOfActiveAyah.map((w, idx) => {
                  const isSelWord = selectedWordIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.wordPill,
                        isSelWord && styles.wordPillActive,
                        {
                          backgroundColor: isSelWord
                            ? '#059669'
                            : isDark
                            ? '#334155'
                            : '#FFFFFF',
                          borderColor: isSelWord ? '#047857' : isDark ? '#475569' : '#CBD5E1',
                        },
                      ]}
                      onPress={() => setSelectedWordIndex(idx)}
                    >
                      <Text
                        style={[
                          styles.wordPillArabic,
                          { color: isSelWord ? '#FFFFFF' : isDark ? '#F1F5F9' : '#047857' },
                        ]}
                      >
                        {w}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Word Root & Morphology Card */}
              {activeWordMorph && (
                <View
                  style={[
                    styles.morphologyCard,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F0FDF4',
                      borderColor: isDark ? '#334155' : '#BBF7D0',
                    },
                  ]}
                >
                  <View style={styles.morphHeaderRow}>
                    <View style={styles.wordBadgeLarge}>
                      <Text style={styles.wordBadgeLargeText}>{activeWordText}</Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text style={[styles.rootLabel, { color: colors.textMuted }]}>
                        মূল ধাতু (جذر / Root):
                      </Text>
                      <Text style={styles.rootTextArabic}>
                        {activeWordMorph.root}
                      </Text>
                    </View>
                  </View>

                  {activeWordMorph.pos ? (
                    <View style={styles.posRow}>
                      <View style={styles.posTag}>
                        <Text style={styles.posTagText}>পদ: {activeWordMorph.pos}</Text>
                      </View>
                      {activeWordMorph.lemma ? (
                        <View style={[styles.posTag, { backgroundColor: '#E0F2FE' }]}>
                          <Text style={[styles.posTagText, { color: '#0369A1' }]}>
                            মৌল রূপ: {activeWordMorph.lemma}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )}

              {/* Dictionary Selector (Al-Mu'jam al-Waseet vs Al-Mufradat) */}
              <View style={[styles.kitabSelectorRow, { marginTop: 14 }]}>
                {[
                  { slug: 'al-mujam-al-waseet', name: "المعجم الوسيط (আল-মু'জামুল ওয়াসীত)" },
                  { slug: 'al-mufradat', name: 'المفردات (আল-মুফরাদাত)' },
                ].map((k) => {
                  const isSel = activeLughatSlug === k.slug;
                  return (
                    <TouchableOpacity
                      key={k.slug}
                      style={[
                        styles.kitabChip,
                        isSel && styles.kitabChipActive,
                        {
                          backgroundColor: isSel
                            ? 'rgba(2, 132, 199, 0.12)'
                            : isDark
                            ? '#334155'
                            : '#F1F5F9',
                          borderColor: isSel ? '#0284C7' : 'transparent',
                        },
                      ]}
                      onPress={() => setActiveLughatSlug(k.slug)}
                    >
                      <Text
                        style={[
                          styles.kitabChipText,
                          { color: isSel ? '#0284C7' : isDark ? '#E2E8F0' : '#475569' },
                        ]}
                      >
                        {k.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dictionary Content Display */}
              <View
                style={[
                  styles.lughatCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FAFAF9',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
              >
                <View style={styles.lughatCardHeader}>
                  <Text style={[styles.lughatTitle, { color: '#0284C7' }]}>
                    {activeLughatSlug === 'al-mujam-al-waseet'
                      ? "المعجم الوسيط — مجمع اللغة العربية بالقاهرة"
                      : "المفردات في غريب القرآن — الراغب الأصفهاني"}
                  </Text>
                </View>

                {loadingLughat ? (
                  <View style={{ paddingVertical: 28, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#0284C7" />
                    <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                      অভিধান থেকে তাহকীক খোঁজা হচ্ছে...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.lughatContentText, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                    {lughatData?.entries?.[0]?.content ||
                      BUILTIN_LUGHAT_ENTRIES[activeWordMorph?.root]?.content ||
                      `ধাতু (${activeWordMorph?.root}) এর বিস্তারিত অর্থ ও প্রয়োগ অভিধানে সংরক্ষিত রয়েছে।`}
                  </Text>
                )}
              </View>
            </ScrollView>
          )}

          {/* Bottom Close Action */}
          <View style={[styles.sheetFooter, { borderTopColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <TouchableOpacity style={styles.returnQuranBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="book-outline" size={17} color="#FFFFFF" />
              <Text style={styles.returnQuranBtnText}>হাফেজী কুরআনে ফিরে যান</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.88,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pagePill: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pagePillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  surahTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  paraSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  ayahSelectorWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  ayahChipsRow: {
    gap: 6,
    paddingRight: 16,
  },
  ayahChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ayahChipActive: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  ayahChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  arabicBanner: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  arabicBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ayahNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ayahNumberCircleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionIconsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    padding: 4,
  },
  ayahArabicText: {
    fontSize: 19,
    fontFamily: 'serif',
    lineHeight: 34,
    textAlign: 'right',
  },
  mainTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginTop: 4,
  },
  mainTabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 2,
  },
  mainTabItemActive: {},
  mainTabText: {
    fontSize: 13,
  },
  tabContentScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  kitabSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  kitabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  kitabChipActive: {},
  kitabChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  translationCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  translationCardHeader: {
    marginBottom: 8,
  },
  translatorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  translatorAuthor: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  translationBodyText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  otherTransCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  otherTransTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  otherTransText: {
    fontSize: 13,
    lineHeight: 20,
  },
  fontSizeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  fontSizeLabel: {
    fontSize: 11,
  },
  fontBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  fontBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fontSizeCurrent: {
    fontSize: 12,
    fontWeight: '700',
  },
  tafsirCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  tafsirCardHeader: {
    marginBottom: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  tafsirKitabArabic: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  tafsirAuthorName: {
    fontSize: 11,
    marginTop: 2,
  },
  tafsirTokensWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tokenAyah: {
    color: '#059669',
    fontWeight: '700',
    fontFamily: 'serif',
  },
  tokenSpeaker: {
    color: '#2563EB',
    fontWeight: '700',
  },
  tokenRef: {
    color: '#D97706',
    fontWeight: '600',
  },
  tokenProse: {
    fontWeight: '400',
  },
  wordsGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  wordPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  wordPillActive: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  wordPillArabic: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  morphologyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  morphHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordBadgeLarge: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  wordBadgeLargeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  rootLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  rootTextArabic: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'serif',
  },
  posRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  posTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  posTagText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  lughatCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  lughatCardHeader: {
    marginBottom: 8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  lughatTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  lughatContentText: {
    fontSize: 14,
    lineHeight: 24,
    fontFamily: 'serif',
  },
  sheetFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  returnQuranBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  returnQuranBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
