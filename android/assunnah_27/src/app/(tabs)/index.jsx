import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, useColorScheme, TouchableOpacity, ImageBackground, Animated, ActivityIndicator, Image } from 'react-native';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/theme';
import { calculatePrayerTimes, fetchCurrentLocation, getHijriDate } from '../../services/prayer-service';
import { API_BASE_URL } from '../../constants/api';
import TopNavbar from '../../components/TopNavbar';
import AcquaintanceCarousel from '../../components/AcquaintanceCarousel';
import acquaintanceService from '../../services/acquaintance-service';
import diaryService from '../../services/diary-service';
import articleService from '../../services/article-service';
import statsService, { toBengaliNumber } from '../../services/stats-service';
import { useAuth } from '../../context/AuthContext';

import { getImageUri } from '../../utils/image';

export default function HomeScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const getUserName = (userObj) => {
    if (!userObj) return 'ব্যবহারকারী';
    const { first_name, last_name, email } = userObj;
    return first_name || last_name ? `${first_name || ''} ${last_name || ''}`.trim() : email ? email.split('@')[0] : 'ব্যবহারকারী';
  };

  const [gregorianStr, setGregorianStr] = useState('');
  const [hijriStr, setHijriStr] = useState('');
  const [prayerInfo, setPrayerInfo] = useState({
    currentName: 'আসর',
    currentTime: '৩:৪৫ PM',
    progress: 0.8,
    remaining: '১৫ মি',
    nextName: 'মাগরিব',
    nextTime: '৫:১২ PM',
  });
  const [acquaintances, setAcquaintances] = useState([]);
  const [recentDiaries, setRecentDiaries] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const { token } = useAuth();

  // AI Summary States
  const [summaryLoading, setSummaryLoading] = useState({});
  const [articleSummaries, setArticleSummaries] = useState({});
  const [showSummaries, setShowSummaries] = useState({});

  const handleToggleSummary = async (articleId) => {
    if (articleSummaries[articleId]) {
      setShowSummaries(prev => ({ ...prev, [articleId]: !prev[articleId] }));
      return;
    }
    setSummaryLoading(prev => ({ ...prev, [articleId]: true }));
    setShowSummaries(prev => ({ ...prev, [articleId]: true }));
    try {
      const res = await articleService.getArticleSummary(token, articleId);
      setArticleSummaries(prev => ({ ...prev, [articleId]: res.summary }));
    } catch (e) {
      console.error('Error fetching summary:', e);
      setArticleSummaries(prev => ({ ...prev, [articleId]: 'সারসংক্ষেপ তৈরি করতে সমস্যা হয়েছে।' }));
    } finally {
      setSummaryLoading(prev => ({ ...prev, [articleId]: false }));
    }
  };

  // Hero background slideshow — মাদ্রাসার ছবি আগে, তারপর পানির ছবি
  const heroImages = [
    require('../../../assets/expo.icon/Assets/images/hero_bg_6.jpeg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_7.jpeg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_8.jpeg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_9.jpeg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_10.jpeg'),
    require('../../../assets/expo.icon/Assets/images/hero_water_bg.jpg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_2.jpg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_3.jpg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_4.jpg'),
    require('../../../assets/expo.icon/Assets/images/hero_bg_5.jpg'),
  ];
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const heroFadeAnim = useRef(new Animated.Value(1)).current;

  // require() images are bundled locally, no prefetch needed

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      Animated.timing(heroFadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change image at lowest opacity
        setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
        // Fade in
        Animated.timing(heroFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadLiveData() {
      const now = new Date();

      // Gregorian Date
      const options = { day: 'numeric', month: 'long', year: 'numeric' };
      setGregorianStr(now.toLocaleDateString('bn-BD', options));

      // Hijri Date
      setHijriStr(getHijriDate(now));

      const prayerNames = {
        fajr: 'ফজর',
        sunrise: 'সূর্যোদয় (মাকরূহ)',
        chast: 'চাশত (নফল)',
        zawal: 'জাওয়াল (মাকরূহ)',
        dhuhr: 'যোহর',
        asr: 'আসর',
        sunset: 'সূর্যাস্ত (মাকরূহ)',
        maghrib: 'মাগরিব',
        isha: 'এশা',
      };

      const defaultLoc = {
        latitude: 23.8103,
        longitude: 90.4125,
        city: 'ঢাকা',
      };

      const updateTimes = (lat, lon) => {
        const pTimes = calculatePrayerTimes(lat, lon, 'bn');

        const currentKey = pTimes.currentWaqtKey;
        const nextKey = pTimes.nextPrayerKey;

        const currentTime = pTimes[currentKey] || pTimes.fajr;
        const nextTime = pTimes[nextKey] || pTimes.nextPrayerTime;

        // Calculate progress to next Fard prayer
        const totalDuration = 120; // approximate duration in minutes
        const elapsed = Math.max(0, totalDuration - pTimes.remainingMinutes);
        const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

        // Format remaining time with Bengali digits
        const remainingMin = pTimes.remainingMinutes;
        const remainingStr = remainingMin < 60
          ? `${toBengaliNumber(remainingMin)} মি`
          : `${toBengaliNumber(Math.floor(remainingMin / 60))} ঘ ${toBengaliNumber(remainingMin % 60)} মি`;

        setPrayerInfo({
          currentName: prayerNames[currentKey] || 'আসর',
          currentTime: currentTime,
          progress: progress,
          remaining: remainingStr,
          nextName: prayerNames[nextKey] || 'মাগরিব',
          nextTime: nextTime,
        });
      };

      // 1. First, try to load from cache
      let cachedLoc = null;
      try {
        const saved = await AsyncStorage.getItem('prayer_location');
        if (saved) {
          cachedLoc = JSON.parse(saved);
        }
      } catch (err) {
        console.log('Error reading cached location:', err);
      }

      const activeLoc = cachedLoc || defaultLoc;
      updateTimes(activeLoc.latitude, activeLoc.longitude);

      // 2. Query live location in the background
      try {
        const liveLoc = await fetchCurrentLocation();
        if (liveLoc && liveLoc.latitude && liveLoc.longitude) {
          updateTimes(liveLoc.latitude, liveLoc.longitude);
          // Save to cache
          await AsyncStorage.setItem('prayer_location', JSON.stringify({
            latitude: liveLoc.latitude,
            longitude: liveLoc.longitude,
            city: liveLoc.city || 'ঢাকা',
          }));
        }
      } catch (err) {
        console.log('Error updating live location:', err);
      }
    }

    loadLiveData();
    loadAcquaintances();
    loadRecentDiaries();
    loadPopularArticles();
    loadUserStats();
  }, []);

  // Load user stats for progress cards
  const loadUserStats = async () => {
    try {
      const stats = await statsService.getUserStats(token);
      if (stats) {
        setUserStats(stats);
      }
    } catch (e) {
      console.log('[Home] Failed to load user stats:', e.message);
    }
  };

  // Load selected acquaintances and check for reminder
  const loadAcquaintances = async () => {
    const { selected } = await acquaintanceService.getSelectedAcquaintances();
    setAcquaintances(selected || []);

    // Check if we should show reminder
    const shouldShow = await acquaintanceService.shouldShowReminder();
    if (shouldShow) {
      // Show reminder after a short delay
      setTimeout(() => {
        router.push('/select-acquaintances');
      }, 1000);
    }
  };

  // Load recent diary entries
  const loadRecentDiaries = async () => {
    try {
      const diaries = await diaryService.getDiaries(token);
      if (diaries && diaries.length > 0) {
        setRecentDiaries(diaries.slice(0, 3)); // Show only 3 recent
      }
    } catch (e) {
      console.log('[Home] Failed to load diaries:', e.message);
    }
  };

  // Load popular articles (most liked)
  const loadPopularArticles = async () => {
    try {
      const result = await articleService.getArticles(token);
      if (result && result.results && result.results.length > 0) {
        // Sort by reaction_count and take top 3
        const sorted = [...result.results].sort((a, b) => (b.reaction_count || 0) - (a.reaction_count || 0));
        setPopularArticles(sorted.slice(0, 3));
      }
    } catch (e) {
      console.log('[Home] Failed to load articles:', e.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Navbar with Profile */}
      <TopNavbar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Futuristic Hero Card with Auto-Sliding Backgrounds */}
        <View style={styles.heroOuterWrapper}>
          <View style={styles.heroCard}>
            {/* Animated Background Image — শুধু বর্তমান ইমেজ render, ghost effect নেই */}
            <AnimatedImageBackground
              key={currentHeroIndex}
              source={heroImages[currentHeroIndex]}
              style={[
                styles.heroBgImage,
                { opacity: heroFadeAnim },
              ]}
              imageStyle={styles.heroImageStyle}
              resizeMode="cover"
            />

            {/* Dark overlay for content readability */}
            <View style={styles.heroOverlay}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroZapBadge}>
                  <Image
                    source={require('../../../assets/expo.icon/Assets/images/icon.png')}
                    style={{ width: 40, height: 40, borderRadius: 10 }}
                    resizeMode="contain"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroBalanceLabel}>আজকের মূল প্রতিপাদ্য</Text>
                  <Text style={styles.heroBalanceValue}>আস-সুন্নাহ <Text style={styles.heroBalanceSub}>ডিজিটাল প্ল্যাটফর্ম</Text></Text>
                </View>
              </View>

              <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 6, lineHeight: 16 }}>
                কুরআন ও সুন্নাহর সঠিক শিক্ষায় জীবনকে গড়ুন এবং দৈনন্দিন আমল রক্ষা করুন।
              </Text>

              <View style={styles.heroDivider} />

              {/* Date Row */}
              <View style={styles.dateRow}>
                <View style={styles.heroMetaItem}>
                  <View style={styles.heroMetaIconRow}>
                    <Ionicons name="calendar-outline" size={12} color="#60A5FA" />
                    <Text style={styles.heroMetaLabel}>তারিখ</Text>
                  </View>
                  <Text style={styles.heroMetaValueSmall}>{gregorianStr || 'আজকের তারিখ'}</Text>
                </View>

                <View style={styles.heroMetaItem}>
                  <View style={styles.heroMetaIconRow}>
                    <Ionicons name="moon-outline" size={12} color="#F472B6" />
                    <Text style={styles.heroMetaLabel}>হিজরী</Text>
                  </View>
                  <Text style={styles.heroMetaValueSmall}>{hijriStr || 'হিজরী তারিখ'}</Text>
                </View>
              </View>

              {/* Prayer Times Section - Current & Next */}
              <View style={styles.prayerSection}>
                {/* Current Prayer with Progress */}
                <View style={styles.prayerCard}>
                  <View style={styles.prayerHeader}>
                    <Ionicons name="radio-button-on" size={10} color="#34D399" />
                    <Text style={styles.prayerLabel}>বর্তমান ওয়াক্ত</Text>
                  </View>
                  <Text style={styles.prayerName}>{prayerInfo.currentName}</Text>
                  <Text style={styles.prayerTime}>{prayerInfo.currentTime}</Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${prayerInfo.progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{prayerInfo.remaining} বাকি</Text>
                  </View>
                </View>

                {/* Next Prayer */}
                <View style={styles.prayerCardNext}>
                  <View style={styles.prayerHeader}>
                    <Ionicons name="arrow-forward" size={10} color="#60A5FA" />
                    <Text style={styles.prayerLabelNext}>পরবর্তী ওয়াক্ত</Text>
                  </View>
                  <Text style={styles.prayerNameNext}>{prayerInfo.nextName}</Text>
                  <Text style={styles.prayerTimeNext}>{prayerInfo.nextTime}</Text>
                </View>
              </View>

              {/* Dot Indicators */}
              <View style={styles.heroDotsRow}>
                {heroImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.heroDot,
                      index === currentHeroIndex ? styles.heroDotActive : styles.heroDotInactive,
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Acquaintance Carousel */}
        {acquaintances.length > 0 && (
          <AcquaintanceCarousel acquaintances={acquaintances} />
        )}

        {/* Quick Stats Grid - Tailwind Glassmorphic Card Style */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>আপনার অগ্রগতি</Text>

        <View style={styles.statsGrid}>
          {/* Card 1: Blue Glow - Diary Stats */}
          <View style={[styles.statOuterCard, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}>
            <View style={[styles.statInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(37, 99, 235, 0.12)', borderColor: 'rgba(37, 99, 235, 0.25)' }]}>
                <Ionicons name="book-outline" size={22} color="#2563EB" />
              </View>
              <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>ডায়েরি</Text>
              <Text style={[styles.statCardValue, { color: colors.text }]}>
                {toBengaliNumber(userStats?.diary?.total || 0)} টি
              </Text>
              <View style={[styles.statSubPill, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Text style={[styles.statSubPillText, { color: colors.textSecondary }]}>
                  এই সপ্তাহে: {toBengaliNumber(userStats?.diary?.weekly || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Card 2: Purple Glow - Article Stats */}
          <View style={[styles.statOuterCard, { backgroundColor: colors.purpleCardBg, borderColor: colors.purpleCardBorder }]}>
            <View style={[styles.statInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(147, 51, 234, 0.12)', borderColor: 'rgba(147, 51, 234, 0.25)' }]}>
                <Ionicons name="document-text-outline" size={22} color="#9333EA" />
              </View>
              <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>আর্টিকেল</Text>
              <Text style={[styles.statCardValue, { color: colors.text }]}>
                {toBengaliNumber(userStats?.article?.read || 0)} টি পড়া
              </Text>
              <View style={[styles.statSubPill, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Text style={[styles.statSubPillText, { color: colors.textSecondary }]}>
                  লাইক: {toBengaliNumber(userStats?.article?.liked || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Card 3: Emerald Glow - Prayer Stats */}
          <View style={[styles.statOuterCard, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}>
            <View style={[styles.statInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(5, 150, 105, 0.12)', borderColor: 'rgba(5, 150, 105, 0.25)' }]}>
                <Ionicons name="time-outline" size={22} color="#059669" />
              </View>
              <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>সালাত</Text>
              <Text style={[styles.statCardValue, { color: colors.text }]}>
                {toBengaliNumber(userStats?.prayer?.today || 0)}/৫ ওয়াক্ত
              </Text>
              <View style={[styles.statSubPill, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Text style={[styles.statSubPillText, { color: colors.textSecondary }]}>
                  স্ট্রীক: {toBengaliNumber(userStats?.prayer?.streak || 0)} দিন
                </Text>
              </View>
            </View>
          </View>

          {/* Card 4: Amber Glow - Social Stats */}
          <View style={[styles.statOuterCard, { backgroundColor: colors.amberCardBg, borderColor: colors.amberCardBorder }]}>
            <View style={[styles.statInnerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.statIconBadge, { backgroundColor: 'rgba(217, 119, 6, 0.12)', borderColor: 'rgba(217, 119, 6, 0.25)' }]}>
                <Ionicons name="people-outline" size={22} color="#D97706" />
              </View>
              <Text style={[styles.statCardTitle, { color: colors.textSecondary }]}>সামাজিক</Text>
              <Text style={[styles.statCardValue, { color: colors.text }]}>
                {toBengaliNumber(userStats?.social?.followers || 0)} ফলোয়ার
              </Text>
              <View style={[styles.statSubPill, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Text style={[styles.statSubPillText, { color: colors.textSecondary }]}>
                  ফলোয়িং: {toBengaliNumber(userStats?.social?.following || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* সর্বশেষ ডায়েরি লেখা */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📔 সর্বশেষ ডায়েরি</Text>

        {recentDiaries.length > 0 ? (
          recentDiaries.map((diary) => {
            const tagColor = diary.tag === 'আমল' ? '#2563EB' :
              diary.tag === 'নামাজ' ? '#9333EA' :
                diary.tag === 'কুরআন' ? '#059669' :
                  diary.tag === 'দোয়া' ? '#D97706' :
                    diary.tag === 'ইলম' ? '#EC4899' : '#6B7280';
            return (
              <TouchableOpacity
                key={diary.id}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/diary-detail', params: { id: diary.id, title: diary.title, content: diary.content, tag: diary.tag, emoji: diary.emoji, date_display: diary.date_display } })}
                style={[styles.streamCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}
              >
                <View style={[styles.streamStripe, { backgroundColor: tagColor }]} />
                <View style={styles.streamCardContent}>
                  <View style={styles.streamTopRow}>
                    <View style={styles.streamTitleGroup}>
                      <Text style={{ fontSize: 18 }}>{diary.emoji || '📝'}</Text>
                      <Text style={[styles.streamTitle, { color: colors.text }]} numberOfLines={1}>{diary.title}</Text>
                    </View>
                    <Text style={[styles.streamTime, { color: colors.textMuted }]}>{diary.date_display}</Text>
                  </View>
                  <View style={[styles.streamMetaRow, { backgroundColor: colors.inputBg }]}>
                    <Ionicons name="document-text-outline" size={14} color={tagColor} />
                    <Text style={[styles.streamTokenText, { color: colors.textSecondary, flex: 1 }]} numberOfLines={2}>
                      {diary.content}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={[styles.emptyMiniCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={{ fontSize: 24 }}>📔</Text>
            <Text style={[styles.emptyMiniText, { color: colors.textSecondary }]}>এখনো কোনো ডায়েরি লেখা হয়নি</Text>
          </View>
        )}

        {/* আজকের হাদীস */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📖 আজকের হাদীস</Text>
        <View style={[styles.dailyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.dailyCardIcon, { backgroundColor: 'rgba(5, 150, 105, 0.1)', borderColor: 'rgba(5, 150, 105, 0.2)' }]}>
            <Ionicons name="book-outline" size={24} color="#059669" />
          </View>
          <View style={styles.dailyCardContent}>
            <Text style={[styles.dailyCardTitle, { color: colors.text }]} numberOfLines={2}>
              রাসূলুল্লাহ (সাঃ) বলেছেন: "তোমাদের মধ্যে সর্বোত্তম সেই ব্যক্তি যে কুরআন শিক্ষা করে এবং অন্যকে শিক্ষা দেয়।"
            </Text>
            <Text style={[styles.dailyCardSource, { color: colors.textSecondary }]}>- সহীহ বুখারী</Text>
          </View>
          <TouchableOpacity
            style={[styles.dailyCardBtn, { backgroundColor: colors.emeraldCardBg, borderColor: colors.emeraldCardBorder }]}
            onPress={() => router.push('/muhaddisin')}
          >
            <Ionicons name="arrow-forward" size={16} color="#059669" />
            <Text style={[styles.dailyCardBtnText, { color: '#059669' }]}>বিস্তারিত</Text>
          </TouchableOpacity>
        </View>

        {/* আজকের দোয়া */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🤲 আজকের দোয়া</Text>
        <View style={[styles.dailyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.dailyCardIcon, { backgroundColor: 'rgba(37, 99, 235, 0.1)', borderColor: 'rgba(37, 99, 235, 0.2)' }]}>
            <Ionicons name="hand-left-outline" size={24} color="#2563EB" />
          </View>
          <View style={styles.dailyCardContent}>
            <Text style={[styles.dailyCardTitle, { color: colors.text }]} numberOfLines={2}>
              ঘুম থেকে ওঠার দোয়া: আলহামদু লিল্লা-হিল্লাযী আহ্ইয়া-না- বা'দা মা- আমা-তানা- ওয়া ইলাইহিন্ নুশূ-র।
            </Text>
            <Text style={[styles.dailyCardSource, { color: colors.textSecondary }]}>অর্থ: সকল প্রশংসা সেই আল্লাহর জন্য, যিনি আমাদেরকে মৃত্যুর পর জীবন দান করেছেন।</Text>
          </View>
          <TouchableOpacity
            style={[styles.dailyCardBtn, { backgroundColor: colors.blueCardBg, borderColor: colors.blueCardBorder }]}
            onPress={() => router.push('/doya')}
          >
            <Ionicons name="arrow-forward" size={16} color="#2563EB" />
            <Text style={[styles.dailyCardBtnText, { color: '#2563EB' }]}>বিস্তারিত</Text>
          </TouchableOpacity>
        </View>

        {/* জনপ্রিয় আর্টিকেল / বার */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 জনপ্রিয় আর্টিকেল</Text>

        {popularArticles.length > 0 ? (
          popularArticles.map((article) => (
            <TouchableOpacity
              key={article.id}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/article-detail', params: { articleId: article.id } })}
              style={[styles.articleCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              {/* User Profile Header */}
              {article.user && (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: colors.cardBorder }}>
                  {article.user.profile_image ? (
                    <Image source={{ uri: getImageUri(article.user.profile_image) }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} />
                  ) : (
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryBg, justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
                        {getUserName(article.user).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={{ fontWeight: '700', fontSize: 14, color: colors.text }}>
                      {getUserName(article.user)}
                    </Text>
                    {article.created_at && (
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                        {new Date(article.created_at).toLocaleDateString('bn-BD')}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              {/* Article Image - বড় */}
              {article.image && (
                <ImageBackground
                  source={{ uri: getImageUri(article.image) }}
                  style={styles.articleCardImage}
                  imageStyle={{ borderRadius: 0 }}
                  resizeMode="cover"
                >
                  <View style={styles.articleImageOverlay}>
                    <View style={styles.articleLikeBadge}>
                      <Ionicons name="heart" size={14} color="#fff" />
                      <Text style={styles.articleLikeText}>
                        {articleService.formatCount(article.reaction_count || 0)}
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              )}

              {/* Article Content */}
              <View style={styles.articleCardContent}>
                {/* Stats Row - না থাকলে image এর উপরে দেখাও */}
                {!article.image && (
                  <View style={styles.articleStatsTop}>
                    <View style={styles.articleLikeBadgeSmall}>
                      <Ionicons name="heart" size={12} color="#EF4444" />
                      <Text style={[styles.articleStatsText, { color: colors.textSecondary }]}>
                        {articleService.formatCount(article.reaction_count || 0)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Header Row with Content Preview & AI Sparkles Icon */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={[styles.articleCardTitle, { color: colors.text, flex: 1, marginRight: 8 }]} numberOfLines={2}>
                    {article.content || 'আর্টিকেল'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => handleToggleSummary(article.id)}
                    style={{ padding: 6, borderRadius: 20, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.08)' }}
                  >
                    <Ionicons 
                      name={showSummaries[article.id] ? "sparkles" : "sparkles-outline"} 
                      size={16} 
                      color="#6366F1" 
                    />
                  </TouchableOpacity>
                </View>

                {/* AI Summary Card */}
                {showSummaries[article.id] && (
                  <View style={{
                    marginTop: 4,
                    marginBottom: 8,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(99, 102, 241, 0.05)',
                    borderLeftWidth: 3,
                    borderLeftColor: '#6366F1',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Ionicons name="sparkles" size={12} color="#6366F1" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6366F1', letterSpacing: 0.5 }}>DEEPSEEK AI SUMMARY</Text>
                    </View>
                    {summaryLoading[article.id] ? (
                      <ActivityIndicator size="small" color="#6366F1" style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                    ) : (
                      <Text style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
                        {articleSummaries[article.id]}
                      </Text>
                    )}
                  </View>
                )}

                {/* Bottom Stats */}
                <View style={[styles.articleStatsRow, { borderTopColor: colors.cardBorder }]}>
                  <View style={styles.articleStatsLeft}>
                    <View style={styles.articleStatItem}>
                      <Ionicons name="heart-outline" size={14} color="#EF4444" />
                      <Text style={[styles.articleStatText, { color: colors.textMuted }]}>
                        {articleService.formatCount(article.reaction_count || 0)}
                      </Text>
                    </View>
                    <View style={styles.articleStatItem}>
                      <Ionicons name="chatbubble-outline" size={14} color="#2563EB" />
                      <Text style={[styles.articleStatText, { color: colors.textMuted }]}>
                        {articleService.formatCount(article.comment_count || 0)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.articleStatItem}>
                    <Ionicons name="eye-outline" size={14} color="#059669" />
                    <Text style={[styles.articleStatText, { color: colors.textMuted }]}>
                      {articleService.formatCount(article.view_count || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={[styles.emptyMiniCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={{ fontSize: 24 }}>📰</Text>
            <Text style={[styles.emptyMiniText, { color: colors.textSecondary }]}>এখনো কোনো আর্টিকেল নেই</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#EC4899', // Matching border-l-8 border-pink-500 from code snippet
    marginHorizontal: 16,
    borderRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  greeting: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroOuterWrapper: {
    borderRadius: 24,
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroCard: {
    borderRadius: 24,
    height: 320,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBgImage: {
    borderRadius: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroImageStyle: {
    borderRadius: 24,
  },
  heroOverlay: {
    padding: 16,
    paddingTop: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  heroDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  heroDotActive: {
    backgroundColor: '#FFFFFF',
    width: 20,
    borderRadius: 3.5,
  },
  heroDotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroZapBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBalanceLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  heroBalanceValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroBalanceSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroMetaItem: {
    flexDirection: 'column',
  },
  heroMetaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  heroMetaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroMetaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  // Prayer Section Styles
  prayerSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  prayerCard: {
    flex: 1,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  prayerCardNext: {
    flex: 1,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  prayerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prayerLabelNext: {
    fontSize: 9,
    fontWeight: '700',
    color: '#60A5FA',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  prayerNameNext: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  prayerTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 6,
  },
  prayerTimeNext: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#34D399',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  heroMetaValueSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 12,
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: -0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statOuterCard: {
    width: '48%',
    borderRadius: 24,
    padding: 3,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statInnerCard: {
    borderRadius: 21,
    padding: 14,
    borderWidth: 1,
  },
  statIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statCardTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statSubPill: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  statSubPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  streamCard: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  streamStripe: {
    width: 5,
    height: '100%',
  },
  streamCardContent: {
    flex: 1,
    padding: 14,
  },
  streamTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  streamTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  streamTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  streamTypeBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  streamTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  streamMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  streamTokenText: {
    fontSize: 12,
    fontWeight: '600',
  },
  streamTokenDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  streamLikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streamLikeCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  streamImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
  },
  emptyMiniCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  emptyMiniText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  // Article Card - Facebook style বড় কার্ড
  articleCard: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  articleCardImage: {
    width: '100%',
    height: 200,
  },
  articleImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  articleLikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  articleLikeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  articleCardContent: {
    padding: 14,
  },
  articleStatsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleLikeBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articleStatsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  articleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  articleStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  articleStatsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  articleStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  articleStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Daily Card (আজকের হাদীস / আজকের দোয়া)
  dailyCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dailyCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyCardContent: {
    flex: 1,
  },
  dailyCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 4,
  },
  dailyCardSource: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  dailyCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dailyCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
