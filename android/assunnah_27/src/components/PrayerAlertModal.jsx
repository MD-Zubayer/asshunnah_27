import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import {
  DEFAULT_PRAYER_ALERT_CONFIG,
  formatTime,
  toBanglaDigits,
  getScheduledPrayerAlertsSummary,
  sendTestPrayerAlert,
} from '../services/prayer-service';

const FARD_PRAYERS = [
  { key: 'fajr', label: 'ফজর', icon: 'moon-outline', color: '#4F46E5' },
  { key: 'dhuhr', label: 'যোহর', icon: 'sunny', color: '#EA580C' },
  { key: 'asr', label: 'আসর', icon: 'partly-sunny', color: '#CA8A04' },
  { key: 'maghrib', label: 'মাগরিব', icon: 'partly-sunny-outline', color: '#EF4444' },
  { key: 'isha', label: 'এশা', icon: 'moon', color: '#1D4ED8' },
];

const PRE_REMINDER_OPTIONS = [
  { value: 0, label: 'বন্ধ' },
  { value: 5, label: '৫ মি আগে' },
  { value: 10, label: '১০ মি আগে' },
  { value: 15, label: '১৫ মি আগে' },
  { value: 30, label: '৩০ মি আগে' },
];

const TAHAJJUD_OFFSET_OPTIONS = [
  { value: 20, label: '২০ মি আগে' },
  { value: 30, label: '৩০ মি আগে' },
  { value: 45, label: '৪৫ মি আগে' },
];

const SOUND_MODES = [
  { key: 'sound', label: 'শব্দসহ', icon: 'volume-high-outline' },
  { key: 'vibrate', label: 'ভাইব্রেশন', icon: 'phone-portrait-outline' },
  { key: 'silent', label: 'নীরব', icon: 'notifications-off-outline' },
];

const DAYS_OPTIONS = [
  { value: 3, label: '৩ দিন' },
  { value: 5, label: '৫ দিন' },
  { value: 7, label: '৭ দিন' },
];

const mergeAlertConfig = (cfg) => ({
  ...DEFAULT_PRAYER_ALERT_CONFIG,
  ...(cfg || {}),
  prayers: {
    ...DEFAULT_PRAYER_ALERT_CONFIG.prayers,
    ...(cfg?.prayers || {}),
  },
  extras: {
    ...DEFAULT_PRAYER_ALERT_CONFIG.extras,
    ...(cfg?.extras || {}),
  },
});

