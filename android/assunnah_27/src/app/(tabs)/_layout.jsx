import { StyleSheet, Text, View, useColorScheme, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const TAB_ICONS = {
  index: { focused: 'home', unfocused: 'home-outline' },
  diary: { focused: 'book', unfocused: 'book-outline' },
  article: { focused: 'newspaper', unfocused: 'newspaper-outline' },
  prayer: { focused: 'moon', unfocused: 'moon-outline' },
  profile: { focused: 'person', unfocused: 'person-outline' },
  more: { focused: 'grid', unfocused: 'grid-outline' },
};

const TAB_LABELS = {
  index: 'হোম',
  diary: 'ডায়েরি',
  article: 'প্রবন্ধ',
  prayer: 'নামাজ',
  profile: 'প্রোফাইল',
  more: 'আরো',
};

function TabIcon({ name, focused, color }) {
  const scale = useSharedValue(focused ? 1 : 0.8);
  const opacity = useSharedValue(focused ? 1 : 0.5);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.85, {
      damping: 12,
      stiffness: 200,
    });
    opacity.value = withTiming(focused ? 1 : 0.5, { duration: 150 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons
        name={name}
        size={focused ? 24 : 22}
        color={color}
      />
    </Animated.View>
  );
}

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const insets = useSafeAreaInsets();
  const isDark = scheme === 'dark';
  const { isGuest } = useAuth();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'android' ? 65 + insets.bottom : 85 + insets.bottom,
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.94)' : 'rgba(255, 255, 255, 0.94)',
          borderTopWidth: 1,
          borderTopColor: isDark ? '#334155' : '#E2E8F0',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          backdropFilter: Platform.OS === 'web' ? 'blur(20px)' : undefined,
        },
        tabBarActiveTintColor: isDark ? '#3B82F6' : '#2563EB',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? TAB_ICONS.index.focused : TAB_ICONS.index.unfocused}
              focused={focused}
              color={color}
            />
          ),
          tabBarLabel: TAB_LABELS.index,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? TAB_ICONS.diary.focused : TAB_ICONS.diary.unfocused}
              focused={focused}
              color={color}
            />
          ),
          tabBarLabel: TAB_LABELS.diary,
        }}
      />
      <Tabs.Screen
        name="article"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? TAB_ICONS.article.focused : TAB_ICONS.article.unfocused}
              focused={focused}
              color={color}
            />
          ),
          tabBarLabel: TAB_LABELS.article,
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? TAB_ICONS.prayer.focused : TAB_ICONS.prayer.unfocused}
              focused={focused}
              color={color}
            />
          ),
          tabBarLabel: TAB_LABELS.prayer,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? TAB_ICONS.profile.focused : TAB_ICONS.profile.unfocused}
              focused={focused}
              color={color}
            />
          ),
          tabBarLabel: TAB_LABELS.profile,
          href: isGuest ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon
              name={focused ? TAB_ICONS.more.focused : TAB_ICONS.more.unfocused}
              focused={focused}
              color={color}
            />
          ),
          tabBarLabel: TAB_LABELS.more,
        }}
      />
    </Tabs>
  );
}