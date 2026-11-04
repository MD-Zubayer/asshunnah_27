import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useColorScheme, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getImageUri } from '../utils/image';
import { useAuth } from '../context/AuthContext';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function TopNavbar({ showSettings = true }) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { user, isGuest } = useAuth();

    // Animation values
    const scale = useSharedValue(1);

    const userName = isGuest ? 'অতিথি' : (user?.first_name || 'ব্যবহারকারী');
    
    const profileImage = getImageUri(user?.profile_image);

    const handleSettingsPress = () => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
        setTimeout(() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 400 });
            if (isGuest) {
                router.push('/login');
            } else {
                router.push('/(tabs)/profile');
            }
        }, 150);
    };

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Get first letter for avatar fallback
    const getInitial = (name) => {
        if (!name) return 'ব';
        return name.charAt(0).toUpperCase();
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
            <View
                style={[
                    styles.gradient,
                    {
                        backgroundColor: isDark ? '#0f2922' : '#008080',
                    },
                ]}
            >
                <View style={styles.content}>
                    {/* Profile Section */}
                    <TouchableOpacity
                        style={styles.profileSection}
                        onPress={() => {
                            if (isGuest) {
                                router.push('/login');
                            } else {
                                router.push('/(tabs)/profile');
                            }
                        }}
                        activeOpacity={0.8}
                    >
                        {/* Profile Photo */}
                        <View style={styles.avatarContainer}>
                            {profileImage ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={styles.avatarFallback}>
                                    <Text style={styles.avatarText}>{getInitial(userName)}</Text>
                                </View>
                            )}
                            {/* Online Indicator */}
                            <View style={[styles.onlineIndicator, { backgroundColor: '#4ade80' }]} />
                        </View>

                        {/* User Name */}
                        <View style={styles.nameContainer}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {userName}
                            </Text>
                            {isGuest && (
                                <View style={styles.guestBadge}>
                                    <Ionicons name="eye-outline" size={10} color="#FFD60A" />
                                    <Text style={styles.guestBadgeText}>অতিথি মোড</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* Right Side - Login Button for Guests / Settings for Users */}
                    {showSettings && isGuest && (
                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={() => router.push('/login')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="log-in-outline" size={18} color="#fff" />
                            <Text style={styles.loginButtonText}>লগ ইন</Text>
                        </TouchableOpacity>
                    )}
                    {showSettings && !isGuest && (
                        <AnimatedTouchable
                            style={[styles.settingsButton, animatedIconStyle]}
                            onPress={handleSettingsPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.settingsIconContainer}>
                                <Ionicons name="settings-outline" size={22} color="#fff" />
                            </View>
                        </AnimatedTouchable>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        zIndex: 100,
    },
    gradient: {
        paddingHorizontal: 20,
        paddingBottom: 14,
        paddingTop: 8,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    avatarFallback: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#008080',
    },
    nameContainer: {
        flex: 1,
    },
    userName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.2,
    },
    guestBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 214, 10, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
        alignSelf: 'flex-start',
        gap: 3,
    },
    guestBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#FFD60A',
        letterSpacing: 0.3,
    },
    settingsButton: {
        padding: 8,
    },
    settingsIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    loginButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },
});