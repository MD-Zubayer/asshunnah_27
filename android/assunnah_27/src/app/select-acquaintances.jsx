import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    useColorScheme,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { fuzalayeJamiaByDistrict, allDistricts } from '../data/fuzalaye-jamia-data';
import acquaintanceService from '../services/acquaintance-service';

export default function SelectAcquaintancesScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedPeople, setSelectedPeople] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

    const loadExistingSelection = async () => {
        const { selected } = await acquaintanceService.getSelectedAcquaintances();
        if (selected && selected.length > 0) {
            setSelectedPeople(selected);
        }
    };

    // Load previously selected people
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadExistingSelection();
    }, []);


    const handleDistrictPress = (district) => {
        setSelectedDistrict(district);
        setViewMode('list');
    };

    const handleBackToGrid = () => {
        setSelectedDistrict(null);
        setViewMode('grid');
    };

    const isPersonSelected = (name) => {
        return selectedPeople.some(p => p.name === name);
    };

    const togglePerson = (person, district) => {
        const personWithDistrict = { ...person, district };
        if (isPersonSelected(person.name)) {
            setSelectedPeople(prev => prev.filter(p => p.name !== person.name));
        } else {
            setSelectedPeople(prev => [...prev, personWithDistrict]);
        }
    };

    const handleSkip = () => {
        router.back();
    };

    const handleDone = async () => {
        if (selectedPeople.length === 0) {
            Alert.alert(
                'কোনো পরিচিত নির্বাচন করা হয়নি',
                'আপনি কি跳过 করতে চান? পরে আবার নির্বাচন করতে পারবেন।',
                [
                    { text: 'বাতিল', style: 'cancel' },
                    { text: 'ঠিক আছে', onPress: () => router.back() },
                ]
            );
            return;
        }

        setLoading(true);
        try {
            await acquaintanceService.saveSelectedAcquaintances(selectedPeople);
            await acquaintanceService.resetVisitCount();
            Alert.alert(
                'সফল!',
                `${selectedPeople.length} জন পরিচিত নির্বাচন করা হয়েছে।`,
                [{ text: 'ঠিক আছে', onPress: () => router.back() }]
            );
        } catch (_error) {
            Alert.alert('ত্রুটি', 'সংরক্ষণ করতে সমস্যা হয়েছে');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedCountInDistrict = (district) => {
        return selectedPeople.filter(p => p.district === district).length;
    };

    const renderPersonCard = (person, district) => {
        const selected = isPersonSelected(person.name);
        return (
            <TouchableOpacity
                key={person.name}
                style={[
                    styles.personCard,
                    { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.cardBorder },
                    selected && styles.personCardSelected
                ]}
                onPress={() => togglePerson(person, district)}
                activeOpacity={0.7}
            >
                <View style={styles.personCardContent}>
                    <View style={styles.personInfo}>
                        <Text style={[styles.personName, { color: colors.text }]} numberOfLines={2}>
                            {person.name}
                        </Text>
                        {person.father ? (
                            <Text style={[styles.personFather, { color: colors.textSecondary }]} numberOfLines={1}>
                                পিতা: {person.father}
                            </Text>
                        ) : null}
                        <Text style={[styles.personAddress, { color: colors.textMuted }]} numberOfLines={1}>
                            {person.village ? `${person.village}, ` : ''}{person.thana}
                        </Text>
                    </View>
                    <View style={[
                        styles.checkbox,
                        { borderColor: selected ? colors.primary : colors.textMuted },
                        selected && { backgroundColor: colors.primary }
                    ]}>
                        {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const totalSelected = selectedPeople.length;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                <TouchableOpacity
                    onPress={() => viewMode === 'list' ? handleBackToGrid() : router.back()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>পরিচিত নির্বাচন</Text>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {viewMode === 'list' ? selectedDistrict : 'আপনার পরিচিত'}
                    </Text>
                </View>
                {totalSelected > 0 && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.selectedBadgeText}>{totalSelected}</Text>
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {viewMode === 'grid' ? (
                    <>
                        {/* Info Section */}
                        <View style={[styles.infoCard, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}>
                            <Ionicons name="information-circle" size={24} color={colors.primary} />
                            <Text style={[styles.infoText, { color: colors.text }]}>
                                ফুজালায়ে জামিয়া থেকে আপনার পরিচিতদের নির্বাচন করুন। তারা হোম পেজে এবং জেলার তালিকায় উপরে দেখাবে।
                            </Text>
                        </View>

                        {/* District Grid */}
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>জেলা নির্বাচন করুন</Text>
                        <View style={styles.grid}>
                            {allDistricts.map((district) => {
                                const countInDistrict = getSelectedCountInDistrict(district);
                                const totalCount = fuzalayeJamiaByDistrict[district]?.length || 0;
                                return (
                                    <TouchableOpacity
                                        key={district}
                                        style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                                        onPress={() => handleDistrictPress(district)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.gridItemHeader}>
                                            <Ionicons name="location" size={16} color={colors.primary} />
                                            <Text style={[styles.gridItemTitle, { color: colors.text }]} numberOfLines={1}>
                                                {district}
                                            </Text>
                                        </View>
                                        <View style={styles.gridItemFooter}>
                                            <Text style={[styles.gridItemCount, { color: colors.textSecondary }]}>
                                                {totalCount} জন
                                            </Text>
                                            {countInDistrict > 0 && (
                                                <View style={[styles.gridItemSelectedBadge, { backgroundColor: colors.primaryBg }]}>
                                                    <Text style={[styles.gridItemSelectedText, { color: colors.primary }]}>
                                                        {countInDistrict} ✓
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                ) : (
                    <>
                        {/* District Header */}
                        <View style={[styles.districtHeader, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                            <Ionicons name="location" size={20} color={colors.primary} />
                            <Text style={[styles.districtHeaderTitle, { color: colors.text }]}>
                                {selectedDistrict} - {fuzalayeJamiaByDistrict[selectedDistrict]?.length || 0} জন
                            </Text>
                        </View>

                        {/* Person List */}
                        {fuzalayeJamiaByDistrict[selectedDistrict]?.map((person) =>
                            renderPersonCard(person, selectedDistrict)
                        )}
                    </>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
                <TouchableOpacity
                    style={[styles.skipButton, { borderColor: colors.cardBorder }]}
                    onPress={handleSkip}
                    disabled={loading}
                >
                    <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.doneButton, { backgroundColor: colors.primary }]}
                    onPress={handleDone}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.doneButtonText}>
                                {totalSelected > 0 ? `${totalSelected} জন নির্বাচিত` : 'Done'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
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
    backButton: { padding: 4 },
    headerTextContainer: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    headerSubtitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
    selectedBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16 },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    infoText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    gridItem: {
        width: '48%',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    gridItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    gridItemTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
    gridItemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    gridItemCount: { fontSize: 12, fontWeight: '600' },
    gridItemSelectedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    gridItemSelectedText: { fontSize: 11, fontWeight: '800' },
    districtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 16,
    },
    districtHeaderTitle: { fontSize: 16, fontWeight: '800' },
    personCard: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
        overflow: 'hidden',
    },
    personCardSelected: {
        borderWidth: 2,
    },
    personCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    personInfo: { flex: 1 },
    personName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    personFather: { fontSize: 12, marginBottom: 2 },
    personAddress: { fontSize: 11 },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
    },
    skipButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    skipButtonText: {
        fontSize: 15,
        fontWeight: '800',
    },
    doneButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
