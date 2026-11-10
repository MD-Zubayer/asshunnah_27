import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import diaryService from '../services/diary-service';
import DiaryBookFlipper from '../components/DiaryBookFlipper';
import {
  exportDiaryToPdf,
  exportDiaryToWord,
  shareDiaryAsText,
} from '../utils/diaryExport';
import { DIARY_FONTS } from '../constants/diaryThemes';
import { toBanglaDigits } from '../utils/diaryDate';

export default function DiaryDetailScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token } = useAuth();

  // Fallback entry constructed from route params so it displays immediately
  const initialParamEntry = params?.id
    ? {
        id: params.id,
        title: params.title || '',
        content: params.content || '',
        tag: params.tag || 'সাধারণ',
        emoji: params.emoji || '📝',
        date_display: params.date_display || '',
        entry_date: params.entry_date || null,
        hijri_date: params.hijri_date || '',
        mood: params.mood || '',
        weather: params.weather || '',
        paper_theme: params.paper_theme || (isDark ? 'night' : 'cream'),
        font_family: params.font_family || 'handwriting',
        is_pinned: params.is_pinned === 'true' || params.is_pinned === true,
      }
    : null;

  const [entries, setEntries] = useState(initialParamEntry ? [initialParamEntry] : []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fontSize, setFontSize] = useState(17);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFontSwitchModal, setShowFontSwitchModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadBookEntries = useCallback(async () => {
    try {
      const list = await diaryService.getDiaries(token);
      if (Array.isArray(list) && list.length > 0) {
        setEntries(list);
        if (params?.id) {
          const foundIdx = list.findIndex((item) => String(item.id) === String(params.id));
          if (foundIdx >= 0) {
            setActiveIndex(foundIdx);
          }
        }
      }
    } catch (e) {
      console.log('[DiaryDetail] loadBookEntries error:', e.message);
    }
  }, [token, params?.id]);

  useFocusEffect(
    useCallback(() => {
      loadBookEntries();
    }, [loadBookEntries])
  );

  const activeEntry = entries[activeIndex] || initialParamEntry;

  const handleEdit = () => {
    if (!activeEntry) return;
    router.push({
      pathname: '/create-diary',
      params: {
        id: activeEntry.id,
        title: activeEntry.title,
        content: activeEntry.content,
        tag: activeEntry.tag,
        emoji: activeEntry.emoji,
        entry_date: activeEntry.entry_date || activeEntry.created_at || '',
        mood: activeEntry.mood || '',
        weather: activeEntry.weather || '',
        paper_theme: activeEntry.paper_theme || 'cream',
        font_family: activeEntry.font_family || 'handwriting',
        is_pinned: String(Boolean(activeEntry.is_pinned)),
        page_number: String(activeIndex + 1),
      },
    });
  };

  const handleDelete = () => {
    if (!activeEntry) return;
    Alert.alert('ডায়েরি মুছবেন?', `"${activeEntry.title}" পৃষ্ঠাটি স্থায়ীভাবে মুছে ফেলতে চান?`, [
      { text: 'বাতিল', style: 'cancel' },
      {
        text: 'মুছে ফেলুন',
        style: 'destructive',
        onPress: async () => {
          try {
            await diaryService.deleteDiary(token, activeEntry.id);
            const remaining = entries.filter((item) => String(item.id) !== String(activeEntry.id));
            if (remaining.length === 0) {
              router.back();
            } else {
              setEntries(remaining);
              setActiveIndex((prev) => Math.max(0, Math.min(prev, remaining.length - 1)));
            }
          } catch (e) {
            Alert.alert('ত্রুটি', e.message || 'মুছে ফেলা যায়নি');
          }
        },
      },
    ]);
  };

  const handleTogglePin = async (entry) => {
    if (!entry) return;
    const nextPinned = !entry.is_pinned;
    // Optimistic update
    setEntries((prev) =>
      prev.map((item) => (String(item.id) === String(entry.id) ? { ...item, is_pinned: nextPinned } : item))
    );
    try {
      await diaryService.updateDiary(token, entry.id, { is_pinned: nextPinned });
    } catch (e) {
      // Revert if failed
      setEntries((prev) =>
        prev.map((item) => (String(item.id) === String(entry.id) ? { ...item, is_pinned: !nextPinned } : item))
      );
      Alert.alert('ত্রুটি', e.message || 'বুকমার্ক আপডেট করা যায়নি');
    }
  };

  const handleChangeEntryFont = async (fontId) => {
    if (!activeEntry) return;
    setShowFontSwitchModal(false);
    setEntries((prev) =>
      prev.map((item) => (String(item.id) === String(activeEntry.id) ? { ...item, font_family: fontId } : item))
    );
    try {
      await diaryService.updateDiary(token, activeEntry.id, { font_family: fontId });
    } catch (e) {
      console.log('Font update failed:', e.message);
    }
  };

  const handleToggleChecklistLine = async (entry, lineIdx) => {
    const lines = String(entry.content || '').split('\n');
    const line = lines[lineIdx];
    if (!line) return;

    if (line.trim().startsWith('☐ ')) {
      lines[lineIdx] = line.replace('☐ ', '☑ ');
    } else if (line.trim().startsWith('☑ ')) {
      lines[lineIdx] = line.replace('☑ ', '☐ ');
    } else if (line.trim().startsWith('[ ] ')) {
      lines[lineIdx] = line.replace('[ ] ', '[x] ');
    } else if (line.trim().startsWith('[x] ')) {
      lines[lineIdx] = line.replace('[x] ', '[ ] ');
    } else {
      return;
    }

    const updatedContent = lines.join('\n');
    setEntries((prev) =>
      prev.map((item) => (String(item.id) === String(entry.id) ? { ...item, content: updatedContent } : item))
    );
    try {
      await diaryService.updateDiary(token, entry.id, { content: updatedContent });
    } catch (e) {
      console.log('Checklist sync failed:', e.message);
    }
  };

  const runExport = async (fn) => {
    try {
      setExporting(true);
      await fn();
      setShowExportModal(false);
    } catch (e) {
      Alert.alert('এক্সপোর্ট ত্রুটি', e.message || 'ফাইল তৈরি করতে সমস্যা হয়েছে');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Action Bar */}
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.iconBtn, { backgroundColor: colors.inputBg }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            📔 আমার ডায়েরি
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            পৃষ্ঠা {toBanglaDigits(activeIndex + 1)} / {toBanglaDigits(entries.length)} • সোয়াইপ করে উল্টান
          </Text>
        </View>

        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={() => setShowFontSwitchModal(true)}
            style={[styles.iconBtn, { backgroundColor: colors.inputBg }]}
          >
            <Ionicons name="text" size={18} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowExportModal(true)}
            style={[styles.iconBtn, { backgroundColor: `${colors.primary}15` }]}
          >
            <Ionicons name="share-outline" size={18} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.iconBtn, { backgroundColor: '#10B98115' }]}
          >
            <Ionicons name="create-outline" size={18} color="#10B981" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.iconBtn, { backgroundColor: '#EF444415' }]}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Physical Book Page Flipper */}
      {entries.length > 0 ? (
        <DiaryBookFlipper
          entries={entries}
          initialIndex={activeIndex}
          fontSize={fontSize}
          onIndexChange={setActiveIndex}
          onTogglePin={handleTogglePin}
          onToggleChecklistLine={handleToggleChecklistLine}
          colors={colors}
        />
      ) : (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>কোনো ডায়েরি পৃষ্ঠা পাওয়া যায়নি</Text>
        </View>
      )}

      {/* Export / Download / Share Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>ডাউনলোড ও শেয়ার করুন</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {exporting ? (
              <View style={styles.exportLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.exportLoadingText, { color: colors.textSecondary }]}>
                  ফাইল প্রস্তুত হচ্ছে...
                </Text>
              </View>
            ) : (
              <View style={styles.exportOptionsList}>
                {/* PDF Single Page */}
                <TouchableOpacity
                  onPress={() =>
                    runExport(() =>
                      exportDiaryToPdf([activeEntry], {
                        mode: 'download',
                        fileNameBase: activeEntry?.title || 'Diary_Page',
                      })
                    )
                  }
                  style={[styles.exportBtn, { backgroundColor: '#EF444412', borderColor: '#EF444435' }]}
                >
                  <Ionicons name="document-attach" size={22} color="#EF4444" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportBtnTitle, { color: colors.text }]}>এই পৃষ্ঠা PDF ডাউনলোড</Text>
                    <Text style={[styles.exportBtnSub, { color: colors.textSecondary }]}>
                      হুবহু ফিজিক্যাল ডায়েরির ডিজাইনে PDF সেভ করুন
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#EF4444" />
                </TouchableOpacity>

                {/* PDF Full Book */}
                {entries.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      runExport(() =>
                        exportDiaryToPdf(entries, {
                          mode: 'download',
                          fileNameBase: 'Assunnah_Full_Diary',
                        })
                      )
                    }
                    style={[styles.exportBtn, { backgroundColor: '#DC262612', borderColor: '#DC262635' }]}
                  >
                    <Ionicons name="book" size={22} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exportBtnTitle, { color: colors.text }]}>
                        সম্পূর্ণ ডায়েরি বই (PDF — {toBanglaDigits(entries.length)} পৃষ্ঠা)
                      </Text>
                      <Text style={[styles.exportBtnSub, { color: colors.textSecondary }]}>
                        সবগুলো লেখা একসাথে একটি বই আকারে ডাউনলোড
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                )}

                {/* Word Single Page */}
                <TouchableOpacity
                  onPress={() =>
                    runExport(() =>
                      exportDiaryToWord([activeEntry], {
                        mode: 'download',
                        fileNameBase: activeEntry?.title || 'Diary_Page',
                      })
                    )
                  }
                  style={[styles.exportBtn, { backgroundColor: '#2563EB12', borderColor: '#2563EB35' }]}
                >
                  <Ionicons name="document-text" size={22} color="#2563EB" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportBtnTitle, { color: colors.text }]}>Word ফাইল (.doc) ডাউনলোড</Text>
                    <Text style={[styles.exportBtnSub, { color: colors.textSecondary }]}>
                      MS Word / Google Docs-এ এডিটযোগ্য ডকুমেন্ট
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#2563EB" />
                </TouchableOpacity>

                {/* Word Full Book */}
                {entries.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      runExport(() =>
                        exportDiaryToWord(entries, {
                          mode: 'download',
                          fileNameBase: 'Assunnah_Full_Diary',
                        })
                      )
                    }
                    style={[styles.exportBtn, { backgroundColor: '#1D4ED812', borderColor: '#1D4ED835' }]}
                  >
                    <Ionicons name="documents" size={22} color="#1D4ED8" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.exportBtnTitle, { color: colors.text }]}>
                        সব লেখা Word (.doc) ফাইল ডাউনলোড
                      </Text>
                      <Text style={[styles.exportBtnSub, { color: colors.textSecondary }]}>
                        সব পৃষ্ঠা একসাথে Word ডকুমেন্ট হিসেবে সেভ
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={18} color="#1D4ED8" />
                  </TouchableOpacity>
                )}

                {/* Share PDF / Text Row */}
                <View style={styles.shareRow}>
                  <TouchableOpacity
                    onPress={() =>
                      runExport(() =>
                        exportDiaryToPdf([activeEntry], {
                          mode: 'share',
                          fileNameBase: activeEntry?.title || 'Diary_Page',
                        })
                      )
                    }
                    style={[styles.shareMiniBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  >
                    <Ionicons name="share-social" size={17} color="#EF4444" />
                    <Text style={[styles.shareMiniText, { color: colors.text }]}>PDF শেয়ার</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      runExport(() =>
                        exportDiaryToWord([activeEntry], {
                          mode: 'share',
                          fileNameBase: activeEntry?.title || 'Diary_Page',
                        })
                      )
                    }
                    style={[styles.shareMiniBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  >
                    <Ionicons name="share-social" size={17} color="#2563EB" />
                    <Text style={[styles.shareMiniText, { color: colors.text }]}>Word শেয়ার</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => runExport(() => shareDiaryAsText(activeEntry))}
                    style={[styles.shareMiniBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
                  >
                    <Ionicons name="chatbubble-ellipses" size={17} color="#10B981" />
                    <Text style={[styles.shareMiniText, { color: colors.text }]}>টেক্সট শেয়ার</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Reader Font & Size Quick Switch Modal */}
      <Modal
        visible={showFontSwitchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFontSwitchModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>পড়ার ফন্ট ও সাইজ</Text>
              <TouchableOpacity onPress={() => setShowFontSwitchModal(false)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.fontSizeRow}>
              <Text style={[styles.fontSizeLabel, { color: colors.textSecondary }]}>লেখার আকার:</Text>
              <View style={styles.fontSizeBtns}>
                <TouchableOpacity
                  onPress={() => setFontSize((s) => Math.max(13, s - 1))}
                  style={[styles.sizeControlBtn, { backgroundColor: colors.inputBg }]}
                >
                  <Text style={[styles.sizeControlText, { color: colors.text }]}>A-</Text>
                </TouchableOpacity>
                <Text style={[styles.sizeValueText, { color: colors.text }]}>{toBanglaDigits(fontSize)}</Text>
                <TouchableOpacity
                  onPress={() => setFontSize((s) => Math.min(24, s + 1))}
                  style={[styles.sizeControlBtn, { backgroundColor: colors.inputBg }]}
                >
                  <Text style={[styles.sizeControlText, { color: colors.text }]}>A+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {DIARY_FONTS.map((f) => {
              const active = (activeEntry?.font_family || 'handwriting') === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => handleChangeEntryFont(f.id)}
                  style={[
                    styles.fontPickRow,
                    {
                      backgroundColor: active ? `${colors.primary}12` : colors.inputBg,
                      borderColor: active ? colors.primary : colors.cardBorder,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fontPickLabel, { color: colors.text, fontFamily: f.fontFamily }]}>
                      {f.label} — হযরতুল মুহাদ্দিসীন ও ডায়েরি
                    </Text>
                    <Text style={[styles.fontPickSub, { color: colors.textSecondary }]}>{f.sublabel}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18,
    paddingBottom: 30,
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
  exportLoading: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
  },
  exportLoadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  exportOptionsList: {
    gap: 10,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  exportBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  exportBtnSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  shareMiniBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  shareMiniText: {
    fontSize: 12,
    fontWeight: '800',
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fontSizeLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  fontSizeBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sizeControlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  sizeControlText: {
    fontSize: 13,
    fontWeight: '900',
  },
  sizeValueText: {
    fontSize: 14,
    fontWeight: '800',
  },
  fontPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  fontPickLabel: {
    fontSize: 15,
  },
  fontPickSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
