import { StyleSheet, Text, View, ScrollView, useColorScheme, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/theme';
import TopNavbar from '../../components/TopNavbar';
import diaryService from '../../services/diary-service';
import cacheService, { CacheKeys } from '../../services/cacheService';
import { useAuth } from '../../context/AuthContext';

const TAG_COLORS = {
  'আমল': { tagColor: '#2563EB', colorBg: '#2563EB15', colorBorder: '#2563EB30' },
  'নামাজ': { tagColor: '#9333EA', colorBg: '#9333EA15', colorBorder: '#9333EA30' },
  'কুরআন': { tagColor: '#059669', colorBg: '#05966915', colorBorder: '#05966930' },
  'দোয়া': { tagColor: '#D97706', colorBg: '#D9770615', colorBorder: '#D9770630' },
  'ইলম': { tagColor: '#EC4899', colorBg: '#EC489915', colorBorder: '#EC489930' },
  'সাধারণ': { tagColor: '#6B7280', colorBg: '#6B728015', colorBorder: '#6B728030' },
};

export default function DiaryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const serviceItems = [
    { id: 1, label: 'জামিয়া পরিচিতি', icon: 'school-outline', color: '#2563EB', colorBg: colors.blueCardBg, colorBorder: colors.blueCardBorder },
    { id: 2, label: 'হযরাতুল মুহাদ্দিসিন', icon: 'people-outline', color: '#9333EA', colorBg: colors.purpleCardBg, colorBorder: colors.purpleCardBorder },
    { id: 3, label: 'মুদাররিস ও মোলাঝিম', icon: 'shirt-outline', color: '#059669', colorBg: colors.emeraldCardBg, colorBorder: colors.emeraldCardBorder },
    { id: 4, label: 'ফুজালায়ে জামিয়া', icon: 'ribbon-outline', color: '#D97706', colorBg: colors.amberCardBg, colorBorder: colors.amberCardBorder },
    { id: 5, label: 'দায়িত্বশীল কর্মীগণ', icon: 'business-outline', color: '#EC4899', colorBg: colors.redCardBg, colorBorder: colors.redCardBorder },
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

  const loadDiaries = async () => {
    // ১. আগে ক্যাশ থেকে instant দেখাও
    const cached = await cacheService.getCache(CacheKeys.DIARIES);
    if (cached.exists && cached.data) {
      setDiaryEntries(cached.data);
      setLoading(false);
      console.log('[Diary] Loaded from cache instantly');
    }

    // ২. ব্যাকগ্রাউন্ডে API থেকে sync করো
    setSyncing(true);
    try {
      const freshData = await diaryService.refreshDiaries(token);
      // ৩. নতুন ডেটা এলে auto আপডেট করো
      if (freshData && freshData.length > 0) {
        setDiaryEntries(freshData);
        console.log('[Diary] Auto-updated from API');
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
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar with Profile */}
      <TopNavbar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar with Glass Glow */}
        <View style={[styles.searchOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.searchInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={18} color={colors.primary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="ডায়েরিতে খুঁজুন..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* জামিয়া নির্দেশিকা ও ইসলামী সেবা (2-Column Grid) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>জামিয়া নির্দেশিকা ও ইসলামী সেবা</Text>

        <View style={styles.servicesGrid}>
          {serviceItems.map((item) => (
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
                  5: '/dayittoshil-kormigon',
                  6: '/photo-gallery',
                  7: '/doya',
                  8: '/probondho',
                  9: '/kitab-parichiti',
                  10: '/contact-location',
                  11: '/websites',
                  12: '/jamia-graduates',
                };
                const route = routes[item.id];
                if (route) {
                  router.push(route);
                }
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

        {/* Add New Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/create-diary')}
        >
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.addButtonText}>নতুন ডায়েরি লিখুন</Text>
        </TouchableOpacity>

        {/* Syncing indicator */}
        {syncing && (
          <View style={styles.syncingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.syncingText, { color: colors.textSecondary }]}>
              আপডেট হচ্ছে...
            </Text>
          </View>
        )}

        {/* Diary Entries (Tailwind Glass Outer + Inner Cards) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>দৈনন্দিন ডায়েরি এন্ট্রি</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              ডায়েরি লোড হচ্ছে...
            </Text>
          </View>
        ) : diaryEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📔</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              এখনো কোনো ডায়েরি লেখা হয়নি।
            </Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
              "নতুন ডায়েরি লিখুন" বাটনে চেপে শুরু করুন
            </Text>
          </View>
        ) : (
          diaryEntries.map((entry) => {
            const tagStyle = TAG_COLORS[entry.tag] || TAG_COLORS['সাধারণ'];
            return (
              <TouchableOpacity
                key={entry.id}
                activeOpacity={0.85}
                onPress={() => {
                  router.push({
                    pathname: '/diary-detail',
                    params: {
                      id: entry.id,
                      title: entry.title,
                      content: entry.content,
                      tag: entry.tag,
                      emoji: entry.emoji,
                      date_display: entry.date_display,
                    },
                  });
                }}
                style={[styles.entryOuterCard, { backgroundColor: tagStyle.colorBg, borderColor: tagStyle.colorBorder }]}
              >
                <View style={[styles.entryInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.entryHeader}>
                    <View style={[styles.emojiBadge, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <Text style={styles.entryEmoji}>{entry.emoji}</Text>
                    </View>
                    <View style={styles.entryMeta}>
                      <Text style={[styles.entryTitle, { color: colors.text }]}>{entry.title}</Text>
                      <Text style={[styles.entryDate, { color: colors.textSecondary }]}>{entry.date_display}</Text>
                    </View>
                    <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
                  </View>

                  <Text style={[styles.entryPreview, { color: colors.textSecondary }]} numberOfLines={3}>
                    {entry.content}
                  </Text>

                  <View style={styles.entryFooter}>
                    <View style={[styles.tagPill, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <View style={[styles.tagDot, { backgroundColor: tagStyle.tagColor }]} />
                      <Text style={[styles.tagText, { color: colors.text }]}>{entry.tag}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#EC4899',
    marginHorizontal: 16,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchOuter: {
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
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
    marginTop: 20,
    marginBottom: 12,
    fontStyle: 'italic',
    textTransform: 'uppercase',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 14,
    marginBottom: 8,
    gap: 8,
    elevation: 4,
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  entryOuterCard: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginTop: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  entryInnerCard: {
    borderRadius: 21,
    padding: 16,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  entryEmoji: {
    fontSize: 22,
  },
  entryMeta: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  entryDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  entryPreview: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    fontWeight: '500',
  },
  entryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
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
