import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, useColorScheme, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40; // Account for padding

export default function AcquaintanceCarousel({ acquaintances = [] }) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const router = useRouter();
    const scrollViewRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-scroll every 4 seconds
    useEffect(() => {
        if (acquaintances.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                const nextIndex = (prev + 1) % acquaintances.length;
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * (CARD_WIDTH + 12),
                    animated: true,
                });
                return nextIndex;
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [acquaintances.length]);

    // Handle manual scroll
    const handleScroll = (event) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (CARD_WIDTH + 12));
        if (index >= 0 && index < acquaintances.length) {
            setCurrentIndex(index);
        }
    };

    const handleManage = () => {
        router.push('/select-acquaintances');
    };

    const colors = {
        card: isDark ? '#1E293B' : '#FFFFFF',
        cardBorder: isDark ? '#334155' : '#E5E7EB',
        text: isDark ? '#F1F5F9' : '#0F172A',
        textSecondary: isDark ? '#94A3B8' : '#64748B',
        textMuted: isDark ? '#64748B' : '#94A3B8',
        primary: isDark ? '#3B82F6' : '#2563EB',
        primaryBg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.08)',
    };

    const getInitial = (name) => {
        if (!name) return '?';
        return name.charAt(0).toUpperCase();
    };

    return (
        <View style={styles.container}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.headerIconBox, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons name="people" size={18} color={colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            পরিচিত সহপাঠী ও ছাত্রগণ
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                            {acquaintances.length > 0 ? `${acquaintances.length} জন নির্বাচিত` : 'ফুজালায়ে জামিয়া'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.manageBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.cardBorder }]}
                    onPress={handleManage}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={14} color={colors.primary} />
                    <Text style={[styles.manageBtnText, { color: colors.primary }]}>
                        {acquaintances.length > 0 ? 'পরিবর্তন' : 'যুক্ত করুন'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Empty State or Carousel */}
            {acquaintances.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons name="people-outline" size={26} color={colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>পরিচিত ছাত্র/সহপাঠী নির্বাচন করুন</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                        ফুজালায়ে জামিয়া তালিকা থেকে আপনার ব্যাচ বা এলাকার পরিচিত ভাইদের নির্বাচন করুন যাতে হোম স্ক্রিন থেকেই সহজে তাদের খুঁজে পাওয়া যায়।
                    </Text>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                        onPress={handleManage}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.addBtnText}>পরিচিত ছাত্র নির্বাচন করুন</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={CARD_WIDTH + 12}
                        decelerationRate="fast"
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.carouselContent}
                    >
                        {acquaintances.map((person, index) => (
                            <View
                                key={`${person.name}-${index}`}
                                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, width: CARD_WIDTH }]}
                            >
                                <View style={styles.cardContent}>
                                    {/* Avatar */}
                                    <View style={[styles.avatar, { backgroundColor: colors.primaryBg }]}>
                                        <Text style={[styles.avatarText, { color: colors.primary }]}>
                                            {getInitial(person.name)}
                                        </Text>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.infoContainer}>
                                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                                            {person.name}
                                        </Text>
                                        {person.father ? (
                                            <Text style={[styles.father, { color: colors.textSecondary }]} numberOfLines={1}>
                                                পিতা: {person.father}
                                            </Text>
                                        ) : null}
                                        <View style={styles.locationRow}>
                                            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                                            <Text style={[styles.location, { color: colors.textMuted }]} numberOfLines={1}>
                                                {person.district} • {person.village || person.thana}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* District Badge */}
                                <View style={[styles.districtBadge, { backgroundColor: colors.primaryBg }]}>
                                    <Text style={[styles.districtBadgeText, { color: colors.primary }]}>
                                        {person.district}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {/* Quick Add More Card at end of carousel */}
                        <TouchableOpacity
                            style={[
                                styles.addMoreCard,
                                {
                                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                                    borderColor: colors.cardBorder,
                                },
                            ]}
                            onPress={handleManage}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.addMoreIconBox, { backgroundColor: colors.primaryBg }]}>
                                <Ionicons name="add" size={24} color={colors.primary} />
                            </View>
                            <Text style={[styles.addMoreText, { color: colors.text }]}>আরও যোগ করুন</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* Pagination Dots */}
                    {acquaintances.length > 1 && (
                        <View style={styles.pagination}>
                            {acquaintances.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        { backgroundColor: index === currentIndex ? colors.primary : (isDark ? '#334155' : '#CBD5E1') },
                                        index === currentIndex && styles.dotActive
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconBox: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    manageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    manageBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    carouselContent: {
        gap: 12,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 14,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '800',
    },
    infoContainer: {
        flex: 1,
        paddingRight: 70,
    },
    name: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    father: {
        fontSize: 12,
        marginBottom: 6,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    location: {
        fontSize: 11,
        fontWeight: '500',
    },
    districtBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    districtBadgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    addMoreCard: {
        width: 110,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        gap: 8,
    },
    addMoreIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addMoreText: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyCard: {
        borderRadius: 20,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: 18,
        paddingHorizontal: 8,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 11,
        borderRadius: 12,
    },
    addBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotActive: {
        width: 18,
    },
});