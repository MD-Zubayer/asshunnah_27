import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';
import { parseBackendError } from '../../utils/errorParser';

import { Colors } from '../../constants/theme';

export default function LoginScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { login, loginAsGuest, isLoading, token } = useAuth();
  const initialCheckDone = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('অনুগ্রহ করে ইমেইল এড্রেস প্রবেশ করান।');
      return;
    }

    if (!password) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড প্রবেশ করান।');
      return;
    }

    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (result && result.success) {
        router.replace('/(tabs)');
      } else {
        setErrorMessage(parseBackendError(result?.message));
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('লগইন প্রক্রিয়ায় একটি সমস্যা ঘটেছে। আবার চেষ্টা করুন।');
    }
  };

  const handleGuestLogin = () => {
    if (typeof loginAsGuest === 'function') {
      loginAsGuest();
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    }
  };

  // Redirect on initial mount if cached token exists (already logged in)
  useEffect(() => {
    if (!initialCheckDone.current && token) {
      initialCheckDone.current = true;
      router.replace('/(tabs)');
    }
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header Icon */}
        <View style={styles.iconHeader}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="log-in" size={32} color={colors.primary} />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>লগ ইন করুন</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          আস-সুন্নাহ অ্যাকাউন্টে প্রবেশের জন্য ইমেইল ও পাসওয়ার্ড দিন।
        </Text>

        {/* Error Alert */}
        {errorMessage ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorContainerText, { color: colors.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form Card (Tailwind Glassmorphic Outer + Inner Card) */}
        <View style={[styles.cardOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
          <View style={[styles.cardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <FormInput
              label="ইমেইল এড্রেস"
              required
              placeholder="example@mail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              iconName="mail-outline"
              value={email}
              onChangeText={setEmail}
            />

            <FormInput
              label="পাসওয়ার্ড"
              required
              secureTextEntry
              placeholder="আপনার পাসওয়ার্ড দিন"
              iconName="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
            />

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordRow}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>পাসওয়ার্ড ভুলে গেছেন?</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>লগ ইন করুন</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Guest Login Section */}
        <View style={styles.guestSection}>
          <View style={styles.guestDivider}>
            <View style={[styles.guestDividerLine, { backgroundColor: colors.cardBorder }]} />
            <Text style={[styles.guestDividerText, { color: colors.textSecondary }]}>অথবা</Text>
            <View style={[styles.guestDividerLine, { backgroundColor: colors.cardBorder }]} />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.guestButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleGuestLogin}
          >
            <View style={[styles.guestIconBadge, { backgroundColor: colors.primaryBg }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.guestTextContainer}>
              <Text style={[styles.guestButtonText, { color: colors.text }]}>অতিথি হিসেবে প্রবেশ করুন</Text>
              <Text style={[styles.guestButtonSubtext, { color: colors.textSecondary }]}>
                কোনো অ্যাকাউন্ট ছাড়াই ব্রাউজ করুন (সীমিত সুবিধা)
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Signup Redirect Row */}
        <View style={styles.signupRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            অ্যাকাউন্ট নেই?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>নতুন অ্যাকাউন্ট তৈরি করুন</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  errorContainerText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  cardOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardInner: {
    borderRadius: 21,
    padding: 20,
    borderWidth: 1,
  },
  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: '#008080',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#008080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  guestSection: {
    marginTop: 24,
  },
  guestDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guestDividerLine: {
    flex: 1,
    height: 1,
  },
  guestDividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  guestIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  guestButtonSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
});
