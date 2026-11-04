import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

const staffCategories = [
  {
    id: 1,
    title: 'বাবুর্চি',
    icon: 'restaurant-outline',
    color: '#2563EB',
    colorBg: 'blueCardBg',
    colorBorder: 'blueCardBorder',
    people: [
      { name: 'মুহা: সুমন মাতুব্বর', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01754113075' },
      { name: 'মুহা: সারেজান মোল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01746184474' },
      { name: 'মুহা: শহিদুল শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01745918307' },
      { name: 'মুহা: জিয়া উদ্দীন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01725121545' },
      { name: 'মুহা: কানু বিশ্বাস', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01764691498' },
      { name: 'মুহা: আজমির ফকির', title: 'বাবুর্চি', address: 'গোপালগঞ্জ', phone: '01307182690' },
      { name: 'মুহা: সরোয়ার মোল্যা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01933602395' },
      { name: 'মুহা: জহিরুল ইসলাম মিথুন', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '1726421690' },
      { name: 'মুহা: ইলিয়াছ শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01729600240' },
      { name: 'মুহা: রওশন মোল্লা', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01879469993' },
      { name: 'মুহা: আইয়ুব আলী শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01778781765' },
      { name: 'মুহা: জয়নাল মোল্লা', title: 'বাবুর্চি', address: 'শরীয়তপুর', phone: '01998065564' },
      { name: 'মুহা: অয়েচ কুরুনী', title: 'বাবুর্চি', address: 'খুলনা', phone: '01740902321' },
      { name: 'মুহা: রাজু শেখ', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01755150977' },
      { name: 'মুহা: তোরাব আলী', title: 'বাবুর্চি', address: 'গোপালগঞ্জ', phone: '01706103269' },
      { name: 'মুহা: মিজানুর রহমান মুন্সি', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01734839876' },
      { name: 'মুহা: বাবুল বেপারী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01735188691' },
      { name: 'মুহা: আব্দুল আলিম', title: 'বাবুর্চি', address: 'খুলনা', phone: '1967189866' },
      { name: 'মোহাম্মাদ আলী', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '1969575961' },
      { name: 'মুহা: শাহাদাৎ ফরাজী', title: 'বাবুর্চি', address: 'মাদারীপুর', phone: '01775085476' },
      { name: 'মুহাঃ শামীম মাতুব্বর', title: 'বাবুর্চি', address: 'ফরিদপুর', phone: '01753686811' },
      { name: 'মুহাঃ বেলায়েত মুন্সী', title: 'বাবুর্চি', address: 'খুলনা', phone: '01896423887' },
    ],
  },
  {
    id: 2,
    title: 'সিকিউরিটি',
    icon: 'shield-checkmark-outline',
    color: '#9333EA',
    colorBg: 'purpleCardBg',
    colorBorder: 'purpleCardBorder',
    people: [
      { name: 'মোহাঃ জহিরুল ইসলাম', title: 'সিকিউরিটি', address: 'গোপালগঞ্জ', phone: '01726421690' },
      { name: 'মুহা: আব্দুল কাদির মোড়ল', title: 'দারোয়ান', address: 'মাদারীপুর', phone: '01955777009' },
      { name: 'মুহা: রবিউল ইসলাম', title: 'দারোয়ান', address: 'খুলনা', phone: '01955653181' },
      { name: 'মুহা: আব্দুল করিম শেখ', title: 'দারোয়ান', address: 'খুলনা', phone: '01853101080' },
      { name: 'মুহ্য: কবির মিয়া', title: 'দারোয়ান', address: 'গোপালগঞ্জ', phone: '01722070673' },
      { name: 'মুহা: ইমাম আল হাফীজ', title: 'দারোয়ান', address: 'গোপালগঞ্জ', phone: '01730953750' },
      { name: 'মুহা: ফরহাদ শেখ', title: 'দারোয়ান', address: 'গোপালগঞ্জ', phone: '01967732460' },
    ],
  },
  {
    id: 3,
    title: 'ক্লিনার ও অন্যান্য',
    icon: 'trash-outline',
    color: '#059669',
    colorBg: 'emeraldCardBg',
    colorBorder: 'emeraldCardBorder',
    people: [
      { name: 'মুহা: মোস্তফা শেখ', title: 'ক্লিনার', address: 'খুলনা', phone: '01799341632' },
      { name: 'মুহা: ওবায়দুল্লাহ', title: 'ক্লিনার', address: 'খুলনা', phone: '01904918226' },
      { name: 'মুহা: ফারুক শেখ', title: 'ক্লিনার', address: 'খুলনা', phone: '01996898951' },
      { name: 'মুহা: মাহবুব আলম', title: 'খাদেমে দফতর', address: 'পটুয়াখালী', phone: '01726730284' },
      { name: 'মুহা: আব্দুল কুদ্দুস', title: 'ইলে: মিস্ত্রী', address: 'বরিশাল', phone: '01916758801' },
      { name: 'মুহা: নাঈম হোসেন', title: 'সহ ইলে: মিস্ত্রী', address: 'বরিশাল', phone: '01757160334' },
      { name: 'মুহা: শাহীন হোসেন', title: 'সহ ইলে: মিস্ত্রী', address: 'বরিশাল', phone: '01608569348' },
      { name: 'মুহা: ইয়ার আলী মুন্সী', title: 'খাদেমে দফতরে ইহতেমাম', address: 'গোপালগঞ্জ', phone: '01767097727' },
    ],
  },
];

export default function DayittoshilKormigonScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const getColorBg = (key) => colors[key] || colors.blueCardBg;
  const getColorBorder = (key) => colors[key.replace('Bg', 'Border')] || colors.blueCardBorder;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>দায়িত্বশীল কর্মীগণ</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>স্টাফ তালিকা</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroOuter, { backgroundColor: colors.amberCardBg, borderColor: colors.amberCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentAmber}15`, borderColor: `${colors.accentAmber}30` }]}>
              <Ionicons name="people" size={36} color={colors.accentAmber} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>দায়িত্বশীল কর্মীগণ</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>জামিয়ার স্টাফ ও কর্মীবৃন্দ</Text>
          </View>
        </View>

        {/* Staff Categories */}
        {staffCategories.map((cat) => (
          <View key={cat.id}>
            <View style={[styles.catHeader, { borderLeftColor: cat.color }]}>
              <Ionicons name={cat.icon} size={18} color={cat.color} />
              <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
              <Text style={[styles.catCount, { color: colors.textSecondary }]}>({cat.people.length} জন)</Text>
            </View>

            {cat.people.map((person, index) => (
              <View key={index} style={styles.sectionWrapper}>
                <View
                  style={[
                    styles.sectionOuterCard,
                    { backgroundColor: getColorBg(cat.colorBg), borderColor: getColorBorder(cat.colorBorder) },
                  ]}
                >
                  <View
                    style={[styles.sectionInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  >
                    <View style={styles.personRow}>
                      <View style={[styles.avatarSmall, { backgroundColor: `${cat.color}15`, borderColor: `${cat.color}30` }]}>
                        <Ionicons name="person" size={16} color={cat.color} />
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                        <Text style={[styles.personTitle, { color: cat.color }]}>{person.title}</Text>
                        <Text style={[styles.personAddress, { color: colors.textMuted }]}>📍 {person.address}</Text>
                      </View>
                      {person.phone ? (
                        <TouchableOpacity
                          style={[styles.callBtn, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}
                          onPress={() => Linking.openURL(`tel:${person.phone}`)}
                        >
                          <Ionicons name="call" size={16} color={colors.accentEmerald} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Bottom spacing */}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#EC4899',
    marginHorizontal: 16,
    borderRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: {
    fontSize: 22,
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  heroOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroInner: {
    borderRadius: 21,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  catTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  catCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionWrapper: { marginBottom: 8 },
  sectionOuterCard: {
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  sectionInnerCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInfo: { flex: 1 },
  personName: {
    fontSize: 13,
    fontWeight: '800',
  },
  personTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  personAddress: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  callBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});