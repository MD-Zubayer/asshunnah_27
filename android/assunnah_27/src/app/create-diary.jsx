import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../constants/theme';
import diaryService from '../services/diary-service';
import { useAuth } from '../context/AuthContext';
import PhysicalDiaryPage from '../components/PhysicalDiaryPage';
import {
  DIARY_FONTS,
  PAPER_THEMES,
  TAG_OPTIONS,
  MOOD_OPTIONS,
  WEATHER_OPTIONS,
} from '../constants/diaryThemes';
import { getHijriDate, toISODateString, toBanglaDigits } from '../utils/diaryDate';

export default function CreateDiaryScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token } = useAuth();

  const isEditMode = Boolean(params?.id);

  const [title, setTitle] = useState(params?.title ? String(params.title) : '');
  const [content, setContent] = useState(params?.content ? String(params.content) : '');
  const [selectedTag, setSelectedTag] = useState(() => {
    if (params?.tag) {
      return TAG_OPTIONS.find((t) => t.label === params.tag) || TAG_OPTIONS[0];
    }
    return TAG_OPTIONS[0];
  });
  const [entryDate, setEntryDate] = useState(() => {
    if (params?.entry_date) {
      const parsed = new Date(String(params.entry_date));
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });
  const [mood, setMood] = useState(params?.mood ? String(params.mood) : '');
  const [weather, setWeather] = useState(params?.weather ? String(params.weather) : '');
  const [paperTheme, setPaperTheme] = useState(
    params?.paper_theme ? String(params.paper_theme) : isDark ? 'night' : 'cream'
  );
  const [fontFamily, setFontFamily] = useState(
    params?.font_family ? String(params.font_family) : 'handwriting'
  );
  const [isPinned, setIsPinned] = useState(
    params?.is_pinned === 'true' || params?.is_pinned === true
  );
  const [fontSize, setFontSize] = useState(17);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [showFontModal, setShowFontModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const contentInputRef = useRef(null);

  // Load saved user preferences & draft when creating a new entry
  useEffect(() => {
    if (isEditMode) return;
    let mounted = true;
    (async () => {
      const [prefs, draft] = await Promise.all([
        diaryService.loadDiaryPrefs(),
        diaryService.loadDraft(),
      ]);
      if (!mounted) return;
      if (prefs?.fontFamily) setFontFamily(prefs.fontFamily);
      if (prefs?.paperTheme) setPaperTheme(prefs.paperTheme);

      if (draft && (draft.title || draft.content)) {
        setTitle(draft.title || '');
        setContent(draft.content || '');
        if (draft.tag) {
          const found = TAG_OPTIONS.find((t) => t.label === draft.tag);
          if (found) setSelectedTag(found);
        }
        if (draft.mood) setMood(draft.mood);
        if (draft.weather) setWeather(draft.weather);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isEditMode]);

  // Auto-save draft while typing in create mode
  useEffect(() => {
    if (isEditMode) return;
    const timer = setTimeout(() => {
      if (title.trim() || content.trim()) {
        diaryService.saveDraft({
          title,
          content,
          tag: selectedTag.label,
          mood,
          weather,
        });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [title, content, selectedTag, mood, weather, isEditMode]);

  const insertSnippet = (snippet) => {
    const pos = selection?.start ?? content.length;
    const before = content.slice(0, pos);
    const after = content.slice(pos);
    const needsNewline = before.length > 0 && !before.endsWith('\n');
    const inserted = (needsNewline ? '\n' : '') + snippet;
    setContent(before + inserted + after);
    contentInputRef.current?.focus();
  };

  const handleSelectFont = (fontId) => {
    setFontFamily(fontId);
    diaryService.saveDiaryPrefs({ fontFamily: fontId });
  };

  const handleSelectPaperTheme = (themeId) => {
    setPaperTheme(themeId);
    diaryService.saveDiaryPrefs({ paperTheme: themeId });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('ত্রুটি', 'ডায়েরির শিরোনাম লিখুন।');
      return;
    }
    if (!content.trim()) {
      Alert.alert('ত্রুটি', 'ডায়েরির বিষয়বস্তু লিখুন।');
      return;
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      tag: selectedTag.label,
      emoji: selectedTag.emoji,
      entry_date: toISODateString(entryDate),
      hijri_date: getHijriDate(entryDate),
      mood,
      weather,
      paper_theme: paperTheme,
      font_family: fontFamily,
      is_pinned: isPinned,
    };

    try {
      setSubmitting(true);
      if (isEditMode) {
        await diaryService.updateDiary(token, params.id, payload);
        Alert.alert('সফল', 'ডায়েরির পৃষ্ঠা আপডেট হয়েছে!');
      } else {
        await diaryService.addDiary(token, payload);
        await diaryService.clearDraft();
        Alert.alert('সফল', 'নতুন ডায়েরি পৃষ্ঠা সংরক্ষিত হয়েছে!');
      }
      router.back();
    } catch (error) {
      console.error('Failed to save diary:', error);
      Alert.alert('ত্রুটি', error.message || 'ডায়েরি সংরক্ষণ করতে সমস্যা হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearDraft = () => {
    Alert.alert('খসড়া মুছবেন?', 'বর্তমান লেখাটি মুছে নতুন করে শুরু করতে চান?', [
      { text: 'না', style: 'cancel' },
      {
        text: 'হ্যাঁ, মুছুন',
        style: 'destructive',
        onPress: async () => {
          setTitle('');
          setContent('');
          await diaryService.clearDraft();
        },
      },
    ]);
  };

  const canSave = title.trim() && content.trim() && !submitting;
  const activeFontObj = DIARY_FONTS.find((f) => f.id === fontFamily) || DIARY_FONTS[0];

  const draftEntry = {
    title,
    content,
    tag: selectedTag.label,
    emoji: selectedTag.emoji,
    entry_date: toISODateString(entryDate),
    hijri_date: getHijriDate(entryDate),
    mood,
    weather,
    paper_theme: paperTheme,
    font_family: fontFamily,
    is_pinned: isPinned,
    page_number: params?.page_number ? Number(params.page_number) : undefined,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.card,
            borderBottomColor: colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.inputBg }]}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>
            {isEditMode ? 'পৃষ্ঠা সম্পাদনা' : 'নতুন ডায়েরি পৃষ্ঠা'}
          </Text>
          <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>
            ফন্ট: {activeFontObj.label} • {PAPER_THEMES[paperTheme]?.label || 'ক্রিম কাগজ'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: canSave ? 1 : 0.45 }]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>সংরক্ষণ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Paper & Font Toolbar */}
      <View style={[styles.toolbarStrip, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
          {/* Font Selector Button */}
          <TouchableOpacity
            onPress={() => setShowFontModal(true)}
            style={[styles.toolChip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}35` }]}
          >
            <Ionicons name="text" size={14} color={colors.primary} />
            <Text style={[styles.toolChipText, { color: colors.primary }]}>{activeFontObj.label}</Text>
          </TouchableOpacity>

          {/* Tag / Mood / Weather */}
          <TouchableOpacity
            onPress={() => setShowMetaModal(true)}
            style={[styles.toolChip, { backgroundColor: `${selectedTag.color}15`, borderColor: `${selectedTag.color}35` }]}
          >
            <Text style={{ fontSize: 13 }}>{selectedTag.emoji}</Text>
            <Text style={[styles.toolChipText, { color: selectedTag.color }]}>
              {selectedTag.label} / মুড
            </Text>
          </TouchableOpacity>

          {/* Date Picker Trigger */}
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[styles.toolChip, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.text} />
            <Text style={[styles.toolChipText, { color: colors.text }]}>তারিখ</Text>
          </TouchableOpacity>

          {/* Formatting Snippets */}
          <TouchableOpacity
            onPress={() => insertSnippet('**শিরোনাম**')}
            style={[styles.toolIconBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.boldBtnText, { color: colors.text }]}>B</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => insertSnippet('• ')}
            style={[styles.toolIconBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="list" size={16} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => insertSnippet('☐ ')}
            style={[styles.toolIconBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          >
            <Ionicons name="checkbox-outline" size={16} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFontSize((s) => Math.max(14, s - 1))}
            style={[styles.toolIconBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.sizeBtnText, { color: colors.text }]}>A-</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFontSize((s) => Math.min(22, s + 1))}
            style={[styles.toolIconBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
          >
            <Text style={[styles.sizeBtnText, { color: colors.text }]}>A+</Text>
          </TouchableOpacity>

          {!isEditMode && (title.length > 0 || content.length > 0) && (
            <TouchableOpacity
              onPress={handleClearDraft}
              style={[styles.toolIconBtn, { backgroundColor: '#EF444415', borderColor: '#EF444440' }]}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Main Physical Paper Canvas */}
      <ScrollView
        style={styles.editorScroll}
        contentContainerStyle={[
          styles.editorScrollContent,
          { paddingBottom: Math.max(40, insets.bottom + 30) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PhysicalDiaryPage
          entry={draftEntry}
          pageNumber={params?.page_number ? Number(params.page_number) : 1}
          mode="edit"
          fontSize={fontSize}
          onChangeTitle={setTitle}
          onChangeContent={setContent}
          onTogglePin={() => setIsPinned((p) => !p)}
          onPressDate={() => setShowDatePicker(true)}
          contentInputRef={contentInputRef}
          onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
          scrollEnabled={false}
        />

        {/* Word & Line count hint */}
        <Text style={[styles.wordCountHint, { color: colors.textMuted }]}>
          শব্দ সংখ্যা: {toBanglaDigits(content.trim() ? content.trim().split(/\s+/).length : 0)} • অক্ষর: {toBanglaDigits(content.length)}
        </Text>
      </ScrollView>

      {/* DateTimePicker */}
      {showDatePicker && (
        <DateTimePicker
          value={entryDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setEntryDate(selectedDate);
          }}
        />
      )}

      {/* Font & Paper Theme Picker Modal */}
      <Modal
        visible={showFontModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFontModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>হাতের লেখা ও কাগজের ধরন</Text>
              <TouchableOpacity onPress={() => setShowFontModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>কাগজের থিম</Text>
            <View style={styles.themeRow}>
              {Object.values(PAPER_THEMES).map((t) => {
                const active = paperTheme === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => handleSelectPaperTheme(t.id)}
                    style={[
                      styles.themeChip,
                      {
                        borderColor: active ? colors.primary : colors.cardBorder,
                        backgroundColor: active ? `${colors.primary}12` : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.swatchCircle, { backgroundColor: t.previewSwatch, borderColor: t.borderColor }]} />
                    <Text style={[styles.themeChipLabel, { color: colors.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalSectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              ফন্ট নির্বাচন (ডিফল্ট: হাতের লেখা)
            </Text>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              {DIARY_FONTS.map((f) => {
                const active = fontFamily === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => handleSelectFont(f.id)}
                    style={[
                      styles.fontOptionCard,
                      {
                        backgroundColor: active ? `${colors.primary}12` : colors.inputBg,
                        borderColor: active ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fontOptionName, { color: colors.text, fontFamily: f.fontFamily }]}>
                        {f.label} — আজকের দিনটি ছিল সুন্দর
                      </Text>
                      <Text style={[styles.fontOptionSub, { color: colors.textSecondary }]}>{f.sublabel}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category, Mood & Weather Modal */}
      <Modal
        visible={showMetaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMetaModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>ক্যাটাগরি, অনুভূতি ও আবহাওয়া</Text>
              <TouchableOpacity onPress={() => setShowMetaModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>ক্যাটাগরি</Text>
              <View style={styles.wrapRow}>
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedTag.label === tag.label;
                  return (
                    <TouchableOpacity
                      key={tag.label}
                      onPress={() => setSelectedTag(tag)}
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: active ? `${tag.color}20` : colors.inputBg,
                          borderColor: active ? tag.color : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text>{tag.emoji}</Text>
                      <Text style={[styles.metaChipText, { color: active ? tag.color : colors.text }]}>{tag.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalSectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>আজকের অনুভূতি</Text>
              <View style={styles.wrapRow}>
                {MOOD_OPTIONS.map((m) => {
                  const active = mood === `${m.emoji} ${m.label}`;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setMood(active ? '' : `${m.emoji} ${m.label}`)}
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: active ? `${colors.primary}20` : colors.inputBg,
                          borderColor: active ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text>{m.emoji}</Text>
                      <Text style={[styles.metaChipText, { color: colors.text }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalSectionLabel, { color: colors.textSecondary, marginTop: 14 }]}>আবহাওয়া</Text>
              <View style={styles.wrapRow}>
                {WEATHER_OPTIONS.map((w) => {
                  const active = weather === `${w.emoji} ${w.label}`;
                  return (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setWeather(active ? '' : `${w.emoji} ${w.label}`)}
                      style={[
                        styles.metaChip,
                        {
                          backgroundColor: active ? `${colors.primary}20` : colors.inputBg,
                          borderColor: active ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text>{w.emoji}</Text>
                      <Text style={[styles.metaChipText, { color: colors.text }]}>{w.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1 },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  topBarSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  toolbarStrip: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  toolbarScroll: {
    paddingHorizontal: 14,
    gap: 8,
    alignItems: 'center',
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  toolIconBtn: {
    width: 32,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boldBtnText: {
    fontSize: 14,
    fontWeight: '900',
  },
  sizeBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  editorScroll: { flex: 1 },
  editorScrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  wordCountHint: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  swatchCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  themeChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  fontOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  fontOptionName: {
    fontSize: 16,
  },
  fontOptionSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
