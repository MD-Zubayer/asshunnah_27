import { useState, useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, useColorScheme, Alert, Modal, FlatList, ImageBackground, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import fuzalayeJamiaData from '../../data/fuzalaye-jamia-data';
import { API_ENDPOINTS } from '../../constants/api';

export default function TakmilSignupScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signup, isLoading, isSignedIn } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [dakhilaNumber, setDakhilaNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [periodOfEducation, setPeriodOfEducation] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState(null);

  // Custom Graduation Session States
  const [takmilYearType, setTakmilYearType] = useState('26_27'); // '26_27' or 'other'
  const [customGraduationYear, setCustomGraduationYear] = useState('');
  const [selectedGraduateId, setSelectedGraduateId] = useState(null);
  
  // State for dynamic graduates fetching
  const [dynamicGraduates, setDynamicGraduates] = useState([]);
  const [loadingGraduates, setLoadingGraduates] = useState(false);
  const [showAddGraduateModal, setShowAddGraduateModal] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [customDistrictSelected, setCustomDistrictSelected] = useState(false);

  const staticDistricts = Object.keys(fuzalayeJamiaData).sort();

  // Add Graduate Form State
  const [graduateForm, setGraduateForm] = useState({
    name: '',
    father_name: '',
    village: '',
    post_office: '',
    thana: '',
    district: '',
    mobile: '',
    blood_group: '',
    graduation_year: ''
  });
  const [addingGraduate, setAddingGraduate] = useState(false);

  const searchDynamicGraduates = async (query) => {
    try {
      setLoadingGraduates(true);
      let url = `${API_ENDPOINTS.JAMIA_GRADUATES}?search=${encodeURIComponent(query)}`;
      if (customGraduationYear) {
        url += `&graduation_year=${encodeURIComponent(customGraduationYear)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDynamicGraduates(data);
        } else if (data && Array.isArray(data.results)) {
          setDynamicGraduates(data.results);
        } else {
          setDynamicGraduates([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGraduates(false);
    }
  };

  useEffect(() => {
    if (takmilYearType === 'other') {
      const delayDebounceFn = setTimeout(() => {
        searchDynamicGraduates(searchQuery);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery, customGraduationYear, takmilYearType]);

  // Fuzalaye Jamia selection state
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedFuzalayeName, setSelectedFuzalayeName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Focused field tracking for floating labels
  const [focusedField, setFocusedField] = useState(null);

  const filteredNames = useMemo(() => {
    let names = [];
    if (district && fuzalayeJamiaData[district]) {
      names = fuzalayeJamiaData[district].map(person => ({
        name: person.name,
        father: person.father,
        village: person.village,
        thana: person.thana,
        district: district
      }));
    } else {
      Object.keys(fuzalayeJamiaData).forEach(dist => {
        fuzalayeJamiaData[dist].forEach(person => {
          names.push({
            name: person.name,
            father: person.father,
            village: person.village,
            thana: person.thana,
            district: dist
          });
        });
      });
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      names = names.filter(person =>
        person.name.toLowerCase().includes(query) ||
        person.father.toLowerCase().includes(query) ||
        person.village.toLowerCase().includes(query) ||
        person.thana.toLowerCase().includes(query)
      );
    }
    return names;
  }, [district, searchQuery]);

  const handleSelectName = (person) => {
    setSelectedFuzalayeName(person.name);
    setShowNameModal(false);
    setSearchQuery('');
  };

  const handleSignup = async () => {
    setError(null);
    if (!firstName || !fatherName || !phoneNumber || !email || !district || !upazila || !dakhilaNumber || !bloodGroup || !periodOfEducation || !password || !passwordConfirm) {
      setError('অনুগ্রহ করে সব ফিল্ড পূরণ করুন।');
      return;
    }
    if (takmilYearType === '26_27' && !selectedFuzalayeName) {
      setError('অনুগ্রহ করে ফুজালায়ে জামিয়া তালিকা থেকে আপনার নাম নির্বাচন করুন।');
      return;
    }
    if (takmilYearType === 'other' && (!customGraduationYear || !selectedGraduateId)) {
      setError('অনুগ্রহ করে শিক্ষাবর্ষ লিখে ফারেগীন তালিকা থেকে নাম নির্বাচন করুন।');
      return;
    }
    if (password !== passwordConfirm) {
      setError('পাসওয়ার্ড মিলছে না।');
      return;
    }
    const result = await signup('takmil_student', {
      first_name: firstName,
      father_name: fatherName,
      phone_number: phoneNumber,
      email,
      district,
      upazila,
      dakhila_number: dakhilaNumber,
      blood_group: bloodGroup,
      period_of_education: periodOfEducation,
      password,
      password_confirm: passwordConfirm,
      fuzalaye_jamia_name: takmilYearType === '26_27' ? selectedFuzalayeName : null,
      takmil_year_type: takmilYearType,
      custom_graduation_year: takmilYearType === 'other' ? customGraduationYear : null,
      jamia_graduate_id: takmilYearType === 'other' ? selectedGraduateId : null,
    });
    if (result.success) {
      router.replace('/profile');
    } else {
      setError(result.message?.detail || JSON.stringify(result.message) || 'সাইনআপ ব্যর্থ হয়েছে।');
    }
  };

  if (isSignedIn) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.alreadyLoggedInCard}>
          <Ionicons name="checkmark-circle" size={48} color="#059669" />
          <Text style={[styles.alreadyLoggedInTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>আপনি ইতোমধ্যে লগ ইন আছেন</Text>
          <TouchableOpacity style={styles.goToProfileBtn} onPress={() => router.replace('/profile')}>
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
            <MaterialCommunityIcons name="school" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.coverTitle}>টকমিল ছাত্র রেজিস্ট্রেশন</Text>
          <Text style={styles.coverSubtitle}>আপনার তথ্য দিয়ে নতুন অ্যাকাউন্ট তৈরি করুন</Text>
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

        {/* Section: শিক্ষা তথ্য */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconBox, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
              <Ionicons name="school-outline" size={18} color="#7C3AED" />
            </View>
            <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>শিক্ষা তথ্য</Text>
          </View>

          {/* Fuzalaye Jamia Select */}
          {/* Takmil Session Year Type Selection */}
          <Text style={[styles.sessionTypeLabel, { color: isDark ? '#94A3B8' : '#64748B', marginTop: 10, marginBottom: 6, fontSize: 13, fontWeight: '600' }]}>तাকমিল শিক্ষাবর্ষ *</Text>
          <View style={styles.sessionTypeRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.sessionTypeBtn,
                {
                  backgroundColor: takmilYearType === '26_27' ? '#059669' : (isDark ? '#334155' : '#E2E8F0'),
                  borderColor: takmilYearType === '26_27' ? '#059669' : (isDark ? '#475569' : '#CBD5E1'),
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginRight: 8,
                  borderWidth: 1
                }
              ]}
              onPress={() => {
                setTakmilYearType('26_27');
                setSelectedFuzalayeName('');
                setSelectedGraduateId(null);
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: takmilYearType === '26_27' ? '#FFFFFF' : (isDark ? '#F8FAFC' : '#1E293B') }}>২৬-২৭ শিক্ষাবর্ষ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.sessionTypeBtn,
                {
                  backgroundColor: takmilYearType === 'other' ? '#059669' : (isDark ? '#334155' : '#E2E8F0'),
                  borderColor: takmilYearType === 'other' ? '#059669' : (isDark ? '#475569' : '#CBD5E1'),
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 1
                }
              ]}
              onPress={() => {
                setTakmilYearType('other');
                setSelectedFuzalayeName('');
                setSelectedGraduateId(null);
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: takmilYearType === 'other' ? '#FFFFFF' : (isDark ? '#F8FAFC' : '#1E293B') }}>অন্যান্য শিক্ষাবর্ষ</Text>
            </TouchableOpacity>
          </View>

          {takmilYearType === 'other' && (
            <FloatingInput
              icon="calendar-outline"
              label="শিক্ষাবর্ষ/পাসের সন (যেমন: 2025)"
              value={customGraduationYear}
              onChangeText={setCustomGraduationYear}
              isDark={isDark}
              focused={focusedField === 'customYear'}
              onFocus={() => setFocusedField('customYear')}
              onBlur={() => setFocusedField(null)}
            />
          )}

          {takmilYearType === '26_27' ? (
            <TouchableOpacity
              style={[styles.fuzalayeSelectBtn, {
                borderColor: selectedFuzalayeName ? '#059669' : isDark ? '#334155' : '#E2E8F0',
                backgroundColor: selectedFuzalayeName ? 'rgba(5, 150, 105, 0.05)' : isDark ? '#1E293B' : '#FFFFFF',
                marginTop: 12,
              }]}
              onPress={() => setShowNameModal(true)}
            >
              <View style={[styles.fuzalayeIconBox, { backgroundColor: selectedFuzalayeName ? 'rgba(5, 150, 105, 0.15)' : 'rgba(100, 116, 139, 0.1)' }]}>
                <Ionicons name="person-outline" size={20} color={selectedFuzalayeName ? '#059669' : '#64748B'} />
              </View>
              <View style={styles.fuzalayeTextWrap}>
                <Text style={[styles.fuzalayeLabel, { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }]}>ফুজালায়ে জামিয়া তালিকায় আপনার নাম</Text>
                <Text style={[styles.fuzalayeValue, { color: selectedFuzalayeName ? '#059669' : isDark ? '#F8FAFC' : '#1E293B', fontSize: 14, fontWeight: 'bold' }]} numberOfLines={1}>
                  {selectedFuzalayeName || 'নাম নির্বাচন করুন'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.fuzalayeSelectBtn, {
                borderColor: selectedGraduateId ? '#059669' : isDark ? '#334155' : '#E2E8F0',
                backgroundColor: selectedGraduateId ? 'rgba(5, 150, 105, 0.05)' : isDark ? '#1E293B' : '#FFFFFF',
                marginTop: 12,
              }]}
              onPress={() => {
                if (!customGraduationYear) {
                  Alert.alert('সতর্কতা', 'দয়া করে আগে শিক্ষাবর্ষ/পাসের সন লিখুন।');
                  return;
                }
                setShowNameModal(true);
              }}
            >
              <View style={[styles.fuzalayeIconBox, { backgroundColor: selectedGraduateId ? 'rgba(5, 150, 105, 0.15)' : 'rgba(100, 116, 139, 0.1)' }]}>
                <Ionicons name="person-outline" size={20} color={selectedGraduateId ? '#059669' : '#64748B'} />
              </View>
              <View style={styles.fuzalayeTextWrap}>
                <Text style={[styles.fuzalayeLabel, { color: isDark ? '#94A3B8' : '#64748B', fontSize: 11 }]}>ফারেগীন তালিকায় আপনার নাম</Text>
                <Text style={[styles.fuzalayeValue, { color: selectedGraduateId ? '#059669' : isDark ? '#F8FAFC' : '#1E293B', fontSize: 14, fontWeight: 'bold' }]} numberOfLines={1}>
                  {selectedFuzalayeName || 'নাম নির্বাচন করুন'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          )}

          <FloatingInput
            icon="card-outline"
            label="দাখিলা নং"
            value={dakhilaNumber}
            onChangeText={setDakhilaNumber}
            isDark={isDark}
            focused={focusedField === 'dakhila'}
            onFocus={() => setFocusedField('dakhila')}
            onBlur={() => setFocusedField(null)}
          />
          <FloatingInput
            icon="fitness-outline"
            label="রক্তের গ্রুপ"
            value={bloodGroup}
            onChangeText={setBloodGroup}
            isDark={isDark}
            focused={focusedField === 'blood'}
            onFocus={() => setFocusedField('blood')}
            onBlur={() => setFocusedField(null)}
          />
          <FloatingInput
            icon="time-outline"
            label="শিক্ষার সময়কাল"
            value={periodOfEducation}
            onChangeText={setPeriodOfEducation}
            isDark={isDark}
            focused={focusedField === 'period'}
            onFocus={() => setFocusedField('period')}
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

      {/* Fuzalaye Jamia Modal */}
      <Modal visible={showNameModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 10, backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>
              {takmilYearType === '26_27' ? 'ফুজালায়ে জামিয়া তালিকা' : 'ফারেগীন তালিকা'}
            </Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => { setShowNameModal(false); setSearchQuery(''); }}>
              <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>
          </View>

          <View style={[styles.modalInfo, { backgroundColor: 'rgba(37, 99, 235, 0.08)', borderBottomColor: 'rgba(37, 99, 235, 0.15)' }]}>
            <Ionicons name="information-circle" size={18} color="#2563EB" />
            <Text style={[styles.modalInfoText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              {takmilYearType === '26_27' 
                ? (district ? `"${district}" জেলার তালিকা থেকে নাম নির্বাচন করুন` : 'জেলা নির্বাচন করলে সেই জেলার নামগুলো দেখাবে')
                : `"${customGraduationYear}" শিক্ষাবর্ষের ফারেগীন তালিকা থেকে নাম নির্বাচন করুন`
              }
            </Text>
          </View>

          {/* For other years, show "Add New Entry" button */}
          {takmilYearType === 'other' && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setShowNameModal(false);
                setGraduateForm({ ...graduateForm, graduation_year: customGraduationYear, district: district });
                setShowAddGraduateModal(true);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#059669',
                paddingVertical: 12,
                marginHorizontal: 16,
                marginTop: 12,
                borderRadius: 8,
              }}
            >
              <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>আপনার নাম তালিকায় না থাকলে নতুন এন্ট্রি যোগ করুন</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#E2E8F0', marginTop: 12 }]}>
            <Ionicons name="search" size={20} color={isDark ? '#64748B' : '#94A3B8'} />
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#F8FAFC' : '#1E293B' }]}
              placeholder="নাম, পিতার নাম, বা থানা দিয়ে খুঁজুন..."
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={isDark ? '#64748B' : '#94A3B8'} />
              </TouchableOpacity>
            ) : null}
          </View>

          {loadingGraduates ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={takmilYearType === '26_27' ? filteredNames : dynamicGraduates}
              keyExtractor={(item, index) => takmilYearType === '26_27' ? item.name : item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.nameItem, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderBottomColor: isDark ? '#334155' : '#F1F5F9' }]}
                  onPress={() => {
                    if (takmilYearType === '26_27') {
                      handleSelectName(item);
                    } else {
                      setSelectedGraduateId(item.id);
                      setSelectedFuzalayeName(item.name);
                      setShowNameModal(false);
                      setSearchQuery('');
                    }
                  }}
                >
                  <View style={styles.nameItemContent}>
                    <View style={[styles.nameAvatar, { backgroundColor: 'rgba(5, 150, 105, 0.1)' }]}>
                      <Ionicons name="person" size={20} color="#059669" />
                    </View>
                    <View style={styles.nameItemText}>
                      <Text style={[styles.nameItemName, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>{item.name}</Text>
                      <Text style={[styles.nameItemDetail, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                        পিতা: {takmilYearType === '26_27' ? item.father : item.father_name}
                      </Text>
                      <Text style={[styles.nameItemDetail, { color: isDark ? '#94A3B8' : '#64748B' }]} numberOfLines={1}>
                        {item.village ? `${item.village}, ` : ''}{item.thana}, {item.district}
                      </Text>
                    </View>
                  </View>
                  {(takmilYearType === '26_27' ? selectedFuzalayeName === item.name : selectedGraduateId === item.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="search-outline" size={48} color={isDark ? '#475569' : '#CBD5E1'} />
                  <Text style={[styles.emptyListText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                    কোনো নাম পাওয়া যায়নি
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      {/* Nested Add Graduate Modal */}
      <Modal visible={showAddGraduateModal} animationType="slide" transparent>
        <View style={styles.nestedModalOverlay}>
          <KeyboardAwareScrollView
            style={[styles.nestedModalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0' }]}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
          >
            <View style={styles.nestedModalHeader}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#F8FAFC' : '#1E293B' }}>নতুন ফারেগীন এন্ট্রি যোগ করুন</Text>
              <TouchableOpacity onPress={() => setShowAddGraduateModal(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>নাম *</Text>
            <TextInput
              style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
              placeholder="ফারেগীন ছাত্রের নাম"
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              value={graduateForm.name}
              onChangeText={(val) => setGraduateForm({ ...graduateForm, name: val })}
            />

            <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>পিতার নাম *</Text>
            <TextInput
              style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
              placeholder="পিতার নাম লিখুন"
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              value={graduateForm.father_name}
              onChangeText={(val) => setGraduateForm({ ...graduateForm, father_name: val })}
            />

            <View style={styles.nestedRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>গ্রাম</Text>
                <TextInput
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="গ্রাম"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={graduateForm.village}
                  onChangeText={(val) => setGraduateForm({ ...graduateForm, village: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>ডাকঘর</Text>
                <TextInput
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="ডাকঘর"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={graduateForm.post_office}
                  onChangeText={(val) => setGraduateForm({ ...graduateForm, post_office: val })}
                />
              </View>
            </View>

            <View style={styles.nestedRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>থানা *</Text>
                <TextInput
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="থানা"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={graduateForm.thana}
                  onChangeText={(val) => setGraduateForm({ ...graduateForm, thana: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>জেলা *</Text>
                <TouchableOpacity
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', justifyContent: 'center' }]}
                  onPress={() => setShowDistrictPicker(true)}
                >
                  <Text style={{ color: graduateForm.district ? (isDark ? '#F8FAFC' : '#1E293B') : (isDark ? '#475569' : '#94A3B8') }}>
                    {graduateForm.district || 'জেলা নির্বাচন'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {customDistrictSelected && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>অন্যান্য জেলা টাইপ করুন *</Text>
                <TextInput
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="জেলার নাম লিখুন"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={graduateForm.district}
                  onChangeText={(val) => setGraduateForm({ ...graduateForm, district: val })}
                />
              </View>
            )}

            {/* District Selection Modal */}
            <Modal visible={showDistrictPicker} transparent animationType="fade">
              <View style={styles.nestedModalOverlay}>
                <View style={[styles.nestedModalContent, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? '#334155' : '#E2E8F0', maxHeight: '60%' }]}>
                  <View style={styles.nestedModalHeader}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: isDark ? '#F8FAFC' : '#1E293B' }}>জেলা নির্বাচন করুন</Text>
                    <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                      <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {staticDistricts.map((dist, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }}
                        onPress={() => {
                          setGraduateForm({ ...graduateForm, district: dist });
                          setCustomDistrictSelected(false);
                          setShowDistrictPicker(false);
                        }}
                      >
                        <Text style={{ fontSize: 16, color: isDark ? '#F8FAFC' : '#1E293B' }}>{dist}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isDark ? '#334155' : '#F1F5F9' }}
                      onPress={() => {
                        setGraduateForm({ ...graduateForm, district: '' });
                        setCustomDistrictSelected(true);
                        setShowDistrictPicker(false);
                      }}
                    >
                      <Text style={{ fontSize: 16, color: '#059669', fontWeight: 'bold' }}>অন্যান্য (টাইপ করুন)</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>মোবাইল নম্বর</Text>
            <TextInput
              style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
              placeholder="মোবাইল"
              placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
              keyboardType="phone-pad"
              value={graduateForm.mobile}
              onChangeText={(val) => setGraduateForm({ ...graduateForm, mobile: val })}
            />

            <View style={styles.nestedRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>রক্তের গ্রুপ</Text>
                <TextInput
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="যেমন: A+"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={graduateForm.blood_group}
                  onChangeText={(val) => setGraduateForm({ ...graduateForm, blood_group: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nestedInputLabel, { color: isDark ? '#F8FAFC' : '#1E293B' }]}>পাসের সন *</Text>
                <TextInput
                  style={[styles.nestedInput, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0', color: isDark ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="যেমন: 2025"
                  placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                  value={graduateForm.graduation_year}
                  onChangeText={(val) => setGraduateForm({ ...graduateForm, graduation_year: val })}
                />
              </View>
            </View>

            <TouchableOpacity
              disabled={addingGraduate}
              onPress={async () => {
                if (!graduateForm.name || !graduateForm.father_name || !graduateForm.thana || !graduateForm.district || !graduateForm.graduation_year) {
                  Alert.alert('ভুল', 'অনুগ্রহ করে সব তারকা চিহ্নিত (*) তথ্যগুলো পূরণ করুন।');
                  return;
                }
                try {
                  setAddingGraduate(true);
                  const res = await fetch(API_ENDPOINTS.JAMIA_GRADUATES, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(graduateForm)
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setSelectedGraduateId(data.id);
                    setSelectedFuzalayeName(data.name);
                    setShowAddGraduateModal(false);
                    Alert.alert('সফল', 'নতুন ফারেগীন এন্ট্রি সফল হয়েছে এবং আপনার নাম হিসাবে নির্বাচিত হয়েছে।');
                  } else {
                    Alert.alert('ত্রুটি', 'এন্ট্রি সংরক্ষণ করতে ব্যর্থ হয়েছে।');
                  }
                } catch (e) {
                  console.error(e);
                  Alert.alert('ত্রুটি', 'সার্ভারে সংযোগ ব্যর্থ হয়েছে।');
                } finally {
                  setAddingGraduate(false);
                }
              }}
              style={{
                height: 48,
                borderRadius: 8,
                backgroundColor: '#059669',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 16,
                marginBottom: 30
              }}
            >
              {addingGraduate ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>সংরক্ষণ ও নির্বাচন করুন</Text>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
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
    height: 220,
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
    backgroundColor: 'rgba(5, 150, 105, 0.8)',
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
  // Fuzalaye Jamia Select
  fuzalayeSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    minHeight: 56,
  },
  fuzalayeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fuzalayeTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  fuzalayeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  fuzalayeValue: {
    fontSize: 15,
    fontWeight: '600',
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
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  resultsCount: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  nameItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nameAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameItemText: {
    flex: 1,
    marginLeft: 12,
  },
  nameItemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  nameItemDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyListText: {
    fontSize: 15,
    marginTop: 12,
  },
  sessionTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  sessionTypeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  sessionTypeBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  nestedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  nestedModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
  },
  nestedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nestedInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  nestedInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  nestedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});