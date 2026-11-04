import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    useColorScheme,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import diaryService from '../services/diary-service';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const TAG_OPTIONS = [
    { label: 'আমল', emoji: '🌙', color: '#2563EB' },
    { label: 'নামাজ', emoji: '🕌', color: '#9333EA' },
    { label: 'কুরআন', emoji: '📖', color: '#059669' },
    { label: 'দোয়া', emoji: '🤲', color: '#D97706' },
    { label: 'ইলম', emoji: '📚', color: '#EC4899' },
    { label: 'সাধারণ', emoji: '📝', color: '#6B7280' },
];

export default function CreateDiaryScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token } = useAuth();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedTag, setSelectedTag] = useState(TAG_OPTIONS[0]);
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('ত্রুটি', 'ডায়েরির শিরোনাম লিখুন।');
            return;
        }
        if (!content.trim()) {
            Alert.alert('ত্রুটি', 'ডায়েরির বিষয়বস্তু লিখুন।');
            return;
        }

        try {
            setSubmitting(true);
            await diaryService.addDiary(token, {
                title: title.trim(),
                content: content.trim(),
                tag: selectedTag.label,
                emoji: selectedTag.emoji,
            });
            Alert.alert('সফল', 'ডায়েরি সংরক্ষিত হয়েছে!');
            router.back();
        } catch (error) {
            console.error('Failed to save diary:', error);
            Alert.alert('ত্রুটি', error.message || 'ডায়েরি সংরক্ষণ করতে সমস্যা হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const canSave = title.trim() && content.trim() && !submitting;

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Gradient Header */}
            <LinearGradient
                colors={['#EC4899', '#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={26} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Ionicons name="book-outline" size={20} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.headerTitle}>নতুন ডায়েরি</Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, { opacity: canSave ? 1 : 0.5 }]}
                        onPress={handleSave}
                        disabled={!canSave}
                        activeOpacity={0.7}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>সংরক্ষণ</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Tag Selection Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="pricetag" size={18} color={selectedTag.color} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>ক্যাটাগরি নির্বাচন</Text>
                    </View>

                    <View style={styles.tagGrid}>
                        {TAG_OPTIONS.map((tag) => {
                            const isSelected = selectedTag.label === tag.label;
                            return (
                                <TouchableOpacity
                                    key={tag.label}
                                    style={[
                                        styles.tagCard,
                                        {
                                            backgroundColor: isSelected ? `${tag.color}20` : 'transparent',
                                            borderColor: isSelected ? tag.color : colors.cardBorder,
                                        },
                                    ]}
                                    onPress={() => setSelectedTag(tag)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.tagEmojiWrap, { backgroundColor: isSelected ? `${tag.color}30` : colors.inputBg }]}>
                                        <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.tagLabel,
                                            { color: isSelected ? tag.color : colors.textSecondary },
                                        ]}
                                    >
                                        {tag.label}
                                    </Text>
                                    {isSelected && (
                                        <View style={[styles.checkBadge, { backgroundColor: tag.color }]}>
                                            <Ionicons name="checkmark" size={10} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Title Input Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="create-outline" size={18} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>শিরোনাম</Text>
                    </View>
                    <TextInput
                        style={[
                            styles.titleInput,
                            {
                                color: colors.text,
                                backgroundColor: colors.inputBg,
                                borderColor: colors.inputBorder,
                            },
                        ]}
                        placeholder="আজকের ডায়েরির শিরোনাম..."
                        placeholderTextColor={colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />
                </View>

                {/* Content Input Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.text }]}>আজকের কথা</Text>
                    </View>
                    <TextInput
                        style={[
                            styles.contentInput,
                            {
                                color: colors.text,
                                backgroundColor: colors.inputBg,
                                borderColor: colors.inputBorder,
                            },
                        ]}
                        placeholder="আজকের দিনটি কেমন কাটলো? মনের কথা লিখুন..."
                        placeholderTextColor={colors.textMuted}
                        value={content}
                        onChangeText={setContent}
                        multiline
                        textAlignVertical="top"
                        numberOfLines={10}
                    />
                </View>

                {/* Preview Card */}
                {title.trim() && content.trim() && (
                    <View style={[styles.card, { backgroundColor: `${selectedTag.color}08`, borderColor: `${selectedTag.color}30` }]}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="eye-outline" size={18} color={selectedTag.color} />
                            <Text style={[styles.cardTitle, { color: selectedTag.color }]}>প্রিভিউ</Text>
                        </View>
                        <View style={styles.previewBox}>
                            <Text style={styles.previewEmoji}>{selectedTag.emoji}</Text>
                            <Text style={[styles.previewTitle, { color: colors.text }]}>{title}</Text>
                            <Text style={[styles.previewContent, { color: colors.textSecondary }]} numberOfLines={4}>
                                {content}
                            </Text>
                            <View style={[styles.previewTag, { backgroundColor: `${selectedTag.color}15`, borderColor: `${selectedTag.color}40` }]}>
                                <View style={[styles.previewDot, { backgroundColor: selectedTag.color }]} />
                                <Text style={[styles.previewTagText, { color: selectedTag.color }]}>{selectedTag.label}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Bottom Spacer */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    saveBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 14,
    },
    card: {
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tagCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        width: '30%',
        gap: 6,
        position: 'relative',
    },
    tagEmojiWrap: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagEmoji: {
        fontSize: 20,
    },
    tagLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    checkBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleInput: {
        fontSize: 16,
        fontWeight: '600',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    contentInput: {
        fontSize: 15,
        lineHeight: 24,
        minHeight: 200,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
    },
    previewBox: {
        gap: 8,
    },
    previewEmoji: {
        fontSize: 28,
    },
    previewTitle: {
        fontSize: 17,
        fontWeight: '800',
    },
    previewContent: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
    },
    previewTag: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
        marginTop: 4,
    },
    previewDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    previewTagText: {
        fontSize: 11,
        fontWeight: '700',
    },
});