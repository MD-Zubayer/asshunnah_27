import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const websites = [
  {
    id: 1,
    name: 'হাদিস একাডেমি',
    url: 'https://hadithacademy.net',
    icon: 'globe-outline',
    color: '#2563EB',
    description: 'হাদিস ও সুন্নাহ সম্পর্কিত গবেষণা ও প্রকাশনা',
  },
  {
    id: 2,
    name: 'হাদিস বাংলা',
    url: 'https://hadithbangla.com',
    icon: 'globe-outline',
    color: '#9333EA',
    description: 'বাংলা ভাষায় হাদিস সংগ্রহ ও অনুবাদ',
  },
  {
    id: 3,
    name: 'হাদিস ফাউন্ডেশন',
    url: 'https://hadithfoundation.com',
    icon: 'globe-outline',
    color: '#059669',
    description: 'হাদিস গবেষণা ও প্রকাশনা প্রতিষ্ঠান',
  },
  {
    id: 4,
    name: 'সহিহ হাদিস',
    url: 'https://sahihhadis.com',
    icon: 'globe-outline',
    color: '#D97706',
    description: 'সহিহ হাদিসের বাংলা সংগ্রহ',
  },
  {
    id: 5,
    name: 'আল কুরআান একাডেমি',
    url: 'https://alquran.academy',
    icon: 'globe-outline',
    color: '#DC2626',
    description: 'কুরআন শিক্ষা ও গবেষণা একাডেমি',
  },
  {
    id: 6,
    name: 'মক্তব বুকস',
    url: 'https://maktabbooks.com',
    icon: 'globe-outline',
    color: '#0891B2',
    description: 'ইসলামি বই প্রকাশনা ও পরিবেশনা',
  },
  {
    id: 7,
    name: 'ইসলামি বই',
    url: 'https://islamibook.com',
    icon: 'globe-outline',
    color: '#7C3AED',
    description: 'বাংলা ইসলামি বইয়ের অনলাইন সংগ্রহ',
  },
  {
    id: 8,
    name: 'রাহে বেলায়াত',
    url: 'https://rohebelayet.com',
    icon: 'globe-outline',
    color: '#EC4899',
    description: 'আত্মশুদ্ধি ও তাসাউফ বিষয়ক ওয়েবসাইট',
  },
  {
    id: 9,
    name: 'ইসলামিক লাইব্রেরি',
    url: 'https://islamiclibrary.com',
    icon: 'globe-outline',
    color: '#1D4ED8',
    description: 'ইসলামি জ্ঞানভাণ্ডারের অনলাইন লাইব্রেরি',
  },
  {
    id: 10,
    name: 'মুসলিম ভিশন',
    url: 'https://muslimvision.com',
    icon: 'globe-outline',
    color: '#059669',
    description: 'ইসলামি সংস্কৃতি ও শিক্ষা বিষয়ক পোর্টাল',
  },
  {
    id: 11,
    name: 'ইসলামিক ফাউন্ডেশন',
    url: 'https://islamicfoundation.com',
    icon: 'globe-outline',
    color: '#2563EB',
    description: 'ইসলামি গবেষণা ও প্রকাশনা সংস্থা',
  },
  {
    id: 12,
    name: 'দারুল উলূম',
    url: 'https://darululum.com',
    icon: 'globe-outline',
    color: '#9333EA',
    description: 'মাদরাসা শিক্ষা ও ইসলামি জ্ঞান',
  },
];

export default function WebsitesScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openWebsite = (url) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>প্রসিদ্ধ ওয়েবসাইট</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>ওয়েবসাইট সমূহ</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
              <Ionicons name="globe" size={36} color={colors.accentBlue} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>প্রসিদ্ধ ওয়েবসাইট</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>গুরুত্বপূর্ণ ইসলামিক ওয়েবসাইট সমূহ</Text>
          </View>
        </View>

        {websites.map((site) => (
          <TouchableOpacity key={site.id} activeOpacity={0.7} onPress={() => openWebsite(site.url)}>
            <View style={[styles.siteOuter, { backgroundColor: colors.purpleCardBg, borderColor: colors.purpleCardBorder }]}>
              <View style={[styles.siteInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.siteHeader}>
                  <View style={[styles.siteIcon, { backgroundColor: `${site.color}15`, borderColor: `${site.color}30` }]}>
                    <Ionicons name={site.icon} size={20} color={site.color} />
                  </View>
                  <View style={styles.siteTitleArea}>
                    <Text style={[styles.siteName, { color: colors.text }]}>{site.name}</Text>
                    <Text style={[styles.siteDescription, { color: colors.textSecondary }]}>{site.description}</Text>
                  </View>
                  <View style={[styles.visitBadge, { backgroundColor: `${site.color}15` }]}>
                    <Ionicons name="open-outline" size={16} color={site.color} />
                  </View>
                </View>
                <Text style={[styles.siteUrl, { color: site.color }]}>{site.url}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '900', fontStyle: 'italic', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  heroOuter: { borderRadius: 24, padding: 3, borderWidth: 1, marginBottom: 16, elevation: 4, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  heroInner: { borderRadius: 21, padding: 24, alignItems: 'center', borderWidth: 1 },
  heroIconContainer: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', fontStyle: 'italic' },
  heroSubtitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  siteOuter: { borderRadius: 16, padding: 2, borderWidth: 1, marginBottom: 8 },
  siteInner: { borderRadius: 14, padding: 14, borderWidth: 1 },
  siteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  siteIcon: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  siteTitleArea: { flex: 1 },
  siteName: { fontSize: 15, fontWeight: '800' },
  siteDescription: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  visitBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  siteUrl: { fontSize: 11, fontWeight: '600', marginTop: 8 },
});