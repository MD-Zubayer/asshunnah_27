import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  PRAYER_KEYS,
  PRAYER_LABELS,
  getPrayerStats,
  togglePrayer,
} from '../services/prayer-tracker-service';

export default function PrayerCheckModal({ visible, onClose, onUpdate, prayerWindows, prayerTimes }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [prayerState, setPrayerState] = useState({
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  });
  const [stats, setStats] = useState({ today: 0, streak: 0 });

  const isPrayerUpcoming = (key) => {
    if (!prayerWindows || !prayerWindows[key]) return false;
    const start = prayerWindows[key].start;
    if (!start) return false;
    return new Date() < new Date(start);
  };

  const loadState = async () => {
    const data = await getPrayerStats();
    setPrayerState(data.state);
    setStats({ today: data.today, streak: data.streak });
  };

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        loadState();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleToggle = async (key) => {
    if (isPrayerUpcoming(key)) {
      const info = PRAYER_LABELS[key];
      const startTimeStr = prayerTimes?.[key] || '';
      Alert.alert(
        'ওয়াক্ত এখনও শুরু হয়নি',
        `${info?.bn || 'এই'}-এর ওয়াক্ত শুরু হবে ${startTimeStr ? startTimeStr + '-এ' : 'যথাসময়ে'}। ওয়াক্ত আসার পর আদায় সম্পন্ন চিহ্নিত করতে পারবেন।`
      );
      return;
    }

    const result = await togglePrayer(key);
    setPrayerState(result.state);
    setStats({ today: result.count, streak: result.streak });
    if (onUpdate) {
      onUpdate({ today: result.count, streak: result.streak, state: result.state });
    }
  };

  const toBengaliNumber = (num) => {
    const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (d) => digits[d]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: 'rgba(5, 150, 105, 0.15)' }]}>
                <Ionicons name="time" size={20} color="#059669" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>দৈনিক সালাত চেকলিস্ট</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  আজকের নামাজ আদায়ের পর টিক চিহ্ন দিন
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={26} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Quick Progress Banner */}
          <View style={[styles.progressBanner, { backgroundColor: isDark ? '#0F172A' : '#F0FDF4', borderColor: isDark ? '#334155' : '#DCFCE7' }]}>
            <View style={styles.progressItem}>
              <Text style={[styles.progressVal, { color: '#059669' }]}>
                {toBengaliNumber(stats.today)}/৫
              </Text>
              <Text style={[styles.progressLbl, { color: colors.textSecondary }]}>আজকের ওয়াক্ত</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <View style={styles.progressItem}>
              <Text style={[styles.progressVal, { color: '#D97706' }]}>
                {toBengaliNumber(stats.streak)} দিন
              </Text>
              <Text style={[styles.progressLbl, { color: colors.textSecondary }]}>সালাত স্ট্রিক</Text>
            </View>
          </View>

          {/* 5 Prayers List */}
          <View style={styles.prayersList}>
            {PRAYER_KEYS.map((key) => {
              const isChecked = !!prayerState[key];
              const isUpcoming = isPrayerUpcoming(key);
              const info = PRAYER_LABELS[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.prayerRow,
                    {
                      backgroundColor: isChecked
                        ? isDark
                          ? 'rgba(5, 150, 105, 0.12)'
                          : '#ECFDF5'
                        : isDark
                        ? '#0F172A'
                        : '#F8FAFC',
                      borderColor: isChecked ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                      opacity: isUpcoming ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => handleToggle(key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isChecked ? '#10B981' : isDark ? '#334155' : '#E2E8F0',
                        },
                      ]}
                    >
                      <Ionicons
                        name={info.icon}
                        size={18}
                        color={isChecked ? '#FFFFFF' : colors.textSecondary}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.waqtName,
                          {
                            color: isChecked ? (isDark ? '#34D399' : '#059669') : colors.text,
                            fontWeight: isChecked ? '800' : '600',
                          },
                        ]}
                      >
                        {info.bn}
                      </Text>
                      {isUpcoming && (
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                          সময় হয়নি {prayerTimes?.[key] ? `(${prayerTimes[key]})` : ''}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked ? '#059669' : 'transparent',
                        borderColor: isChecked ? '#059669' : isDark ? '#64748B' : '#94A3B8',
                      },
                    ]}
                  >
                    {isChecked ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : isUpcoming ? (
                      <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>ঠিক আছে</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  progressBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  progressLbl: {
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 28,
  },
  prayersList: {
    gap: 10,
    marginBottom: 18,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waqtName: {
    fontSize: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
