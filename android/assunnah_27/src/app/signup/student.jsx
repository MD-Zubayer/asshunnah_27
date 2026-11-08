import { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
  Modal,
  FlatList,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import geoJamatData from '../../data/geo-jamat-data.json';
import { parseBackendError } from '../../utils/errorParser';

export default function StudentSignupScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup, isLoading, token } = useAuth();

  // Form Fields
  const [jamat, setJamat] = useState('');
  const [dakhilaNumber, setDakhilaNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);

  // Modals
  const [showJamatModal, setShowJamatModal] = useState(false);
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [showThanaModal, setShowThanaModal] = useState(false);

  const availableThanas = useMemo(() => {
    if (!district || !geoJamatData.districts[district]) return [];
    return geoJamatData.districts[district];
  }, [district]);

  const handleSignup = async () => {
    setError(null);

    if (!jamat || !dakhilaNumber || !firstName || !phoneNumber || !email || !district || !upazila || !password || !passwordConfirm) {
      setError('অনুগ্রহ করে প্রয়োজনীয় সব তথ্য পূরণ করুন।');
      return;
    }

    if (password !== passwordConfirm) {
      setError('পাসওয়ার্ড এবং নিশ্চিতকরণ পাসওয়ার্ড মিলছে না।');
      return;
    }

    if (password.length < 8) {
      setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    const payload = {
      first_name: firstName.trim(),
      father_name: fatherName.trim(),
      phone_number: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      district,
      upazila,
      jamat,
      dakhila_number: dakhilaNumber.trim(),
      password,
      password_confirm: passwordConfirm,
    };

    const result = await signup('current_student', payload);
    if (result.success) {
      Alert.alert('সফল!', 'আপনার ছাত্র অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।', [
        { text: 'ঠিক আছে', onPress: () => router.replace('/(tabs)/profile') },
      ]);
    } else {
      setError(parseBackendError(result.message) || 'সাইনআপ ব্যর্থ হয়েছে।');
    }
  };

  if (token) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.alreadyLoggedInCard}>
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
          <Text style={[styles.alreadyLoggedInTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            আপনি ইতোমধ্যে লগ ইন আছেন
          </Text>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={80}
        enableOnAndroid={true}
      >
        {/* Cover Header */}
        <ImageBackground
          source={require('../../../assets/expo.icon/Assets/images/hero_bg_6.jpeg')}
          style={[styles.coverImage, { paddingTop: insets.top + 10 }]}
          resizeMode="cover"
        >
          <View style={styles.coverOverlay} />
          <View style={styles.coverContent}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.coverIconBox}>
              <MaterialCommunityIcons name="book-open-variant" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.coverTitle}>জামিয়ার ছাত্রবৃন্দ</Text>
            <Text style={styles.coverSubtitle}>বর্তমানে অধ্যয়নরত সকল জামাতের রেজিস্ট্রেশন</Text>
          </View>
        </ImageBackground>

        {/* Error Card */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section 1: জামাত ও দাখিলা তথ্য */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            📖 জামাত ও দাখিলা
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>আপনার জামাত / ক্লাস *</Text>
            <TouchableOpacity
              style={[styles.dropdownBox, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              onPress={() => setShowJamatModal(true)}
            >
              <Text style={{ color: jamat ? colors.text : colors.textMuted, fontWeight: jamat ? '700' : 'normal' }}>
                {jamat || 'জামাত নির্বাচন করুন'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>দাখিলা নম্বর (Dakhila) *</Text>
            <TextInput
              style={[
                styles.inputBox,
                { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0', fontWeight: '700' },
              ]}
              placeholder="দাখিলা নম্বর লিখুন"
              placeholderTextColor={colors.textMuted}
              value={dakhilaNumber}
              onChangeText={setDakhilaNumber}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Section 2: ব্যক্তিগত তথ্য */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            👤 শিক্ষার্থীর বিবরণ
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>শিক্ষার্থীর নাম *</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="আপনার পূর্ণ নাম"
              placeholderTextColor={colors.textMuted}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>পিতার নাম</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="পিতার নাম"
              placeholderTextColor={colors.textMuted}
              value={fatherName}
              onChangeText={setFatherName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>মোবাইল নম্বর *</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="01XXXXXXXXX"
              placeholderTextColor={colors.textMuted}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {/* District & Upazila */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>জেলা *</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                onPress={() => setShowDistrictModal(true)}
              >
                <Text style={{ color: district ? colors.text : colors.textMuted }} numberOfLines={1}>
                  {district || 'জেলা বাছুন'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>থানা/উপজেলা *</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                onPress={() => {
                  if (!district) {
                    Alert.alert('সতর্কতা', 'প্রথমে জেলা নির্বাচন করুন।');
                    return;
                  }
                  setShowThanaModal(true);
                }}
              >
                <Text style={{ color: upazila ? colors.text : colors.textMuted }} numberOfLines={1}>
                  {upazila || 'থানা বাছুন'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section 3: সিকিউরিটি */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            🔒 পাসওয়ার্ড ও ইমেইল
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>ইমেইল এড্রেস *</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="example@mail.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>পাসওয়ার্ড নিশ্চিত করুন *</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#2563EB', opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>ছাত্র অ্যাকাউন্ট তৈরি করুন</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Jamat Selector Modal */}
      <Modal visible={showJamatModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>জামাত নির্বাচন করুন</Text>
              <TouchableOpacity onPress={() => setShowJamatModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={geoJamatData.jamats}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}
                  onPress={() => {
                    setJamat(item);
                    setShowJamatModal(false);
                  }}
                >
                  <Text style={[styles.modalItemName, { color: colors.text }]}>{item}</Text>
                  {jamat === item && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* District Selector Modal */}
      <Modal visible={showDistrictModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>জেলা নির্বাচন করুন</Text>
              <TouchableOpacity onPress={() => setShowDistrictModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearchBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="জেলা খুঁজুন..."
                placeholderTextColor={colors.textMuted}
                value={districtSearch}
                onChangeText={setDistrictSearch}
              />
            </View>
            <FlatList
              data={Object.keys(geoJamatData.districts).filter((d) =>
                d.toLowerCase().includes(districtSearch.toLowerCase().trim())
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}
                  onPress={() => {
                    setDistrict(item);
                    setUpazila('');
                    setShowDistrictModal(false);
                    setDistrictSearch('');
                  }}
                >
                  <Text style={[styles.modalItemName, { color: colors.text }]}>{item}</Text>
                  {district === item && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Thana Selector Modal */}
      <Modal visible={showThanaModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{district} এর থানা/উপজেলা</Text>
              <TouchableOpacity onPress={() => setShowThanaModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableThanas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}
                  onPress={() => {
                    setUpazila(item);
                    setShowThanaModal(false);
                  }}
                >
                  <Text style={[styles.modalItemName, { color: colors.text }]}>{item}</Text>
                  {upazila === item && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 60 },
  coverImage: { height: 180, position: 'relative', overflow: 'hidden' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  coverContent: { paddingHorizontal: 16, zIndex: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  coverIconBox: { marginTop: 6, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.7)', justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 6 },
  coverSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, gap: 8 },
  errorText: { color: '#B91C1C', fontSize: 13, flex: 1, fontWeight: '500' },
  sectionCard: { marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dropdownBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInputs: { flexDirection: 'row', marginBottom: 12 },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  alreadyLoggedInCard: { margin: 24, padding: 24, alignItems: 'center', borderRadius: 16, backgroundColor: '#fff' },
  alreadyLoggedInTitle: { fontSize: 18, fontWeight: '700', marginVertical: 12 },
  goToProfileBtn: { backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  goToProfileText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { height: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 10, marginBottom: 12, height: 40 },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  modalItemName: { fontSize: 14, fontWeight: '600' },
});
