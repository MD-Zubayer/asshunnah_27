import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

export default function ContactLocationScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openMap = () => {
    Linking.openURL('https://maps.app.goo.gl/jYZZs3YGswBNBAfg8?g_st=afm');
  };

  const callPhone = () => {
    Linking.openURL('tel:+8801523687485');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>যোগাযোগ ও লোকেশন</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>যোগাযোগ</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
              <Ionicons name="location" size={36} color={colors.accentBlue} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>যোগাযোগ ও লোকেশন</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>জামিয়াতুস সুন্নাহ, শিবচর</Text>
          </View>
        </View>

        {/* Contact Info Card */}
        <View style={[styles.contactOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
          <View style={[styles.contactInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.contactIconContainer, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
              <Ionicons name="school" size={28} color={colors.accentEmerald} />
            </View>
            <Text style={[styles.contactTitle, { color: colors.text }]}>জামিয়াতুস সুন্নাহ, শিবচর</Text>
            <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>দক্ষিনকান্দী, বাহাদুরপুর, শিবচর, মাদারীপুর, বাংলাদেশ</Text>
          </View>
        </View>

        {/* Address Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
              <Ionicons name="location-outline" size={22} color={colors.accentBlue} />
            </View>
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ঠিকানা</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>দক্ষিনকান্দী, বাহাদুরপুর, শিবচর, মাদারীপুর, বাংলাদেশ</Text>
            </View>
          </View>
        </View>

        {/* Phone Card */}
        <TouchableOpacity activeOpacity={0.7} onPress={callPhone}>
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
                <Ionicons name="call-outline" size={22} color={colors.accentEmerald} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ফোন</Text>
                <Text style={[styles.infoValue, { color: colors.accentEmerald }]}>+8801523-687485</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Map Button */}
        <TouchableOpacity activeOpacity={0.7} onPress={openMap}>
          <View style={[styles.mapOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
            <View style={[styles.mapInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.mapIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                <Ionicons name="map" size={32} color={colors.accentBlue} />
              </View>
              <Text style={[styles.mapButtonText, { color: colors.accentBlue }]}>ম্যাপে দেখুন</Text>
              <Text style={[styles.mapSubtext, { color: colors.textSecondary }]}>গুগল ম্যাপে লোকেশন দেখুন</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 6, borderLeftColor: '#EC4899', marginHorizontal: 16, borderRadius: 4 },
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
  contactOuter: { borderRadius: 20, padding: 3, borderWidth: 1, marginBottom: 16 },
  contactInner: { borderRadius: 17, padding: 20, alignItems: 'center', borderWidth: 1 },
  contactIconContainer: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  contactTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  contactSubtitle: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  mapOuter: { borderRadius: 20, padding: 3, borderWidth: 1, marginTop: 6, marginBottom: 16 },
  mapInner: { borderRadius: 17, padding: 20, alignItems: 'center', borderWidth: 1 },
  mapIconContainer: { width: 64, height: 64, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  mapButtonText: { fontSize: 16, fontWeight: '900' },
  mapSubtext: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});