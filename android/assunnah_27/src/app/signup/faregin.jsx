import { useState, useMemo, useEffect } from 'react';
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
import fuzalayeJamiaData, { fuzalayeJamiaByDistrict, allDistricts } from '../../data/fuzalaye-jamia-data';
import geoJamatData from '../../data/geo-jamat-data.json';
import { API_ENDPOINTS } from '../../constants/api';
import { parseBackendError } from '../../utils/errorParser';

export default function FareginSignupScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup, isLoading, token } = useAuth();

  // Mode: '2027' (Current Takmil batch) vs 'other'
  const [takmilYearType, setTakmilYearType] = useState('2027');
  const [customGraduationYear, setCustomGraduationYear] = useState('');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [village, setVillage] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [dakhilaNumber, setDakhilaNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [periodOfEducation, setPeriodOfEducation] = useState('১০ বছর');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);

  // Selected student record for verification
  const [selectedStudentRef, setSelectedStudentRef] = useState(null);
  const [selectedFuzalayeName, setSelectedFuzalayeName] = useState('');

  // Modals
  const [showNameModal, setShowNameModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [showThanaModal, setShowThanaModal] = useState(false);
  const [showBloodModal, setShowBloodModal] = useState(false);

  // Dynamic graduates for 'other' year
  const [dynamicGraduates, setDynamicGraduates] = useState([]);
  const [loadingGraduates, setLoadingGraduates] = useState(false);
  const [selectedGraduateId, setSelectedGraduateId] = useState(null);

  // Available thanas for selected district
  const availableThanas = useMemo(() => {
    if (!district || !geoJamatData.districts[district]) return [];
    return geoJamatData.districts[district];
  }, [district]);

  // Search dynamic graduates for past batches
  const searchDynamicGraduates = async (query = '') => {
    if (!customGraduationYear) return;
    try {
      setLoadingGraduates(true);
      let url = `${API_ENDPOINTS.JAMIA_GRADUATES || `${API_ENDPOINTS.SIGNUP_UNIVERSAL.replace('signup/', 'jamia-graduates/')}`}?graduation_year=${customGraduationYear}`;
      if (query) url += `&search=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDynamicGraduates(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) {
      console.log('Error fetching graduates:', e);
    } finally {
      setLoadingGraduates(false);
    }
  };

  useEffect(() => {
    if (takmilYearType === 'other' && customGraduationYear) {
      const delay = setTimeout(() => searchDynamicGraduates(searchQuery), 400);
      return () => clearTimeout(delay);
    }
  }, [searchQuery, customGraduationYear, takmilYearType]);

  // Filter 2027 Takmil list
  const filteredTakmilStudents = useMemo(() => {
    const list = [];
    const takmilData = fuzalayeJamiaData['তাকমিল'] || {};
    Object.entries(takmilData).forEach(([dist, students]) => {
      students.forEach((s) => {
        list.push({ ...s, district: dist });
      });
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.dakhila).includes(q) ||
        (s.father && s.father.toLowerCase().includes(q)) ||
        (s.thana && s.thana.toLowerCase().includes(q)) ||
        (s.district && s.district.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // When a student is selected from 2027 list
  const handleSelectTakmilStudent = (student) => {
    setSelectedStudentRef(student);
    setSelectedFuzalayeName(student.name);
    setFirstName(student.name);
    setFatherName(student.father || '');
    setVillage(student.village || '');
    setPostOffice(student.post || '');
    setDistrict(student.district || '');
    setUpazila(student.thana || '');
    setDakhilaNumber(String(student.dakhila || ''));
    if (student.bloodGroup) setBloodGroup(student.bloodGroup);
    if (student.studyPeriod) setPeriodOfEducation(student.studyPeriod);
    if (student.rawMobile && student.rawMobile[0]) {
      setPhoneNumber(student.rawMobile[0]);
    }
    setShowNameModal(false);
    setSearchQuery('');
  };

  // Convert Bengali numerals to ASCII
  const bnToAscii = (str) => {
    if (!str) return '';
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(str)
      .split('')
      .map((ch) => {
        const idx = bnNums.indexOf(ch);
        return idx !== -1 ? idx : ch;
      })
      .join('');
  };

  // Strict Verification for 2027 Batch
  const verifyTakmil2027 = () => {
    if (!selectedStudentRef) {
      return { valid: false, message: 'তালিকা থেকে আপনার নামটি নির্বাচন করুন।' };
    }

    // 1. Dakhila Check (Strict)
    const enteredDakhila = bnToAscii(dakhilaNumber.trim());
    const expectedDakhila = bnToAscii(String(selectedStudentRef.dakhila || '').trim());
    if (enteredDakhila !== expectedDakhila) {
      return {
        valid: false,
        message: `দাখিলা নম্বর মেলেনি! তালিকায় আপনার দাখিলা নম্বর ${expectedDakhila} ছিল।`,
      };
    }

    // 2. Phone Check (Strict)
    const enteredPhone = bnToAscii(phoneNumber.replace(/[\s-]/g, ''));
    const expectedPhones = (selectedStudentRef.rawMobile || []).map((p) => bnToAscii(p.replace(/[\s-]/g, '')));
    const phoneMatches = expectedPhones.some((p) => enteredPhone.endsWith(p.slice(-10)) || p.endsWith(enteredPhone.slice(-10)));
    if (!phoneMatches) {
      return {
        valid: false,
        message: 'মোবাইল নম্বর মেলেনি! জামিয়ার তালিকার রেকর্ডভুক্ত মোবাইল নম্বর দিন।',
      };
    }

    // 3. Blood Group Check (Strict)
    const enteredBlood = bloodGroup.trim().toUpperCase();
    const expectedBlood = (selectedStudentRef.bloodGroup || '').trim().toUpperCase();
    if (expectedBlood && enteredBlood !== expectedBlood) {
      return {
        valid: false,
        message: `রক্তের গ্রুপ মেলেনি! তালিকায় আপনার রক্তের গ্রুপ ${expectedBlood} দেওয়া আছে।`,
      };
    }

    // 4. District & Thana Check (Strict)
    if (district.trim() !== (selectedStudentRef.district || '').trim()) {
      return {
        valid: false,
        message: `জেলা মেলেনি! তালিকায় আপনার জেলা ${selectedStudentRef.district} ছিল।`,
      };
    }
    if (upazila.trim() !== (selectedStudentRef.thana || '').trim()) {
      return {
        valid: false,
        message: `থানা/উপজেলা মেলেনি! তালিকায় আপনার থানা ${selectedStudentRef.thana} ছিল।`,
      };
    }

    return { valid: true };
  };

  const handleSignup = async () => {
    setError(null);

    if (!firstName || !phoneNumber || !email || !district || !upazila || !dakhilaNumber || !password || !passwordConfirm) {
      setError('অনুগ্রহ করে প্রয়োজনীয় সকল তথ্য পূরণ করুন।');
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

    // Verification check for 2027
    if (takmilYearType === '2027') {
      const check = verifyTakmil2027();
      if (!check.valid) {
        setError(check.message);
        Alert.alert('ভেরিফিকেশন ব্যর্থ', check.message);
        return;
      }
    }

    const payload = {
      first_name: firstName,
      father_name: fatherName,
      phone_number: bnToAscii(phoneNumber.trim()),
      email: email.trim().toLowerCase(),
      district,
      upazila,
      dakhila_number: bnToAscii(dakhilaNumber.trim()),
      blood_group: bloodGroup,
      period_of_education: periodOfEducation,
      password,
      password_confirm: passwordConfirm,
      takmil_year_type: takmilYearType === '2027' ? '26_27' : 'other',
      custom_graduation_year: takmilYearType === 'other' ? customGraduationYear : '2027',
      fuzalaye_jamia_name: takmilYearType === '2027' ? selectedFuzalayeName : null,
      jamia_graduate_id: takmilYearType === 'other' ? selectedGraduateId : null,
    };

    const result = await signup('jamia_faregin', payload);
    if (result.success) {
      Alert.alert('অভিনন্দন!', 'আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।', [
        { text: 'ঠিক আছে', onPress: () => router.replace('/(tabs)/profile') },
      ]);
    } else {
      setError(parseBackendError(result.message) || 'সাইনআপ সম্পন্ন করা যায়নি।');
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
              <MaterialCommunityIcons name="school" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.coverTitle}>জামিয়ার ফারেগীন ছাত্র</Text>
            <Text style={styles.coverSubtitle}>তাকমিল ও প্রাক্তন ফারেগীন রেজিস্ট্রেশন</Text>
          </View>
        </ImageBackground>

        {/* Error Card */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Section 1: পাসের শিক্ষাবর্ষ নির্বাচন */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            🎓 ফারেগীন শিক্ষাবর্ষ
          </Text>

          <View style={styles.yearTypeRow}>
            <TouchableOpacity
              style={[
                styles.yearTypeBtn,
                takmilYearType === '2027' && styles.yearTypeBtnActive,
                { borderColor: takmilYearType === '2027' ? '#059669' : isDark ? '#334155' : '#E2E8F0' },
              ]}
              onPress={() => {
                setTakmilYearType('2027');
                setSelectedStudentRef(null);
                setSelectedFuzalayeName('');
              }}
            >
              <MaterialCommunityIcons
                name="star-circle"
                size={20}
                color={takmilYearType === '2027' ? '#059669' : colors.textMuted}
              />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.yearTypeBtnTitle, { color: takmilYearType === '2027' ? '#059669' : colors.text }]}>
                  ২০২৭ ব্যাচ (বর্তমান)
                </Text>
                <Text style={styles.yearTypeBtnSub}>তাকমিল ১৪৪৭-৪৮ হি.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.yearTypeBtn,
                takmilYearType === 'other' && styles.yearTypeBtnActive,
                { borderColor: takmilYearType === 'other' ? '#059669' : isDark ? '#334155' : '#E2E8F0' },
              ]}
              onPress={() => {
                setTakmilYearType('other');
                setSelectedStudentRef(null);
              }}
            >
              <MaterialCommunityIcons
                name="history"
                size={20}
                color={takmilYearType === 'other' ? '#059669' : colors.textMuted}
              />
              <View style={{ marginLeft: 8 }}>
                <Text style={[styles.yearTypeBtnTitle, { color: takmilYearType === 'other' ? '#059669' : colors.text }]}>
                  অন্যান্য শিক্ষাবর্ষ
                </Text>
                <Text style={styles.yearTypeBtnSub}>২০২৬, ২৫ বা পূর্ববর্তী</Text>
              </View>
            </TouchableOpacity>
          </View>

          {takmilYearType === 'other' && (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>পাসের সন / শিক্ষাবর্ষ লিখুন *</Text>
              <TextInput
                style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
                placeholder="যেমন: 2026 বা 2025"
                placeholderTextColor={colors.textMuted}
                value={customGraduationYear}
                onChangeText={setCustomGraduationYear}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* 2027 Batch Student Selector */}
          {takmilYearType === '2027' && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                তাকমিল তালিকা থেকে নিজের নাম নির্বাচন করুন *
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectCard,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                    borderColor: selectedStudentRef ? '#059669' : isDark ? '#334155' : '#E2E8F0',
                  },
                ]}
                onPress={() => setShowNameModal(true)}
              >
                <Ionicons
                  name={selectedStudentRef ? 'checkmark-circle' : 'search'}
                  size={20}
                  color={selectedStudentRef ? '#059669' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.selectCardText,
                    { color: selectedStudentRef ? (isDark ? '#F8FAFC' : '#0F172A') : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {selectedStudentRef
                    ? `${selectedStudentRef.name} (দাখিলা: ${selectedStudentRef.dakhila}, ${selectedStudentRef.district})`
                    : 'তালিকা থেকে নাম খুঁজুন ও সিলেক্ট করুন'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
              {selectedStudentRef && (
                <View style={styles.verifiedNotice}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" />
                  <Text style={styles.verifiedNoticeText}>
                    দাখিলা নম্বর, মোবাইল ও রক্তের গ্রুপ হুবহু যাচাই করা হবে।
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 2: ব্যক্তিগত ও ভেরিফিকেশন তথ্য */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            👤 শিক্ষার্থীর তথ্য ও ভেরিফিকেশন
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
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>দাখিলা নম্বর (Dakhila) *</Text>
            <TextInput
              style={[
                styles.inputBox,
                { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0', fontWeight: '700' },
              ]}
              placeholder="যেমন: 267"
              placeholderTextColor={colors.textMuted}
              value={dakhilaNumber}
              onChangeText={setDakhilaNumber}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>মোবাইল নম্বর (Phone) *</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="017XXXXXXXX"
              placeholderTextColor={colors.textMuted}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>রক্তের গ্রুপ (Blood Group) *</Text>
            <TouchableOpacity
              style={[styles.dropdownBox, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              onPress={() => setShowBloodModal(true)}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{bloodGroup || 'নির্বাচন করুন'}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>পিতার নাম (শিথিল বানান)</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="পিতার নাম"
              placeholderTextColor={colors.textMuted}
              value={fatherName}
              onChangeText={setFatherName}
            />
          </View>

          {/* District & Upazila Selection */}
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

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>গ্রাম / ঠিকানা</Text>
            <TextInput
              style={[styles.inputBox, { color: colors.text, borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              placeholder="গ্রাম / পাড়ার নাম"
              placeholderTextColor={colors.textMuted}
              value={village}
              onChangeText={setVillage}
            />
          </View>
        </View>

        {/* Section 3: অ্যাকাউন্ট ও সিকিউরিটি */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
            🔒 লগইন সিকিউরিটি
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
            style={[styles.submitBtn, { backgroundColor: '#059669', opacity: isLoading ? 0.7 : 1 }]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>ভেরিফাই ও অ্যাকাউন্ট তৈরি করুন</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Name Selector Modal (2027 Takmil List) */}
      <Modal visible={showNameModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>২০২৭ তাকমিল তালিকা</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchBox, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="নাম বা দাখিলা নম্বর দিয়ে খুঁজুন..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredTakmilStudents}
              keyExtractor={(item, index) => `${item.dakhila}_${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}
                  onPress={() => handleSelectTakmilStudent(item)}
                >
                  <View style={styles.dakhilaBadge}>
                    <Text style={styles.dakhilaBadgeText}>{item.dakhila}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.modalItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>
                      পিতা: {item.father} | {item.thana}, {item.district}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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
                  {district === item && <Ionicons name="checkmark" size={18} color="#059669" />}
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
                  {upazila === item && <Ionicons name="checkmark" size={18} color="#059669" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Blood Group Modal */}
      <Modal visible={showBloodModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBoxSmall, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 12 }]}>রক্তের গ্রুপ</Text>
            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
              <TouchableOpacity
                key={bg}
                style={[styles.bloodItem, bloodGroup === bg && styles.bloodItemActive]}
                onPress={() => {
                  setBloodGroup(bg);
                  setShowBloodModal(false);
                }}
              >
                <Text style={[styles.bloodText, bloodGroup === bg && { color: '#059669', fontWeight: '800' }]}>
                  {bg}
                </Text>
              </TouchableOpacity>
            ))}
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
  coverIconBox: { marginTop: 6, width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(5, 150, 105, 0.7)', justifyContent: 'center', alignItems: 'center' },
  coverTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 6 },
  coverSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  errorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', marginHorizontal: 16, marginTop: 14, padding: 12, borderRadius: 12, gap: 8 },
  errorText: { color: '#B91C1C', fontSize: 13, flex: 1, fontWeight: '500' },
  sectionCard: { marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  yearTypeRow: { flexDirection: 'row', gap: 10 },
  yearTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, backgroundColor: 'transparent' },
  yearTypeBtnActive: { backgroundColor: 'rgba(5, 150, 105, 0.08)' },
  yearTypeBtnTitle: { fontSize: 13, fontWeight: '700' },
  yearTypeBtnSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  inputBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dropdownBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowInputs: { flexDirection: 'row', marginBottom: 12 },
  selectCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.2, gap: 10 },
  selectCardText: { flex: 1, fontSize: 13, fontWeight: '500' },
  verifiedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 6 },
  verifiedNoticeText: { fontSize: 11, color: '#059669', fontWeight: '500' },
  submitBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  alreadyLoggedInCard: { margin: 24, padding: 24, alignItems: 'center', borderRadius: 16, backgroundColor: '#fff' },
  alreadyLoggedInTitle: { fontSize: 18, fontWeight: '700', marginVertical: 12 },
  goToProfileBtn: { backgroundColor: '#059669', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  goToProfileText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { height: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalBoxSmall: { margin: 24, borderRadius: 16, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSearchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 10, marginBottom: 12, height: 40 },
  modalSearchInput: { flex: 1, marginLeft: 8, fontSize: 13 },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  modalItemName: { fontSize: 14, fontWeight: '600' },
  modalItemSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  dakhilaBadge: { backgroundColor: '#059669', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dakhilaBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bloodItem: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  bloodText: { fontSize: 16, fontWeight: '600' },
});
