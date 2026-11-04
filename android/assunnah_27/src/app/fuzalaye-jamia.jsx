import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import fuzalayeJamiaData from '../data/fuzalaye-jamia-data';
import acquaintanceService from '../services/acquaintance-service';

const allDistricts = Object.keys(fuzalayeJamiaData);

export default function FuzalayeJamiaScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedNames, setSelectedNames] = useState(new Set());
  const [acquaintances, setAcquaintances] = useState([]);

  useEffect(() => {
    loadAcquaintances();
  }, []);

  const loadAcquaintances = async () => {
    const { selected } = await acquaintanceService.getSelectedAcquaintances();
    setAcquaintances(selected || []);
    setSelectedNames(new Set((selected || []).map(p => p.name)));
  };

  const handleDistrictPress = (district) => {
    setSelectedDistrict(district);
    setViewMode('list');
  };

  const handleBackToGrid = () => {
    setSelectedDistrict(null);
    setViewMode('grid');
  };

  const handleNamePress = (person) => {
    router.push({
      pathname: '/user-profile',
      params: { fuzalayeName: person.name }
    });
  };

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
            <Text style={[styles.personName, { color: colors.text }]}>{person.name}</Text>
            <Ionicons name="person-circle-outline" size={18} color={colors.accentBlue} />
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>পিতা: </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{person.father}</Text>
          </View>

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
              <Text style={[styles.infoValue, { color: colors.text }]}>{person.thana}</Text>
            </View>
          </View>

          {person.mobile && person.mobile.length > 0 ? (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>মোবাইল: </Text>
              <Text style={[styles.infoValue, { color: colors.accentEmerald }]}>{person.mobile.join(', ')}</Text>
            </View>
          ) : null}

          <View style={styles.tagsRow}>
            {person.bloodGroup ? (
              <View style={[styles.tag, { backgroundColor: `${colors.accentAmber}15`, borderColor: `${colors.accentAmber}30` }]}>
                <Text style={[styles.tagText, { color: colors.accentAmber }]}>{person.bloodGroup}</Text>
              </View>
            ) : null}
            {person.studyPeriod ? (
              <View style={[styles.tag, { backgroundColor: `${colors.accentEmerald}15`, borderColor: `${colors.accentEmerald}30` }]}>
                <Text style={[styles.tagText, { color: colors.accentEmerald }]}>অধ্যায়ন: {person.studyPeriod}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingBottom: 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => viewMode === 'list' ? handleBackToGrid() : router.back()}
          style={[styles.backButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>ফুজালায়ে জামিয়া</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {viewMode === 'list' ? selectedDistrict : 'ফারেগীন ছাত্রবৃন্দ'}
          </Text>
        </View>
        {viewMode === 'list' ? (
          <View style={[styles.countBadge, { backgroundColor: colors.accentBlue, borderColor: `${colors.accentBlue}50` }]}>
            <Text style={styles.countText}>{fuzalayeJamiaData[selectedDistrict]?.length || 0}</Text>
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
        {viewMode === 'grid' ? (
          <>
            <View style={[styles.heroOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.heroInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.heroIconContainer, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="school" size={36} color={colors.accentBlue} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>ফুজালায়ে জামিয়া</Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>দাওরা ফারেগীন ছাত্রদের তালিকা</Text>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.amberCardBg, borderColor: colors.amberCardBorder }]}>
              <Ionicons name="information-circle" size={20} color={colors.accentAmber} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                নিচের যেকোনো জেলায় ক্লিক করে দাওরা ফারেগীন ছাত্রদের তালিকা দেখুন
              </Text>
            </View>

            <View style={styles.grid}>
              {allDistricts.map((district, index) => (
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
                      <Ionicons name="location" size={18} color={colors.accentEmerald} />
                    </View>
                    <Text style={[styles.gridText, { color: colors.text }]}>{district}</Text>
                    <View style={[styles.gridCount, { backgroundColor: colors.accentEmerald }]}>
                      <Text style={styles.gridCountText}>{fuzalayeJamiaData[district].length}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.districtHeaderOuter, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
              <View style={[styles.districtHeaderInner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={[styles.districtHeaderIcon, { backgroundColor: `${colors.accentBlue}15`, borderColor: `${colors.accentBlue}30` }]}>
                  <Ionicons name="location" size={24} color={colors.accentBlue} />
                </View>
                <Text style={[styles.districtHeaderTitle, { color: colors.text }]}>{selectedDistrict}</Text>
                <Text style={[styles.districtHeaderSubtitle, { color: colors.textSecondary }]}>
                  মোট {fuzalayeJamiaData[selectedDistrict]?.length || 0} জন ফারেগীন
                </Text>
              </View>
            </View>

            {(() => {
              const districtAcquaintances = acquaintances.filter(p => p.district === selectedDistrict);
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
                            <Text style={[styles.infoValue, { color: colors.text }]}>{person.thana}</Text>
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

            {(() => {
              const allPeople = fuzalayeJamiaData[selectedDistrict] || [];
              const sorted = [...allPeople].sort((a, b) => {
                const aSelected = selectedNames.has(a.name) ? 0 : 1;
                const bSelected = selectedNames.has(b.name) ? 0 : 1;
                return aSelected - bSelected;
              });
              return sorted.map((person, index) => renderPersonCard(person, index));
            })()}
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
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 14,
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
    fontStyle: 'italic',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItemOuter: {
    width: '47%',
    borderRadius: 16,
    padding: 2,
    borderWidth: 1,
  },
  gridItemInner: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gridIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
    width: 22,
    height: 22,
    borderRadius: 11,
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
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  districtHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
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
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  personName: {
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  addressContainer: {
    marginBottom: 6,
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
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  acquaintanceSectionTitle: {
    fontSize: 16,
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
});