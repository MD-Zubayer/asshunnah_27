import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useColorScheme,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  ACCOUNT_TYPES,
  normalizeProfileType,
  getAccountTypeInfo,
} from '../constants/accountTypes';
import geoJamatData from '../data/geo-jamat-data.json';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const DEPARTMENTS = [
  'কিতাব বিভাগ',
  'হিফজ বিভাগ',
  'বোর্ড ও নাজেরা বিভাগ',
  'বাংলা বিভাগ',
  'হিসাব বিভাগ',
  "দফতরে তা'লীমাত",
  'বোর্ডিং বিভাগ',
  'অন্যান্য',
];
const DESIGNATION_SUGGESTIONS = ['মুদাররিস', 'মুহাদ্দিস', 'মুফতি', 'মুহতামিম', 'নায়েবে মুহতামিম', "নাজেমে তা'লীমাত"];

export default function SwitchAccountTypeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, isGuest, switchProfileType } = useAuth();

  const currentNormalizedType = normalizeProfileType(user?.profile_type);
  const currentTypeInfo = getAccountTypeInfo(user?.profile_type);

  const [selectedType, setSelectedType] = useState(currentNormalizedType);

  // Role-specific fields pre-filled from user profile
  const [jamat, setJamat] = useState(user?.jamat || '');
  const [dakhilaNumber, setDakhilaNumber] = useState(
    user?.dakhila_number || user?.takmil_profile?.dakhila_number || ''
  );
  const [bloodGroup, setBloodGroup] = useState(
    user?.blood_group || user?.takmil_profile?.blood_group || ''
  );
  const [takmilYearType, setTakmilYearType] = useState(user?.takmil_year_type || '26_27');
  const [customGradYear, setCustomGradYear] = useState(user?.custom_graduation_year || '');
  const [designation, setDesignation] = useState(user?.designation || 'মুদাররিস');
  const [department, setDepartment] = useState(user?.department || 'কিতাব বিভাগ');
  const [occupation, setOccupation] = useState(
    user?.occupation || user?.non_takmil_profile?.occupation || ''
  );

  const [submitting, setSubmitting] = useState(false);
  const [showJamatModal, setShowJamatModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);

  useEffect(() => {
    if (!token || isGuest) {
      Alert.alert('লগইন প্রয়োজন', 'অ্যাকাউন্টের ধরন পরিবর্তন করতে লগইন করুন।', [
        { text: 'ঠিক আছে', onPress: () => router.replace('/login') },
      ]);
    }
  }, [token, isGuest, router]);

  const handleSubmit = async () => {
    if (selectedType === 'current_student') {
      if (!jamat.trim()) {
        Alert.alert('তথ্য অসম্পূর্ণ', 'অনুগ্রহ করে আপনার বর্তমান জামাত নির্বাচন করুন।');
        return;
      }
      if (!dakhilaNumber.trim()) {
        Alert.alert('তথ্য অসম্পূর্ণ', 'আপনার দাখিলা নম্বর লিখুন।');
        return;
      }
    } else if (selectedType === 'jamia_faregin') {
      if (!dakhilaNumber.trim()) {
        Alert.alert('তথ্য অসম্পূর্ণ', 'ফারেগীন অ্যাকাউন্টের জন্য দাখিলা নম্বর আবশ্যক।');
        return;
      }
      if (takmilYearType === 'other' && !customGradYear.trim()) {
        Alert.alert('তথ্য অসম্পূর্ণ', 'আপনার ফারাগাতের সাল লিখুন (যেমন: ২০২৪-২৫)।');
        return;
      }
    } else if (selectedType === 'jamia_ustad') {
      if (!designation.trim()) {
        Alert.alert('তথ্য অসম্পূর্ণ', 'আপনার পদবী লিখুন।');
        return;
      }
    }

    const payload = {
      profile_type: selectedType,
    };

    if (selectedType === 'current_student') {
      payload.jamat = jamat.trim();
      payload.dakhila_number = dakhilaNumber.trim();
    } else if (selectedType === 'jamia_faregin') {
      payload.dakhila_number = dakhilaNumber.trim();
      payload.blood_group = bloodGroup.trim();
      payload.takmil_year_type = takmilYearType;
      payload.custom_graduation_year = takmilYearType === 'other' ? customGradYear.trim() : '';
    } else if (selectedType === 'jamia_ustad') {
      payload.designation = designation.trim();
      payload.department = department.trim();
    } else if (selectedType === 'general_user') {
      payload.occupation = occupation.trim();
    }

    setSubmitting(true);
    const result = await switchProfileType(payload);
    setSubmitting(false);

    if (result.success) {
      const targetInfo = getAccountTypeInfo(selectedType);
      Alert.alert(
        'অ্যাকাউন্ট আপডেট হয়েছে!',
        `আপনার অ্যাকাউন্ট এখন "${targetInfo.title}" হিসেবে সেট করা হয়েছে। আপনার পূর্বের সকল পোস্ট, ডায়েরি ও তথ্য অক্ষুণ্ণ রয়েছে।`,
        [{ text: 'ঠিক আছে', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('ত্রুটি', result.message || 'পরিবর্তন সংরক্ষণ করা যায়নি');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>অ্যাকাউন্টের ধরন পরিবর্তন</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            বর্তমান পরিচয়: {currentTypeInfo.shortLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Reassuring Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: '#10B98114', borderColor: '#10B98140' }]}>
          <Ionicons name="shield-checkmark" size={22} color="#059669" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: isDark ? '#6EE7B7' : '#065F46' }]}>
              সবকিছু আপনার একই অ্যাকাউন্টে থাকবে
            </Text>
            <Text style={[styles.infoBannerDesc, { color: colors.textSecondary }]}>
              ছাত্র থেকে ফারেগীন, অথবা ফারেগীন থেকে উস্তাদ—যেকোনো সময় পরিচয় পরিবর্তন করলেও আপনার ডায়েরি, পোস্ট, ফলোয়ার ও মেসেজ সব নিরাপদ থাকবে।
            </Text>
          </View>
        </View>

        {/* Role Options Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>নতুন অ্যাকাউন্ট টাইপ বেছে নিন</Text>

        <View style={styles.rolesList}>
          {ACCOUNT_TYPES.map((role) => {
            const isSelected = selectedType === role.id;
            const isCurrent = currentNormalizedType === role.id;

            return (
              <TouchableOpacity
                key={role.id}
                activeOpacity={0.8}
                onPress={() => setSelectedType(role.id)}
                style={[
                  styles.roleCard,
                  {
                    backgroundColor: isSelected ? `${role.color}14` : colors.card,
                    borderColor: isSelected ? role.color : colors.cardBorder,
                  },
                ]}
              >
                <View style={[styles.roleIconBox, { backgroundColor: `${role.color}20` }]}>
                  <Ionicons name={role.icon} size={22} color={role.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.roleTitleRow}>
                    <Text style={[styles.roleTitle, { color: colors.text }]}>{role.title}</Text>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: `${role.color}20` }]}>
                        <Text style={[styles.currentBadgeText, { color: role.color }]}>বর্তমান</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.roleSub, { color: colors.textSecondary }]}>{role.subtitle}</Text>
                </View>

                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={isSelected ? role.color : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Role-Specific Input Card */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.formCardTitle, { color: colors.text }]}>
            প্রয়োজনীয় তথ্য ({getAccountTypeInfo(selectedType).shortLabel})
          </Text>

          {/* 1. Current Student Fields */}
          {selectedType === 'current_student' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>বর্তমান জামাত *</Text>
              <TouchableOpacity
                onPress={() => setShowJamatModal(true)}
                style={[styles.selectInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              >
                <Text style={[styles.selectInputText, { color: jamat ? colors.text : colors.textMuted }]}>
                  {jamat || 'জামাত নির্বাচন করুন'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>দাখিলা নম্বর *</Text>
              <TextInput
                value={dakhilaNumber}
                onChangeText={setDakhilaNumber}
                placeholder="যেমন: ১২৩৪"
                placeholderTextColor={colors.textMuted}
                keyboardType="default"
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              />
            </>
          )}

          {/* 2. Faregin Fields */}
          {selectedType === 'jamia_faregin' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>দাখিলা নম্বর *</Text>
              <TextInput
                value={dakhilaNumber}
                onChangeText={setDakhilaNumber}
                placeholder="আপনার দাখিলা নম্বর লিখুন"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>তাকমিল ফারাগাতের শিক্ষাবর্ষ</Text>
              <View style={styles.yearChipsRow}>
                <TouchableOpacity
                  onPress={() => setTakmilYearType('26_27')}
                  style={[
                    styles.yearChip,
                    {
                      backgroundColor: takmilYearType === '26_27' ? '#059669' : colors.inputBg,
                      borderColor: takmilYearType === '26_27' ? '#059669' : colors.inputBorder,
                    },
                  ]}
                >
                  <Text style={[styles.yearChipText, { color: takmilYearType === '26_27' ? '#fff' : colors.text }]}>
                    ২০২৬-২৭ ব্যাচ
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTakmilYearType('other')}
                  style={[
                    styles.yearChip,
                    {
                      backgroundColor: takmilYearType === 'other' ? '#059669' : colors.inputBg,
                      borderColor: takmilYearType === 'other' ? '#059669' : colors.inputBorder,
                    },
                  ]}
                >
                  <Text style={[styles.yearChipText, { color: takmilYearType === 'other' ? '#fff' : colors.text }]}>
                    অন্যান্য ব্যাচ/সাল
                  </Text>
                </TouchableOpacity>
              </View>

              {takmilYearType === 'other' && (
                <TextInput
                  value={customGradYear}
                  onChangeText={setCustomGradYear}
                  placeholder="ফারাগাতের সাল লিখুন (যেমন: ২০২৫)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, { marginTop: 10, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                />
              )}

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>রক্তের গ্রুপ (ঐচ্ছিক)</Text>
              <View style={styles.bloodWrap}>
                {BLOOD_GROUPS.map((bg) => {
                  const active = bloodGroup === bg;
                  return (
                    <TouchableOpacity
                      key={bg}
                      onPress={() => setBloodGroup(active ? '' : bg)}
                      style={[
                        styles.bloodChip,
                        {
                          backgroundColor: active ? '#EF4444' : colors.inputBg,
                          borderColor: active ? '#EF4444' : colors.inputBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.bloodChipText, { color: active ? '#fff' : colors.text }]}>{bg}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* 3. Ustad Fields */}
          {selectedType === 'jamia_ustad' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>পদবী *</Text>
              <TextInput
                value={designation}
                onChangeText={setDesignation}
                placeholder="যেমন: মুদাররিস / মুহাদ্দিস"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
                {DESIGNATION_SUGGESTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setDesignation(item)}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: designation === item ? '#7C3AED20' : colors.inputBg,
                        borderColor: designation === item ? '#7C3AED' : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.suggestionText, { color: designation === item ? '#7C3AED' : colors.textSecondary }]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>বিভাগ</Text>
              <TouchableOpacity
                onPress={() => setShowDeptModal(true)}
                style={[styles.selectInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              >
                <Text style={[styles.selectInputText, { color: department ? colors.text : colors.textMuted }]}>
                  {department || 'বিভাগ নির্বাচন করুন'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </>
          )}

          {/* 4. General User Fields */}
          {selectedType === 'general_user' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>পেশা / পরিচয় (ঐচ্ছিক)</Text>
              <TextInput
                value={occupation}
                onChangeText={setOccupation}
                placeholder="যেমন: ব্যবসা, শিক্ষকতা, ইমামতি..."
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              />
            </>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: getAccountTypeInfo(selectedType).color, opacity: submitting ? 0.6 : 1 }]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>পরিবর্তন সংরক্ষণ করুন</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Jamat Picker Modal */}
      <Modal visible={showJamatModal} transparent animationType="slide" onRequestClose={() => setShowJamatModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>জামাত নির্বাচন করুন</Text>
              <TouchableOpacity onPress={() => setShowJamatModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {(geoJamatData.jamats || []).map((j) => (
                <TouchableOpacity
                  key={j}
                  onPress={() => {
                    setJamat(j);
                    setShowJamatModal(false);
                  }}
                  style={[styles.modalItem, { borderBottomColor: colors.cardBorder }]}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{j}</Text>
                  {jamat === j && <Ionicons name="checkmark-circle" size={20} color="#2563EB" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Department Picker Modal */}
      <Modal visible={showDeptModal} transparent animationType="slide" onRequestClose={() => setShowDeptModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>বিভাগ নির্বাচন করুন</Text>
              <TouchableOpacity onPress={() => setShowDeptModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  onPress={() => {
                    setDepartment(dept);
                    setShowDeptModal(false);
                  }}
                  style={[styles.modalItem, { borderBottomColor: colors.cardBorder }]}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{dept}</Text>
                  {department === dept && <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 3,
  },
  infoBannerDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  rolesList: {
    gap: 10,
    marginBottom: 18,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  currentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  roleSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  formCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectInputText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  yearChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yearChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  bloodWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  bloodChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  suggestionsRow: {
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
