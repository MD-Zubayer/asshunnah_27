import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/theme';
import TopNavbar from '../../components/TopNavbar';
import AdminAlertPanel from '../../components/AdminAlertPanel';
import PrayerCheckModal from '../../components/PrayerCheckModal';
import PrayerAlertModal from '../../components/PrayerAlertModal';
import { useAuth } from '../../context/AuthContext';
import {
  calculateFullPrayerData,
  fetchCurrentLocation,
  getPrayerTimingStatus,
  formatRemainingTime,
  formatTime,
  toBanglaDigits,
  CALCULATION_METHODS,
  DEFAULT_PRAYER_ALERT_CONFIG,
  schedulePrayerAlerts,
  getScheduledPrayerAlertsSummary,
} from '../../services/prayer-service';
import {
  PRAYER_KEYS,
  getPrayerStats,
  togglePrayer,
} from '../../services/prayer-tracker-service';

import RingerModeService from '../../services/native/RingerModeModule';
import HabitTracker from '../../services/habit-tracker';
import MosqueDetector from '../../services/mosque-detector';
import { startBackgroundSilentTracking, stopBackgroundSilentTracking } from '../../services/background-silent-task';


// সঠিক Ionicons আইকন ম্যাপিং
const ICON_MAP = {
  fajr: 'moon-outline',
  sunrise: 'sunny-outline',
  chast: 'sunny-outline',
  zawal: 'warning-outline',
  dhuhr: 'sunny',
  asr: 'partly-sunny',
  sunset: 'sunny-outline',
  maghrib: 'partly-sunny-outline',
  isha: 'moon',
};

// ============================================
// Constants
// ============================================

const DEFAULT_LOCATION = {
  latitude: 25.0833,
  longitude: 90.0167,
  city: 'শেরপুর',
  address: 'কবনা, শেরপুর, বাংলাদেশ',
  timezone: 'Asia/Dhaka',
};

const STORAGE_KEYS = {
  LOCATION: 'prayer_location',
  METHOD: 'prayer_method',
  MADHAB: 'prayer_madhab',
  ALERT_CONFIG: 'prayer_alert_config',
};

// ============================================
// Helper Functions
// ============================================

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

// ============================================
// Main Component
// ============================================

