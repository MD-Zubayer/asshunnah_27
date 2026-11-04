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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
      {/* Cover Image Background */}
      <ImageBackground
        source={require('../../../assets/expo.icon/Assets/images/hero_bg_6.jpeg')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View style={styles.bgOverlay} />
        
        {/* Back Button */}
        <View style={[styles.backButtonContainer, { paddingTop: insets.top + 20 }]}>
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

      {/* Logo overlapping cover and content - Facebook profile style */}
      <View style={[styles.logoContainer, { marginTop: insets.top + 200 }]}>
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
          { paddingTop: 340, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Text */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            নতুন অ্যাকাউন্ট তৈরি করুন
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            আপনার জন্য সঠিক অপশন নির্বাচন করুন
          </Text>
        </View>

        {/* Option 1: Takmil Student - Green Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryButton}
          onPress={() => router.push('/signup/takmil')}
        >
          <View style={styles.primaryButtonInner}>
            <View style={styles.buttonIconBox}>
              <MaterialCommunityIcons name="school" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.buttonTextContent}>
              <Text style={styles.primaryButtonText}>আমি তকমিলের ছাত্র</Text>
              <Text style={styles.primaryButtonSubtext}>
                দাখিলা নম্বর ও শিক্ষার বিবরণ দিন
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>

        {/* OR Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
          <Text style={[styles.dividerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>অথবা</Text>
          <View style={[styles.dividerLine, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
        </View>

        {/* Option 2: Non-Takmil - Blue Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.secondaryButton}
          onPress={() => router.push('/signup/non-takmil')}
        >
          <View style={styles.secondaryButtonInner}>
            <View style={[styles.buttonIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="person" size={26} color="#FFFFFF" />
            </View>
            <View style={styles.buttonTextContent}>
              <Text style={styles.secondaryButtonText}>সাধারণ ব্যবহারকারী</Text>
              <Text style={styles.secondaryButtonSubtext}>
                নাম, মোবাইল ও ঠিকানা দিন
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginPrompt, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            আগেই অ্যাকাউন্ট আছে?
          </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}>লগ ইন করুন</Text>
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
    height: 280,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backButtonContainer: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTextSection: {
    position: 'absolute',
    bottom: 55,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  welcomeSection: {
    marginBottom: 28,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: '400',
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonInner: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  buttonTextContent: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  primaryButtonSubtext: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '400',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    marginBottom: 28,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  secondaryButtonInner: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  secondaryButtonSubtext: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '400',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginPrompt: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
});