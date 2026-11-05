import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import fuzalayeJamiaData, { allJamats } from '../data/fuzalaye-jamia-data';
import acquaintanceService from '../services/acquaintance-service';

export default function FuzalayeJamiaScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Navigation state: 'jamat' -> 'district' -> 'list'
  const [selectedJamat, setSelectedJamat] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [acquaintances, setAcquaintances] = useState([]);

  useEffect(() => {
    loadAcquaintances();
  }, []);

  const loadAcquaintances = async () => {
    const { selected } = await acquaintanceService.getSelectedAcquaintances();
    setAcquaintances(selected || []);
  };

  const handleJamatPress = (jamat) => {
    setSelectedJamat(jamat);
    setSelectedDistrict(null);
    setSearchQuery('');
  };

  const handleDistrictPress = (district) => {
    setSelectedDistrict(district);
    setSearchQuery('');
  };

  const handleBack = () => {
    if (selectedDistrict !== null) {
      setSelectedDistrict(null);
      setSearchQuery('');
    } else if (selectedJamat !== null) {
      setSelectedJamat(null);
      setSearchQuery('');
    } else {
      router.back();
    }
  };

  const handleNamePress = (person) => {
    router.push({
      pathname: '/user-profile',
      params: { fuzalayeName: person.name }
    });
  };

  // Get districts for current jamat sorted by student count descending (jei jelay manush beshi seta agee thakbe)
  const currentJamatDistricts = useMemo(() => {
    if (!selectedJamat || !fuzalayeJamiaData[selectedJamat]) return [];
    const dMap = fuzalayeJamiaData[selectedJamat];
    return Object.keys(dMap).sort((a, b) => {
      const countA = dMap[a]?.length || 0;
      const countB = dMap[b]?.length || 0;
      if (countB !== countA) return countB - countA;
      return a.localeCompare(b, 'bn');
    });
  }, [selectedJamat]);

  // Total students in a jamat
  const getJamatTotalStudents = (jamat) => {
    const dMap = fuzalayeJamiaData[jamat];
    if (!dMap) return 0;
    return Object.values(dMap).reduce((sum, list) => sum + list.length, 0);
  };

  // Total students in all jamats
  const grandTotalStudents = useMemo(() => {
    return allJamats.reduce((acc, j) => acc + getJamatTotalStudents(j), 0);
  }, []);

  // Current list of students to show
  const currentStudents = useMemo(() => {
    if (!selectedJamat) return [];
    const dMap = fuzalayeJamiaData[selectedJamat] || {};

    let list = [];
    if (selectedDistrict === '__ALL__') {
      list = Object.values(dMap).flat();
    } else if (selectedDistrict && dMap[selectedDistrict]) {
      list = dMap[selectedDistrict];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.father && p.father.toLowerCase().includes(q)) ||
        (p.thana && p.thana.toLowerCase().includes(q)) ||
        (p.village && p.village.toLowerCase().includes(q)) ||
        (p.district && p.district.toLowerCase().includes(q)) ||
        (p.dakhila && String(p.dakhila).includes(q))
      );
    }
    return list;
  }, [selectedJamat, selectedDistrict, searchQuery]);

  const renderPersonCard = (person, index) => {
    return (
      <TouchableOpacity
        key={index}
        activeOpacity={0.7}
        onPress={() => handleNamePress(person)}
        style={[styles.personCardOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}
      >
        <View style={[styles.personCardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.personNameRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
              {person.dakhila ? (
                <Text style={[styles.dakhilaText, { color: colors.textSecondary }]}>
                  দাখিলা নং: {person.dakhila}
                </Text>
              ) : null}
            </View>
            <Ionicons name="person-circle-outline" size={22} color={colors.accentBlue} />
          </View>

          {person.father ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>পিতা: </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{person.father}</Text>
            </View>
          ) : null}

          <View style={styles.addressContainer}>
            {person.village ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>গ্রাম: </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{person.village}</Text>
              </View>
            ) : null}
            {person.post ? (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ডাকঘর: </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{person.post}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>থানা: </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {person.thana}{person.district ? `, ${person.district}` : ''}
              </Text>
            </View>
          </View>

          {person.mobile && person.mobile.length > 0 ? (
            <View style={styles.mobileRowWrap}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>মোবাইল: </Text>
              <View style={styles.mobileButtonsContainer}>
                {person.mobile.map((mob, mIdx) => {
                  const raw = (person.rawMobile && person.rawMobile[mIdx]) || mob.replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d));
                  return (
                    <TouchableOpacity
                      key={mIdx}
                      activeOpacity={0.7}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${raw}`).catch(() => {});
                      }}
                      style={[styles.callBtn, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}40` }]}
                    >
                      <Ionicons name="call" size={12} color={colors.accentEmerald} />
                      <Text style={[styles.callBtnText, { color: colors.accentEmerald }]}>{mob}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.tagsRow}>
            {person.bloodGroup ? (
              <View style={[styles.tag, { backgroundColor: `${colors.accentAmber}15`, borderColor: `${colors.accentAmber}30` }]}>
                <Ionicons name="water-outline" size={12} color={colors.accentAmber} />
                <Text style={[styles.tagText, { color: colors.accentAmber }]}>{person.bloodGroup}</Text>
              </View>
            ) : null}
            {person.studyPeriod ? (
              <View style={[styles.tag, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
                <Ionicons name="time-outline" size={12} color={colors.accentEmerald} />
                <Text style={[styles.tagText, { color: colors.accentEmerald }]}>অধ্যায়ন: {person.studyPeriod}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Header Title & Subtitle
  let headerTitle = 'ফুজালায়ে জামিয়া';
  let headerSubtitle = 'ফারেগীন ছাত্রবৃন্দ';
  let countBadgeValue = grandTotalStudents;

  if (selectedDistrict) {
    headerTitle = selectedDistrict === '__ALL__' ? 'সকল ফারেগীন' : selectedDistrict;
    headerSubtitle = selectedJamat;
    countBadgeValue = currentStudents.length;
  } else if (selectedJamat) {
    headerTitle = selectedJamat;
    headerSubtitle = 'জেলা নির্বাচন করুন';
    countBadgeValue = getJamatTotalStudents(selectedJamat);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{headerSubtitle}</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
        </View>
        {selectedDistrict ? (
          <View style={[styles.countBadge, { backgroundColor: colors.accentBlue, borderColor: `${colors.accentBlue}50` }]}>
            <Text style={styles.countText}>{countBadgeValue}</Text>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/select-acquaintances')}
            style={[styles.acquaintanceButton, { backgroundColor: colors.accentEmerald, borderColor: `${colors.accentEmerald}50` }]}
          >
            <Ionicons name="people" size={16} color="#fff" />
            {acquaintances.length > 0 && (
              <View style={styles.acquaintanceCount}>
                <Text style={styles.acquaintanceCountText}>{acquaintances.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* VIEW 1: JAMAT SELECTION */}
        {!selectedJamat && (
          <>
            <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="school" size={36} color={colors.accentBlue} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>ফুজালায়ে জামিয়া</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  দাওরা ও বিভিন্ন বিভাগের ফারেগীন ছাত্রদের তালিকা (মোট {grandTotalStudents} জন)
                </Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.amberCardBg, borderColor: colors.amberCardBorder }]}>
              <Ionicons name="information-circle" size={20} color={colors.accentAmber} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                নিচের যেকোনো জামাত বা বিভাগ নির্বাচন করে ফারেগীন ছাত্রদের তালিকা দেখুন
              </Text>
            </View>

            <View style={styles.jamatList}>
              {allJamats.map((jamat, index) => {
                const count = getJamatTotalStudents(jamat);
                const dCount = Object.keys(fuzalayeJamiaData[jamat] || {}).length;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    style={[
                      styles.jamatCardOuter,
                      { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder },
                    ]}
                    onPress={() => handleJamatPress(jamat)}
                  >
                    <View style={[styles.jamatCardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={[styles.jamatIcon, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
                        <Ionicons name="ribbon-outline" size={20} color={colors.accentEmerald} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.jamatTitle, { color: colors.text }]}>{jamat}</Text>
                        <Text style={[styles.jamatSub, { color: colors.textSecondary }]}>{dCount}টি জেলা</Text>
                      </View>
                      <View style={[styles.jamatBadge, { backgroundColor: colors.accentEmerald }]}>
                        <Text style={styles.jamatBadgeText}>{count} জন</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* VIEW 2: DISTRICT SELECTION FOR SELECTED JAMAT */}
        {selectedJamat && !selectedDistrict && (
          <>
            <View style={[styles.districtHeaderOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.districtHeaderInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.districtHeaderIcon, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="school" size={28} color={colors.accentBlue} />
                </View>
                <Text style={[styles.districtHeaderTitle, { color: colors.text }]}>{selectedJamat}</Text>
                <Text style={[styles.districtHeaderSubtitle, { color: colors.textSecondary }]}>
                  মোট {getJamatTotalStudents(selectedJamat)} জন ফারেগীন ({currentJamatDistricts.length}টি জেলা)
                </Text>
              </View>
            </View>

            {/* View All Option */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.viewAllBtn,
                { backgroundColor: colors.accentBlue, borderColor: `${colors.accentBlue}50` }
              ]}
              onPress={() => handleDistrictPress('__ALL__')}
            >
              <Ionicons name="layers-outline" size={18} color="#FFFFFF" />
              <Text style={styles.viewAllBtnText}>
                {selectedJamat}-এর সকল ছাত্র দেখুন ({getJamatTotalStudents(selectedJamat)} জন)
              </Text>
            </TouchableOpacity>

            <View style={[styles.infoCard, { backgroundColor: colors.amberCardBg, borderColor: colors.amberCardBorder }]}>
              <Ionicons name="location-outline" size={20} color={colors.accentAmber} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                জেলা ভিত্তিক দেখতে নিচের যেকোনো জেলা নির্বাচন করুন
              </Text>
            </View>

            <View style={styles.grid}>
              {currentJamatDistricts.map((district, index) => {
                const count = fuzalayeJamiaData[selectedJamat][district]?.length || 0;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.7}
                    style={[
                      styles.gridItemOuter,
                      { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder },
                    ]}
                    onPress={() => handleDistrictPress(district)}
                  >
                    <View style={[styles.gridItemInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <View style={[styles.gridIcon, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
                        <Ionicons name="location" size={16} color={colors.accentEmerald} />
                      </View>
                      <Text style={[styles.gridText, { color: colors.text }]} numberOfLines={1}>
                        {district}
                      </Text>
                      <View style={[styles.gridCount, { backgroundColor: colors.accentEmerald }]}>
                        <Text style={styles.gridCountText}>{count}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* VIEW 3: STUDENT LIST */}
        {selectedJamat && selectedDistrict && (
          <>
            <View style={[styles.districtHeaderOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.districtHeaderInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.districtHeaderIcon, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="people" size={28} color={colors.accentBlue} />
                </View>
                <Text style={[styles.districtHeaderTitle, { color: colors.text }]}>
                  {selectedDistrict === '__ALL__' ? 'সকল জেলা' : selectedDistrict}
                </Text>
                <Text style={[styles.districtHeaderSubtitle, { color: colors.textSecondary }]}>
                  জামাত: {selectedJamat} • মোট {currentStudents.length} জন ফারেগীন
                </Text>
              </View>
            </View>

            {/* Search Box */}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="নাম, পিতা, থানা বা দাখিলা নং দিয়ে খুঁজুন..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Acquaintances Section */}
            {(() => {
              if (searchQuery.trim()) return null;
              const districtAcquaintances = acquaintances.filter(p => {
                if (selectedDistrict === '__ALL__') return true;
                return p.district === selectedDistrict;
              });
              if (districtAcquaintances.length === 0) return null;
              return (
                <>
                  <View style={[styles.acquaintanceSectionHeader, { borderBottomColor: colors.cardBorder }]}>
                    <Ionicons name="people" size={18} color={colors.accentEmerald} />
                    <Text style={[styles.acquaintanceSectionTitle, { color: colors.text }]}>
                      আপনার পরিচিত ({districtAcquaintances.length})
                    </Text>
                  </View>
                  {districtAcquaintances.map((person, index) => (
                    <TouchableOpacity
                      key={`acquainted-${index}`}
                      activeOpacity={0.7}
                      onPress={() => handleNamePress(person)}
                      style={[styles.personCardOuter, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder, borderWidth: 2 }]}
                    >
                      <View style={[styles.personCardInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <View style={styles.acquaintedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.accentEmerald} />
                          <Text style={[styles.acquaintedBadgeText, { color: colors.accentEmerald }]}>পরিচিত</Text>
                        </View>
                        <View style={styles.personNameRow}>
                          <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
                          <Ionicons name="person-circle-outline" size={18} color={colors.accentBlue} />
                        </View>
                        {person.father ? (
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>পিতা: </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>{person.father}</Text>
                          </View>
                        ) : null}
                        <View style={styles.addressContainer}>
                          {person.village ? (
                            <View style={styles.infoRow}>
                              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>গ্রাম: </Text>
                              <Text style={[styles.infoValue, { color: colors.text }]}>{person.village}</Text>
                            </View>
                          ) : null}
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>থানা: </Text>
                            <Text style={[styles.infoValue, { color: colors.text }]}>
                              {person.thana}{person.district ? `, ${person.district}` : ''}
                            </Text>
                          </View>
                        </View>
                        {person.mobile && person.mobile.length > 0 ? (
                          <View style={styles.infoRow}>
                            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>মোবাইল: </Text>
                            <Text style={[styles.infoValue, { color: colors.accentEmerald }]}>{person.mobile.join(', ')}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              );
            })()}

            {/* Students List */}
            {currentStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>কোনো ছাত্র পাওয়া যায়নি</Text>
              </View>
            ) : (
              currentStudents.map((person, index) => renderPersonCard(person, index))
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  acquaintanceButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  acquaintanceCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  acquaintanceCountText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  heroOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  heroInner: {
    borderRadius: 21,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  jamatList: {
    gap: 12,
  },
  jamatCardOuter: {
    borderRadius: 18,
    padding: 2,
    borderWidth: 1,
  },
  jamatCardInner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  jamatIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jamatTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  jamatSub: {
    fontSize: 12,
    marginTop: 2,
  },
  jamatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  jamatBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  viewAllBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItemOuter: {
    width: '48%',
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  gridItemInner: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gridIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridText: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  gridCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCountText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  districtHeaderOuter: {
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  districtHeaderInner: {
    borderRadius: 21,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  districtHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  districtHeaderTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  districtHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  personCardOuter: {
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  personCardInner: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  personNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  personName: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  dakhilaText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  mobileRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  mobileButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 19,
  },
  addressContainer: {
    marginBottom: 5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  acquaintanceSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  acquaintanceSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  acquaintedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  acquaintedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
