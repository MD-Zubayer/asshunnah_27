import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  useColorScheme,
  Image,
  Platform,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SLIDE_DURATION = 2600; // 2.6 seconds per cover slide

const COVERS = [
  {
    id: 1,
    image: require('../../assets/expo.icon/Assets/images/proccod_1.jpeg'),
    edition: 'প্রথম সংস্করণ',
    title: 'হৃদয়ে আস-সুন্নাহ',
    subtitle: 'বিদায়ী স্মৃতি ২০২৭ • দাওরায়ে হাদীস',
    institution: 'জামিয়াতুস সুন্নাহ',
  },
  {
    id: 2,
    image: require('../../assets/expo.icon/Assets/images/proccod_2.jpeg'),
    edition: 'দ্বিতীয় সংস্করণ',
    title: 'হৃদয়ে আস-সুন্নাহ',
    subtitle: 'বিদায়ী স্মৃতি ২০২৭ • দাওরায়ে হাদীস',
    institution: 'জামিয়াতুস সুন্নাহ',
  },
  {
    id: 3,
    image: require('../../assets/expo.icon/Assets/images/proccod_3.jpeg'),
    edition: 'তৃতীয় সংস্করণ',
    title: 'হৃদয়ে আস-সুন্নাহ',
    subtitle: 'বিদায়ী স্মৃতি ২০২৭ • দাওরায়ে হাদীস',
    institution: 'জামিয়াতুস সুন্নাহ',
  },
];

export default function HomeRedirect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { redirectAfterLogout } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const hasNavigated = useRef(false);

  // If redirected immediately after logout, skip to login
  if (redirectAfterLogout) {
    return <Redirect href="/login" />;
  }

  const navigateToHome = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    router.replace('/(tabs)');
  };

  const goToSlide = (nextIndex) => {
    if (nextIndex >= COVERS.length) {
      navigateToHome();
      return;
    }

    // Smooth fade transition
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(nextIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    });
  };

  // Progress bar and auto-advance timer for current slide
  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SLIDE_DURATION,
      useNativeDriver: false,
    }).start();

    timerRef.current = setTimeout(() => {
      if (currentIndex < COVERS.length - 1) {
        goToSlide(currentIndex + 1);
      } else {
        navigateToHome();
      }
    }, SLIDE_DURATION);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex]);

  const handleNextPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (currentIndex < COVERS.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      navigateToHome();
    }
  };

  const handlePrevPress = () => {
    if (currentIndex > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      goToSlide(currentIndex - 1);
    }
  };

  const currentCover = COVERS[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Blurred / Dimmed Backdrop */}
      <Image
        key={`bg-${currentIndex}`}
        source={currentCover.image}
        style={StyleSheet.absoluteFillObject}
        blurRadius={Platform.OS === 'ios' ? 24 : 12}
        resizeMode="cover"
      />
      <View style={styles.darkBackdrop} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { top: insets.top + 8 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="book" size={14} color="#FBBF24" />
          </View>
          <Text style={styles.brandName}>আস-সুন্নাহ প্রকাশনা</Text>
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={navigateToHome}
          style={styles.skipButton}
        >
          <Text style={styles.skipButtonText}>এড়িয়ে যান</Text>
          <Ionicons name="chevron-forward" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Cover Display with Cross-Fade */}
      <Animated.View style={[styles.coverContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          activeOpacity={0.98}
          onPress={handleNextPress}
          style={styles.touchableCover}
        >
          <Image
            source={currentCover.image}
            style={styles.coverImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Information & Controls */}
      <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
        {/* Step Progress Indicators */}
        <View style={styles.progressRow}>
          {COVERS.map((item, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <View key={item.id} style={styles.progressTrack}>
                {isCompleted && <View style={[styles.progressFill, { width: '100%' }]} />}
                {isCurrent && (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Cover Meta Texts */}
        <Animated.View style={[styles.metaSection, { opacity: fadeAnim }]}>
          <View style={styles.editionBadge}>
            <Text style={styles.editionBadgeText}>{currentCover.edition}</Text>
          </View>
          <Text style={styles.coverTitle}>{currentCover.title}</Text>
          <Text style={styles.coverSubtitle}>{currentCover.subtitle}</Text>
          <Text style={styles.institutionText}>{currentCover.institution}</Text>
        </Animated.View>

        {/* Action Controls */}
        <View style={styles.controlsRow}>
          {currentIndex > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePrevPress}
              style={styles.backArrowBtn}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNextPress}
            style={styles.primaryActionBtn}
          >
            <Text style={styles.primaryActionBtnText}>
              {currentIndex === COVERS.length - 1 ? 'মূল অ্যাপে প্রবেশ করুন' : 'পরবর্তী প্রচ্ছদ'}
            </Text>
            <Ionicons
              name={currentIndex === COVERS.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
              size={18}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  darkBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.72)',
  },
  headerBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    gap: 8,
  },
  brandIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    gap: 4,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  coverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 220,
    zIndex: 10,
  },
  touchableCover: {
    width: SCREEN_WIDTH * 0.78,
    height: SCREEN_HEIGHT * 0.52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 22,
    paddingTop: 18,
    zIndex: 30,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  metaSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  editionBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    marginBottom: 6,
  },
  editionBadgeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  coverTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 4,
    textAlign: 'center',
  },
  institutionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backArrowBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  primaryActionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
