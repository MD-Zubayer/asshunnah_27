import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Alert, Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { API_ENDPOINTS } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import { allDistricts } from '../data/fuzalaye-jamia-data';

export default function JamiaGraduatesScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();

  const [graduates, setGraduates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [customDistrictSelected, setCustomDistrictSelected] = useState(false);

  const staticDistricts = allDistricts;

  // Form State
  const [form, setForm] = useState({
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGraduates();
  }, []);

  const fetchGraduates = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.JAMIA_GRADUATES, {
        headers: token ? { Authorization: `Token ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setGraduates(data);
        } else if (data && Array.isArray(data.results)) {
          setGraduates(data.results);
        } else {
          setGraduates([]);
        }
      } else {
        console.warn('Failed to fetch graduates');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Group graduates by year first, then by district
  const groupedGraduates = Array.isArray(graduates) ? graduates.reduce((acc, graduate) => {
    const year = graduate.graduation_year || 'অন্যান্য শিক্ষাবর্ষ';
    const dist = graduate.district || 'অন্যান্য';
    if (!acc[year]) acc[year] = {};
    if (!acc[year][dist]) acc[year][dist] = [];
    acc[year][dist].push(graduate);
    return acc;
  }, {}) : {};

  const allYears = Object.keys(groupedGraduates).sort((a, b) => b.localeCompare(a));

  const handleDistrictPress = (year, district) => {
    setSelectedYear(year);
    setSelectedDistrict(district);
    setViewMode('list');
  };

  const handleBackToGrid = () => {
    setSelectedYear(null);
    setSelectedDistrict(null);
    setViewMode('grid');
  };

  const handleSubmit = async () => {
    if (!form.name || !form.father_name || !form.thana || !form.district || !form.graduation_year) {
      Alert.alert('ভুল', 'অনুগ্রহ করে সব তারকা চিহ্নিত (*) তথ্যগুলো পূরণ করুন।');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(API_ENDPOINTS.JAMIA_GRADUATES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Token ${token}` } : {})
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        Alert.alert('সফল', 'নতুন ফারেগীন ছাত্রের এন্ট্রি সফলভাবে সম্পন্ন হয়েছে।');
        setIsModalVisible(false);
        setForm({
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
        fetchGraduates();
      } else {
        const err = await res.json();
        Alert.alert('ত্রুটি', err.message || 'ডাটাবেজে এন্ট্রি করতে ব্যর্থ হয়েছে।');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('ত্রুটি', 'সার্ভারে সংযোগ ব্যর্থ হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => viewMode === 'list' ? handleBackToGrid() : router.back()}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>জামিয়ার সকল ফারেগিন</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {viewMode === 'list' ? `${selectedDistrict} (${selectedYear})` : 'সকল ফারেগীন ছাত্রবৃন্দ'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'grid' ? (
            <>
              {/* Hero Banner */}
              <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
                <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                    <Ionicons name="ribbon" size={36} color={colors.accentBlue} />
                  </View>
                  <Text style={[styles.heroTitle, { color: colors.text }]}>সকল ফারেগীন ডেটাবেস</Text>
                  <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>জামিয়ার প্রাক্তন ছাত্রদের বর্ষ ও জেলা ভিত্তিক তালিকা</Text>
                </View>
              </View>

              {allYears.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>এখনো কোনো ফারেগীন তালিকা যুক্ত করা হয়নি।</Text>
                </View>
              ) : (
                allYears.map((year, yIdx) => {
                  const districtsInYear = Object.keys(groupedGraduates[year]).sort();
                  return (
                    <View key={yIdx} style={{ marginBottom: 24, paddingHorizontal: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>শিক্ষাবর্ষ/পাসের সন: {year}</Text>
                      </View>
                      <View style={styles.grid}>
                        {districtsInYear.map((district, dIdx) => (
                          <TouchableOpacity
                            key={dIdx}
                            activeOpacity={0.7}
                            style={[styles.gridItemOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}
                            onPress={() => handleDistrictPress(year, district)}
                          >
                            <View style={[styles.gridItemInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                              <View style={[styles.gridIcon, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
                                <Ionicons name="location" size={18} color={colors.accentEmerald} />
                              </View>
                              <Text style={[styles.gridText, { color: colors.text }]}>{district}</Text>
                              <View style={[styles.gridCount, { backgroundColor: colors.accentEmerald }]}>
                                <Text style={styles.gridCountText}>{groupedGraduates[year][district].length}</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })
              )}
            </>
          ) : (
            <View style={styles.listContainer}>
              {groupedGraduates[selectedYear]?.[selectedDistrict]?.map((person, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: '/user-profile',
                      params: person.registered_user_id 
                        ? { userId: person.registered_user_id } 
                        : { fuzalayeName: person.name }
                    });
                  }}
                  style={[styles.personCardOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}
                >
                  <View style={[styles.personCardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={styles.personNameRow}>
                      <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                      <Ionicons name="school-outline" size={18} color={colors.accentBlue} />
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>পিতা: </Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{person.father_name}</Text>
                    </View>

                    <View style={styles.addressContainer}>
                      {person.village ? (
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>গ্রাম: </Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{person.village}</Text>
                        </View>
                      ) : null}
                      {person.post_office ? (
                        <View style={styles.infoRow}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ডাকঘর: </Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{person.post_office}</Text>
                        </View>
                      ) : null}
                      <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>থানা: </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{person.thana}</Text>
                      </View>
                    </View>

                    <View style={styles.bottomRow}>
                      <View style={[styles.tag, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                        <Text style={[styles.tagText, { color: colors.accentBlue }]}>সন: {person.graduation_year}</Text>
                      </View>
                      {person.blood_group ? (
                        <View style={[styles.tag, { backgroundColor: `${colors.accentAmber}15`, borderColor: `${colors.accentAmber}30`, marginLeft: 8 }]}>
                          <Text style={[styles.tagText, { color: colors.accentAmber }]}>{person.blood_group}</Text>
                        </View>
                      ) : null}
                    </View>

                    {person.mobile ? (
                      <View style={[styles.infoRow, { marginTop: 8 }]}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>মোবাইল: </Text>
                        <Text style={[styles.infoValue, { color: colors.accentEmerald }]}>{person.mobile}</Text>
                      </View>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Graduate Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAwareScrollView
            style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>নতুন ফারেগীন এন্ট্রি</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>নাম *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="ফারেগীন ছাত্রের নাম"
              placeholderTextColor={colors.textMuted}
              value={form.name}
              onChangeText={(val) => setForm({ ...form, name: val })}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>পিতার নাম *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="পিতার নাম লিখুন"
              placeholderTextColor={colors.textMuted}
              value={form.father_name}
              onChangeText={(val) => setForm({ ...form, father_name: val })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>গ্রাম</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="গ্রাম"
                  placeholderTextColor={colors.textMuted}
                  value={form.village}
                  onChangeText={(val) => setForm({ ...form, village: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>ডাকঘর</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="ডাকঘর"
                  placeholderTextColor={colors.textMuted}
                  value={form.post_office}
                  onChangeText={(val) => setForm({ ...form, post_office: val })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>থানা *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="থানা"
                  placeholderTextColor={colors.textMuted}
                  value={form.thana}
                  onChangeText={(val) => setForm({ ...form, thana: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>জেলা *</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, justifyContent: 'center' }]}
                  onPress={() => setShowDistrictPicker(true)}
                >
                  <Text style={{ color: form.district ? colors.text : colors.textMuted }}>
                    {form.district || 'জেলা নির্বাচন'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {customDistrictSelected && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>অন্যান্য জেলা টাইপ করুন *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="জেলার নাম লিখুন"
                  placeholderTextColor={colors.textMuted}
                  value={form.district}
                  onChangeText={(val) => setForm({ ...form, district: val })}
                />
              </View>
            )}

            {/* District Selection Modal */}
            <Modal visible={showDistrictPicker} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder, maxHeight: '60%' }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text, fontSize: 16 }]}>জেলা নির্বাচন করুন</Text>
                    <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView>
                    {staticDistricts.map((dist, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}
                        onPress={() => {
                          setForm({ ...form, district: dist });
                          setCustomDistrictSelected(false);
                          setShowDistrictPicker(false);
                        }}
                      >
                        <Text style={{ fontSize: 16, color: colors.text }}>{dist}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}
                      onPress={() => {
                        setForm({ ...form, district: '' });
                        setCustomDistrictSelected(true);
                        setShowDistrictPicker(false);
                      }}
                    >
                      <Text style={{ fontSize: 16, color: colors.primary, fontWeight: 'bold' }}>অন্যান্য (টাইপ করুন)</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Text style={[styles.inputLabel, { color: colors.text }]}>মোবাইল নম্বর</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="মোবাইল"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={form.mobile}
              onChangeText={(val) => setForm({ ...form, mobile: val })}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>রক্তের গ্রুপ</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="যেমন: A+"
                  placeholderTextColor={colors.textMuted}
                  value={form.blood_group}
                  onChangeText={(val) => setForm({ ...form, blood_group: val })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>শিক্ষাবর্ষ/পাসের সন *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                  placeholder="যেমন: 2025"
                  placeholderTextColor={colors.textMuted}
                  value={form.graduation_year}
                  onChangeText={(val) => setForm({ ...form, graduation_year: val })}
                />
              </View>
            </View>

            <TouchableOpacity
              disabled={submitting}
              onPress={handleSubmit}
              style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>সংরক্ষণ করুন</Text>
              )}
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroOuter: {
    padding: 2,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroInner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItemOuter: {
    width: '48%',
    padding: 1,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  gridItemInner: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  gridIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  gridText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  gridCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  gridCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  listContainer: {
    width: '100%',
  },
  personCardOuter: {
    padding: 1,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  personCardInner: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 14,
  },
  personNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  personName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  addressContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    paddingTop: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitBtn: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
