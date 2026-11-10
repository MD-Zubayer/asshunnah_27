import React, { useState, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import articleService from '../services/article-service';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import {
  POST_BACKGROUND_THEMES,
  MAX_THEMED_POST_LENGTH,
  canUsePostTheme,
  getShortPostTypography,
} from '../constants/postThemes';
import StyledPostContent, { ThemeDecorOverlay } from '../components/StyledPostContent';
import ArticleRenderer from '../components/ArticleRenderer';
import SocialEmbedCard from '../components/SocialEmbedCard';
import { getTextDirection } from '../utils/textDirection';
import { extractSocialEmbeds, hasMarkdownOrEmbeds } from '../utils/socialEmbed';

export default function CreateArticleScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, user } = useAuth();

  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editorTab, setEditorTab] = useState('write'); // 'write' | 'preview'
  const [selection, setSelection] = useState({ start: 0, end: 0 });

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
      setSelectedThemeId(''); // Facebook disables background theme when a photo is added
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const handleSelectTheme = (themeId) => {
    if (image) {
      Alert.alert(
        'ছবি সরিয়ে থিম ব্যবহার করবেন?',
        'রঙিন ব্যাকগ্রাউন্ড থিম কেবল ছবিবিহীন ছোট লেখার জন্য প্রযোজ্য।',
        [
          { text: 'বাতিল', style: 'cancel' },
          {
            text: 'ছবি সরান ও থিম দিন',
            onPress: () => {
              setImage(null);
              setSelectedThemeId(themeId);
            },
          },
        ]
      );
      return;
    }
    if (!canUsePostTheme(content, false) && themeId) {
      Alert.alert(
        'লেখা অনেক বড়',
        `ব্যাকগ্রাউন্ড থিম সর্বোচ্চ ${MAX_THEMED_POST_LENGTH} অক্ষরের ছোট পোস্টের জন্য প্রযোজ্য।`
      );
      return;
    }
    setSelectedThemeId(themeId);
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('ত্রুটি', 'পোস্টের বিষয়বস্তু লিখুন।');
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    const themeAllowed = !image && canUsePostTheme(content, false);
    const finalTheme = themeAllowed ? selectedThemeId : '';

    try {
      setSubmitting(true);
      await articleService.createArticle(
        token,
        content.trim(),
        image ? image.uri : null,
        finalTheme
      );
      Alert.alert('সফল', 'পোস্ট প্রকাশিত হয়েছে!');
      router.back();
    } catch (error) {
      console.error('Failed to create article:', error);
      Alert.alert('ত্রুটি', error.message || 'পোস্ট প্রকাশ করতে সমস্যা হয়েছে');
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

  const themeEligible = !image && canUsePostTheme(content, false);
  const typo = getShortPostTypography(content, Boolean(image), selectedThemeId);
  const activeTheme = typo.isThemed ? typo.theme : null;
  const dir = getTextDirection(content);
  const isArabic = dir === 'rtl';

  const detectedEmbeds = useMemo(() => extractSocialEmbeds(content), [content]);
  const isMarkdownOrLink = useMemo(() => hasMarkdownOrEmbeds(content), [content]);

  const insertMarkdown = (prefix, suffix = '', sample = 'টেক্সট', isLineStart = false) => {
    // Switching out of color theme when user actively writes Markdown
    if (selectedThemeId) {
      setSelectedThemeId('');
    }
    const start = Math.min(selection.start ?? content.length, content.length);
    const end = Math.min(selection.end ?? content.length, content.length);
    const selectedText = content.slice(start, end);

    if (isLineStart) {
      const before = content.slice(0, start);
      const needsNewline = before.length > 0 && !before.endsWith('\n');
      const insertion = `${needsNewline ? '\n' : ''}${prefix}${selectedText || sample}`;
      const next = `${before}${insertion}${content.slice(end)}`;
      setContent(next);
      return;
    }

    const insertion = `${prefix}${selectedText || sample}${suffix}`;
    const next = `${content.slice(0, start)}${insertion}${content.slice(end)}`;
    setContent(next);
  };

  const MARKDOWN_TOOLS = [
    { id: 'h1', label: 'H1', action: () => insertMarkdown('# ', '', 'শিরোনাম', true) },
    { id: 'h2', label: 'H2', action: () => insertMarkdown('## ', '', 'উপ-শিরোনাম', true) },
    { id: 'bold', label: 'B', bold: true, action: () => insertMarkdown('**', '**', 'বোল্ড') },
    { id: 'italic', label: 'I', italic: true, action: () => insertMarkdown('*', '*', 'ইটালিক') },
    { id: 'quote', label: '” উদ্ধৃতি', action: () => insertMarkdown('> ', '', 'উদ্ধৃতি লিখুন', true) },
    { id: 'list', label: '• তালিকা', action: () => insertMarkdown('- ', '', 'তালিকার আইটেম', true) },
    { id: 'num', label: '১. নম্বর', action: () => insertMarkdown('1. ', '', 'প্রথম ধাপ', true) },
    { id: 'code', label: '</> কোড', action: () => insertMarkdown('`', '`', 'code') },
    { id: 'link', label: '🔗 লিংক', action: () => insertMarkdown('[', '](https://)', 'লিংকের নাম') },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>নতুন পোস্ট</Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]}>{getUserName()}</Text>
            <Text style={[styles.userSubHint, { color: colors.textMuted }]}>
              {activeTheme
                ? `থিম: ${activeTheme.label} (${content.trim().length}/${MAX_THEMED_POST_LENGTH})`
                : isMarkdownOrLink
                  ? 'মার্কডাউন ও এম্বেড সক্রিয়'
                  : typo.isShortAuto
                    ? 'ছোট স্ট্যাটাস — বড় ফন্ট স্বয়ংক্রিয়ভাবে চালু'
                    : 'সাধারণ পোস্ট'}
            </Text>
          </View>
        </View>

        {/* Write / Preview Mode Switcher */}
        <View style={[styles.modeBar, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              editorTab === 'write' && { backgroundColor: colors.card },
            ]}
            onPress={() => setEditorTab('write')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={editorTab === 'write' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: editorTab === 'write' ? colors.primary : colors.textSecondary },
              ]}
            >
              লিখুন
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              editorTab === 'preview' && { backgroundColor: colors.card },
            ]}
            onPress={() => setEditorTab('preview')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="eye-outline"
              size={15}
              color={editorTab === 'preview' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeBtnText,
                { color: editorTab === 'preview' ? colors.primary : colors.textSecondary },
              ]}
            >
              প্রিভিউ {detectedEmbeds.length > 0 ? `(${detectedEmbeds.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {editorTab === 'preview' ? (
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {content.trim() ? (
              <StyledPostContent
                article={{
                  content,
                  image_url: image?.uri || null,
                  background_theme: activeTheme ? selectedThemeId : '',
                }}
                colors={colors}
                isDark={isDark}
                mode="detail"
              />
            ) : (
              <Text style={[styles.previewEmpty, { color: colors.textMuted }]}>
                প্রিভিউ দেখতে আগে কিছু লিখুন বা YouTube / Facebook লিংক পেস্ট করুন।
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* Markdown Formatting Toolbar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.mdToolbar}
              style={{ marginBottom: 10 }}
            >
              {MARKDOWN_TOOLS.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  onPress={tool.action}
                  style={[
                    styles.mdToolChip,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.mdToolText,
                      {
                        color: colors.text,
                        fontWeight: tool.bold ? '900' : '700',
                        fontStyle: tool.italic ? 'italic' : 'normal',
                      },
                    ]}
                  >
                    {tool.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Facebook-style Themed Composer OR Auto-Sized Plain/Markdown Composer */}
            {activeTheme ? (
              <LinearGradient
                colors={activeTheme.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.themedComposerCard}
              >
                <ThemeDecorOverlay
                  pattern={activeTheme.pattern}
                  color={activeTheme.accentDecor || activeTheme.textColor}
                />
                <TextInput
                  style={[
                    styles.themedInput,
                    {
                      color: activeTheme.textColor,
                      fontSize: content.trim().length === 0 ? 24 : typo.fontSize,
                      lineHeight: content.trim().length === 0 ? 34 : typo.lineHeight,
                      fontWeight: typo.fontWeight,
                      fontFamily: isArabic ? 'Amiri-Regular' : undefined,
                      writingDirection: dir,
                    },
                  ]}
                  placeholder="আপনার মনে কী চলছে? লিখুন..."
                  placeholderTextColor={activeTheme.placeholderColor}
                  value={content}
                  onChangeText={setContent}
                  onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                  multiline
                  textAlign="center"
                  textAlignVertical="center"
                  autoFocus
                />
              </LinearGradient>
            ) : (
              <TextInput
                style={[
                  styles.contentInput,
                  {
                    color: colors.text,
                    fontSize: content.trim().length === 0 ? 18 : isMarkdownOrLink ? 16 : typo.fontSize,
                    lineHeight: content.trim().length === 0 ? 26 : isMarkdownOrLink ? 24 : typo.lineHeight,
                    fontWeight: content.trim().length === 0 || isMarkdownOrLink ? '400' : typo.fontWeight,
                    writingDirection: dir,
                    textAlign: isArabic ? 'right' : 'left',
                  },
                ]}
                placeholder="আপনার মনে কী চলছে? লিখুন...&#10;টিপস: # শিরোনাম, **বোল্ড**, > উদ্ধৃতি, অথবা YouTube/Facebook লিংক দিলে অটো এম্বেড হবে।"
                placeholderTextColor={colors.textMuted}
                value={content}
                onChangeText={setContent}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            )}

            {/* Live Detected YouTube / Facebook Embed Preview */}
            {detectedEmbeds.length > 0 && (
              <View style={styles.embedPreviewSection}>
                <View style={styles.embedPreviewHeader}>
                  <Ionicons name="videocam-outline" size={16} color={colors.primary} />
                  <Text style={[styles.embedPreviewTitle, { color: colors.textSecondary }]}>
                    শনাক্তকৃত ভিডিও / পোস্ট এম্বেড ({detectedEmbeds.length})
                  </Text>
                </View>
                {detectedEmbeds.map((emb, idx) => (
                  <SocialEmbedCard
                    key={`composer-emb-${idx}`}
                    embed={emb}
                    colors={colors}
                    isDark={isDark}
                    compact
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Notice if user had selected a theme but exceeded length */}
        {selectedThemeId && !themeEligible && !image && (
          <View style={[styles.hintBanner, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.hintBannerText, { color: colors.textSecondary }]}>
              লেখা {MAX_THEMED_POST_LENGTH} অক্ষরের বেশি হওয়ায় সাধারণ মোডে প্রদর্শিত হচ্ছে।
            </Text>
          </View>
        )}

        {/* Facebook-style Background Color & Theme Picker */}
        <View style={styles.themePickerSection}>
          <View style={styles.themeHeaderRow}>
            <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
            <Text style={[styles.themeSectionLabel, { color: colors.textSecondary }]}>
              ব্যাকগ্রাউন্ড ও থিম {image ? '(ছবি ছাড়া প্রযোজ্য)' : ''}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeSwatchList}
            keyboardShouldPersistTaps="handled"
          >
            {POST_BACKGROUND_THEMES.map((theme) => {
              const isSelected = selectedThemeId === theme.id && themeEligible;
              return (
                <TouchableOpacity
                  key={theme.id || 'none'}
                  activeOpacity={0.8}
                  onPress={() => handleSelectTheme(theme.id)}
                  style={styles.swatchItem}
                >
                  <LinearGradient
                    colors={theme.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.swatchBox,
                      {
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                        borderWidth: isSelected ? 2.5 : 1,
                        opacity: !themeEligible && !theme.isNone ? 0.45 : 1,
                      },
                    ]}
                  >
                    {theme.isNone ? (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>Aa</Text>
                    ) : theme.pattern ? (
                      <Ionicons
                        name={
                          theme.pattern === 'moon' ? 'moon' :
                          theme.pattern === 'sunny' ? 'sunny' :
                          theme.pattern === 'water' ? 'water' :
                          theme.pattern === 'star' ? 'star' :
                          theme.pattern === 'flower' ? 'rose' :
                          theme.pattern === 'leaf' ? 'leaf' :
                          theme.pattern === 'book' ? 'book' :
                          theme.pattern === 'heart' ? 'heart' : 'sparkles'
                        }
                        size={16}
                        color={theme.accentDecor || theme.textColor}
                      />
                    ) : (
                      <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textColor }}>Aa</Text>
                    )}

                    {isSelected && (
                      <View style={[styles.selectedTick, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                  <Text
                    style={[
                      styles.swatchLabel,
                      { color: isSelected ? colors.primary : colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {theme.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

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
        <TouchableOpacity
          style={[styles.addPhotoButton, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}
          onPress={pickImage}
        >
          <Ionicons name="image-outline" size={22} color={colors.primary} />
          <Text style={[styles.addPhotoText, { color: colors.primary }]}>
            {image ? 'অন্য ছবি নির্বাচন করুন' : 'ছবি যোগ করুন'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  backButton: { padding: 4 },
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
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  },
  userSubHint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  contentInput: {
    minHeight: 190,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  themedComposerCard: {
    minHeight: 240,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 28,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  themedInput: {
    width: '100%',
    minHeight: 140,
    textAlign: 'center',
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  hintBannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  themePickerSection: {
    marginBottom: 16,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  themeSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  themeSwatchList: {
    gap: 10,
    paddingVertical: 2,
  },
  swatchItem: {
    alignItems: 'center',
    width: 58,
  },
  swatchBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedTick: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 14,
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
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
