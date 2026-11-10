import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity,
  TextInput, Alert, Modal, Platform, ActivityIndicator, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { Colors } from '../../constants/theme';
import TopNavbar from '../../components/TopNavbar';
import RingerModeService from '../../services/native/RingerModeModule';
import HabitTracker from '../../services/habit-tracker';
import MosqueDetector from '../../services/mosque-detector';
import { startBackgroundSilentTracking, stopBackgroundSilentTracking } from '../../services/background-silent-task';
import { fetchCurrentLocation } from '../../services/prayer-service';

export default function MoreScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Navigation state inside More tab
  const [activeSubMenu, setActiveSubMenu] = useState(null); // 'silent' or null

  // Auto Silent State
  const [autoSilent, setAutoSilent] = useState(false);
  const [userProfile, setUserProfile] = useState('regular');
  const [wifiSSID, setWifiSSID] = useState('');
  const [learningStatus, setLearningStatus] = useState('পর্যবেক্ষণ শুরু হয়নি');
  const [anomalousStayPrompt, setAnomalousStayPrompt] = useState(false);

  // Auto Silent Feature Toggles & Offsets
  const [jumuahOverride, setJumuahOverride] = useState(true);
  const [ramadanTarawih, setRamadanTarawih] = useState(true);
  const [wifiBypass, setWifiBypass] = useState(true);
  const [dwellFilter, setDwellFilter] = useState(true);
  const [startOffset, setStartOffset] = useState('-5');
  const [endOffset, setEndOffset] = useState('25');

  // Custom Mosques State
  const [customMosques, setCustomMosques] = useState([]);
  const [newMosqueName, setNewMosqueName] = useState('');
  const [newMosqueRadius, setNewMosqueRadius] = useState('50');
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [selectedMapCoordinate, setSelectedMapCoordinate] = useState(null);
  const [deviceLocation, setDeviceLocation] = useState({ latitude: 23.8103, longitude: 90.4125 }); // Default Dhaka

  const mapRef = useRef(null);
  const webViewRef = useRef(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [measureStep, setMeasureStep] = useState(0); // 0: Idle, 1: Center Set
  const [centerPoint, setCenterPoint] = useState(null);

  // Compass & Qibla States
  const [heading, setHeading] = useState(0);
  const [compassError, setCompassError] = useState(null);
  const [headingSubscription, setHeadingSubscription] = useState(null);

  useEffect(() => {
    if (activeSubMenu === 'compass') {
      startWatchingHeading();
    } else {
      stopWatchingHeading();
    }
    return () => stopWatchingHeading();
  }, [activeSubMenu]);

  const startWatchingHeading = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCompassError('কম্পাস ব্যবহার করার জন্য লোকেশন পারমিশন প্রয়োজন।');
        return;
      }
      
      const sub = await Location.watchHeadingAsync((data) => {
        const currentHeading = data.trueHeading !== -1 ? data.trueHeading : data.magneticHeading;
        setHeading(currentHeading);
      });
      setHeadingSubscription(sub);
      setCompassError(null);
    } catch (e) {
      setCompassError('ম্যাগনেটোমিটার সেন্সর পাওয়া যায়নি বা এরর হয়েছে।');
    }
  };

  const stopWatchingHeading = () => {
    if (headingSubscription) {
      headingSubscription.remove();
      setHeadingSubscription(null);
    }
  };

  const calculateQibla = () => {
    const lat1 = deviceLocation.latitude * Math.PI / 180;
    const lon1 = deviceLocation.longitude * Math.PI / 180;
    const lat2 = 21.4225 * Math.PI / 180; // Kaaba Lat
    const lon2 = 39.8262 * Math.PI / 180; // Kaaba Lon
    const dLon = lon2 - lon1;
    const y = Math.sin(dLon);
    const x = Math.cos(lat1) * Math.tan(lat2) - Math.sin(lat1) * Math.cos(dLon);
    const qiblaRad = Math.atan2(y, x);
    const qiblaDeg = (qiblaRad * 180 / Math.PI + 360) % 360;
    return qiblaDeg;
  };

  const getDirectionLabel = (deg) => {
    const directions = ['উত্তর', 'উত্তর-পূর্ব', 'পূর্ব', 'দক্ষিণ-পূর্ব', 'দক্ষিণ', 'দক্ষিণ-পশ্চিম', 'পশ্চিম', 'উত্তর-পশ্চিম'];
    const index = Math.round(((deg % 360) / 45)) % 8;
    return directions[index];
  };

  const qiblaBearing = calculateQibla();
  const diff = (qiblaBearing - heading + 360) % 360;
  const isAligned = diff < 4 || diff > 356;

  const handleGetCurrentGPSLocation = async () => {
    setGpsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('অনুমতি মেলেনি', 'জিপিএস অ্যাক্সেস ছাড়া লোকেশন নেওয়া সম্ভব নয়।');
        setGpsLoading(false);
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const point = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
      };

      setSelectedMapCoordinate(point);
      updateWebViewMap(point.latitude, point.longitude);
    } catch (error) {
      Alert.alert('এরর', 'জিপিএস লোকেশন পাওয়া যায়নি।');
    } finally {
      setGpsLoading(false);
    }
  };

  const updateWebViewMap = (lat, lng) => {
    webViewRef.current?.injectJavaScript(`
      if (typeof map !== 'undefined' && typeof marker !== 'undefined') {
        map.setView([${lat}, ${lng}], 16);
        marker.setLatLng([${lat}, ${lng}]);
        sendCoordinates(${lat}, ${lng});
      }
      true;
    `);
  };

  const handleSearchLocation = async () => {
    if (!mapSearchQuery.trim()) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=1&countrycodes=bd&accept-language=bn,en`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'As-Sunnah-App-Mobile/1.0 (contact: zubayer.dev.bd@gmail.com; android-app)'
        }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const point = { latitude: lat, longitude: lon };
        setSelectedMapCoordinate(point);
        updateWebViewMap(lat, lon);
      } else {
        Alert.alert('পাওয়া যায়নি', 'কোনো স্থান খুঁজে পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('ত্রুটি', 'সার্চ করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করুন।');
    }
  };

  // Load Settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const config = await HabitTracker.getConfig();
      setAutoSilent(config.autoSilentEnabled || false);
      setUserProfile(config.profile || 'regular');
      setWifiSSID(config.homeWifiSSID || '');
      setJumuahOverride(config.jumuahOverrideEnabled !== false);
      setRamadanTarawih(config.ramadanTarawihEnabled !== false);
      setWifiBypass(config.wifiBypassEnabled !== false);
      setDwellFilter(config.dwellFilterEnabled !== false);
      setStartOffset(config.defaultStartOffset?.toString() || '-5');
      setEndOffset(config.defaultEndOffset?.toString() || '25');

      // Load learning status
      const logs = await HabitTracker.getVisitLogs();
      const distinctDays = new Set(logs.map(l => new Date(l.entryTime).toDateString())).size;
      setLearningStatus(distinctDays >= 3 ? 'অভ্যাস শেখা সম্পন্ন' : `পর্যবেক্ষণ চলছে (${distinctDays}/৩ দিন)`);

      // Check anomalous prompt
      const showPrompt = await HabitTracker.checkAnomalousStayPrompt();
      setAnomalousStayPrompt(showPrompt);

      // Load custom mosques
      const list = await MosqueDetector.getCustomMosques();
      setCustomMosques(list);

      // Get current location for centering map
      const loc = await fetchCurrentLocation().catch(() => null);
      if (loc) {
        setDeviceLocation({ latitude: loc.latitude, longitude: loc.longitude });
      }
    } catch (e) {
      console.log('Error loading settings in More tab', e);
    }
  };

  // Auto-Silent Handlers
  const handleToggleAutoSilent = async () => {
    const nextState = !autoSilent;
    if (nextState) {
      const hasDnd = await RingerModeService.checkDndPermission();
      if (!hasDnd) {
        Alert.alert(
          'ডিএনডি অনুমতি প্রয়োজন',
          'অটো সাইলেন্ট ফিচারটি কাজ করার জন্য নোটিফিকেশন পলিসি (Do Not Disturb) অনুমতি প্রয়োজন। অনুগ্রহ করে পরবর্তী স্ক্রিনে অনুমতি দিন।',
          [
            { text: 'বাতিল', onPress: () => {}, style: 'cancel' },
            {
              text: 'অনুমতি দিন',
              onPress: async () => {
                await RingerModeService.requestDndPermission();
                const started = await startBackgroundSilentTracking();
                if (started) {
                  setAutoSilent(true);
                  await HabitTracker.saveConfig({ autoSilentEnabled: true });
                }
              },
            },
          ]
        );
        return;
      }

      const started = await startBackgroundSilentTracking();
      if (started) {
        setAutoSilent(true);
        await HabitTracker.saveConfig({ autoSilentEnabled: true });
      } else {
        Alert.alert('ত্রুটি', 'লোকেশনের ব্যাকগ্রাউন্ড ট্র্যাকিং শুরু করা সম্ভব হয়নি। অনুগ্রহ করে সেটিংসে গিয়ে লোকেশন অনুমতি "Always Allow" নিশ্চিত করুন।');
      }
    } else {
      await stopBackgroundSilentTracking();
      setAutoSilent(false);
      await HabitTracker.saveConfig({ autoSilentEnabled: false });
    }
  };

  const handleChangeProfile = async (profile) => {
    setUserProfile(profile);
    await HabitTracker.saveConfig({ profile });
  };

  const handleChangeWifiSSID = async (ssid) => {
    setWifiSSID(ssid);
    await HabitTracker.saveConfig({ homeWifiSSID: ssid || null });
  };

  const handleResetLogs = async () => {
    Alert.alert(
      'ডাটা রিসেট',
      'আপনি কি আগের মসজিদের যাতায়াতের সকল লগ এবং অভ্যাস ডাটা মুছে ফেলতে চান?',
      [
        { text: 'বাতিল', style: 'cancel' },
        {
          text: 'মুছে ফেলুন',
          style: 'destructive',
          onPress: async () => {
            await HabitTracker.clearVisitLogs();
            setLearningStatus('পর্যবেক্ষণ শুরু হয়নি');
            Alert.alert('রিসেট সম্পন্ন', 'অভ্যাস ও পর্যবেক্ষণ ডাটা সফলভাবে রিসেট করা হয়েছে।');
          },
        },
      ]
    );
  };

  const handleToggleJumuah = async () => {
    const nextVal = !jumuahOverride;
    setJumuahOverride(nextVal);
    await HabitTracker.saveConfig({ jumuahOverrideEnabled: nextVal });
  };

  const handleToggleRamadan = async () => {
    const nextVal = !ramadanTarawih;
    setRamadanTarawih(nextVal);
    await HabitTracker.saveConfig({ ramadanTarawihEnabled: nextVal });
  };

  const handleToggleWifiBypass = async () => {
    const nextVal = !wifiBypass;
    setWifiBypass(nextVal);
    await HabitTracker.saveConfig({ wifiBypassEnabled: nextVal });
  };

  const handleToggleDwellFilter = async () => {
    const nextVal = !dwellFilter;
    setDwellFilter(nextVal);
    await HabitTracker.saveConfig({ dwellFilterEnabled: nextVal });
  };

  const handleStartOffsetChange = async (val) => {
    setStartOffset(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      await HabitTracker.saveConfig({ defaultStartOffset: parsed });
    }
  };

  const handleEndOffsetChange = async (val) => {
    setEndOffset(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed)) {
      await HabitTracker.saveConfig({ defaultEndOffset: parsed });
    }
  };

  const handleRemoveCustomMosque = async (id) => {
    await MosqueDetector.removeCustomMosque(id);
    const list = await MosqueDetector.getCustomMosques();
    setCustomMosques(list);
  };

  // Main menu portal items
  const menuItems = [
    {
      id: 'silent',
      title: 'অটো-সাইলেন্ট ও মসজিদ ম্যানেজার',
      icon: 'volume-mute-outline',
      color: '#3B82F6',
    },
    {
      id: 'compass',
      title: 'দিকনির্ণয় কম্পাস ও কিবলা',
      icon: 'compass-outline',
      color: '#10B981',
    },
    {
      id: 'chat',
      title: 'মেসেঞ্জার ও লাইভ কল',
      icon: 'chatbubble-ellipses-outline',
      color: '#0084FF',
      route: '/chat',
    },
    {
      id: 'switch-account',
      title: 'অ্যাকাউন্টের ধরন পরিবর্তন (ছাত্র / ফারেগীন / উস্তাদ)',
      icon: 'swap-horizontal-outline',
      color: '#7C3AED',
      route: '/switch-account-type',
    },
  ];

  const handleMenuPress = (item) => {
    if (item.route) {
      router.push(item.route);
    } else if (item.id === 'silent') {
      setActiveSubMenu('silent');
    } else if (item.id === 'compass') {
      setActiveSubMenu('compass');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopNavbar showSettings={false} />

      {activeSubMenu ? (
        // Sub Menu Header
        <View style={[styles.subMenuHeader, { borderBottomColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setActiveSubMenu(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
            <Text style={[styles.backBtnText, { color: colors.text }]}>ফিরে যান</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeSubMenu === null ? (
          // Main Menu Grid/List
          <View style={{ gap: 12 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>মেনু ও ফিচারসমূহ</Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleMenuPress(item)}
                style={[styles.menuItemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingVertical: 14 }]}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.text, fontWeight: '600' }]}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        ) : activeSubMenu === 'silent' ? (
          // Auto Silent & Mosque Settings Panel
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.settingsTitle, { color: colors.text }]}>অটো সাইলেন্ট ও মসজিদ সেটিংস</Text>

            {/* Auto Silent System Toggle */}
            <View style={styles.settingItem}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 2 }]}>অটো সাইলেন্ট সিস্টেম</Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary }}>লোকেশন ট্র্যাকিং ও অভ্যাস ভিত্তিক অটো সাইলেন্ট</Text>
                </View>
                <TouchableOpacity
                  onPress={handleToggleAutoSilent}
                  style={[
                    styles.settingOption,
                    {
                      backgroundColor: autoSilent ? colors.primary : colors.inputBg,
                      borderColor: autoSilent ? colors.primary : colors.inputBorder,
                    },
                  ]}
                >
                  <Text style={[styles.settingOptionText, { color: autoSilent ? '#fff' : colors.text }]}>
                    {autoSilent ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </Text>
                </TouchableOpacity>
              </View>

              {autoSilent && (
                <View style={{ marginTop: 8 }}>
                  {/* User Profile */}
                  <Text style={[styles.settingLabel, { color: colors.textSecondary, marginBottom: 6 }]}>ব্যবহারকারীর প্রোফাইল</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    {['regular', 'imam', 'itikaf'].map((profile) => (
                      <TouchableOpacity
                        key={profile}
                        onPress={() => handleChangeProfile(profile)}
                        style={[
                          styles.settingOptionFlex,
                          {
                            backgroundColor: userProfile === profile ? colors.primary : colors.inputBg,
                            borderColor: userProfile === profile ? colors.primary : colors.inputBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.settingOptionText, { color: userProfile === profile ? '#fff' : colors.text, fontSize: 10 }]}>
                          {profile === 'regular' ? 'সাধারণ মুসল্লি' : profile === 'imam' ? 'ইমাম/স্টাফ' : 'ইতেকাফ/লং-স্টে'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* WiFi SSID Input */}
                  <Text style={[styles.settingLabel, { color: colors.textSecondary, marginBottom: 6 }]}>বাসার ওয়াইফাই নাম (SSID) - বাইপাস জোন</Text>
                  <TextInput
                    value={wifiSSID}
                    onChangeText={handleChangeWifiSSID}
                    placeholder="যেমন: MyHomeWiFi"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, marginBottom: 14, height: 38 }]}
                  />

                  {/* Feature Toggles */}
                  <Text style={[styles.settingLabel, { color: colors.textSecondary, marginBottom: 8 }]}>ফিচার সক্রিয়/নিষ্ক্রিয় সেটিংস</Text>
                  
                  <View style={styles.toggleRow}>
                    <Text style={{ fontSize: 11, color: colors.text }}>জুমার নামাজে সাইলেন্ট উইন্ডো বৃদ্ধি</Text>
                    <TouchableOpacity
                      onPress={handleToggleJumuah}
                      style={[styles.smallToggleBtn, { borderColor: jumuahOverride ? colors.primary : colors.inputBorder, backgroundColor: jumuahOverride ? colors.primary : colors.inputBg }]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: jumuahOverride ? '#fff' : colors.text }}>{jumuahOverride ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.toggleRow}>
                    <Text style={{ fontSize: 11, color: colors.text }}>রমজানে তারাবির সাইলেন্ট উইন্ডো বৃদ্ধি</Text>
                    <TouchableOpacity
                      onPress={handleToggleRamadan}
                      style={[styles.smallToggleBtn, { borderColor: ramadanTarawih ? colors.primary : colors.inputBorder, backgroundColor: ramadanTarawih ? colors.primary : colors.inputBg }]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: ramadanTarawih ? '#fff' : colors.text }}>{ramadanTarawih ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.toggleRow}>
                    <Text style={{ fontSize: 11, color: colors.text }}>বাসার ওয়াইফাইতে সাইলেন্ট বাইপাস</Text>
                    <TouchableOpacity
                      onPress={handleToggleWifiBypass}
                      style={[styles.smallToggleBtn, { borderColor: wifiBypass ? colors.primary : colors.inputBorder, backgroundColor: wifiBypass ? colors.primary : colors.inputBg }]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: wifiBypass ? '#fff' : colors.text }}>{wifiBypass ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.toggleRow, { marginBottom: 14 }]}>
                    <Text style={{ fontSize: 11, color: colors.text }}>২-মিনিট ডdwell ফিল্টার (পাশ দিয়ে যাওয়া এড়াতে)</Text>
                    <TouchableOpacity
                      onPress={handleToggleDwellFilter}
                      style={[styles.smallToggleBtn, { borderColor: dwellFilter ? colors.primary : colors.inputBorder, backgroundColor: dwellFilter ? colors.primary : colors.inputBg }]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: dwellFilter ? '#fff' : colors.text }}>{dwellFilter ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Offset Buffers */}
                  <Text style={[styles.settingLabel, { color: colors.textSecondary, marginBottom: 8 }]}>ডিফল্ট সাইলেন্ট সময়সীমা (মিনিট)</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>শুরু (নামাজের পূর্বে)</Text>
                      <TextInput
                        value={startOffset}
                        onChangeText={handleStartOffsetChange}
                        keyboardType="numeric"
                        placeholder="-৫"
                        placeholderTextColor={colors.textMuted}
                        style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, height: 38 }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>শেষ (নামাজের পরে)</Text>
                      <TextInput
                        value={endOffset}
                        onChangeText={handleEndOffsetChange}
                        keyboardType="numeric"
                        placeholder="২৫"
                        placeholderTextColor={colors.textMuted}
                        style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, height: 38 }]}
                      />
                    </View>
                  </View>

                  {/* Operational status */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBg, padding: 10, borderRadius: 8, marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>অবস্থা:</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{learningStatus}</Text>
                  </View>

                  {/* Reset logs button */}
                  <TouchableOpacity
                    onPress={handleResetLogs}
                    style={{ padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#EF4444', alignItems: 'center', marginBottom: 12 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>পর্যবেক্ষণ ও অভ্যাস ডাটা রিসেট করুন</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Custom / Crowdsourced Mosques List & Addition */}
            <View style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(128,128,128,0.2)', paddingTop: 16, marginTop: 8 }}>
              <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 8 }]}>আমার মসজিদের তালিকা (Custom Database)</Text>
              
              {/* Add Custom Mosque Form */}
              <View style={{ marginBottom: 12 }}>
                <TextInput
                  value={newMosqueName}
                  onChangeText={setNewMosqueName}
                  placeholder="মসজিদের নাম দিন (যেমন: বাইতুল ফালাহ)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, marginBottom: 8, height: 38 }]}
                />
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={newMosqueRadius}
                    onChangeText={setNewMosqueRadius}
                    keyboardType="numeric"
                    placeholder="ব্যাসার্ধ (মিটার, যেমন: ৫০)"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, height: 38, flex: 1 }]}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedMapCoordinate({ latitude: deviceLocation.latitude, longitude: deviceLocation.longitude });
                      setIsMapModalVisible(true);
                    }}
                    style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, height: 38, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>ম্যাপে মসজিদ যোগ করুন</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Custom Mosques List */}
              {customMosques.length > 0 ? (
                customMosques.map((item) => (
                  <View
                    key={item.id}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inputBg, padding: 10, borderRadius: 8, marginBottom: 6 }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>{item.name}</Text>
                      <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>
                        রেডিয়াস: {item.radius}মি | {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveCustomMosque(item.id)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>
                  কোনো কাস্টম মসজিদ যুক্ত করা হয়নি।
                </Text>
              )}
            </View>
          </View>
        ) : activeSubMenu === 'compass' ? (
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, alignItems: 'center', padding: 20 }]}>
            <Text style={[styles.settingsTitle, { color: colors.text, alignSelf: 'flex-start', marginBottom: 20 }]}>দিকনির্ণয় কম্পাস ও কিবলা</Text>

            {compassError ? (
              <Text style={{ color: '#EF4444', textAlign: 'center', marginVertical: 20 }}>{compassError}</Text>
            ) : (
              <View style={{ alignItems: 'center', width: '100%' }}>
                {/* Heading details */}
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>
                  {Math.round(heading)}° {getDirectionLabel(heading)}
                </Text>
                
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 24 }}>
                  কিবলার দিক: {Math.round(qiblaBearing)}° ({getDirectionLabel(qiblaBearing)})
                </Text>

                {/* Rotating Compass Circle */}
                <View style={[
                  styles.compassOuterRing, 
                  { 
                    borderColor: isAligned ? '#10B981' : colors.cardBorder,
                    shadowColor: isAligned ? '#10B981' : 'transparent',
                    shadowOpacity: isAligned ? 0.4 : 0,
                    shadowRadius: 10,
                    elevation: isAligned ? 4 : 0
                  }
                ]}>
                  {/* Fixed Reference needle pointing straight up */}
                  <View style={styles.fixedPointer} />

                  {/* Rotating Dial */}
                  <View style={[
                    styles.compassDial, 
                    { 
                      transform: [{ rotate: `${-heading}deg` }],
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                    }
                  ]}>
                    {/* Cardinal Points */}
                    <Text style={[styles.cardinalText, { top: 8, color: '#EF4444', fontWeight: 'bold' }]}>N</Text>
                    <Text style={[styles.cardinalText, { right: 8, color: colors.text }]}>E</Text>
                    <Text style={[styles.cardinalText, { bottom: 8, color: colors.text }]}>S</Text>
                    <Text style={[styles.cardinalText, { left: 8, color: colors.text }]}>W</Text>

                    {/* Qibla Pointer inside dial, rotates with it but offset by qibla bearing */}
                    <View style={[
                      styles.qiblaPointerContainer, 
                      { transform: [{ rotate: `${qiblaBearing}deg` }] }
                    ]}>
                      <Ionicons name="compass" size={28} color="#10B981" style={styles.qiblaIcon} />
                      <Text style={styles.qiblaText}>কিবলা</Text>
                    </View>
                  </View>
                </View>

                {/* Alignment status alert */}
                <View style={{
                  marginTop: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: isAligned ? '#10B98120' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  borderWidth: 1,
                  borderColor: isAligned ? '#10B981' : colors.cardBorder,
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: isAligned ? '#10B981' : colors.text }}>
                    {isAligned ? '✓ আপনি এখন কিবলামুখী আছেন!' : `কিবলা থেকে ${Math.round(diff)}° দূরে আছেন`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Map Selector Modal */}
      <Modal
        visible={isMapModalVisible}
        animationType="slide"
        onRequestClose={() => setIsMapModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: insets.top + 10,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.cardBorder,
            backgroundColor: colors.card,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>ম্যাপে মসজিদ যুক্ত করুন</Text>
            <TouchableOpacity onPress={() => setIsMapModalVisible(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flexDirection: 'row', padding: 10, gap: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.cardBorder }}>
            <TextInput
              value={mapSearchQuery}
              onChangeText={setMapSearchQuery}
              placeholder="স্থান/জেলা সার্চ করুন (যেমন: কুমিল্লা)"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, flex: 1, height: 40, marginBottom: 0 }]}
            />
            <TouchableOpacity
              onPress={handleSearchLocation}
              style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>সার্চ</Text>
            </TouchableOpacity>
          </View>

          <WebView
            ref={webViewRef}
            key={isMapModalVisible ? 'map-active' : 'map-inactive'}
            style={{ flex: 1 }}
            originWhitelist={['*']}
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                  <style>
                    body { padding: 0; margin: 0; }
                    html, body, #map { height: 100%; width: 100vw; }
                  </style>
                </head>
                <body>
                  <div id="map"></div>
                  <script>
                    const lat = ${deviceLocation.latitude};
                    const lng = ${deviceLocation.longitude};
                    const map = L.map('map').setView([lat, lng], 16);
                    
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      maxZoom: 19,
                      attribution: '© OpenStreetMap'
                    }).addTo(map);

                    let marker = L.marker([lat, lng], { draggable: true }).addTo(map);

                    function sendCoordinates(lat, lng) {
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
                      }
                    }

                    // Send initial coordinates
                    sendCoordinates(lat, lng);

                    map.on('click', function(e) {
                      const { lat, lng } = e.latlng;
                      marker.setLatLng([lat, lng]);
                      sendCoordinates(lat, lng);
                    });

                    marker.on('dragend', function(e) {
                      const { lat, lng } = marker.getLatLng();
                      sendCoordinates(lat, lng);
                    });
                  </script>
                </body>
                </html>
              `
            }}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.latitude && data.longitude) {
                  setSelectedMapCoordinate({
                    latitude: data.latitude,
                    longitude: data.longitude
                  });
                }
              } catch (err) {
                console.warn(err);
              }
            }}
          />

          <View style={{
            padding: 16,
            backgroundColor: colors.card,
            borderTopWidth: 1,
            borderTopColor: colors.cardBorder,
            gap: 12,
          }}>
            <TouchableOpacity
              onPress={handleGetCurrentGPSLocation}
              disabled={gpsLoading}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                paddingVertical: 10,
                borderRadius: 10,
                gap: 8,
                borderWidth: 1,
                borderColor: colors.cardBorder,
              }}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate" size={18} color={colors.primary} />
              )}
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>
                {gpsLoading ? 'লোকেশন লোড হচ্ছে...' : 'আমি এখন মসজিদে আছি (GPS সনাক্ত করুন)'}
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
              * মসজিদের সঠিক স্থানে ম্যাপে ক্লিক করে মার্কার বসান বা মার্কারটি ড্র্যাগ করে সঠিক স্থানে রাখুন।
            </Text>

            {/* GPS Measure Tool */}
            <View style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              padding: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              gap: 8,
              marginVertical: 4
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>📏 জিপিএস দিয়ে সাইজ পরিমাপ করুন:</Text>
              {measureStep === 0 ? (
                <TouchableOpacity
                  disabled={gpsLoading}
                  onPress={async () => {
                    try {
                      setGpsLoading(true);
                      const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
                      setCenterPoint({
                        latitude: currentLoc.coords.latitude,
                        longitude: currentLoc.coords.longitude
                      });
                      setMeasureStep(1);
                      Alert.alert('ধাপ ১', 'আপনি কি মসজিদের কেন্দ্রে দাঁড়িয়ে আছেন? কেন্দ্রবিন্দু সেট করা হয়েছে। এখন সীমানায় গিয়ে "সীমানা বিন্দু সেট করুন" বাটনে চাপুন।');
                    } catch (err) {
                      Alert.alert('ত্রুটি', 'লোকেশন রিড করতে সমস্যা হয়েছে। জিপিএস চালু আছে কিনা নিশ্চিত করুন।');
                    } finally {
                      setGpsLoading(false);
                    }
                  }}
                  style={{ backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {gpsLoading ? 'লোকেশন নেওয়া হচ্ছে...' : 'পরিমাপ শুরু করুন (কেন্দ্রে দাঁড়িয়ে ক্লিক করুন)'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        const currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
                        const dist = MosqueDetector.calculateDistance(
                          centerPoint.latitude,
                          centerPoint.longitude,
                          currentLoc.coords.latitude,
                          currentLoc.coords.longitude
                        );
                        const finalRadius = Math.max(5, Math.round(dist));
                        setNewMosqueRadius(finalRadius.toString());
                        setMeasureStep(0);
                        Alert.alert('সফল', `পরিমাপ সম্পন্ন! মসজিদের ব্যাসার্ধ ${finalRadius} মিটার সেট করা হয়েছে।`);
                      } catch (err) {
                        Alert.alert('ত্রুটি', 'লোকেশন রিড করতে সমস্যা হয়েছে।');
                      }
                    }}
                    style={{ backgroundColor: '#2e7d32', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flex: 1.2, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>সীমানায় গিয়ে এখানে ক্লিক করুন</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setMeasureStep(0);
                      setCenterPoint(null);
                    }}
                    style={{ backgroundColor: '#c62828', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, flex: 0.6, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>বাতিল</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <TextInput
              value={newMosqueName}
              onChangeText={setNewMosqueName}
              placeholder="মসজিদের নাম লিখুন (যেমন: বায়তুল মোকাররম)"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, height: 40, width: '100%', marginBottom: 0 }]}
            />
            
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={newMosqueRadius}
                onChangeText={setNewMosqueRadius}
                keyboardType="numeric"
                placeholder="রেডিয়াস (মিটার, যেমন: ৫০)"
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.text, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, height: 40, flex: 1, marginBottom: 0 }]}
              />

              <TouchableOpacity
                onPress={async () => {
                  if (!newMosqueName.trim()) {
                    Alert.alert('ত্রুটি', 'অনুগ্রহ করে মসজিদের একটি নাম দিন।');
                    return;
                  }
                  const coords = selectedMapCoordinate || { latitude: deviceLocation.latitude, longitude: deviceLocation.longitude };
                  const radiusVal = parseInt(newMosqueRadius, 10) || 50;

                  const added = await MosqueDetector.addCustomMosque(
                    newMosqueName.trim(),
                    coords.latitude,
                    coords.longitude,
                    radiusVal
                  );

                  const list = await MosqueDetector.getCustomMosques();
                  setCustomMosques(list);
                  setNewMosqueName('');
                  setIsMapModalVisible(false);
                  Alert.alert('সফল', `"${added.name}" সফলভাবে যুক্ত হয়েছে!`);
                }}
                style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, height: 40, justifyContent: 'center', alignItems: 'center', flex: 1.5 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>মসজিদটি সেভ করুন</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginTop: 12, marginBottom: 12, textTransform: 'uppercase' },
  
  // Sub Menu Header
  subMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Menu items list
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuItemSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },

  // Settings Card
  settingsCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  settingsTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  settingItem: { marginBottom: 16 },
  settingLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  settingOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  settingOptionFlex: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  settingOptionText: { fontSize: 11, fontWeight: '700' },
  searchInput: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  smallToggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  compassOuterRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fixedPointer: {
    position: 'absolute',
    top: -2,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#EF4444',
    zIndex: 10,
  },
  compassDial: {
    width: 210,
    height: 210,
    borderRadius: 105,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardinalText: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: 'bold',
  },
  qiblaPointerContainer: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 36,
  },
  qiblaIcon: {
    transform: [{ rotate: '180deg' }],
  },
  qiblaText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#10B981',
    marginTop: 2,
  },
});
