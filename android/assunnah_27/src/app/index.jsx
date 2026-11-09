import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  Image,
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive cover dimensions matching 1.372 aspect ratio
const COVER_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.72), 320);
const COVER_HEIGHT = Math.round(COVER_WIDTH * 1.372);

const SLIDE_DURATION = 2800; // 2.8 seconds per slide

const COVERS = [
  {
    id: 1,
    image: require('../../assets/expo.icon/Assets/images/proccod_1.jpeg'),
    edition: 'প্রথম প্রচ্ছদ',
    title: 'হৃদয়ে আস-সুন্নাহ',
    subtitle: 'বিদায়ী স্মৃতি ২০২৭ • দাওরায়ে হাদীস সমাপনী',
    institution: 'জামিয়াতুস সুন্নাহ • মাদারীপুর',
  },
  {
    id: 2,
    image: require('../../assets/expo.icon/Assets/images/proccod_2.jpeg'),
    edition: 'দ্বিতীয় প্রচ্ছদ',
    title: 'হৃদয়ে আস-সুন্নাহ',
    subtitle: 'বিদায়ী স্মৃতি ২০২৭ • দাওরায়ে হাদীস সমাপনী',
    institution: 'জামিয়াতুস সুন্নাহ • মাদারীপুর',
  },
  {
    id: 3,
    image: require('../../assets/expo.icon/Assets/images/proccod_3.jpeg'),
    edition: 'তৃতীয় প্রচ্ছদ',
    title: 'হৃদয়ে আস-সুন্নাহ',
    subtitle: 'বিদায়ী স্মৃতি ২০২৭ • দাওরায়ে হাদীস সমাপনী',
    institution: 'জামিয়াতুস সুন্নাহ • মাদারীপুর',
  },
];

export default function HomeRedirect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { redirectAfterLogout } = useAuth();

  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
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

    // Smooth transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentIndex(nextIndex);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Auto-advance timer and progress bar
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

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="book" size={13} color="#FBBF24" />
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
          <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Center Showcase Area (Dedicated flex: 1 space, zero overlap) */}
      <View style={styles.showcaseArea}>
        <Animated.View
          style={[
            styles.animatedWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={handleNextPress}
            style={styles.coverCard}
          >
            <Image
              source={currentCover.image}
              style={styles.coverImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Bottom Information & Controls (Natural flow below cover) */}
      <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
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
            <View style={{ width: 44 }} />
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
    backgroundColor: '#070D18',
    justifyContent: 'space-between',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
    zIndex: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  brandIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 4,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  showcaseArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  animatedWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverCard: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  coverImage: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
  },
  bottomCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  metaSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  editionBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: 4,
  },
  editionBadgeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 2,
    textAlign: 'center',
  },
  institutionText: {
    fontSize: 11,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  primaryActionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
