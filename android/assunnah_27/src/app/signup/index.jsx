import { StyleSheet, Text, View, TouchableOpacity, useColorScheme, ScrollView, Image, ImageBackground } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export default function SignupSelectionScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const options = [
    {
      id: 'jamia_faregin',
      title: 'জামিয়ার ফারেগীন ছাত্র',
      subtitle: 'তাকমিল ও প্রাক্তন ফারেগীন ব্যাচ',
      icon: 'school',
      iconType: 'material',
      color: '#059669',
      bgColor: isDark ? 'rgba(5, 150, 105, 0.15)' : 'rgba(5, 150, 105, 0.1)',
      borderColor: isDark ? 'rgba(5, 150, 105, 0.4)' : '#A7F3D0',
      route: '/signup/faregin',
    },
    {
      id: 'current_student',
      title: 'জামিয়ার ছাত্রবৃন্দ',
      subtitle: 'বর্তমানে অধ্যয়নরত সকল জামাতের ছাত্র',
      icon: 'book-open-variant',
      iconType: 'material',
      color: '#2563EB',
      bgColor: isDark ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)',
      borderColor: isDark ? 'rgba(37, 99, 235, 0.4)' : '#BFDBFE',
      route: '/signup/student',
    },
    {
      id: 'jamia_ustad',
      title: 'জামিয়ার উস্তাদগণ',
      subtitle: 'জামিয়ার সম্মানিত শিক্ষকমণ্ডলী',
      icon: 'account-tie',
      iconType: 'material',
      color: '#7C3AED',
      bgColor: isDark ? 'rgba(124, 58, 237, 0.15)' : 'rgba(124, 58, 237, 0.1)',
      borderColor: isDark ? 'rgba(124, 58, 237, 0.4)' : '#DDD6FE',
      route: '/signup/ustad',
    },
    {
      id: 'general_user',
      title: 'অন্যান্য (সাধারণ)',
      subtitle: 'শুভাকাঙ্ক্ষী ও সাধারণ ব্যবহারকারী',
      icon: 'person',
      iconType: 'ionicon',
      color: '#D97706',
      bgColor: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.1)',
      borderColor: isDark ? 'rgba(217, 119, 6, 0.4)' : '#FDE68A',
      route: '/signup/general',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* Cover Image Background */}
      <ImageBackground
        source={require('../../../assets/expo.icon/Assets/images/hero_bg_6.jpeg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.bgOverlay} />

        {/* Back Button */}
        <View style={[styles.backButtonContainer, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* App Name and Tagline at bottom of cover */}
        <View style={styles.coverTextSection}>
          <Text style={styles.appName}>আস-সুন্নাহ প্ল্যাটফর্ম</Text>
          <Text style={styles.tagline}>ডিজিটাল ইসলামিক শিক্ষা ও আমল</Text>
        </View>
      </ImageBackground>

      {/* Logo Circle */}
      <View style={[styles.logoContainer, { marginTop: insets.top + 180 }]}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../../../assets/expo.icon/Assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 300, paddingBottom: insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            অ্যাকাউন্ট টাইপ নির্বাচন করুন
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            আপনার পরিচয় অনুযায়ী সঠিক অপশনটি বেছে নিন
          </Text>
        </View>

        {/* 4 Account Type Cards */}
        <View style={styles.optionsList}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.88}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
              onPress={() => router.push(opt.route)}
            >
              <View style={[styles.optionIconBox, { backgroundColor: opt.bgColor, borderColor: opt.borderColor }]}>
                {opt.iconType === 'material' ? (
                  <MaterialCommunityIcons name={opt.icon} size={28} color={opt.color} />
                ) : (
                  <Ionicons name={opt.icon} size={26} color={opt.color} />
                )}
              </View>

              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                  {opt.title}
                </Text>
                <Text style={[styles.optionSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {opt.subtitle}
                </Text>
              </View>

              <View style={[styles.chevronBox, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
                <Ionicons name="chevron-forward" size={18} color={opt.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginPrompt, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            আগেই অ্যাকাউন্ট আছে?
          </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}> লগ ইন করুন</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  backButtonContainer: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverTextSection: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  logoContainer: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  logoImage: {
    width: 46,
    height: 46,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  welcomeSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  optionSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 10,
  },
  loginPrompt: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
});
