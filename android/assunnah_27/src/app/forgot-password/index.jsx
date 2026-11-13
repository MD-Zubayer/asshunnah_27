import React, { useState, useEffect } from 'react';
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
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import FormInput from '../../components/FormInput';
import { parseBackendError } from '../../utils/errorParser';

export default function ForgotPasswordScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { requestPasswordReset, verifyPasswordReset, confirmPasswordReset, isLoading } = useAuth();

  // Step state: 1 = Email, 2 = OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Messages & Errors
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Step 1: Request OTP via Gmail
  const handleRequestOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার ইমেইল এড্রেস প্রবেশ করান।');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setErrorMessage('সঠিক ইমেইল ফরম্যাট প্রদান করুন।');
      return;
    }

    const res = await requestPasswordReset(email.trim().toLowerCase());
    if (res.success) {
      setSuccessMessage(res.message || 'আপনার ইমেইলে ৬ ডিজিটের OTP পাঠানো হয়েছে।');
      setResendCooldown(60);
      setStep(2);
    } else {
      setErrorMessage(parseBackendError(res.message));
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage('৬ ডিজিটের সঠিক OTP কোড প্রবেশ করান।');
      return;
    }

    const res = await verifyPasswordReset(email.trim().toLowerCase(), otp.trim());
    if (res.success) {
      setSuccessMessage(res.message || 'OTP সঠিক আছে। এবার নতুন পাসওয়ার্ড দিন।');
      setStep(3);
    } else {
      setErrorMessage(parseBackendError(res.message));
    }
  };

  // Step 3: Confirm Reset
  const handleConfirmReset = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!password) {
      setErrorMessage('নতুন পাসওয়ার্ড প্রদান করুন।');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('পাসওয়ার্ড দুটি মিলছে না।');
      return;
    }

    const res = await confirmPasswordReset(
      email.trim().toLowerCase(),
      otp.trim(),
      password,
      passwordConfirm
    );

    if (res.success) {
      setSuccessMessage(res.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!');
      setStep(4);
    } else {
      setErrorMessage(parseBackendError(res.message));
    }
  };

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
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="key-outline" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>পাসওয়ার্ড রিসেট</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>পাসওয়ার্ড ভুলে গেছেন?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {step === 1 && 'আপনার নিবন্ধিত ইমেইল প্রদান করুন। আমরা একটি ৬ ডিজিটের OTP পাঠাবো।'}
          {step === 2 && 'ইমেইলে প্রাপ্ত ৬ ডিজিটের OTP কোডটি নিচে প্রদান করুন।'}
          {step === 3 && 'আপনার অ্যাকাউন্টের জন্য একটি নতুন পাসওয়ার্ড সেট করুন।'}
          {step === 4 && 'পাসওয়ার্ড পরিবর্তন সম্পন্ন হয়েছে!'}
        </Text>

        {/* Step Indicator */}
        {step < 4 ? (
          <View style={styles.stepIndicatorRow}>
            <View style={[styles.stepDot, { backgroundColor: step >= 1 ? colors.primary : colors.inputBg }]}>
              <Text style={[styles.stepDotText, { color: step >= 1 ? '#FFFFFF' : colors.textMuted }]}>১</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: step >= 2 ? colors.primary : colors.inputBorder }]} />
            <View style={[styles.stepDot, { backgroundColor: step >= 2 ? colors.primary : colors.inputBg }]}>
              <Text style={[styles.stepDotText, { color: step >= 2 ? '#FFFFFF' : colors.textMuted }]}>২</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: step >= 3 ? colors.primary : colors.inputBorder }]} />
            <View style={[styles.stepDot, { backgroundColor: step >= 3 ? colors.primary : colors.inputBg }]}>
              <Text style={[styles.stepDotText, { color: step >= 3 ? '#FFFFFF' : colors.textMuted }]}>৩</Text>
            </View>
          </View>
        ) : null}

        {/* Alerts */}
        {errorMessage ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorContainerText, { color: colors.error }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={[styles.successContainer, { backgroundColor: colors.successBg }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.successContainerText, { color: colors.success }]}>{successMessage}</Text>
            </View>
          </View>
        ) : null}

        {/* STEP 1: Enter Email */}
        {step === 1 ? (
          <View style={[styles.cardOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
            <View style={[styles.cardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <FormInput
                label="রেজিস্টার্ড ইমেইল এড্রেস"
                required
                placeholder="example@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                iconName="mail-outline"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleRequestOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>OTP ইমেইল পাঠান</Text>
                    <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* STEP 2: Enter OTP */}
        {step === 2 ? (
          <View style={[styles.cardOuter, { backgroundColor: colors.purpleCardBg, borderColor: colors.purpleCardBorder }]}>
            <View style={[styles.cardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <FormInput
                label="৬ ডিজিটের OTP কোড"
                required
                placeholder="123456"
                keyboardType="number-pad"
                iconName="shield-checkmark-outline"
                value={otp}
                onChangeText={setOtp}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>OTP যাচাই করুন</Text>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendRow}
                onPress={resendCooldown === 0 ? handleRequestOtp : null}
                disabled={resendCooldown > 0 || isLoading}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  কোড পাননি?{' '}
                  {resendCooldown > 0 ? (
                    <Text style={{ color: colors.textMuted }}>
                      অপেক্ষা করুন ({resendCooldown} সে.)
                    </Text>
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      পুনরায় OTP পাঠান
                    </Text>
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* STEP 3: Enter New Password */}
        {step === 3 ? (
          <View style={[styles.cardOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
            <View style={[styles.cardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <FormInput
                label="নতুন পাসওয়ার্ড"
                required
                secureTextEntry
                placeholder="কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড"
                iconName="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
              />

              <FormInput
                label="নতুন পাসওয়ার্ড পুনরায় লিখুন"
                required
                secureTextEntry
                placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                iconName="shield-checkmark-outline"
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleConfirmReset}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>পাসওয়ার্ড পরিবর্তন করুন</Text>
                    <Ionicons name="key" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* STEP 4: Success Screen */}
        {step === 4 ? (
          <View style={[styles.cardOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
            <View style={[styles.cardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder, alignItems: 'center', paddingVertical: 32 }]}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              <Text style={[styles.successTitle, { color: colors.text }]}>
                পাসওয়ার্ড রিসেট সফল হয়েছে!
              </Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                আপনার পাসওয়ার্ড পরিবর্তন সম্পন্ন হয়েছে। এখন নতুন পাসওয়ার্ড ব্যবহার করে লগ ইন করুন।
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.primaryButton, { backgroundColor: colors.primary, width: '100%', marginTop: 24 }]}
                onPress={() => router.replace('/signup')}
              >
                <Text style={styles.buttonText}>লগ ইন পেজে যান</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 128, 128, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: '#008080',
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: '#008080',
  },
  stepDotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#008080',
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  successContainerText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
  },
  devOtpText: {
    color: '#059669',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
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
  primaryButton: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
