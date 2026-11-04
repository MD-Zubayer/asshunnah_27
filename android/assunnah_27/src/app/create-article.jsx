import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    useColorScheme,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import articleService from '../services/article-service';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

export default function CreateArticleScreen() {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { token, user } = useAuth();

    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                'অনুমতি প্রয়োজন',
                'ছবি আপলোড করতে গ্যালারি অ্যাক্সেস অনুমতি দিন।',
                [{ text: 'ঠিক আছে' }]
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setImage(result.assets[0]);
        }
    };

    const removeImage = () => {
        setImage(null);
    };

    const handlePost = async () => {
        if (!content.trim()) {
            Alert.alert('ত্রুটি', 'প্রবন্ধের বিষয়বস্তু লিখুন।');
            return;
        }

        if (!token) {
            router.push('/login');
            return;
        }

        try {
            setSubmitting(true);
            await articleService.createArticle(
                token,
                content.trim(),
                image ? image.uri : null
            );
            Alert.alert('সফল', 'প্রবন্ধ প্রকাশিত হয়েছে!');
            router.back();
        } catch (error) {
            console.error('Failed to create article:', error);
            Alert.alert('ত্রুটি', error.message || 'প্রবন্ধ প্রকাশ করতে সমস্যা হয়েছে');
        } finally {
            setSubmitting(false);
        }
    };

    const getUserName = () => {
        if (!user) return 'ব্যবহারকারী';
        const { first_name, last_name, email } = user;
        if (first_name || last_name) {
            return `${first_name || ''} ${last_name || ''}`.trim();
        }
        return email?.split('@')[0] || 'ব্যবহারকারী';
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>নতুন প্রবন্ধ</Text>
                <TouchableOpacity
                    style={[styles.postButton, { backgroundColor: content.trim() ? colors.primary : colors.inputBg }]}
                    onPress={handlePost}
                    disabled={!content.trim() || submitting}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={[styles.postButtonText, { color: content.trim() ? '#fff' : colors.textMuted }]}>
                            প্রকাশ করুন
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* User Info */}
                <View style={styles.userInfo}>
                    {user?.profile_image ? (
                        <Image source={{ uri: user.profile_image }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primaryBg }]}>
                            <Text style={[styles.avatarText, { color: colors.primary }]}>
                                {getUserName().charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.userName, { color: colors.text }]}>{getUserName()}</Text>
                </View>

                {/* Content Input */}
                <TextInput
                    style={[styles.contentInput, { color: colors.text }]}
                    placeholder="আপনার মনে কী চলছে? লিখুন..."
                    placeholderTextColor={colors.textMuted}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                    autoFocus
                />

                {/* Image Preview */}
                {image && (
                    <View style={styles.imagePreviewContainer}>
                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                        <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Add Photo Button */}
                <TouchableOpacity style={[styles.addPhotoButton, { borderColor: colors.cardBorder }]} onPress={pickImage}>
                    <Ionicons name="image-outline" size={24} color={colors.primary} />
                    <Text style={[styles.addPhotoText, { color: colors.primary }]}>ছবি যোগ করুন</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
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
        padding: 4,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 12,
    },
    postButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    postButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 12,
    },
    contentInput: {
        fontSize: 18,
        lineHeight: 28,
        minHeight: 200,
        marginBottom: 16,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    imagePreview: {
        width: '100%',
        height: 250,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        padding: 2,
    },
    addPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        gap: 8,
    },
    addPhotoText: {
        fontSize: 15,
        fontWeight: '600',
    },
});