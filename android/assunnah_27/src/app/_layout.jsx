import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme, View, ActivityIndicator, Text, TouchableOpacity, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CallProvider, useCall } from '../context/CallContext';
import { processQueue } from '../services/offlineQueueService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import '../i18n';

SplashScreen.preventAutoHideAsync().catch(() => { });

function OfflineSyncListener() {
  const { token } = useAuth();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && token) {
        // Process offline queue when back online
        processQueue(token).catch(console.error);
      }
    });

    return () => unsubscribe();
  }, [token]);

  return null;
}

// Auth Gate - waits for auth initialization before rendering
function AuthGate({ children }) {
  const { isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized) {
      // Hide splash screen only after auth is fully initialized
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [isInitialized]);

  if (!isInitialized) {
    // Keep splash screen visible while initializing
    return null;
  }

  return children;
}

// Global Floating Call Banner for ongoing background calls
function FloatingCallBanner() {
  const { callStatus, duration, otherUserName, isMinimized, restoreCall, hangupCall } = useCall();
  const insets = useSafeAreaInsets();

  if (callStatus === 'idle' || !isMinimized) {
    return null;
  }

  const formatDuration = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={restoreCall}
      style={[styles.floatingBanner, { top: insets.top + 6 }]}
    >
      <View style={styles.bannerRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.bannerText} numberOfLines={1}>
          {callStatus === 'connected'
            ? `চলমান কল (${formatDuration(duration)}) • ${otherUserName}`
            : `চলমান কল (সংযোগ হচ্ছে...) • ${otherUserName}`}
        </Text>
      </View>
      <View style={styles.rightActionsRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={(e) => {
            e.stopPropagation();
            hangupCall();
          }}
          style={styles.bannerHangupBtn}
        >
          <Ionicons name="call" size={14} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color="#10B981" style={{ marginLeft: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    'Atma-Regular': require('../../assets/fonts/Atma-Regular.ttf'),
    'Atma-Bold': require('../../assets/fonts/Atma-Bold.ttf'),
    'Galada-Regular': require('../../assets/fonts/Galada-Regular.ttf'),
    'HindSiliguri-Regular': require('../../assets/fonts/HindSiliguri-Regular.ttf'),
    'HindSiliguri-Bold': require('../../assets/fonts/HindSiliguri-Bold.ttf'),
    'NotoSerifBengali-Regular': require('../../assets/fonts/NotoSerifBengali-Regular.ttf'),
    'Amiri-Regular': require('../../assets/fonts/Amiri-Regular.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <CallProvider>
            <OfflineSyncListener />
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }} />
              <FloatingCallBanner />
            </AuthGate>
          </CallProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  floatingBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 99999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 10,
  },
  bannerText: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '75%',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerHangupBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
});