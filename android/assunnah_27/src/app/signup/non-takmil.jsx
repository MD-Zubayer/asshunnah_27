import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, useColorScheme, ImageBackground } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { parseBackendError } from '../../utils/errorParser';

export default function NonTakmilSignupScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup, isLoading, token } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);

  const [focusedField, setFocusedField] = useState(null);

  const handleSignup = async () => {
    setError(null);
    if (!firstName || !fatherName || !phoneNumber || !email || !district || !upazila || !password || !passwordConfirm) {
      setError('অনুগ্রহ করে সব ফিল্ড পূরণ করুন।');
      return;
    }
    if (password !== passwordConfirm) {
      setError('পাসওয়ার্ড মিলছে না।');
      return;
    }
    const result = await signup('non_takmil_student', {
      first_name: firstName,
      father_name: fatherName,
      phone_number: phoneNumber,
      email,
      district,
      upazila,
      password,
      password_confirm: passwordConfirm,
    });
    if (result.success) {
      router.replace('/(tabs)/profile');
    } else {
      setError(parseBackendError(result.message) || 'সাইনআপ ব্যর্থ হয়েছে।');
    }
  };

  if (token) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.alreadyLoggedInCard}>
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
          <Text style={[styles.alreadyLoggedInTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>আপনি ইতোমধ্যে লগ ইন আছেন</Text>
          <TouchableOpacity style={styles.goToProfileBtn} onPress={() => router.replace('/(tabs)/profile')}>
            <Text style={styles.goToProfileText}>প্রোফাইলে যান</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={80}
        enableOnAndroid={true}
      >
      {/* Cover Header */}
      <ImageBackground
        source={require('../../../assets/expo.icon/Assets/images/hero_bg_6.jpeg')}
        style={[styles.coverImage, { paddingTop: insets.top }]}
        resizeMode="cover"
      >
        <View style={styles.coverOverlay} />
        <View style={styles.coverContent}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.coverIconBox}>
            <Ionicons name="person" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.coverTitle}>সাধারণ রেজিস্ট্রেশন</Text>
          <Text style={styles.coverSubtitle}>নতুন অ্যাকাউন্ট তৈরি করতে তথ্য দিন</Text>
        </View>
      </ImageBackground>

      {/* Scrollable Form */}
        {/* Error Card */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section: ব্যক্তিগত তথ্য */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
              <Ionicons name="person" size={18} color="#059669" />
            </View>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>ব্যক্তিগত তথ্য</Text>
          </View>

          <FloatingInput
            icon="person-outline"
            label="নাম"
            value={firstName}
            onChangeText={setFirstName}
            isDark={isDark}
            focused={focusedField === 'firstName'}
            onFocus={() => setFocusedField('firstName')}
            onBlur={() => setFocusedField(null)}
          />
          <FloatingInput
            icon="people-outline"
            label="পিতার নাম"
            value={fatherName}
            onChangeText={setFatherName}
            isDark={isDark}
            focused={focusedField === 'fatherName'}
            onFocus={() => setFocusedField('fatherName')}
            onBlur={() => setFocusedField(null)}
          />
          <FloatingInput
            icon="phone-portrait-outline"
            label="মোবাইল নাম্বার"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            isDark={isDark}
            focused={focusedField === 'phone'}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            keyboardType="phone-pad"
          />
          <FloatingInput
            icon="mail-outline"
            label="ইমেইল"
            value={email}
            onChangeText={setEmail}
            isDark={isDark}
            focused={focusedField === 'email'}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Section: ঠিকানা */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
              <Ionicons name="location-outline" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>ঠিকানা</Text>
          </View>

          <FloatingInput
            icon="map-outline"
            label="জেলা"
            value={district}
            onChangeText={setDistrict}
            isDark={isDark}
            focused={focusedField === 'district'}
            onFocus={() => setFocusedField('district')}
            onBlur={() => setFocusedField(null)}
          />
          <FloatingInput
            icon="navigate-outline"
            label="উপজেলা"
            value={upazila}
            onChangeText={setUpazila}
            isDark={isDark}
            focused={focusedField === 'upazila'}
            onFocus={() => setFocusedField('upazila')}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* Section: পাসওয়ার্ড */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#EF4444" />
            </View>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>পাসওয়ার্ড</Text>
          </View>

          <FloatingInput
            icon="lock-closed-outline"
            label="পাসওয়ার্ড"
            value={password}
            onChangeText={setPassword}
            isDark={isDark}
            focused={focusedField === 'password'}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry
          />
          <FloatingInput
            icon="shield-checkmark-outline"
            label="পাসওয়ার্ড নিশ্চিত করুন"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            isDark={isDark}
            focused={focusedField === 'passwordConfirm'}
            onFocus={() => setFocusedField('passwordConfirm')}
            onBlur={() => setFocusedField(null)}
            secureTextEntry
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSignup}
          disabled={isLoading}
          activeOpacity={0.9}
        >
          <View style={styles.submitBtnInner}>
            {isLoading ? (
              <Ionicons name="hourglass" size={22} color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            )}
            <Text style={styles.submitBtnText}>
              {isLoading ? 'জমা হচ্ছে...' : 'সাইনআপ করুন'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginPrompt, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            আগেই কি অ্যাকাউন্ট করেছেন?
          </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}>লগ ইন করুন</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

// Floating Label Input Component
function FloatingInput({ icon, label, value, onChangeText, isDark, focused, onFocus, onBlur, keyboardType, autoCapitalize, secureTextEntry }) {
  const hasValue = value && value.length > 0;
  const isFocused = focused || hasValue;

  return (
    <View style={[styles.inputWrapper, { 
      borderColor: focused ? '#059669' : isDark ? '#334155' : '#E2E8F0',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF'
    }]}>
      <View style={[styles.inputIconBox, { backgroundColor: focused ? 'rgba(5, 150, 105, 0.1)' : isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.08)' }]}>
        <Ionicons name={icon} size={18} color={focused ? '#059669' : isDark ? '#64748B' : '#94A3B8'} />
      </View>
      <View style={styles.inputFieldWrap}>
        <Text style={[styles.inputLabel, {
          color: focused ? '#059669' : isDark ? '#64748B' : '#94A3B8',
          fontSize: isFocused ? 11 : 14,
          top: isFocused ? -2 : 14,
        }]}>
          {label}
        </Text>
        <TextInput
          style={[styles.inputField, {
            color: isDark ? '#F8FAFC' : '#1E293B',
            marginTop: isFocused ? 4 : 16,
          }]}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={isDark ? '#475569' : '#CBD5E1'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Cover Header
  coverImage: {
    height: 200,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  coverContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  coverIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  coverSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Error Card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  // Section Card
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Floating Input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  inputIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  inputFieldWrap: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'relative',
    justifyContent: 'center',
    minHeight: 48,
  },
  inputLabel: {
    position: 'absolute',
    left: 12,
    fontWeight: '500',
  },
  inputField: {
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  // Submit Button
  submitBtn: {
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnInner: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  // Login Row
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  loginPrompt: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '700',
  },
  // Already Logged In
  alreadyLoggedInCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  alreadyLoggedInTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 20,
  },
  goToProfileBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  goToProfileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});