export default function PrayerAlertModal({
  visible,
  onClose,
  config,
  prayerItems = [],
  onSaveAndSchedule,
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState(() => mergeAlertConfig(config));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [summary, setSummary] = useState({ count: 0, nextTriggerDate: null, nextTitle: '' });

  const refreshSummary = useCallback(async () => {
    const info = await getScheduledPrayerAlertsSummary();
    setSummary(info);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    getScheduledPrayerAlertsSummary().then((info) => {
      if (active) setSummary(info);
    });
    return () => {
      active = false;
    };
  }, [visible]);

  const getPrayerTimeLabel = (key) => {
    const found = prayerItems.find((item) => item.key === key);
    return found?.time ? formatTime(found.time, 'bn') : '';
  };

  const togglePrayer = (key) => {
    setDraft((prev) => ({
      ...prev,
      prayers: {
        ...prev.prayers,
        [key]: !prev.prayers[key],
      },
    }));
  };

  const toggleExtra = (key) => {
    setDraft((prev) => ({
      ...prev,
      extras: {
        ...prev.extras,
        [key]: !prev.extras[key],
      },
    }));
  };

  const handleTestAlert = async () => {
    setTesting(true);
    try {
      const res = await sendTestPrayerAlert(draft.soundMode);
      if (res.success) {
        Alert.alert(
          'টেস্ট পাঠানো হয়েছে',
          'আগামী ২ সেকেন্ডের মধ্যে আপনার ডিভাইসে একটি টেস্ট নোটিফিকেশন আসবে।'
        );
      } else if (res.reason === 'permission_denied') {
        Alert.alert(
          'নোটিফিকেশন অনুমতি প্রয়োজন',
          'অ্যালার্ট পেতে ফোনের Settings থেকে এই অ্যাপের Notification পারমিশন চালু করুন।',
          [
            { text: 'বাতিল', style: 'cancel' },
            { text: 'সেটিংস খুলুন', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert(
          'সাপোর্ট পাওয়া যায়নি',
          'Expo Go পরিবেশে বা এই ডিভাইসে লোকাল নোটিফিকেশন চালু করা যায়নি। ডেভেলপমেন্ট/রিলিজ বিল্ড ব্যবহার করুন।'
        );
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSaveAndSchedule(draft);
      await refreshSummary();

      if (!result) return;

      if (!draft.enabled) {
        Alert.alert('অ্যালার্ট বন্ধ', 'সকল নামাজের অ্যালার্ট বন্ধ করা হয়েছে।');
        onClose();
        return;
      }

      if (!result.success) {
        if (result.reason === 'permission_denied') {
          Alert.alert(
            'নোটিফিকেশন অনুমতি প্রয়োজন',
            'নামাজের অ্যালার্ট কাজ করার জন্য আপনার ফোনের Notification পারমিশন দেওয়া প্রয়োজন।',
            [
              { text: 'বাতিল', style: 'cancel' },
              { text: 'সেটিংস খুলুন', onPress: () => Linking.openSettings() },
            ]
          );
        } else if (result.reason === 'unsupported') {
          Alert.alert(
            'অ্যালার্ট সেট করা যায়নি',
            'এই পরিবেশে লোকাল নোটিফিকেশন সাপোর্ট পাওয়া যায়নি। অ্যাপের রিলিজ/নেটিভ APK ব্যবহার করুন।'
          );
        } else {
          Alert.alert(
            'ত্রুটি',
            `অ্যালার্ট সেট করতে সমস্যা হয়েছে: ${result.errorMessage || 'আবার চেষ্টা করুন'}`
          );
        }
        return;
      }

      if (result.scheduledCount === 0) {
        Alert.alert(
          'কোনো ওয়াক্ত নির্বাচিত নয়',
          'অনুগ্রহ করে অন্তত একটি ওয়াক্ত বা অতিরিক্ত অ্যালার্ট চালু করুন।'
        );
        return;
      }

      const nextTimeStr = result.nextAlertTime
        ? `\nপরবর্তী অ্যালার্ট: ${formatTime(result.nextAlertTime, 'bn')}`
        : '';

      Alert.alert(
        'সফলভাবে সেট হয়েছে',
        `আগামী ${toBanglaDigits(result.daysScheduled)} দিনের জন্য মোট ${toBanglaDigits(result.scheduledCount)}টি অ্যালার্ট সেট করা হয়েছে।${nextTimeStr}`
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={() => {
        setDraft(mergeAlertConfig(config));
        refreshSummary();
      }}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 14),
              backgroundColor: colors.card,
              borderBottomColor: colors.cardBorder,
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.amberCardBg }]}>
              <Ionicons name="notifications" size={20} color="#D97706" />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>নামাজের অ্যালার্ট সেটিংস</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                ওয়াক্ত, রিমাইন্ডার ও শব্দের ধরন নির্ধারণ করুন
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Live Status Banner */}
          <View
            style={[
              styles.statusCard,
              {
                backgroundColor: summary.count > 0 ? colors.emeraldCardBg : colors.amberCardBg,
                borderColor: summary.count > 0 ? colors.emeraldCardBorder : colors.amberCardBorder,
              },
            ]}
          >
            <View style={styles.statusRow}>
              <Ionicons
                name={summary.count > 0 ? 'checkmark-circle' : 'notifications-off-outline'}
                size={22}
                color={summary.count > 0 ? '#059669' : '#D97706'}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                  {summary.count > 0
                    ? `সক্রিয়: ${toBanglaDigits(summary.count)}টি অ্যালার্ট শিডিউল করা আছে`
                    : 'কোনো অ্যালার্ট শিডিউল করা নেই'}
                </Text>
                {summary.nextTriggerDate && (
                  <Text style={[styles.statusSub, { color: colors.textSecondary }]}>
                    পরবর্তী: {summary.nextTitle} ({formatTime(summary.nextTriggerDate, 'bn')})
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleTestAlert}
              disabled={testing}
              style={[styles.testBtn, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}
            >
              {testing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="flash-outline" size={16} color={colors.primary} />
              )}
              <Text style={[styles.testBtnText, { color: colors.primary }]}>টেস্ট অ্যালার্ট পাঠান</Text>
            </TouchableOpacity>
          </View>

          {/* Master Switch */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>নামাজের অ্যালার্ট চালু রাখুন</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  নির্বাচিত ওয়াক্ত অনুযায়ী স্বয়ংক্রিয় রিমাইন্ডার নোটিফিকেশন পাবেন
                </Text>
              </View>
              <Switch
                value={draft.enabled}
                onValueChange={(val) => setDraft((prev) => ({ ...prev, enabled: val }))}
                trackColor={{ false: colors.inputBorder, true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Options visible/editable regardless, dimmed when master is off */}
          <View style={{ opacity: draft.enabled ? 1 : 0.55 }} pointerEvents={draft.enabled ? 'auto' : 'none'}>
            {/* Sound Mode */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>অ্যালার্টের ধরন</Text>
              <View style={styles.chipRow}>
                {SOUND_MODES.map((mode) => {
                  const active = draft.soundMode === mode.key;
                  return (
                    <TouchableOpacity
                      key={mode.key}
                      onPress={() => setDraft((prev) => ({ ...prev, soundMode: mode.key }))}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor: active ? colors.primary : colors.inputBg,
                          borderColor: active ? colors.primary : colors.inputBorder,
                        },
                      ]}
                    >
                      <Ionicons name={mode.icon} size={16} color={active ? '#fff' : colors.text} />
                      <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pre-Adhan Reminder */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                ওয়াক্তের আগে প্রস্তুতি রিমাইন্ডার
              </Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                মূল ওয়াক্ত শুরু হওয়ার কত মিনিট আগে মনে করিয়ে দেবে
              </Text>
              <View style={styles.chipWrap}>
                {PRE_REMINDER_OPTIONS.map((opt) => {
                  const active = draft.preReminderMinutes === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setDraft((prev) => ({ ...prev, preReminderMinutes: opt.value }))}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: active ? '#D97706' : colors.inputBg,
                          borderColor: active ? '#D97706' : colors.inputBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Fard Prayers List */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>ফরজ ওয়াক্তসমূহ</Text>
              {FARD_PRAYERS.map((p, idx) => {
                const enabled = Boolean(draft.prayers?.[p.key]);
                const timeStr = getPrayerTimeLabel(p.key);
                return (
                  <View
                    key={p.key}
                    style={[
                      styles.prayerToggleRow,
                      idx < FARD_PRAYERS.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.prayerLeft}>
                      <View style={[styles.prayerIconBox, { backgroundColor: p.color + '18' }]}>
                        <Ionicons name={p.icon} size={18} color={p.color} />
                      </View>
                      <View>
                        <Text style={[styles.prayerName, { color: colors.text }]}>{p.label}</Text>
                        {!!timeStr && (
                          <Text style={[styles.prayerTime, { color: colors.textSecondary }]}>
                            আজ: {timeStr}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Switch
                      value={enabled}
                      onValueChange={() => togglePrayer(p.key)}
                      trackColor={{ false: colors.inputBorder, true: '#10B981' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })}
            </View>

            {/* Extra Islamic Alerts */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>অতিরিক্ত ইসলামিক ও নফল অ্যালার্ট</Text>

              {/* Tahajjud / Sahri */}
              <View style={[styles.extraBlock, { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 }]}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.extraTitle, { color: colors.text }]}>🌙 তাহাজ্জুদ ও সেহরির শেষ সময়</Text>
                    <Text style={[styles.extraDesc, { color: colors.textSecondary }]}>
                      ফজর শুরু হওয়ার আগে শেষ রাতের রিমাইন্ডার
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(draft.extras?.tahajjud)}
                    onValueChange={() => toggleExtra('tahajjud')}
                    trackColor={{ false: colors.inputBorder, true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {draft.extras?.tahajjud && (
                  <View style={[styles.chipWrap, { marginTop: 10 }]}>
                    {TAHAJJUD_OFFSET_OPTIONS.map((opt) => {
                      const active = (draft.extras?.tahajjudMinutesBefore || 30) === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() =>
                            setDraft((prev) => ({
                              ...prev,
                              extras: { ...prev.extras, tahajjudMinutesBefore: opt.value },
                            }))
                          }
                          style={[
                            styles.optionChip,
                            {
                              backgroundColor: active ? '#4F46E5' : colors.inputBg,
                              borderColor: active ? '#4F46E5' : colors.inputBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                            ফজরের {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Ishraq */}
              <View style={[styles.extraBlock, { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 }]}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.extraTitle, { color: colors.text }]}>☀️ ইশরাক ও চাশতের ওয়াক্ত</Text>
                    <Text style={[styles.extraDesc, { color: colors.textSecondary }]}>
                      সূর্যোদয়ের ১৫ মিনিট পর ইশরাক শুরুর অ্যালার্ট
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(draft.extras?.ishraq)}
                    onValueChange={() => toggleExtra('ishraq')}
                    trackColor={{ false: colors.inputBorder, true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Jummah */}
              <View style={[styles.extraBlock, { borderBottomColor: colors.cardBorder, borderBottomWidth: 1 }]}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.extraTitle, { color: colors.text }]}>🕌 জুমুআর প্রস্তুতি (শুক্রবার)</Text>
                    <Text style={[styles.extraDesc, { color: colors.textSecondary }]}>
                      প্রতি শুক্রবার যোহরের ৩০ মিনিট আগে বিশেষ রিমাইন্ডার
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(draft.extras?.jummah)}
                    onValueChange={() => toggleExtra('jummah')}
                    trackColor={{ false: colors.inputBorder, true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Makruh Warning */}
              <View style={styles.extraBlock}>
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.extraTitle, { color: colors.text }]}>⚠️ মাকরূহ ও নিষিদ্ধ সময় সতর্কতা</Text>
                    <Text style={[styles.extraDesc, { color: colors.textSecondary }]}>
                      সূর্যোদয়, যাওয়াল ও সূর্যাস্তের মাকরূহ সময়ের আগে সতর্কতা
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(draft.extras?.makruhWarning)}
                    onValueChange={() => toggleExtra('makruhWarning')}
                    trackColor={{ false: colors.inputBorder, true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* Schedule Days Ahead */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>অটো-শিডিউল সময়সীমা</Text>
              <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                একবার সেভ করলে পরবর্তী কত দিনের ওয়াক্ত আগেভাগে সেট হয়ে থাকবে
              </Text>
              <View style={styles.chipRow}>
                {DAYS_OPTIONS.map((opt) => {
                  const active = (draft.daysAhead || 5) === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setDraft((prev) => ({ ...prev, daysAhead: opt.value }))}
                      style={[
                        styles.modeChip,
                        {
                          backgroundColor: active ? '#059669' : colors.inputBg,
                          borderColor: active ? '#059669' : colors.inputBorder,
                        },
                      ]}
                    >
                      <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Bottom Save Button */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveBtn,
              { backgroundColor: draft.enabled ? '#059669' : '#64748B' },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={draft.enabled ? 'notifications-outline' : 'notifications-off-outline'} size={20} color="#fff" />
            )}
            <Text style={styles.saveBtnText}>
              {saving
                ? 'শিডিউল করা হচ্ছে...'
                : draft.enabled
                  ? 'সংরক্ষণ ও অ্যালার্ট চালু করুন'
                  : 'সংরক্ষণ ও অ্যালার্ট বন্ধ করুন'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  closeBtn: { padding: 6 },

  scrollContent: { padding: 16 },
  statusCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTitle: { fontSize: 13, fontWeight: '700' },
  statusSub: { fontSize: 11, marginTop: 2 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  testBtnText: { fontSize: 12, fontWeight: '700' },

  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },

  sectionLabel: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  sectionHint: { fontSize: 11, marginBottom: 10 },

  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  prayerToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  prayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prayerName: { fontSize: 14, fontWeight: '700' },
  prayerTime: { fontSize: 11, marginTop: 1 },

  extraBlock: { paddingVertical: 12 },
  extraTitle: { fontSize: 13, fontWeight: '700' },
  extraDesc: { fontSize: 11, marginTop: 2, lineHeight: 16 },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