export default function PrayerScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // State
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [method, setMethod] = useState('Karachi');
  const [madhab, setMadhab] = useState('Hanafi');
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState(DEFAULT_PRAYER_ALERT_CONFIG);
  const [activeAlertCount, setActiveAlertCount] = useState(0);
  const [showPrayerCheckModal, setShowPrayerCheckModal] = useState(false);
  const [prayerTrackerState, setPrayerTrackerState] = useState({
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  });
  const [prayerTrackerStats, setPrayerTrackerStats] = useState({ today: 0, streak: 0 });

  // Load prayer tracker state
  const loadPrayerTracker = async () => {
    try {
      const stats = await getPrayerStats();
      if (stats?.state) {
        setPrayerTrackerState(stats.state);
        setPrayerTrackerStats({ today: stats.today, streak: stats.streak });
      }
    } catch (e) {
      console.log('[Prayer] Failed to load prayer tracker:', e.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPrayerTracker();
    }, [])
  );

  const handleTogglePrayer = async (waqtKey, prayerItem, status) => {
    // Prevent premature tracking if prayer waqt has not started yet today
    if (isToday && status?.status === 'upcoming') {
      const startTimeStr = prayerItem?.time ? formatTime(prayerItem.time, 'bn') : '';
      Alert.alert(
        'ওয়াক্ত এখনও শুরু হয়নি',
        `${prayerItem?.name || 'এই'}-এর ওয়াক্ত শুরু হবে ${startTimeStr}-এ। ওয়াক্ত শুরু হওয়ার পর আদায় সম্পন্ন চিহ্নিত করতে পারবেন।`
      );
      return;
    }

    try {
      const res = await togglePrayer(waqtKey);
      if (res?.state) {
        setPrayerTrackerState(res.state);
        setPrayerTrackerStats({ today: res.count, streak: res.streak });
      }
    } catch (e) {
      console.log('[Prayer] Error toggling prayer:', e.message);
    }
  };

  // (Auto-Silent states removed and moved to More tab)




  // Location suggestions autocomplete query
  useEffect(() => {
    if (!locationQuery || locationQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(locationQuery.trim())}`,
          {
            headers: {
              'User-Agent': 'AsSunnah27/1.0 (prayer-app)',
            },
          }
        );
        const data = await response.json();
        if (data && Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch (e) {
        console.log('Error fetching suggestions', e);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [locationQuery]);

  // Load saved settings
  useEffect(() => {
    loadSavedSettings();
  }, []);

  // Real-time update every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Recalculate when dependencies change
  useEffect(() => {
    calculatePrayerData();
  }, [location, selectedDate, method, madhab]);

  // Keep prayer alerts synced automatically if enabled when location/method/madhab updates
  useEffect(() => {
    if (loading || !alertConfig?.enabled) return;
    schedulePrayerAlerts(location.latitude, location.longitude, method, madhab, alertConfig)
      .then((res) => {
        if (res?.success) {
          setActiveAlertCount(res.scheduledCount || 0);
        }
      })
      .catch(() => {});
  }, [loading, location.latitude, location.longitude, method, madhab]);

  const loadSavedSettings = async () => {
    try {
      const savedLocation = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION);
      if (savedLocation) {
        const parsed = JSON.parse(savedLocation);
        if (parsed?.latitude && parsed?.longitude) {
          setLocation(parsed);
        }
      }
      const savedMethod = await AsyncStorage.getItem(STORAGE_KEYS.METHOD);
      if (savedMethod && CALCULATION_METHODS[savedMethod]) {
        setMethod(savedMethod);
      }
      const savedMadhab = await AsyncStorage.getItem(STORAGE_KEYS.MADHAB);
      if (savedMadhab === 'Hanafi' || savedMadhab === 'Shafi') {
        setMadhab(savedMadhab);
      }

      const savedAlertConfig = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_CONFIG);
      if (savedAlertConfig) {
        const parsedAlert = JSON.parse(savedAlertConfig);
        setAlertConfig({
          ...DEFAULT_PRAYER_ALERT_CONFIG,
          ...parsedAlert,
          prayers: {
            ...DEFAULT_PRAYER_ALERT_CONFIG.prayers,
            ...(parsedAlert?.prayers || {}),
          },
          extras: {
            ...DEFAULT_PRAYER_ALERT_CONFIG.extras,
            ...(parsedAlert?.extras || {}),
          },
        });
      }

      const summary = await getScheduledPrayerAlertsSummary();
      setActiveAlertCount(summary.count || 0);
    } catch (e) {
      console.log('Error loading settings', e);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.log('Error saving settings', e);
    }
  };

  // Auto-Silent settings handlers removed (moved to More tab)




  const calculatePrayerData = () => {
    return calculateFullPrayerData(
      location.latitude,
      location.longitude,
      'bn',
      method,
      madhab,
      selectedDate
    );
  };

  const prayerData = useMemo(() => calculatePrayerData(), [location, selectedDate, method, madhab]);

  const isToday = isSameDay(selectedDate, new Date());

  // Location functions
  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const loc = await fetchCurrentLocation();
      const newLocation = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        city: loc.city,
        address: loc.city + ', বাংলাদেশ',
        timezone: loc.timezone || 'Asia/Dhaka',
      };
      setLocation(newLocation);
      saveSettings(STORAGE_KEYS.LOCATION, newLocation);
    } catch (e) {
      Alert.alert('ত্রুটি', 'অবস্থান নির্ণয় করা যায়নি');
    } finally {
      setLocating(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    const addressObj = suggestion.address || {};
    const city = addressObj.city || addressObj.town || addressObj.village || addressObj.suburb || addressObj.district || addressObj.state || suggestion.name || 'অজানা স্থান';
    const displayAddress = suggestion.display_name;

    const newLocation = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      city: city,
      address: displayAddress,
      timezone: 'Asia/Dhaka',
    };

    setLocation(newLocation);
    saveSettings(STORAGE_KEYS.LOCATION, newLocation);
    setShowLocationSearch(false);
    setLocationQuery('');
    setSuggestions([]);
  };

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(locationQuery.trim())}`,
        {
          headers: {
            'User-Agent': 'AsSunnah27/1.0 (prayer-app)',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        handleSelectSuggestion(data[0]);
      } else {
        Alert.alert('খুঁজে পাওয়া যায়নি', 'এই অবস্থান খুঁজে পাওয়া যায়নি');
      }
    } catch (e) {
      Alert.alert('ত্রুটি', 'অবস্থান খোঁজা যায়নি');
    } finally {
      setSearching(false);
    }
  };

  const onChangeDate = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleMethodChange = (newMethod) => {
    setMethod(newMethod);
    saveSettings(STORAGE_KEYS.METHOD, newMethod);
  };

  const handleMadhabChange = (newMadhab) => {
    setMadhab(newMadhab);
    saveSettings(STORAGE_KEYS.MADHAB, newMadhab);
  };

  const handleDateChange = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await useCurrentLocation();
    setRefreshing(false);
  };

  const handleScheduleNotifications = () => {
    setShowAlertModal(true);
  };

  const handleSaveAlertConfig = async (newConfig) => {
    setAlertConfig(newConfig);
    await saveSettings(STORAGE_KEYS.ALERT_CONFIG, newConfig);
    const result = await schedulePrayerAlerts(
      location.latitude,
      location.longitude,
      method,
      madhab,
      newConfig
    );
    if (result?.success) {
      setActiveAlertCount(result.scheduledCount || 0);
    }
    return result;
  };

  // Get prayer timing status for each prayer
  const getPrayerStatus = (prayerKey) => {
    if (!isToday || !prayerData.prayerWindows[prayerKey]) {
      return { status: 'upcoming', remainingMinutes: 0, percent: 0, durationMinutes: 0 };
    }
    return getPrayerTimingStatus(prayerData.prayerWindows[prayerKey], now);
  };

  // Get makruh timing status
  const getMakruhStatus = (makruhTime) => {
    if (!isToday) {
      return { status: 'upcoming', remainingMinutes: 0, elapsedMinutes: 0, percent: 0, durationMinutes: 0 };
    }
    const nowTime = now.getTime();
    const startTime = makruhTime.start.getTime();
    const endTime = makruhTime.end.getTime();
    const durationMinutes = makruhTime.durationMinutes;

    if (nowTime < startTime) {
      return {
        status: 'upcoming',
        remainingMinutes: Math.floor((startTime - nowTime) / 60000),
        elapsedMinutes: 0,
        percent: 0,
        durationMinutes,
      };
    }
    if (nowTime < endTime) {
      const elapsed = Math.floor((nowTime - startTime) / 60000);
      const remaining = durationMinutes - elapsed;
      return {
        status: 'active',
        remainingMinutes: remaining,
        elapsedMinutes: elapsed,
        percent: Math.round((elapsed / durationMinutes) * 100),
        durationMinutes,
      };
    }
    return {
      status: 'passed',
      remainingMinutes: 0,
      elapsedMinutes: durationMinutes,
      percent: 100,
      durationMinutes,
    };
  };

  // Find next upcoming prayer (only upcoming, not active fard prayers)
  const nextPrayer = useMemo(() => {
    if (!isToday) return null;
    const fardKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const item of prayerData.items) {
      if (!fardKeys.includes(item.key)) continue;
      const status = getPrayerStatus(item.key);
      if (status.status === 'upcoming') {
        return { item, status };
      }
    }
    return null;
  }, [prayerData, now, isToday]);

  // Check if makruh time is active
  const isSunriseMakruhActive = isToday && now >= prayerData.makruhTimes.sunrise.start && now < prayerData.makruhTimes.sunrise.end;
  const isMiddayMakruhActive = isToday && now >= prayerData.makruhTimes.midday.start && now < prayerData.makruhTimes.midday.end;
  const isSunsetMakruhActive = isToday && now >= prayerData.makruhTimes.sunset.start && now < prayerData.makruhTimes.sunset.end;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar with Profile */}
      <TopNavbar showSettings={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Anomalous Stay Prompt Alert removed (moved to More tab) */}

        {/* Location & Date Card */}
        <View style={[styles.locationDateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Location Area */}
          <View style={styles.locationContainer}>
            <View style={styles.locationHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={[styles.locationCityText, { color: colors.text }]} numberOfLines={1}>
                  {location.city}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsIconBtn}>
                <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.locationAddressText, { color: colors.textSecondary }]} numberOfLines={2}>
              {location.address || 'কবনা, শেরপুর, বাংলাদেশ'}
            </Text>
          </View>

          <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />

          {/* Date Selector Area */}
          <View style={styles.dateNavRow}>
            <TouchableOpacity onPress={() => handleDateChange(-1)} style={styles.dateNavBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.dateSelectorContent}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.dateNavText, { color: colors.text }]}>{prayerData.gregorianDate}</Text>
                <Text style={[styles.dateNavHijri, { color: colors.textSecondary }]}>{prayerData.hijriDate}</Text>
              </View>
              <Ionicons name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleDateChange(1)} style={styles.dateNavBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Search */}
        {showLocationSearch && (
          <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="শহর বা দেশের নাম লিখুন..."
                placeholderTextColor={colors.textSecondary}
                value={locationQuery}
                onChangeText={setLocationQuery}
                onSubmitEditing={searchLocation}
              />
              <TouchableOpacity
                onPress={searchLocation}
                disabled={searching}
                style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { borderColor: colors.cardBorder }]}>
                {suggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.place_id || index}
                    onPress={() => handleSelectSuggestion(item)}
                    style={[
                      styles.suggestionItem,
                      index < suggestions.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder }
                    ]}
                  >
                    <Ionicons name="location-outline" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={2}>
                      {item.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            onPress={useCurrentLocation}
            disabled={locating}
            style={[styles.quickActionCard, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="location" size={20} color="#2563EB" />
            )}
            <Text style={[styles.quickActionText, { color: colors.text }]}>আমার অবস্থান</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowPrayerCheckModal(true)}
            style={[styles.quickActionCard, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}
          >
            <Ionicons name="checkbox-outline" size={20} color="#059669" />
            <Text style={[styles.quickActionText, { color: colors.text }]}>সালাত চেকলিস্ট</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleScheduleNotifications}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: alertConfig?.enabled && activeAlertCount > 0 ? colors.emeraldCardBg : colors.amberCardBg,
                borderColor: alertConfig?.enabled && activeAlertCount > 0 ? colors.emeraldCardBorder : colors.amberCardBorder,
              },
            ]}
          >
            <Ionicons
              name={alertConfig?.enabled && activeAlertCount > 0 ? 'notifications' : 'notifications-outline'}
              size={20}
              color={alertConfig?.enabled && activeAlertCount > 0 ? '#059669' : '#D97706'}
            />
            <Text style={[styles.quickActionText, { color: colors.text }]}>
              {alertConfig?.enabled && activeAlertCount > 0
                ? `অ্যালার্ট (${toBanglaDigits(activeAlertCount)})`
                : 'অ্যালার্ট সেট'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Admin Alert Panel Button (visible for staff or admin profile) */}
        {(user?.is_staff || user?.profile_type === 'admin') && (
          <TouchableOpacity
            onPress={() => setShowAdminPanel(true)}
            style={[styles.adminPanelBtn, { backgroundColor: '#7C3AED', borderColor: '#6D28D9' }]}
          >
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
            <Text style={styles.adminPanelBtnText}>Admin Alert Panel</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.settingsTitle, { color: colors.text }]}>সেটিংস</Text>

            {/* Calculation Method */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>হিসাবের পদ্ধতি</Text>
              <View style={styles.settingOptions}>
                {Object.entries(CALCULATION_METHODS).map(([key, value]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleMethodChange(key)}
                    style={[
                      styles.settingOption,
                      {
                        backgroundColor: method === key ? colors.primary : colors.inputBg,
                        borderColor: method === key ? colors.primary : colors.inputBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.settingOptionText, { color: method === key ? '#fff' : colors.text }]}>
                      {value.nameBn}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Madhab */}
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>আসরের হিসাব (মাজহাব)</Text>
              <View style={styles.settingOptionsRow}>
                <TouchableOpacity
                  onPress={() => handleMadhabChange('Hanafi')}
                  style={[
                    styles.settingOptionFlex,
                    {
                      backgroundColor: madhab === 'Hanafi' ? colors.primary : colors.inputBg,
                      borderColor: madhab === 'Hanafi' ? colors.primary : colors.inputBorder,
                    },
                  ]}
                >
                  <Text style={[styles.settingOptionText, { color: madhab === 'Hanafi' ? '#fff' : colors.text }]}>
                    হানাফি
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMadhabChange('Shafi')}
                  style={[
                    styles.settingOptionFlex,
                    {
                      backgroundColor: madhab === 'Shafi' ? colors.primary : colors.inputBg,
                      borderColor: madhab === 'Shafi' ? colors.primary : colors.inputBorder,
                    },
                  ]}
                >
                  <Text style={[styles.settingOptionText, { color: madhab === 'Shafi' ? '#fff' : colors.text }]}>
                    শাফেয়ি
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Next Prayer Hero */}
        {nextPrayer && isToday && (
          <View style={[styles.heroCard, { backgroundColor: colors.heroBg }]}>
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={14} color="#34D399" />
                <Text style={styles.heroBadgeText}>পরবর্তী ওয়াক্ত</Text>
              </View>
              <Text style={styles.heroPrayerName}>{nextPrayer.item.name}</Text>
              <Text style={styles.heroPrayerTime}>
                {formatTime(nextPrayer.item.time, 'bn')}
              </Text>
              <Text style={styles.heroCountdown}>
                {nextPrayer.status.status === 'active'
                  ? `⏱️ ${formatRemainingTime(nextPrayer.status.remainingMinutes)} বাকি`
                  : `⏳ ${formatRemainingTime(nextPrayer.status.remainingMinutes)} পরে`}
              </Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name={nextPrayer.item.icon} size={40} color="#FBBF24" />
            </View>
          </View>
        )}

        {/* Prayer Times List & Tracker Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
            {isToday ? 'আজকের সময়সূচী' : 'নির্বাচিত দিনের সময়সূচী'}
          </Text>
          {isToday && (
            <TouchableOpacity
              onPress={() => setShowPrayerCheckModal(true)}
              style={[styles.trackerPill, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}
            >
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={[styles.trackerPillText, { color: '#059669' }]}>
                আদায়: {toBanglaDigits(prayerTrackerStats.today)}/৫ • স্ট্রীক: {toBanglaDigits(prayerTrackerStats.streak)} দিন
              </Text>
              <Ionicons name="chevron-forward" size={12} color="#059669" />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.prayerListCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {prayerData.items.map((item, index) => {
            const status = getPrayerStatus(item.key);
            const isActive = status.status === 'active';
            const isUpcoming = status.status === 'upcoming' && isToday;
            const isPassed = status.status === 'passed' && isToday;
            const isInfoItem = item.key === 'sunrise' || item.key === 'sunset' || item.key === 'zawal';
            const isFarz = PRAYER_KEYS.includes(item.key);
            const isDone = isFarz && prayerTrackerState[item.key];

            return (
              <View
                key={item.key}
                style={[
                  styles.prayerItemContainer,
                  isActive && {
                    backgroundColor: colors.primaryBg,
                    borderColor: colors.primary,
                    borderWidth: 1,
                  },
                  index < prayerData.items.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.cardBorder,
                  },
                ]}
              >
                {/* Main Row */}
                <View style={styles.prayerItemRow}>
                  <View style={styles.prayerItemLeft}>
                    <View
                      style={[
                        styles.prayerIconBadge,
                        {
                          backgroundColor: isActive ? colors.primary : isInfoItem ? '#FEF3C7' : colors.inputBg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={ICON_MAP[item.key] || item.icon || 'time-outline'}
                        size={20}
                        color={isActive ? '#fff' : item.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.prayerNameRow}>
                        <Text
                          style={[
                            styles.prayerName,
                            {
                              color: isActive ? colors.primary : colors.text,
                              fontWeight: isActive ? '900' : '700',
                            },
                          ]}
                        >
                          {item.name}
                        </Text>
                        {isInfoItem && (
                          <Text style={[styles.infoBadge, { color: '#D97706' }]}>মাকরুহ ওয়াক্ত</Text>
                        )}
                        {isActive && (
                          <Text style={[styles.activeBadge, { color: colors.primary }]}>চলমান</Text>
                        )}
                      </View>
                      {isToday && !isInfoItem && (
                        <Text style={[styles.prayerDuration, { color: colors.textSecondary }]}>
                          সময়কাল: {toBanglaDigits(status.totalMinutes)} মিনিট
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.prayerItemRight}>
                    <Text
                      style={[
                        styles.prayerTime,
                        { color: isActive ? colors.primary : colors.text },
                      ]}
                    >
                      {formatTime(item.time, 'bn')}
                    </Text>

                    {/* Interactive prayer completion toggle for 5 farz prayers */}
                    {isToday && isFarz && (
                      <TouchableOpacity
                        onPress={() => handleTogglePrayer(item.key, item, status)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={[
                          styles.prayerCheckBtn,
                          isDone
                            ? { backgroundColor: '#10B981', borderColor: '#059669' }
                            : isUpcoming
                            ? { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, opacity: 0.6 }
                            : { backgroundColor: colors.inputBg, borderColor: colors.inputBorder },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isDone ? 'checkmark' : isUpcoming ? 'time-outline' : 'ellipse-outline'}
                          size={14}
                          color={isDone ? '#ffffff' : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.prayerCheckBtnText,
                            { color: isDone ? '#ffffff' : colors.textSecondary },
                          ]}
                        >
                          {isDone ? 'আদায় সম্পন্ন' : isUpcoming ? 'সময় হয়নি' : 'আদায় করুন'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Sub-row with Start/End times, progress bar, and remaining time */}
                {prayerData.prayerWindows[item.key] && (
                  <View style={styles.prayerDetailContainer}>
                    <View style={styles.prayerTimesRangeRow}>
                      <Text style={[styles.rangeTimeText, { color: colors.textSecondary }]}>
                        শুরু: {formatTime(prayerData.prayerWindows[item.key].start, 'bn')}
                      </Text>
                      <Text style={[styles.rangeTimeText, { color: colors.textSecondary }]}>
                        শেষ: {formatTime(prayerData.prayerWindows[item.key].end, 'bn')}
                      </Text>
                    </View>

                    {/* Progress Bar (Line Graph) */}
                    {isToday && (
                      <View style={styles.prayerProgressBarWrapper}>
                        <View style={[styles.prayerProgressBarBg, { backgroundColor: colors.inputBg }]}>
                          <View
                            style={[
                              styles.prayerProgressBarFill,
                              {
                                width: `${status.percent}%`,
                                backgroundColor: isActive ? colors.primary : '#10B981',
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.prayerProgressInfoRow}>
                          <Text style={[styles.prayerRemainingText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                            {status.status === 'active'
                              ? `${formatRemainingTime(status.remainingMinutes)} বাকি`
                              : status.status === 'upcoming'
                                ? `${formatRemainingTime(status.remainingMinutes)} পরে শুরু`
                                : 'ওয়াক্ত শেষ'}
                          </Text>
                          {status.status === 'active' && (
                            <Text style={[styles.percentText, { color: colors.primary }]}>
                              {toBanglaDigits(status.percent)}%
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Progress Bars for Active/Upcoming Prayers */}
        {isToday && (
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>ওয়াক্তের অগ্রগতি</Text>
            {prayerData.items
              .filter(item => ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(item.key))
              .map((item) => {
                const status = getPrayerStatus(item.key);
                if (status.status === 'passed') return null;
                return (
                  <View key={item.key} style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={[styles.progressName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.progressTime, { color: colors.textSecondary }]}>
                        {status.status === 'active'
                          ? `${formatRemainingTime(status.remainingMinutes)} বাকি`
                          : `${formatRemainingTime(status.remainingMinutes)} পরে`}
                      </Text>
                    </View>
                    <View style={[styles.progressBarBg, { backgroundColor: colors.inputBg }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${status.percent}%`,
                            backgroundColor: status.status === 'active' ? colors.primary : '#10B981',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Makruh Times Warning */}
        <View style={[styles.makruhCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <View style={styles.makruhHeader}>
            <Ionicons name="warning-outline" size={20} color="#D97706" />
            <Text style={[styles.makruhTitle, { color: '#92400E' }]}>মাকরূহ সময়</Text>
          </View>
          <Text style={[styles.makruhSubtitle, { color: '#A16207' }]}>
            এই সময়ে নফল নামাজ থেকে বিরত থাকুন
          </Text>

          {/* Sunrise Makruh */}
          {(() => {
            const sunriseMakruhStatus = getMakruhStatus(prayerData.makruhTimes.sunrise);
            const isActive = sunriseMakruhStatus.status === 'active';
            const isUpcoming = sunriseMakruhStatus.status === 'upcoming';
            return (
              <View
                style={[
                  styles.makruhItem,
                  {
                    backgroundColor: isActive ? '#FEE2E2' : '#FEF3C7',
                    borderColor: isActive ? '#FCA5A5' : '#FDE68A',
                  },
                ]}
              >
                <View style={styles.makruhItemHeader}>
                  <Ionicons name="sunny-outline" size={18} color="#D97706" />
                  <Text style={[styles.makruhItemName, { color: '#92400E' }]}>সূর্যোদয়ের মাকরূহ</Text>
                  {isActive && (
                    <Text style={[styles.makruhActiveBadge, { color: '#DC2626' }]}>চলমান</Text>
                  )}
                </View>
                <View style={styles.makruhTimeRangeRow}>
                  <Text style={[styles.makruhRangeTime, { color: '#78350F' }]}>
                    শুরু: {formatTime(prayerData.makruhTimes.sunrise.start, 'bn')}
                  </Text>
                  <Text style={[styles.makruhRangeTime, { color: '#78350F' }]}>
                    শেষ: {formatTime(prayerData.makruhTimes.sunrise.end, 'bn')}
                  </Text>
                </View>
                <Text style={[styles.makruhItemDuration, { color: '#A16207' }]}>
                  ১৮ মিনিট (সূর্যোদয়ের ৩ মি আগে → ১৫ মি পরে)
                </Text>
                {isToday && (
                  <View style={styles.makruhProgressWrapper}>
                    <View style={[styles.makruhProgressBarBg, { backgroundColor: '#FDE68A' }]}>
                      <View
                        style={[
                          styles.makruhProgressBarFill,
                          {
                            width: `${sunriseMakruhStatus.percent}%`,
                            backgroundColor: isActive ? '#DC2626' : '#D97706',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.makruhRemainingText, { color: isActive ? '#DC2626' : '#A16207' }]}>
                      {sunriseMakruhStatus.status === 'active'
                        ? `⚠️ ${formatRemainingTime(sunriseMakruhStatus.remainingMinutes)} বাকি`
                        : sunriseMakruhStatus.status === 'upcoming'
                          ? `⏳ ${formatRemainingTime(sunriseMakruhStatus.remainingMinutes)} পরে শুরু`
                          : '✓ সময় শেষ'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Midday Makruh (Zawal) */}
          {(() => {
            const middayMakruhStatus = getMakruhStatus(prayerData.makruhTimes.midday);
            const isActive = middayMakruhStatus.status === 'active';
            return (
              <View
                style={[
                  styles.makruhItem,
                  {
                    backgroundColor: isActive ? '#FEE2E2' : '#FEF3C7',
                    borderColor: isActive ? '#FCA5A5' : '#FDE68A',
                    marginTop: 10,
                  },
                ]}
              >
                <View style={styles.makruhItemHeader}>
                  <Ionicons name="sunny" size={18} color="#D97706" />
                  <Text style={[styles.makruhItemName, { color: '#92400E' }]}>মধ্যাহ্নের মাকরূহ (যাওয়াল)</Text>
                  {isActive && (
                    <Text style={[styles.makruhActiveBadge, { color: '#DC2626' }]}>চলমান</Text>
                  )}
                </View>
                <View style={styles.makruhTimeRangeRow}>
                  <Text style={[styles.makruhRangeTime, { color: '#78350F' }]}>
                    শুরু: {formatTime(prayerData.makruhTimes.midday.start, 'bn')}
                  </Text>
                  <Text style={[styles.makruhRangeTime, { color: '#78350F' }]}>
                    শেষ: {formatTime(prayerData.makruhTimes.midday.end, 'bn')}
                  </Text>
                </View>
                <Text style={[styles.makruhItemDuration, { color: '#A16207' }]}>
                  ১০ মিনিট (যোহরের ১০ মি আগে → যোহরের সময়)
                </Text>
                {isToday && (
                  <View style={styles.makruhProgressWrapper}>
                    <View style={[styles.makruhProgressBarBg, { backgroundColor: '#FDE68A' }]}>
                      <View
                        style={[
                          styles.makruhProgressBarFill,
                          {
                            width: `${middayMakruhStatus.percent}%`,
                            backgroundColor: isActive ? '#DC2626' : '#D97706',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.makruhRemainingText, { color: isActive ? '#DC2626' : '#A16207' }]}>
                      {middayMakruhStatus.status === 'active'
                        ? `⚠️ ${formatRemainingTime(middayMakruhStatus.remainingMinutes)} বাকি`
                        : middayMakruhStatus.status === 'upcoming'
                          ? `⏳ ${formatRemainingTime(middayMakruhStatus.remainingMinutes)} পরে শুরু`
                          : '✓ সময় শেষ'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Sunset Makruh */}
          {(() => {
            const sunsetMakruhStatus = getMakruhStatus(prayerData.makruhTimes.sunset);
            const isActive = sunsetMakruhStatus.status === 'active';
            return (
              <View
                style={[
                  styles.makruhItem,
                  {
                    backgroundColor: isActive ? '#FEE2E2' : '#FEF3C7',
                    borderColor: isActive ? '#FCA5A5' : '#FDE68A',
                    marginTop: 10,
                  },
                ]}
              >
                <View style={styles.makruhItemHeader}>
                  <Ionicons name="partly-sunny-outline" size={18} color="#DC2626" />
                  <Text style={[styles.makruhItemName, { color: '#92400E' }]}>সূর্যাস্তের মাকরূহ</Text>
                  {isActive && (
                    <Text style={[styles.makruhActiveBadge, { color: '#DC2626' }]}>চলমান</Text>
                  )}
                </View>
                <View style={styles.makruhTimeRangeRow}>
                  <Text style={[styles.makruhRangeTime, { color: '#78350F' }]}>
                    শুরু: {formatTime(prayerData.makruhTimes.sunset.start, 'bn')}
                  </Text>
                  <Text style={[styles.makruhRangeTime, { color: '#78350F' }]}>
                    শেষ: {formatTime(prayerData.makruhTimes.sunset.end, 'bn')}
                  </Text>
                </View>
                <Text style={[styles.makruhItemDuration, { color: '#A16207' }]}>
                  ২ মিনিট (সূর্যাস্তের ১ মি আগে → ১ মি পরে)
                </Text>
                {isToday && (
                  <View style={styles.makruhProgressWrapper}>
                    <View style={[styles.makruhProgressBarBg, { backgroundColor: '#FDE68A' }]}>
                      <View
                        style={[
                          styles.makruhProgressBarFill,
                          {
                            width: `${sunsetMakruhStatus.percent}%`,
                            backgroundColor: isActive ? '#DC2626' : '#D97706',
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.makruhRemainingText, { color: isActive ? '#DC2626' : '#A16207' }]}>
                      {sunsetMakruhStatus.status === 'active'
                        ? `⚠️ ${formatRemainingTime(sunsetMakruhStatus.remainingMinutes)} বাকি`
                        : sunsetMakruhStatus.status === 'upcoming'
                          ? `⏳ ${formatRemainingTime(sunsetMakruhStatus.remainingMinutes)} পরে শুরু`
                          : '✓ সময় শেষ'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}
        </View>

        {/* Bengali Date */}
        <View style={[styles.bengaliDateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          <Text style={[styles.bengaliDateText, { color: colors.text }]}>{prayerData.bengaliDate}</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            নামাজের সময় নির্বাচিত অবস্থানের জন্য হিসাব করা হয়েছে। স্থানীয় মসজিদের ঘোষণার সাথে কয়েক মিনিট পার্থক্য হতে পারে।
          </Text>
        </View>

      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {/* Admin Alert Panel Modal */}
      <AdminAlertPanel visible={showAdminPanel} onClose={() => setShowAdminPanel(false)} />

      {/* Prayer Check Modal */}
      <PrayerCheckModal
        visible={showPrayerCheckModal}
        onClose={() => setShowPrayerCheckModal(false)}
        prayerWindows={prayerData?.prayerWindows}
        prayerTimes={prayerData?.times}
        onUpdate={(updated) => {
          if (updated?.state) {
            setPrayerTrackerState(updated.state);
            setPrayerTrackerStats({ today: updated.today, streak: updated.streak });
          }
        }}
      />

      {/* Prayer Alert Settings Modal */}
      <PrayerAlertModal
        visible={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        config={alertConfig}
        prayerItems={prayerData?.items || []}
        onSaveAndSchedule={handleSaveAlertConfig}
      />
    </View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  locationDateCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  locationContainer: { marginBottom: 10 },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  locationCityText: { fontSize: 18, fontWeight: '800' },
  locationAddressText: { fontSize: 12, lineHeight: 16 },
  settingsIconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dividerLine: { height: 0.5, marginVertical: 10 },
  dateNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateNavBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(37, 99, 235, 0.1)', justifyContent: 'center', alignItems: 'center' },
  dateSelectorContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  dateNavText: { fontSize: 13, fontWeight: '700' },
  dateNavHijri: { fontSize: 11, marginTop: 2 },

  // Search
  searchCard: { borderRadius: 16, padding: 12, borderWidth: 1, marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  searchBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  suggestionsContainer: { marginTop: 8, borderTopWidth: 0.5, paddingTop: 8 },
  suggestionItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 4 },
  suggestionText: { fontSize: 12, flex: 1 },

  // Quick Actions
  quickActionsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickActionCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  quickActionText: { fontSize: 10, fontWeight: '700', marginTop: 4 },

  // Settings
  settingsCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  settingsTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  settingItem: { marginBottom: 16 },
  settingLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  settingOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  settingOptionsRow: { flexDirection: 'row', gap: 8 },
  settingOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  settingOptionFlex: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  settingOptionText: { fontSize: 11, fontWeight: '700' },

  // Hero
  heroCard: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  heroContent: { flex: 1 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', gap: 4 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#34D399', textTransform: 'uppercase' },
  heroPrayerName: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 8 },
  heroPrayerTime: { fontSize: 16, color: '#60A5FA', fontWeight: '800', marginTop: 2 },
  heroCountdown: { fontSize: 12, color: '#94A3B8', marginTop: 6, fontWeight: '600' },
  heroIconBox: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  // Prayer List
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase' },
  trackerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  trackerPillText: { fontSize: 11, fontWeight: '700' },
  prayerListCard: { borderRadius: 20, padding: 4, borderWidth: 1, overflow: 'hidden' },
  prayerItemContainer: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginVertical: 2 },
  prayerItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prayerItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  prayerItemRight: { alignItems: 'flex-end', gap: 6 },
  prayerCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  prayerCheckBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  prayerIconBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  prayerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prayerName: { fontSize: 15 },
  infoBadge: { fontSize: 9, fontWeight: '800', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  activeBadge: { fontSize: 9, fontWeight: '800', backgroundColor: 'rgba(37, 99, 235, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  prayerDuration: { fontSize: 10, marginTop: 2 },
  prayerTime: { fontSize: 16, fontWeight: '900' },

  prayerDetailContainer: { marginTop: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(128,128,128,0.15)', paddingTop: 8 },
  prayerTimesRangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rangeTimeText: { fontSize: 11, fontWeight: '600' },
  prayerProgressBarWrapper: { marginTop: 4 },
  prayerProgressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  prayerProgressBarFill: { height: '100%', borderRadius: 3 },
  prayerProgressInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, alignItems: 'center' },
  prayerRemainingText: { fontSize: 10, fontWeight: '700' },
  percentText: { fontSize: 10, fontWeight: '700' },

  // Progress
  progressCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 12 },
  progressItem: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressName: { fontSize: 12, fontWeight: '700' },
  progressTime: { fontSize: 11 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // Makruh
  makruhCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 16 },
  makruhHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  makruhTitle: { fontSize: 15, fontWeight: '800' },
  makruhSubtitle: { fontSize: 11, marginBottom: 12 },
  makruhItem: { borderRadius: 12, padding: 12, borderWidth: 1 },
  makruhItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  makruhItemName: { fontSize: 13, fontWeight: '700' },
  makruhItemTime: { fontSize: 15, fontWeight: '800', marginTop: 4 },
  makruhItemDuration: { fontSize: 10, marginTop: 2 },
  makruhActiveText: { fontSize: 12, fontWeight: '800', color: '#DC2626', marginTop: 6 },
  makruhActiveBadge: { fontSize: 9, fontWeight: '800', backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 'auto' },
  makruhTimeRangeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  makruhRangeTime: { fontSize: 12, fontWeight: '700' },
  makruhProgressWrapper: { marginTop: 8 },
  makruhProgressBarBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  makruhProgressBarFill: { height: '100%', borderRadius: 3 },
  makruhRemainingText: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  // Bengali Date
  bengaliDateCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1, marginTop: 12 },
  bengaliDateText: { fontSize: 13, fontWeight: '700' },

  // Disclaimer
  disclaimerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, padding: 12 },
  disclaimerText: { fontSize: 11, flex: 1, lineHeight: 16 },
});