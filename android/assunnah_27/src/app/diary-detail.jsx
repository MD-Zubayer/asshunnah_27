import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    useColorScheme,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/theme';

const TAG_COLORS = {
    'আমল': { tagColor: '#2563EB', colorBg: '#2563EB15', colorBorder: '#2563EB30' },
    'নামাজ': { tagColor: '#9333EA', colorBg: '#9333EA15', colorBorder: '#9333EA30' },
    'কুরআন': { tagColor: '#059669', colorBg: '#05966915', colorBorder: '#05966930' },
    'দোয়া': { tagColor: '#D97706', colorBg: '#D9770615', colorBorder: '#D9770630' },
    'ইলম': { tagColor: '#EC4899', colorBg: '#EC489915', colorBorder: '#EC489930' },
    'সাধারণ': { tagColor: '#6B7280', colorBg: '#6B728015', colorBorder: '#6B728030' },
};

export default function DiaryDetailScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();

    // Parse entry data from params
    const entry = {
        id: params.id,
        title: params.title,
        content: params.content,
        tag: params.tag,
        emoji: params.emoji,
        date_display: params.date_display,
    };

    const tagStyle = TAG_COLORS[entry.tag] || TAG_COLORS['সাধারণ'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                    {entry.emoji} {entry.title}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card */}
                <View style={[styles.mainCard, { backgroundColor: tagStyle.colorBg, borderColor: tagStyle.colorBorder }]}>
                    <View style={[styles.innerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        {/* Header Section */}
                        <View style={styles.cardHeader}>
                            <View style={[styles.emojiBadge, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                                <Text style={styles.emoji}>{entry.emoji}</Text>
                            </View>
                            <View style={styles.headerMeta}>
                                <Text style={[styles.title, { color: colors.text }]}>{entry.title}</Text>
                                <Text style={[styles.date, { color: colors.textSecondary }]}>{entry.date_display}</Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

                        {/* Content Section */}
                        <Text style={[styles.content, { color: colors.text }]}>{entry.content}</Text>

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

                        {/* Footer - Tag */}
                        <View style={styles.footer}>
                            <View style={[styles.tagPill, { backgroundColor: `${tagStyle.tagColor}15`, borderColor: `${tagStyle.tagColor}40` }]}>
                                <View style={[styles.tagDot, { backgroundColor: tagStyle.tagColor }]} />
                                <Text style={[styles.tagText, { color: tagStyle.tagColor }]}>{entry.tag}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
        paddingBottom: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
        borderRadius: 10,
    },
    headerTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 8,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    mainCard: {
        borderRadius: 24,
        padding: 3,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    innerCard: {
        borderRadius: 21,
        padding: 20,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emojiBadge: {
        width: 52,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    emoji: {
        fontSize: 26,
    },
    headerMeta: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    date: {
        fontSize: 13,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 16,
        opacity: 0.5,
    },
    content: {
        fontSize: 16,
        lineHeight: 28,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    tagDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 13,
        fontWeight: '700',
    },
});