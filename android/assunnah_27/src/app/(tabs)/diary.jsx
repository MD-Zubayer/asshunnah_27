import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import TopNavbar from '../../components/TopNavbar';
import diaryService from '../../services/diary-service';
import cacheService, { CacheKeys } from '../../services/cacheService';
import { useAuth } from '../../context/AuthContext';
import { TAG_COLORS, TAG_OPTIONS, getDiaryFont, getPaperTheme } from '../../constants/diaryThemes';
import { getFullDiaryDateMeta, getMonthYearKey, toBanglaDigits } from '../../utils/diaryDate';
import { exportDiaryToPdf, exportDiaryToWord } from '../../utils/diaryExport';
import { getTotalAmolStats } from '../../data/dailyAmol';

export default function DiaryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const router = useRouter();
  const { token } = useAuth();

  const serviceItems = [
    { id: 1, label: 'জামিয়া পরিচিতি', icon: 'school-outline', color: '#2563EB', colorBg: colors.blueCardBg, colorBorder: colors.blueCardBorder },
    { id: 2, label: 'হযরাতুল মুহাদ্দিসিন', icon: 'people-outline', color: '#9333EA', colorBg: colors.purpleCardBg, colorBorder: colors.purpleCardBorder },
    { id: 3, label: 'মুদাররিস ও মোলাঝিম', icon: 'shirt-outline', color: '#059669', colorBg: colors.emeraldCardBg, colorBorder: colors.emeraldCardBorder },
    { id: 4, label: 'ফুজালায়ে জামিয়া', icon: 'ribbon-outline', color: '#D97706', colorBg: colors.amberCardBg, colorBorder: colors.amberCardBorder },
    { id: 6, label: 'ফটো গ্যালারি', icon: 'images-outline', color: '#2563EB', colorBg: colors.blueCardBg, colorBorder: colors.blueCardBorder },
    { id: 7, label: 'প্রয়োজনীয় দোয়া', icon: 'heart-outline', color: '#DC2626', colorBg: colors.redCardBg, colorBorder: colors.redCardBorder },
    { id: 8, label: 'বিষয় ভিত্তিক প্রবন্ধ', icon: 'document-text-outline', color: '#059669', colorBg: colors.emeraldCardBg, colorBorder: colors.emeraldCardBorder },
    { id: 9, label: 'কিতাব পরিচিতি', icon: 'book-outline', color: '#D97706', colorBg: colors.amberCardBg, colorBorder: colors.amberCardBorder },
    { id: 10, label: 'যোগাযোগ ও লোকেশন', icon: 'map-outline', color: '#2563EB', colorBg: colors.blueCardBg, colorBorder: colors.blueCardBorder },
    { id: 11, label: 'প্রসিদ্ধ ওয়েবসাইট', icon: 'globe-outline', color: '#9333EA', colorBg: colors.purpleCardBg, colorBorder: colors.purpleCardBorder },
    { id: 12, label: 'জামিয়ার সকল ফারেগিন', icon: 'people-circle-outline', color: '#10B981', colorBg: colors.emeraldCardBg, colorBorder: colors.emeraldCardBorder },
  ];

  const [diaryEntries, setDiaryEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'pinned' | tag label
  const [exportingAll, setExportingAll] = useState(false);

  const loadDiaries = async () => {
    const cached = await cacheService.getCache(CacheKeys.DIARIES);
    if (cached.exists && cached.data) {
      setDiaryEntries(cached.data);
      setLoading(false);
    }

    setSyncing(true);
    try {
      const freshData = await diaryService.refreshDiaries(token);
      if (Array.isArray(freshData)) {
        setDiaryEntries(freshData);
      }
    } catch (e) {
      console.log('[Diary] Background sync error:', e.message);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDiaries();
    }, [token])
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredServices = useMemo(() => {
    if (!normalizedQuery) return serviceItems;
    return serviceItems.filter((item) => item.label.toLowerCase().includes(normalizedQuery));
  }, [normalizedQuery, isDark]);

  const filteredDiaries = useMemo(() => {
    return diaryEntries.filter((entry) => {
      if (selectedFilter === 'pinned' && !entry.is_pinned) return false;
      if (selectedFilter !== 'all' && selectedFilter !== 'pinned' && entry.tag !== selectedFilter) {
        return false;
      }
      if (!normalizedQuery) return true;
      const hay = `${entry.title || ''} ${entry.content || ''} ${entry.tag || ''} ${entry.date_display || ''} ${entry.hijri_date || ''} ${entry.mood || ''}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [diaryEntries, selectedFilter, normalizedQuery]);

  // Group filtered diaries by month-year
  const groupedDiaries = useMemo(() => {
    const groups = [];
    const map = new Map();
    filteredDiaries.forEach((entry, idx) => {
      const globalPageIndex = diaryEntries.findIndex((d) => String(d.id) === String(entry.id));
      const key = getMonthYearKey(entry);
      if (!map.has(key)) {
        const group = { monthLabel: key, items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).items.push({
        entry,
        pageNumber: globalPageIndex >= 0 ? globalPageIndex + 1 : idx + 1,
      });
    });
    return groups;
  }, [filteredDiaries, diaryEntries]);

  const amolStats = useMemo(() => getTotalAmolStats(), []);

  const pinnedCount = useMemo(
    () => diaryEntries.filter((d) => d.is_pinned).length,
    [diaryEntries]
  );

  const openEntryInBook = (entry) => {
    router.push({
      pathname: '/diary-detail',
      params: {
        id: entry.id,
        title: entry.title,
        content: entry.content,
        tag: entry.tag,
        emoji: entry.emoji,
        date_display: entry.date_display,
        entry_date: entry.entry_date || '',
        hijri_date: entry.hijri_date || '',
        mood: entry.mood || '',
        weather: entry.weather || '',
        paper_theme: entry.paper_theme || 'cream',
        font_family: entry.font_family || 'handwriting',
        is_pinned: String(Boolean(entry.is_pinned)),
      },
    });
  };

  const handleExportAllMenu = () => {
    if (diaryEntries.length === 0) {
      Alert.alert('খালি ডায়েরি', 'ডাউনলোড করার জন্য এখনো কোনো ডায়েরি লেখা নেই।');
      return;
    }
    Alert.alert(
      'সম্পূর্ণ ডায়েরি ডাউনলোড',
      `মোট ${toBanglaDigits(diaryEntries.length)}টি পৃষ্ঠা কোন ফরম্যাটে ডাউনলোড করবেন?`,
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'PDF বই হিসেবে',
          onPress: async () => {
            try {
              setExportingAll(true);
              await exportDiaryToPdf(diaryEntries, {
                mode: 'download',
                fileNameBase: 'Assunnah_Full_Diary',
              });
            } catch (e) {
              Alert.alert('ত্রুটি', e.message || 'PDF তৈরি করা যায়নি');
            } finally {
              setExportingAll(false);
            }
          },
        },
        {
          text: 'Word (.doc) ফাইল',
          onPress: async () => {
            try {
              setExportingAll(true);
              await exportDiaryToWord(diaryEntries, {
                mode: 'download',
                fileNameBase: 'Assunnah_Full_Diary',
              });
            } catch (e) {
              Alert.alert('ত্রুটি', e.message || 'Word ফাইল তৈরি করা যায়নি');
            } finally {
              setExportingAll(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavbar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Working Search Bar */}
        <View style={[styles.searchOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.searchInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="ডায়েরির লেখা, তারিখ, ট্যাগ বা সেবা খুঁজুন..."
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

        {/* জামিয়া নির্দেশিকা ও ইসলামী সেবা */}
        {filteredServices.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>জামিয়া নির্দেশিকা ও ইসলামী সেবা</Text>
            <View style={styles.servicesGrid}>
              {filteredServices.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  style={[styles.serviceOuterCard, { backgroundColor: item.colorBg, borderColor: item.colorBorder }]}
                  onPress={() => {
                    const routes = {
                      1: '/jamia-parichiti',
                      2: '/muhaddisin',
                      3: '/mudarris-wo-molazim',
                      4: '/fuzalaye-jamia',
                      6: '/photo-gallery',
                      7: '/doya',
                      8: '/probondho',
                      9: '/kitab-parichiti',
                      10: '/contact-location',
                      11: '/websites',
                      12: '/jamia-graduates',
                    };
                    const route = routes[item.id];
                    if (route) router.push(route);
                  }}
                >
                  <View style={[styles.serviceInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={[styles.serviceIconBadge, { backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <Text style={[styles.serviceLabel, { color: colors.text }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Daily Amol & Dua Book Cover Card */}
        <LinearGradient
          colors={isDark ? ['#064E3B', '#022C22'] : ['#065F46', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.diaryCoverCard}
        >
          <View style={styles.coverSpine} />
          <View style={styles.coverGoldBorder}>
            <View style={styles.coverTopRow}>
              <View style={styles.coverBadge}>
                <Ionicons name="sparkles" size={14} color="#FDE68A" />
                <Text style={styles.coverBadgeText}>দৈনন্দিন মাসনূন ওযীফা</Text>
              </View>
              <View style={styles.coverStatsRow}>
                <Text style={styles.coverStatText}>
                  📖 {toBanglaDigits(amolStats.totalDuasCount)}+ দু‘আ • {toBanglaDigits(amolStats.asmaulHusnaCount)} নাম
                </Text>
              </View>
            </View>

            <Text style={[styles.coverTitle, { fontFamily: 'Atma-Bold' }]}>
              দৈনন্দিন আমল ও দু‘আসমূহ
            </Text>
            <Text style={styles.coverSubtitle}>
              কুরআন ও হাদীসে বর্ণিত • সকাল-সন্ধ্যা, নামাযের পর, ইস্তিগফার, দুরূদ, সফর ও আসমাউল হুসনা
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              contentContainerStyle={{ gap: 6 }}
            >
              {[
                { id: 'ch1-morning-evening', label: '☀️ সকাল-সন্ধ্যা' },
                { id: 'ch1-after-prayer', label: '🕌 নামাযের পর' },
                { id: 'ch3-daily-safar', label: '🧭 দৈনন্দিন ও সফর' },
                { id: 'ch4-istighfar', label: '💧 ইস্তিগফার' },
                { id: 'ch5-durood', label: '🌹 দুরূদ শরীফ' },
                { id: 'ch6-special-amol', label: '⭐ বিশেষ আমল' },
                { id: 'asmaul-husna', label: '✨ ৯৯ নাম' },
              ].map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({ pathname: '/doinondin-amol', params: { chapter: cat.id } })
                  }
                  style={styles.amolQuickChip}
                >
                  <Text style={styles.amolQuickChipText}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.coverActionsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.coverWriteBtn, { backgroundColor: '#FDE68A' }]}
                onPress={() =>
                  router.push(
                    normalizedQuery
                      ? { pathname: '/doinondin-amol', params: { q: searchQuery.trim() } }
                      : '/doinondin-amol'
                  )
                }
              >
                <Ionicons name="book-outline" size={17} color="#064E3B" />
                <Text style={[styles.coverWriteBtnText, { color: '#064E3B' }]}>
                  {normalizedQuery ? `কিতাবে “${searchQuery.trim()}” খুঁজুন` : 'কিতাব ও দু‘আ খুলুন'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.coverReadBtn}
                onPress={() =>
                  router.push({ pathname: '/doinondin-amol', params: { chapter: 'favorites' } })
                }
              >
                <Ionicons name="bookmark" size={16} color="#FDE68A" />
                <Text style={styles.coverReadBtnText}>প্রিয় আমল</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Physical Leather Diary Cover Card */}
        <LinearGradient
          colors={isDark ? ['#311B12', '#1F120D'] : ['#6B2E1E', '#471D12']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.diaryCoverCard}
        >
          {/* Left Spine Line & Gold Trim */}
          <View style={styles.coverSpine} />
          <View style={styles.coverGoldBorder}>
            <View style={styles.coverTopRow}>
              <View style={styles.coverBadge}>
                <Ionicons name="book" size={14} color="#FDE68A" />
                <Text style={styles.coverBadgeText}>ব্যক্তিগত নোটবুক</Text>
              </View>
              <View style={styles.coverStatsRow}>
                <Text style={styles.coverStatText}>📄 {toBanglaDigits(diaryEntries.length)} পৃষ্ঠা</Text>
                {pinnedCount > 0 && (
                  <Text style={styles.coverStatText}> • 📌 {toBanglaDigits(pinnedCount)}</Text>
                )}
              </View>
            </View>

            <Text style={[styles.coverTitle, { fontFamily: 'Atma-Bold' }]}>
              আমার দৈনন্দিন ডায়েরি
            </Text>
            <Text style={styles.coverSubtitle}>
              হাতের লেখায় ফিজিক্যাল কাগজের অভিজ্ঞতা • হিজরি, বাংলা ও ইংরেজি তারিখসহ
            </Text>

            <View style={styles.coverActionsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.coverWriteBtn}
                onPress={() => router.push('/create-diary')}
              >
                <Ionicons name="create" size={17} color="#471D12" />
                <Text style={styles.coverWriteBtnText}>নতুন পৃষ্ঠা লিখুন</Text>
              </TouchableOpacity>

              {diaryEntries.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.coverReadBtn}
                  onPress={() => openEntryInBook(diaryEntries[0])}
                >
                  <Ionicons name="book-outline" size={17} color="#FDE68A" />
                  <Text style={styles.coverReadBtnText}>বই খুলুন</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.coverExportBtn}
                onPress={handleExportAllMenu}
                disabled={exportingAll}
              >
                {exportingAll ? (
                  <ActivityIndicator size="small" color="#FDE68A" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#FDE68A" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Syncing indicator */}
        {syncing && (
          <View style={styles.syncingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.syncingText, { color: colors.textSecondary }]}>আপডেট হচ্ছে...</Text>
          </View>
        )}

        {/* Filter Chips */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14, marginBottom: 8 }]}>
            সংরক্ষিত পৃষ্ঠাসমূহ ({toBanglaDigits(filteredDiaries.length)})
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          <TouchableOpacity
            onPress={() => setSelectedFilter('all')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'all' ? colors.primary : colors.card,
                borderColor: selectedFilter === 'all' ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'all' ? '#fff' : colors.text }]}>
              সব ({toBanglaDigits(diaryEntries.length)})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedFilter('pinned')}
            style={[
              styles.filterChip,
              {
                backgroundColor: selectedFilter === 'pinned' ? '#DC2626' : colors.card,
                borderColor: selectedFilter === 'pinned' ? '#DC2626' : colors.cardBorder,
              },
            ]}
          >
            <Text style={[styles.filterChipText, { color: selectedFilter === 'pinned' ? '#fff' : colors.text }]}>
              📌 পিন করা ({toBanglaDigits(pinnedCount)})
            </Text>
          </TouchableOpacity>

          {TAG_OPTIONS.map((tag) => {
            const active = selectedFilter === tag.label;
            return (
              <TouchableOpacity
                key={tag.label}
                onPress={() => setSelectedFilter(tag.label)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? tag.color : colors.card,
                    borderColor: active ? tag.color : colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: active ? '#fff' : colors.text }]}>
                  {tag.emoji} {tag.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Diary Entries Grouped by Month */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>ডায়েরি লোড হচ্ছে...</Text>
          </View>
        ) : filteredDiaries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📔</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {normalizedQuery ? 'খুঁজে পাওয়া যায়নি' : 'এখনো কোনো ডায়েরি লেখা হয়নি।'}
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
              {normalizedQuery
                ? 'অন্য কোনো শব্দ বা তারিখ দিয়ে খুঁজে দেখুন'
                : '"নতুন পৃষ্ঠা লিখুন" বাটনে চেপে হাতে লেখা ডায়েরি শুরু করুন'}
            </Text>
          </View>
        ) : (
          groupedDiaries.map((group) => (
            <View key={group.monthLabel} style={styles.monthGroup}>
              <View style={styles.monthHeader}>
                <View style={[styles.monthDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.monthTitle, { color: colors.textSecondary }]}>{group.monthLabel}</Text>
                <View style={[styles.monthLine, { backgroundColor: colors.cardBorder }]} />
              </View>

              {group.items.map(({ entry, pageNumber }) => {
                const tagStyle = TAG_COLORS[entry.tag] || TAG_COLORS['সাধারণ'];
                const paper = getPaperTheme(entry.paper_theme === 'night' && !isDark ? 'cream' : entry.paper_theme);
                const font = getDiaryFont(entry.font_family);
                const dateMeta = getFullDiaryDateMeta(entry.entry_date || entry.created_at, entry.hijri_date);

                return (
                  <TouchableOpacity
                    key={entry.id}
                    activeOpacity={0.85}
                    onPress={() => openEntryInBook(entry)}
                    style={[
                      styles.paperCard,
                      {
                        backgroundColor: paper.paperBg,
                        borderColor: paper.borderColor,
                      },
                    ]}
                  >
                    {/* Left red notebook margin */}
                    <View style={[styles.cardMarginLine, { borderLeftColor: paper.marginColor }]} />

                    <View style={styles.cardBodyWrap}>
                      <View style={styles.entryHeader}>
                        <View style={[styles.pageTagPill, { backgroundColor: paper.headerBg, borderColor: paper.borderColor }]}>
                          <Text style={[styles.pageTagText, { color: paper.accentColor }]}>
                            পৃষ্ঠা {toBanglaDigits(pageNumber)}
                          </Text>
                        </View>
                        <Text style={[styles.entryDate, { color: paper.mutedColor }]}>
                          {dateMeta.englishBn} • {dateMeta.weekday}
                        </Text>
                        {entry.is_pinned && (
                          <Ionicons name="bookmark" size={16} color="#DC2626" style={{ marginLeft: 'auto' }} />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.entryTitle,
                          { color: paper.textColor, fontFamily: font.boldFontFamily },
                        ]}
                        numberOfLines={1}
                      >
                        {entry.emoji || '📝'} {entry.title}
                      </Text>

                      <Text
                        style={[
                          styles.entryPreview,
                          { color: paper.mutedColor, fontFamily: font.fontFamily },
                        ]}
                        numberOfLines={2}
                      >
                        {entry.content}
                      </Text>

                      <View style={styles.entryFooter}>
                        <View style={styles.footerLeft}>
                          <View style={[styles.tagPill, { backgroundColor: `${tagStyle.tagColor}15`, borderColor: `${tagStyle.tagColor}35` }]}>
                            <View style={[styles.tagDot, { backgroundColor: tagStyle.tagColor }]} />
                            <Text style={[styles.tagText, { color: tagStyle.tagColor }]}>{entry.tag}</Text>
                          </View>
                          <Text style={[styles.hijriMini, { color: paper.mutedColor }]} numberOfLines={1}>
                            🌙 {dateMeta.hijriDate}
                          </Text>
                        </View>
                        <View style={styles.readArrowPill}>
                          <Text style={[styles.readArrowText, { color: paper.accentColor }]}>খুলুন</Text>
                          <Ionicons name="chevron-forward" size={14} color={paper.accentColor} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  searchOuter: {
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 12,
    fontStyle: 'italic',
    letterSpacing: -0.3,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  serviceOuterCard: {
    width: '48%',
    borderRadius: 20,
    padding: 2.5,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  serviceInnerCard: {
    borderRadius: 17,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  serviceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  serviceLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  diaryCoverCard: {
    marginTop: 14,
    borderRadius: 20,
    padding: 6,
    position: 'relative',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  coverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(253,230,138,0.25)',
  },
  coverGoldBorder: {
    marginLeft: 12,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(253,230,138,0.45)',
    padding: 16,
  },
  coverTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(253,230,138,0.14)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  coverBadgeText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '800',
  },
  coverStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverStatText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  coverTitle: {
    color: '#FFFBEB',
    fontSize: 22,
    marginBottom: 3,
  },
  coverSubtitle: {
    color: 'rgba(254,243,199,0.78)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 14,
  },
  coverActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverWriteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FDE68A',
    paddingVertical: 11,
    borderRadius: 12,
  },
  coverWriteBtnText: {
    color: '#471D12',
    fontSize: 13,
    fontWeight: '900',
  },
  coverReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.4)',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
  },
  coverReadBtnText: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '800',
  },
  amolQuickChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  amolQuickChipText: {
    color: '#FFFBEB',
    fontSize: 11.5,
    fontWeight: '700',
  },
  coverExportBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthGroup: {
    marginBottom: 14,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  monthTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  monthLine: {
    flex: 1,
    height: 1,
  },
  paperCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  cardMarginLine: {
    position: 'absolute',
    left: 24,
    top: 0,
    bottom: 0,
    borderLeftWidth: 1.5,
    opacity: 0.65,
  },
  cardBodyWrap: {
    paddingLeft: 34,
    paddingRight: 14,
    paddingVertical: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pageTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  pageTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entryDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  entryTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  entryPreview: {
    fontSize: 14,
    lineHeight: 22,
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  hijriMini: {
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  readArrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readArrowText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 46,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 5,
  },
  emptySubText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  syncingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  syncingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
