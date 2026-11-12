import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/theme';
import { getQuranPageInfo, QURAN_SURAHS } from '../data/quranIndex';
import { getRootForWord } from '../data/quranWordRoots';
import quranService, {
  DEFAULT_KITABS,
  getKitabCitationReference,
  getDefaultTranslationSlug,
  setDefaultTranslationSlug,
} from '../services/quranService';
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
  const [activeTransSlug, setActiveTransSlug] = useState('trans-zakaria');
  const [defaultTransSlug, setDefaultTransSlug] = useState('trans-zakaria');
  const [defaultSavedToast, setDefaultSavedToast] = useState(false);
  const [activeTafsirSlug, setActiveTafsirSlug] = useState('tafsir-ibn-kathir');
  const [activeLughatSlug, setActiveLughatSlug] = useState('al-mujam-al-waseet');
  const [copiedLughatCiteToast, setCopiedLughatCiteToast] = useState(false);
  const lughatKitabs = useMemo(() => DEFAULT_KITABS.filter((k) => k.category === 'LUGHAT'), []);
  const [tafsirFontSize, setTafsirFontSize] = useState(16);
  const [isAyahExpanded, setIsAyahExpanded] = useState(false);

  // Load saved default translation
  useEffect(() => {
    let isMounted = true;
    getDefaultTranslationSlug().then((saved) => {
      if (isMounted && saved) {
        setDefaultTransSlug(saved);
        setActiveTransSlug(saved);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetDefaultTranslation = async (slug) => {
    await setDefaultTranslationSlug(slug);
    setDefaultTransSlug(slug);
    setDefaultSavedToast(true);
    setTimeout(() => setDefaultSavedToast(false), 2400);
  };

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
  const [copiedCiteToast, setCopiedCiteToast] = useState(false);
  const [copiedTransCiteToast, setCopiedTransCiteToast] = useState(false);

  // Sync initial tab when opening
  useEffect(() => {
    if (visible && initialTab) {
      Promise.resolve().then(() => setActiveTab(initialTab));
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
            if (initialAyahNumber) {
              setSelectedAyahNumber(initialAyahNumber);
            } else {
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
  }, [visible, currentPage, initialAyahNumber]);

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
        trans: pageInfo.para.arabic ? `পারা ${toBn(pageInfo.para.id)}: ${pageInfo.para.arabic}` : `পারা ${toBn(pageInfo.para.id)}`,
      },
    ];
  }, [pageData, currentPage, pageInfo]);

  // Active Ayah Object
  const currentAyah = useMemo(() => {
    const found = currentAyahsList.find((a) => a.number === selectedAyahNumber);
    return found || currentAyahsList[0] || { number: 1, arabic: '', trans: '' };
  }, [currentAyahsList, selectedAyahNumber]);

  const currentSurahId = currentAyah?.surahId || pageData?.surahId || pageInfo.surah.id;

  const activeSurahInfo = useMemo(() => {
    if (currentAyah?.surahId) {
      const found = QURAN_SURAHS.find((s) => s.id === currentAyah.surahId);
      if (found) return found;
    }
    return pageInfo.surah;
  }, [currentAyah, pageInfo.surah]);

  // Words list of active Ayah
  const wordsOfActiveAyah = useMemo(() => {
    if (!currentAyah || !currentAyah.arabic) return [];
    return currentAyah.arabic.split(/\s+/).filter(Boolean);
  }, [currentAyah]);

  const isLongAyah = useMemo(() => {
    return (currentAyah?.arabic || '').length > 80;
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
    const rawRoot = morph?.r || getRootForWord(activeWordText) || null;
    return {
      root: rawRoot ? rawRoot.replace(/\s+/g, '') : null,
      lemma: morph?.l || '',
      pos: morph?.p || '',
    };
  }, [activeWordText, currentSurahId, selectedAyahNumber, selectedWordIndex]);

  useEffect(() => {
    let isMounted = true;
    if (visible && activeTab === 'tahqeeq') {
      if (!activeWordMorph?.root) {
        Promise.resolve().then(() => {
          if (isMounted) {
            setLughatData({ entries: [] });
            setLoadingLughat(false);
          }
        });
        return;
      }
      const fetchLughat = async () => {
        setLoadingLughat(true);
        try {
          const res = await quranService.getWordLughat({
            surah: currentSurahId,
            ayah: selectedAyahNumber,
            position: selectedWordIndex + 1,
            root: activeWordMorph.root,
            kitabSlug: activeLughatSlug,
            kitab_slug: activeLughatSlug,
          });
          if (!isMounted) return;
          setLughatData(res || { entries: [] });
        } catch (_err) {
          if (isMounted) setLughatData({ entries: [] });
        } finally {
          if (isMounted) setLoadingLughat(false);
        }
      };
      Promise.resolve().then(fetchLughat);
    }
    return () => {
      isMounted = false;
    };
  }, [visible, activeTab, currentSurahId, selectedAyahNumber, selectedWordIndex, activeWordMorph?.root, activeLughatSlug]);

  const activeLughatContent = useMemo(() => {
    if (!lughatData?.entries || lughatData.entries.length === 0) return null;
    const found = lughatData.entries.find((e) => e.kitab_slug === activeLughatSlug);
    return found?.content || (lughatData.entries[0]?.kitab_slug === activeLughatSlug ? lughatData.entries[0]?.content : null);
  }, [lughatData, activeLughatSlug]);

  const renderFormattedLughatContent = (rawText) => {
    if (!rawText) return null;
    const paragraphs = rawText
      .split(/[\n|]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    return paragraphs.map((para, pIdx) => {
      const tokens = para
        .split(/(\[\[[\s\S]*?\]\]|﴿[\s\S]*?﴾|\[[\s\S]*?\]|«[\s\S]*?»|\([^)]+\))/g)
        .filter(Boolean);

      return (
        <Text
          key={pIdx}
          style={[styles.lughatParagraph, { color: isDark ? '#E2E8F0' : '#1E293B' }]}
        >
          {tokens.map((token, tIdx) => {
            const trimmed = token.trim();

            // 1. Double bracket footnote / tahqiq commentary: [[...]]
            if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
              return (
                <Text
                  key={tIdx}
                  style={[
                    styles.lughatFootnote,
                    {
                      color: isDark ? '#9CA3AF' : '#64748B',
                      backgroundColor: isDark ? '#33415530' : '#F1F5F9',
                    },
                  ]}
                >
                  {token}{' '}
                </Text>
              );
            }

            // 2. Quranic Ayah: ﴿...﴾
            if (trimmed.startsWith('﴿') && trimmed.endsWith('﴾')) {
              return (
                <Text
                  key={tIdx}
                  style={[
                    styles.lughatAyah,
                    {
                      color: isDark ? '#34D399' : '#047857',
                      backgroundColor: isDark ? '#064E3B40' : '#ECFDF5',
                    },
                  ]}
                >
                  {token}{' '}
                </Text>
              );
            }

            // 3. Surah / Ayah reference citation: [...]
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
              return (
                <Text
                  key={tIdx}
                  style={[
                    styles.lughatRef,
                    {
                      color: isDark ? '#94A3B8' : '#475569',
                      backgroundColor: isDark ? '#33415540' : '#F1F5F9',
                    },
                  ]}
                >
                  {token}{' '}
                </Text>
              );
            }

            // 4. Hadith / quotes: «...»
            if (trimmed.startsWith('«') && trimmed.endsWith('»')) {
              return (
                <Text
                  key={tIdx}
                  style={[
                    styles.lughatQuote,
                    {
                      color: isDark ? '#FBBF24' : '#92400E',
                      backgroundColor: isDark ? '#78350F40' : '#FEF3C7',
                    },
                  ]}
                >
                  {token}{' '}
                </Text>
              );
            }

            // 5. Parenthesized headwords (Al-Mu'jam al-Waseet): (...)
            if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
              return (
                <Text
                  key={tIdx}
                  style={[
                    styles.lughatHeadword,
                    {
                      color: isDark ? '#34D399' : '#047857',
                      backgroundColor: isDark ? '#064E3B40' : '#ECFDF5',
                    },
                  ]}
                >
                  {token}{' '}
                </Text>
              );
            }

            // Regular Arabic text
            return <Text key={tIdx}>{token}</Text>;
          })}
        </Text>
      );
    });
  };

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

  const activeTafsirRef = useMemo(() => {
    return getKitabCitationReference(activeTafsirSlug, currentSurahId, selectedAyahNumber, currentPage);
  }, [activeTafsirSlug, currentSurahId, selectedAyahNumber, currentPage]);

  const activeTransRef = useMemo(() => {
    return getKitabCitationReference(activeTransSlug, currentSurahId, selectedAyahNumber, currentPage);
  }, [activeTransSlug, currentSurahId, selectedAyahNumber, currentPage]);

  const activeLughatRef = useMemo(() => {
    return getKitabCitationReference(activeLughatSlug, currentSurahId, selectedAyahNumber, currentPage);
  }, [activeLughatSlug, currentSurahId, selectedAyahNumber, currentPage]);

  const handleCopyLughatWithCitation = async () => {
    if (!activeLughatContent) return;
    const cleanContent = activeLughatContent.replace(/<[^>]+>/g, '').trim();
    const currentKitab = lughatKitabs.find((k) => k.slug === activeLughatSlug);
    const ref = activeLughatRef?.fullCitation || `${currentKitab?.name_arabic} — ${currentKitab?.author}`;
    const textToCopy = `[শব্দমূল: (${activeWordMorph?.root || ''})]\nশব্দ: ${activeWordText}\n[সূরা ${activeSurahInfo.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nলোগাত / তাহকীক:\n${cleanContent}\n\n— রেফারেন্স: ${ref}\n[সংগ্রহ: জামিয়া ইসলামিয়া ইমদাদিয়া কুরআন অ্যাপ]`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedLughatCiteToast(true);
    setTimeout(() => setCopiedLughatCiteToast(false), 2000);
  };

  const handleCopyTafsirWithCitation = async () => {
    const rawTafsir = getActiveTafsirText().replace(/<[^>]+>/g, '').trim();
    const ref = activeTafsirRef?.fullCitation || 'تفسير القرآن الكريم';
    const textToCopy = `﴿${currentAyah.arabic}﴾\n[সূরা ${activeSurahInfo.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nতাফসীর:\n${rawTafsir}\n\n— রেফারেন্স: ${ref}\n[সংগ্রহ: জামিয়া ইসলামিয়া ইমদাদিয়া কুরআন অ্যাপ]`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedCiteToast(true);
    setTimeout(() => setCopiedCiteToast(false), 2000);
  };

  const handleCopyTranslationWithCitation = async () => {
    const trans = getActiveTranslationText();
    const ref = activeTransRef?.fullCitation || 'কুরআনুল কারীম বাংলা অনুবাদ';
    const textToCopy = `﴿${currentAyah.arabic}﴾\n[সূরা ${activeSurahInfo.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nঅনুবাদ:\n"${trans}"\n\n— রেফারেন্স: ${ref}\n[সংগ্রহ: জামিয়া ইসলামিয়া ইমদাদিয়া কুরআন অ্যাপ]`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedTransCiteToast(true);
    setTimeout(() => setCopiedTransCiteToast(false), 2000);
  };

  const handleCopyAyah = async () => {
    const textToCopy = `﴿${currentAyah.arabic}﴾\n\n[সূরা ${activeSurahInfo.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nঅনুবাদ: ${getActiveTranslationText()}`;
    await Clipboard.setStringAsync(textToCopy);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleShareAyah = async () => {
    const textToShare = `﴿${currentAyah.arabic}﴾\n\n[সূরা ${activeSurahInfo.nameBangla}, আয়াত: ${toBn(currentAyah.number)}]\n\nঅনুবাদ: ${getActiveTranslationText()}\n\n— জামিয়া ইসলামিয়া ইমদাদিয়া হাফেজী কুরআন অ্যাপ`;
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
                <View style={styles.headerTitleWrap}>
                  <Text
                    style={[styles.surahTitle, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {activeSurahInfo.nameBangla} ({activeSurahInfo.nameArabic})
                  </Text>
                  <Text
                    style={styles.paraSubtitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    পারা {toBn(pageInfo.para.id)} {pageInfo.para.arabic ? `• ${pageInfo.para.arabic}` : ''}
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
                      setIsAyahExpanded(false);
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

          {/* Selected Ayah Arabic Banner Card (Smart Compact & Expandable) */}
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
              <View style={styles.ayahBannerHeaderLeft}>
                <View style={styles.ayahNumberCircle}>
                  <Text style={styles.ayahNumberCircleText}>{toBn(currentAyah.number)}</Text>
                </View>
                <Text style={[styles.ayahHeaderLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  আয়াত {toBn(currentAyah.number)}
                </Text>
              </View>

              <View style={styles.actionIconsRow}>
                {isLongAyah && (
                  <TouchableOpacity
                    style={[
                      styles.expandAyahPill,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                      },
                    ]}
                    onPress={() => setIsAyahExpanded((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isAyahExpanded ? 'chevron-up' : 'chevron-down'}
                      size={12}
                      color={isDark ? '#34D399' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.expandAyahPillText,
                        { color: isDark ? '#34D399' : '#059669' },
                      ]}
                    >
                      {isAyahExpanded ? 'সংক্ষেপ' : 'সম্পূর্ণ আয়াত'}
                    </Text>
                  </TouchableOpacity>
                )}

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

            {isLongAyah && isAyahExpanded ? (
              <ScrollView
                style={styles.expandedAyahScroll}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text style={[styles.ayahArabicText, { color: isDark ? '#F1F5F9' : '#047857' }]}>
                  {currentAyah.arabic}
                </Text>
              </ScrollView>
            ) : (
              <Text
                style={[
                  styles.ayahArabicText,
                  {
                    color: isDark ? '#F1F5F9' : '#047857',
                    fontSize: isLongAyah ? 17 : 19,
                    lineHeight: isLongAyah ? 28 : 34,
                  },
                ]}
                numberOfLines={isLongAyah ? 2 : undefined}
                ellipsizeMode={isLongAyah ? 'tail' : undefined}
              >
                {currentAyah.arabic}
              </Text>
            )}
          </View>

          {/* Main 3 Navigation Tabs (Responsive & Pure Islamic Design) */}
          <View style={[styles.mainTabBar, { borderBottomColor: isDark ? '#334155' : '#E5E7EB' }]}>
            {[
              { id: 'translation', label: 'তরজমা', icon: 'document-text-outline' },
              { id: 'tafsir', label: 'তাফসীর', icon: 'book-outline' },
              { id: 'tahqeeq', label: 'তাহকীক', icon: 'search-outline' },
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
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={isActive ? '#059669' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.mainTabText,
                      {
                        color: isActive ? '#059669' : colors.textMuted,
                        fontWeight: isActive ? '700' : '600',
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
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
                  const isDefault = defaultTransSlug === k.slug;
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        {isDefault && (
                          <Ionicons name="star" size={11} color={isSel ? '#059669' : '#D97706'} />
                        )}
                        <Text
                          style={[
                            styles.kitabChipText,
                            { color: isSel ? '#059669' : isDark ? '#E2E8F0' : '#475569' },
                          ]}
                        >
                          {k.name_bangla}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Toast confirmation for default translation */}
              {defaultSavedToast && (
                <View style={styles.defaultSavedToastBanner}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.defaultSavedToastText} numberOfLines={1}>
                    {transKitabs.find((k) => k.slug === defaultTransSlug)?.name_bangla || 'তরজমা'} ডিফল্ট হিসেবে সেট করা হয়েছে!
                  </Text>
                </View>
              )}

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
                  <View style={styles.headerTitleRow}>
                    <View style={styles.headerTitleTextWrap}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.translatorName, { color: '#059669', flexShrink: 1 }]} numberOfLines={1}>
                          {transKitabs.find((k) => k.slug === activeTransSlug)?.name_bangla || 'বিশুদ্ধ বাংলা তরজমা'}
                        </Text>
                        {activeTransSlug === defaultTransSlug && (
                          <View style={styles.defaultBadge}>
                            <Ionicons name="star" size={10} color="#D97706" />
                            <Text style={styles.defaultBadgeText}>ডিফল্ট</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.translatorAuthor} numberOfLines={1}>
                        {transKitabs.find((k) => k.slug === activeTransSlug)?.description || ''}
                      </Text>
                    </View>

                    <View style={styles.headerActionsWrap}>
                      <TouchableOpacity
                        style={[
                          styles.defaultSetBtn,
                          activeTransSlug === defaultTransSlug && styles.defaultSetBtnActive,
                        ]}
                        onPress={() => handleSetDefaultTranslation(activeTransSlug)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={activeTransSlug === defaultTransSlug ? 'star' : 'star-outline'}
                          size={12}
                          color={activeTransSlug === defaultTransSlug ? '#D97706' : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.defaultSetBtnText,
                            { color: activeTransSlug === defaultTransSlug ? '#D97706' : colors.textMuted },
                          ]}
                        >
                          {activeTransSlug === defaultTransSlug ? 'ডিফল্ট' : 'ডিফল্ট করুন'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.citeCopyBtn}
                        onPress={handleCopyTranslationWithCitation}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={copiedTransCiteToast ? 'checkmark-circle' : 'newspaper-outline'}
                          size={13}
                          color={copiedTransCiteToast ? '#059669' : colors.textMuted}
                        />
                        <Text style={[styles.citeCopyBtnText, { color: copiedTransCiteToast ? '#059669' : colors.textMuted }]}>
                          {copiedTransCiteToast ? 'কপি হয়েছে' : 'উদ্ধৃতি কপি'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Publication Reference Tag */}
                  {activeTransRef ? (
                    <View
                      style={[
                        styles.referenceCardBox,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                    >
                      <View style={styles.referenceBadgeLine}>
                        <Ionicons name="book-outline" size={12} color="#059669" />
                        <Text
                          style={[styles.referenceBadgeText, { color: isDark ? '#E2E8F0' : '#374151' }]}
                          numberOfLines={1}
                        >
                          {activeTransRef.badgeText}
                        </Text>
                      </View>
                      {activeTransRef.edition ? (
                        <Text style={[styles.referenceBadgeSub, { color: colors.textMuted }]} numberOfLines={2}>
                          {activeTransRef.edition}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
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
                  const isOtherDefault = defaultTransSlug === otherK.slug;
                  return (
                    <TouchableOpacity
                      key={otherK.slug}
                      style={[
                        styles.otherTransCard,
                        {
                          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                          borderColor: isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                      onPress={() => setActiveTransSlug(otherK.slug)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          {isOtherDefault && (
                            <Ionicons name="star" size={12} color="#D97706" />
                          )}
                          <Text style={[styles.otherTransTitle, { color: isDark ? '#93C5FD' : '#2563EB', marginBottom: 0 }]}>
                            {otherK.name_bangla}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.selectTransPill,
                            isOtherDefault && styles.selectTransPillActive,
                          ]}
                          onPress={() => handleSetDefaultTranslation(otherK.slug)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isOtherDefault ? 'star' : 'star-outline'}
                            size={11}
                            color={isOtherDefault ? '#D97706' : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.selectTransPillText,
                              { color: isOtherDefault ? '#D97706' : colors.textMuted },
                            ]}
                          >
                            {isOtherDefault ? 'ডিফল্ট' : 'ডিফল্ট করুন'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.otherTransText, { color: isDark ? '#D1D5DB' : '#374151' }]}>
                        {otherText || currentAyah.trans}
                      </Text>
                    </TouchableOpacity>
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
                  <View style={styles.headerTitleRow}>
                    <View style={styles.headerTitleTextWrap}>
                      <Text style={[styles.tafsirKitabArabic, { color: '#059669' }]} numberOfLines={1}>
                        {tafsirKitabs.find((k) => k.slug === activeTafsirSlug)?.name_arabic}
                      </Text>
                      <Text style={[styles.tafsirAuthorName, { color: colors.textMuted }]} numberOfLines={1}>
                        {tafsirKitabs.find((k) => k.slug === activeTafsirSlug)?.author}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.citeCopyBtn}
                      onPress={handleCopyTafsirWithCitation}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={copiedCiteToast ? 'checkmark-circle' : 'newspaper-outline'}
                        size={13}
                        color={copiedCiteToast ? '#059669' : colors.textMuted}
                      />
                      <Text style={[styles.citeCopyBtnText, { color: copiedCiteToast ? '#059669' : colors.textMuted }]}>
                        {copiedCiteToast ? 'কপি হয়েছে' : 'উদ্ধৃতি কপি'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Publication & Volume/Page Reference Badge */}
                  {activeTafsirRef ? (
                    <View
                      style={[
                        styles.referenceCardBox,
                        {
                          backgroundColor: isDark ? '#064E3B20' : '#ECFDF5',
                          borderColor: isDark ? '#047857' : '#A7F3D0',
                        },
                      ]}
                    >
                      <View style={styles.referenceBadgeLine}>
                        <Ionicons name="bookmark-outline" size={12} color="#059669" />
                        <Text
                          style={[styles.referenceBadgeText, { color: isDark ? '#6EE7B7' : '#065F46' }]}
                          numberOfLines={1}
                        >
                          {activeTafsirRef.badgeText}
                        </Text>
                      </View>
                      {activeTafsirRef.investigator ? (
                        <Text style={[styles.referenceBadgeSub, { color: colors.textMuted }]} numberOfLines={2}>
                          {activeTafsirRef.investigator}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {loadingAyah ? (
                  <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                      তাফসীর লোড হচ্ছে...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.tafsirTokensWrapper,
                      { lineHeight: Math.round(tafsirFontSize * 1.85) },
                    ]}
                  >
                    {parseTafsirTokens(getActiveTafsirText()).map((tok, idx) => {
                      if (tok.type === 'ayah') {
                        return (
                          <Text
                            key={idx}
                            style={[
                              styles.tokenAyah,
                              { fontSize: tafsirFontSize + 2 },
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
                              { fontSize: tafsirFontSize },
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
                              { fontSize: Math.max(12, tafsirFontSize - 2) },
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
                              color: isDark ? '#E2E8F0' : '#1F2937',
                            },
                          ]}
                        >
                          {tok.text}{' '}
                        </Text>
                      );
                    })}
                  </Text>
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

              {/* Selected Word Root & Morphology Card (Pure Arabic Presentation, No Bengali Grammar Labels) */}
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

                    <View style={{ flex: 1, marginRight: 14, justifyContent: 'center' }}>
                      {activeWordMorph.root ? (
                        <View style={styles.rootArabicRow}>
                          <Text style={[styles.rootArabicTag, { color: isDark ? '#34D399' : '#059669' }]}>
                            الجذر:
                          </Text>
                          <Text style={[styles.rootTextArabic, { color: isDark ? '#F1F5F9' : '#047857' }]}>
                            {activeWordMorph.root}
                          </Text>
                        </View>
                      ) : null}

                      {activeWordMorph.lemma ? (
                        <View style={[styles.rootArabicRow, activeWordMorph.root ? { marginTop: 4 } : null]}>
                          <Text style={[styles.rootArabicTag, { color: isDark ? '#93C5FD' : '#2563EB' }]}>
                            الأصل / الصيغة:
                          </Text>
                          <Text style={[styles.lemmaTextArabic, { color: isDark ? '#E2E8F0' : '#1E293B' }]}>
                            {activeWordMorph.lemma}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}

              {/* Dictionary Selector and Content (Multi-Lughat Classical Registry) */}
              {activeWordMorph?.root ? (
                <>
                  {/* Scrollable Dictionary Chips */}
                  <View style={{ marginTop: 14 }}>
                    <Text style={[styles.sectionHeading, { color: colors.textMuted, fontSize: 11.5, marginBottom: 6 }]}>
                      প্রামাণ্য আরবি ও দ্বিভাষিক অভিধানসমূহ:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={[styles.kitabSelectorRow, { flexDirection: 'row-reverse' }]}
                    >
                      {lughatKitabs.map((k) => {
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
                              {k.name_arabic}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

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
                      <View style={styles.headerTitleRow}>
                        <View style={styles.headerTitleTextWrap}>
                          <Text style={[styles.lughatTitle, { color: '#0284C7' }]} numberOfLines={1}>
                            {lughatKitabs.find((k) => k.slug === activeLughatSlug)?.name_arabic}
                          </Text>
                          <Text style={[styles.tafsirAuthorName, { color: colors.textMuted }]} numberOfLines={1}>
                            {lughatKitabs.find((k) => k.slug === activeLughatSlug)?.author}
                          </Text>
                        </View>

                        {activeLughatContent ? (
                          <TouchableOpacity
                            style={styles.citeCopyBtn}
                            onPress={handleCopyLughatWithCitation}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={copiedLughatCiteToast ? 'checkmark-circle' : 'newspaper-outline'}
                              size={13}
                              color={copiedLughatCiteToast ? '#0284C7' : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.citeCopyBtnText,
                                { color: copiedLughatCiteToast ? '#0284C7' : colors.textMuted },
                              ]}
                            >
                              {copiedLughatCiteToast ? 'কপি হয়েছে' : 'উদ্ধৃতি কপি'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Publication Reference Card Box */}
                      {activeLughatRef ? (
                        <View
                          style={[
                            styles.referenceCardBox,
                            {
                              backgroundColor: isDark ? '#0369A120' : '#F0F9FF',
                              borderColor: isDark ? '#0284C7' : '#BAE6FD',
                            },
                          ]}
                        >
                          <View style={styles.referenceBadgeLine}>
                            <Ionicons name="book-outline" size={12} color="#0284C7" />
                            <Text
                              style={[styles.referenceBadgeText, { color: isDark ? '#7DD3FC' : '#0369A1' }]}
                              numberOfLines={1}
                            >
                              {activeLughatRef.badgeText}
                            </Text>
                          </View>
                          {activeLughatRef.edition ? (
                            <Text style={[styles.referenceBadgeSub, { color: colors.textMuted }]} numberOfLines={2}>
                              {activeLughatRef.edition}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    {loadingLughat ? (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#0284C7" />
                        <Text style={{ marginTop: 8, fontSize: 12, color: colors.textMuted }}>
                          লোগাত অনুসন্ধান করা হচ্ছে...
                        </Text>
                      </View>
                    ) : activeLughatContent ? (
                      <View style={styles.lughatContentContainer}>
                        {renderFormattedLughatContent(activeLughatContent)}
                      </View>
                    ) : (
                      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 }}>
                          এই কিতাবে এই শব্দমূলের ({activeWordMorph.root}) সরাসরি ভুক্তি পাওয়া যায়নি।{'\n'}
                          উপরের তালিকা থেকে অন্যান্য অভিধানসমূহ দেখতে পারেন।
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              ) : null}
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
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 12,
  },
  surahTitle: {
    fontSize: 15,
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
    marginBottom: 6,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  arabicBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ayahBannerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ayahHeaderLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  expandAyahPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  expandAyahPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expandedAyahScroll: {
    maxHeight: 140,
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
    writingDirection: 'rtl',
  },
  mainTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 12,
    marginTop: 4,
  },
  mainTabItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
  },
  mainTabItemActive: {},
  mainTabText: {
    fontSize: 13,
    textAlign: 'center',
    flexShrink: 1,
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
    writingDirection: 'auto',
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  defaultSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4.5,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  defaultSetBtnActive: {
    borderColor: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  defaultSetBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  defaultSavedToastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  defaultSavedToastText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  selectTransPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 0.8,
    borderColor: '#E2E8F0',
  },
  selectTransPillActive: {
    borderColor: '#D97706',
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
  },
  selectTransPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  citeCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'rgba(0,0,0,0.02)',
    flexShrink: 0,
  },
  citeCopyBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  referenceCardBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.8,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  referenceBadgeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  referenceBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'serif',
    flexShrink: 1,
  },
  referenceBadgeSub: {
    fontSize: 10.5,
    marginTop: 3,
    lineHeight: 15,
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
    writingDirection: 'rtl',
  },
  tafsirAuthorName: {
    fontSize: 11,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  tafsirTokensWrapper: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tokenAyah: {
    color: '#059669',
    fontWeight: '700',
    fontFamily: 'serif',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tokenSpeaker: {
    color: '#2563EB',
    fontWeight: '700',
    fontFamily: 'serif',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tokenRef: {
    color: '#D97706',
    fontWeight: '600',
    fontFamily: 'serif',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  tokenProse: {
    fontWeight: '400',
    fontFamily: 'serif',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  wordsGridWrap: {
    flexDirection: 'row-reverse',
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
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  morphologyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  morphHeaderRow: {
    flexDirection: 'row-reverse',
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
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  rootArabicRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  rootArabicTag: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: '700',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rootTextArabic: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lemmaTextArabic: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: '600',
    textAlign: 'right',
    writingDirection: 'rtl',
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
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  lughatContentContainer: {
    paddingVertical: 4,
  },
  lughatParagraph: {
    fontSize: 15,
    lineHeight: 28,
    fontFamily: 'serif',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  lughatAyah: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'serif',
    borderRadius: 4,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
  },
  lughatRef: {
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 4,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
  },
  lughatFootnote: {
    fontSize: 12,
    fontStyle: 'italic',
    borderRadius: 4,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
  },
  lughatQuote: {
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
  },
  lughatHeadword: {
    fontWeight: '700',
    borderRadius: 4,
    paddingHorizontal: 4,
    writingDirection: 'rtl',
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
