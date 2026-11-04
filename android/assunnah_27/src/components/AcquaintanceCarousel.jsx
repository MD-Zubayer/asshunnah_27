import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, useColorScheme, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40; // Account for padding

export default function AcquaintanceCarousel({ acquaintances = [] }) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
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
        setCurrentIndex(index);
    };

    if (!acquaintances || acquaintances.length === 0) {
        return null;
    }

    const colors = {
        card: isDark ? '#1E293B' : '#FFFFFF',
        cardBorder: isDark ? '#334155' : '#E5E7EB',
        text: isDark ? '#F1F5F9' : '#0F172A',
        textSecondary: isDark ? '#94A3B8' : '#64748B',
        textMuted: isDark ? '#64748B' : '#94A3B8',
        primary: isDark ? '#3B82F6' : '#2563EB',
        primaryBg: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)',
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
                    <Ionicons name="people" size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        আপনার পরিচিত
                    </Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
                    {acquaintances.length} জন নির্বাচিত
                </Text>
            </View>

            {/* Carousel */}
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
            </ScrollView>

            {/* Pagination Dots */}
            {acquaintances.length > 1 && (
                <View style={styles.pagination}>
                    {acquaintances.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: index === currentIndex ? colors.primary : colors.cardBorder },
                                index === currentIndex && styles.dotActive
                            ]}
                        />
                    ))}
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
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '600',
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