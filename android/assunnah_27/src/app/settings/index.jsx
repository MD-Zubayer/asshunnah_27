import { StyleSheet, Text, View, ScrollView, useColorScheme, ActivityIndicator, TouchableOpacity, Alert, Appearance, TextInput, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../constants/api';
import { getAccountTypeInfo } from '../../constants/accountTypes';

export default function SettingsScreen() {
    const scheme = useColorScheme();
    const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
    const insets = useSafeAreaInsets();
    const isDark = scheme === 'dark';
    const router = useRouter();
    const {
        isSignedIn,
        isLoading,
        user,
        logout,
        isGuest,
        token,
        sendEmailVerification,
        confirmEmailVerification,
        changePassword,
    } = useAuth();
    const [darkModeEnabled, setDarkModeEnabled] = useState(isDark);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Email verification state
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailOtp, setEmailOtp] = useState('');
    const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
    const [emailCooldown, setEmailCooldown] = useState(0);
    const [emailModalError, setEmailModalError] = useState('');
    const [emailModalMessage, setEmailModalMessage] = useState('');

    // Change password state
    const [showChangePwModal, setShowChangePwModal] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [changePwLoading, setChangePwLoading] = useState(false);
    const [changePwError, setChangePwError] = useState('');

    useEffect(() => {
        let timer;
        if (emailCooldown > 0) {
            timer = setInterval(() => {
                setEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [emailCooldown]);

    const handleSendEmailVerification = async () => {
        if (emailCooldown > 0) return;
        setEmailVerifyLoading(true);
        setEmailModalError('');
        setEmailModalMessage('');
        try {
            const res = await sendEmailVerification();
            if (res.success) {
                if (res.already_verified) {
                    Alert.alert('তথ্য', 'আপনার ইমেইল ইতিমধ্যে ভেরিফাই করা আছে।');
                    setShowEmailModal(false);
                } else {
                    setEmailModalMessage(res.message || 'আপনার ইমেইলে ৬ ডিজিটের ওটিপি কোড পাঠানো হয়েছে।');
                    setEmailCooldown(60);
                    setShowEmailModal(true);
                }
            } else {
                const errMsg = typeof res.message === 'object' ? JSON.stringify(res.message) : (res.message || 'ওটিপি পাঠানো যায়নি।');
                Alert.alert('ত্রুটি', errMsg);
            }
        } catch (e) {
            Alert.alert('ত্রুটি', 'নেটওয়ার্ক সংযোগ সমস্যা।');
        } finally {
            setEmailVerifyLoading(false);
        }
    };

    const handleConfirmEmailOtp = async () => {
        if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
            setEmailModalError('৬ ডিজিটের সঠিক OTP কোড প্রবেশ করান।');
            return;
        }
        setEmailVerifyLoading(true);
        setEmailModalError('');
        try {
            const res = await confirmEmailVerification(emailOtp.trim());
            if (res.success) {
                setShowEmailModal(false);
                setEmailOtp('');
                Alert.alert('সফল', 'আপনার ইমেইল সফলভাবে ভেরিফাই করা হয়েছে!');
            } else {
                const errMsg = typeof res.message === 'object'
                    ? (res.message?.otp?.[0] || res.message?.email?.[0] || res.message?.detail || JSON.stringify(res.message))
                    : (res.message || 'ওটিপি সঠিক নয়।');
                setEmailModalError(errMsg);
            }
        } catch (e) {
            setEmailModalError('নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।');
        } finally {
            setEmailVerifyLoading(false);
        }
    };

    const handleChangePasswordSubmit = async () => {
        setChangePwError('');
        if (!oldPassword) {
            setChangePwError('বর্তমান পাসওয়ার্ড প্রদান করুন।');
            return;
        }
        if (!newPassword || newPassword.length < 8) {
            setChangePwError('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            setChangePwError('নতুন পাসওয়ার্ড দুটি মিলছে না।');
            return;
        }

        setChangePwLoading(true);
        try {
            const res = await changePassword(oldPassword, newPassword, newPasswordConfirm);
            if (res.success) {
                setShowChangePwModal(false);
                setOldPassword('');
                setNewPassword('');
                setNewPasswordConfirm('');
                Alert.alert('সফল', 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।');
            } else {
                const errMsg = typeof res.message === 'object'
                    ? (res.message?.old_password?.[0] || res.message?.new_password?.[0] || res.message?.detail || JSON.stringify(res.message))
                    : (res.message || 'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
                setChangePwError(errMsg);
            }
        } catch (e) {
            setChangePwError('নেটওয়ার্ক সংযোগ সমস্যা।');
        } finally {
            setChangePwLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading && !isSignedIn) {
            router.replace('/login');
        }
    }, [isLoading, isSignedIn, router]);

    // Guest users cannot access settings
    useEffect(() => {
        if (isGuest) {
            Alert.alert(
                'অতিথি মোড',
                'সেটিংস ব্যবহার করতে লগ ইন করুন।',
                [{ text: 'ঠিক আছে', onPress: () => router.replace('/(tabs)/index') }]
            );
        }
    }, [isGuest, router]);

    const handleMenuItemPress = (item) => {
        if (item.id === 'verify_email') {
            if (user?.is_email_verified) {
                Alert.alert('ইমেইল ভেরিফাইড', 'আপনার ইমেইল ঠিকানাটি ইতোমধ্যে সফলভাবে ভেরিফাই করা হয়েছে।');
            } else {
                handleSendEmailVerification();
            }
            return;
        }
        if (item.id === 'change_password') {
            setChangePwError('');
            setShowChangePwModal(true);
            return;
        }
        if (item.id === 'switch_account') {
            router.push('/switch-account-type');
            return;
        }
        if (item.id === 'privacy_policy') {
            Linking.openURL('https://api-assunnah-27.newsmartagent.com/privacy-policy/');
            return;
        }
        if (item.id === 3) {
            const nextValue = !darkModeEnabled;
            setDarkModeEnabled(nextValue);
            Appearance.setColorScheme(nextValue ? 'dark' : 'light');
            Alert.alert(
                'ডার্ক মোড',
                nextValue ? 'ডার্ক মোড চালু হয়েছে' : 'লাইট মোড চালু হয়েছে',
                [{ text: 'ঠিক আছে' }]
            );
        }
    };

    if (isLoading || !isSignedIn) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Guest restriction screen
    if (isGuest) {
        return (
            <View style={[styles.guestContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.guestCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={[styles.guestIconContainer, { backgroundColor: colors.primaryBg }]}>
                        <Ionicons name="lock-closed" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.guestTitle, { color: colors.text }]}>অতিথি মোড সীমাবদ্ধ</Text>
                    <Text style={[styles.guestMessage, { color: colors.textSecondary }]}>
                        সেটিংস ব্যবহার করতে{'\n'}লগ ইন করুন বা অ্যাকাউন্ট তৈরি করুন।
                    </Text>
                    <TouchableOpacity
                        style={[styles.guestLoginButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.replace('/login')}
                    >
                        <Text style={styles.guestLoginButtonText}>লগ ইন করুন</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const accountInfo = getAccountTypeInfo(user?.profile_type);

    const menuItems = [
        {
            section: 'অ্যাকাউন্ট',
            items: [
                {
                    id: 'verify_email',
                    icon: user?.is_email_verified ? 'shield-checkmark-outline' : 'shield-outline',
                    label: 'ইমেইল ভেরিফিকেশন',
                    color: user?.is_email_verified ? '#10B981' : '#F59E0B',
                    value: user?.is_email_verified ? 'ভেরিফাইড' : 'যাচাই করুন',
                },
                {
                    id: 'change_password',
                    icon: 'key-outline',
                    label: 'পাসওয়ার্ড পরিবর্তন',
                    color: '#6366F1',
                },
                {
                    id: 'switch_account',
                    icon: 'swap-horizontal-outline',
                    label: 'অ্যাকাউন্টের ধরন পরিবর্তন',
                    color: accountInfo.color,
                    value: accountInfo.shortLabel,
                },
            ],
        },
        {
            section: 'সাধারণ',
            items: [
                { id: 1, icon: 'notifications-outline', label: 'নোটিফিকেশন', color: '#FF9500' },
                { id: 2, icon: 'language-outline', label: 'ভাষা', color: '#007AFF', value: 'বাংলা' },
                { id: 3, icon: 'moon-outline', label: 'ডার্ক মোড', color: '#8E8E93', isToggle: true },
            ],
        },
        {
            section: 'শিক্ষা',
            items: [
                { id: 4, icon: 'book-outline', label: 'পঠিত সূরা', color: colors.primary, value: '১২টি' },
                { id: 5, icon: 'trophy-outline', label: 'অর্জন', color: '#FFD60A', value: '৮টি' },
                { id: 6, icon: 'trending-up-outline', label: 'অগ্রগতি', color: '#30D158' },
            ],
        },
        {
            section: 'অন্যান্য',
            items: [
                { id: 'privacy_policy', icon: 'shield-half-outline', label: 'গোপনীয়তা নীতি (Privacy Policy)', color: '#059669' },
                { id: 7, icon: 'help-circle-outline', label: 'সাহায্য', color: '#8E8E93' },
                { id: 8, icon: 'information-circle-outline', label: 'অ্যাপ সম্পর্কে', color: '#8E8E93' },
            ],
        },
    ];

    const handleBack = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.cardBorder }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>সেটিংস</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* User Info Card */}
                <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.userAvatarText}>
                            {(user?.first_name || 'U').charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: colors.text }]}>
                            {user?.first_name || 'ব্যবহারকারী'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap', gap: 6 }}>
                            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                                {user?.email || ''}
                            </Text>
                            {user?.is_email_verified ? (
                                <View style={[styles.verifiedBadge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                                    <Ionicons name="checkmark-circle" size={11} color="#059669" />
                                    <Text style={[styles.verifiedBadgeText, { color: '#059669' }]}>ভেরিফাইড</Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.verifiedBadge, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                                    onPress={handleSendEmailVerification}
                                >
                                    <Ionicons name="alert-circle" size={11} color="#D97706" />
                                    <Text style={[styles.verifiedBadgeText, { color: '#D97706' }]}>যাচাই করুন</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity onPress={handleBack}>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Unverified Email Warning Banner */}
                {!user?.is_email_verified ? (
                    <View style={[styles.unverifiedBanner, { backgroundColor: isDark ? '#451A03' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Ionicons name="shield-outline" size={24} color="#D97706" style={{ marginRight: 10 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.bannerTitle, { color: isDark ? '#FEF3C7' : '#92400E' }]}>
                                    ইমেইল ভেরিফাই করা হয়নি
                                </Text>
                                <Text style={[styles.bannerDesc, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                                    অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে কোড পাঠিয়ে ইমেইল যাচাই করুন।
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.verifyNowBtn, { backgroundColor: '#D97706' }]}
                            onPress={handleSendEmailVerification}
                            disabled={emailVerifyLoading}
                        >
                            {emailVerifyLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.verifyNowBtnText}>ভেরিফাই</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Menu Sections */}
                {menuItems.map((section) => (
                    <View key={section.section}>
                        <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
                            {section.section}
                        </Text>
                        <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                            {section.items.map((item, index) => (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => handleMenuItemPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.menuItem,
                                            index < section.items.length - 1 && {
                                                borderBottomWidth: 1,
                                                borderBottomColor: colors.cardBorder,
                                            },
                                        ]}
                                    >
                                        <View style={styles.menuItemLeft}>
                                            <View style={[styles.menuItemIcon, { backgroundColor: colors.backgroundElement }]}>
                                                <Ionicons name={item.icon} size={20} color={item.color} />
                                            </View>
                                            <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
                                        </View>
                                        <View style={styles.menuItemRight}>
                                            {item.value && (
                                                <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>
                                                    {item.value}
                                                </Text>
                                            )}
                                            {item.isToggle ? (
                                                <View style={[styles.toggle, { backgroundColor: darkModeEnabled ? colors.primary : colors.backgroundElement }]}>
                                                    <View style={[styles.toggleKnob, { alignSelf: darkModeEnabled ? 'flex-end' : 'flex-start', backgroundColor: '#fff' }]} />
                                                </View>
                                            ) : (
                                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                {/* Logout Button */}
                <TouchableOpacity
                    style={[styles.logoutButton, { backgroundColor: colors.errorBg }]}
                    onPress={async () => {
                        Alert.alert('লগ আউট', 'আপনি কি লগ আউট করতে চান?', [
                            { text: 'বাতিল', style: 'cancel' },
                            { text: 'লগ আউট', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
                        ]);
                    }}
                    activeOpacity={0.7}
                >
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                    <Text style={[styles.logoutText, { color: colors.error }]}>লগ আউট</Text>
                </TouchableOpacity>

                {/* Delete Account Button */}
                <TouchableOpacity
                    style={[styles.deleteAccountButton, { borderColor: colors.error }]}
                    onPress={() => setShowDeleteModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={[styles.deleteAccountText, { color: colors.error }]}>অ্যাকাউন্ট ডিলিট করুন</Text>
                </TouchableOpacity>

                {/* Bottom spacing */}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Delete Account Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={[styles.modalIconContainer, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="warning" size={32} color="#EF4444" />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>অ্যাকাউন্ট ডিলিট করুন</Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                            এটি স্থায়ীভাবে আপনার অ্যাকাউন্ট এবং সমস্ত ডেটা মুছে ফেলবে। এই ক্রিয়াটি পূর্বাবস্থায় ফেরানো যাবে না।
                        </Text>

                        <TextInput
                            style={[styles.passwordInput, { backgroundColor: colors.backgroundElement, color: colors.text, borderColor: colors.cardBorder }]}
                            placeholder="আপনার পাসওয়ার্ড লিখুন"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={deletePassword}
                            onChangeText={setDeletePassword}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.backgroundElement }]}
                                onPress={() => {
                                    setShowDeleteModal(false);
                                    setDeletePassword('');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>বাতিল</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.deleteButton, { backgroundColor: '#EF4444' }]}
                                onPress={async () => {
                                    if (!deletePassword.trim()) {
                                        Alert.alert('ত্রুটি', 'পাসওয়ার্ড দিন');
                                        return;
                                    }
                                    setDeleteLoading(true);
                                    try {
                                        const response = await fetch(`${API_BASE_URL}/api/auth/delete-account/`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Token ${token}`,
                                            },
                                            body: JSON.stringify({ password: deletePassword }),
                                        });
                                        const data = await response.json();
                                        if (response.ok) {
                                            Alert.alert('সফল', data.message || 'অ্যাকাউন্ট ডিলিট করা হয়েছে');
                                            setShowDeleteModal(false);
                                            setDeletePassword('');
                                            await logout();
                                            router.replace('/login');
                                        } else {
                                            Alert.alert('ত্রুটি', data.error || 'অ্যাকাউন্ট ডিলিট করা যায়নি');
                                        }
                                    } catch (error) {
                                        Alert.alert('ত্রুটি', 'নেটওয়ার্ক সমস্যা');
                                    } finally {
                                        setDeleteLoading(false);
                                    }
                                }}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>ডিলিট করুন</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Email Verification Modal */}
            <Modal
                visible={showEmailModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowEmailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                        <View style={[styles.modalIconContainer, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="mail-open-outline" size={32} color="#059669" />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>ইমেইল ভেরিফিকেশন</Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                            {emailModalMessage || `${user?.email} ঠিকানায় প্রেরিত ৬ ডিজিটের OTP কোডটি দিন।`}
                        </Text>

                        <TextInput
                            style={[
                                styles.passwordInput,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: colors.inputBorder,
                                    color: colors.text,
                                    textAlign: 'center',
                                    fontSize: 20,
                                    letterSpacing: 8,
                                    fontWeight: 'bold',
                                },
                            ]}
                            placeholder="123456"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={6}
                            value={emailOtp}
                            onChangeText={setEmailOtp}
                        />

                        {emailModalError ? (
                            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                                {emailModalError}
                            </Text>
                        ) : null}

                        {/* Resend Cooldown Row */}
                        <TouchableOpacity
                            style={{ marginBottom: 18 }}
                            onPress={emailCooldown === 0 ? handleSendEmailVerification : null}
                            disabled={emailCooldown > 0 || emailVerifyLoading}
                        >
                            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                                কোড পাননি?{' '}
                                {emailCooldown > 0 ? (
                                    <Text style={{ color: colors.textMuted }}>
                                        পুনরায় পাঠান ({emailCooldown} সে.)
                                    </Text>
                                ) : (
                                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                                        পুনরায় OTP পাঠান
                                    </Text>
                                )}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: colors.cardBorder, borderWidth: 1 }]}
                                onPress={() => {
                                    setShowEmailModal(false);
                                    setEmailOtp('');
                                    setEmailModalError('');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>বাতিল</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleConfirmEmailOtp}
                                disabled={emailVerifyLoading}
                            >
                                {emailVerifyLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>যাচাই করুন</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={showChangePwModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowChangePwModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                        <View style={[styles.modalIconContainer, { backgroundColor: colors.primaryBg }]}>
                            <Ionicons name="key-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>পাসওয়ার্ড পরিবর্তন</Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
                            আপনার বর্তমান পাসওয়ার্ড দিন এবং কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড সেট করুন।
                        </Text>

                        <TextInput
                            style={[
                                styles.passwordInput,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: colors.inputBorder,
                                    color: colors.text,
                                    marginBottom: 12,
                                },
                            ]}
                            placeholder="বর্তমান পাসওয়ার্ড"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={oldPassword}
                            onChangeText={setOldPassword}
                        />

                        <TextInput
                            style={[
                                styles.passwordInput,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: colors.inputBorder,
                                    color: colors.text,
                                    marginBottom: 12,
                                },
                            ]}
                            placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />

                        <TextInput
                            style={[
                                styles.passwordInput,
                                {
                                    backgroundColor: colors.inputBg,
                                    borderColor: colors.inputBorder,
                                    color: colors.text,
                                    marginBottom: 14,
                                },
                            ]}
                            placeholder="নতুন পাসওয়ার্ড নিশ্চিত করুন"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            value={newPasswordConfirm}
                            onChangeText={setNewPasswordConfirm}
                        />

                        {changePwError ? (
                            <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 14, textAlign: 'center' }}>
                                {changePwError}
                            </Text>
                        ) : null}

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: colors.cardBorder, borderWidth: 1 }]}
                                onPress={() => {
                                    setShowChangePwModal(false);
                                    setOldPassword('');
                                    setNewPassword('');
                                    setNewPasswordConfirm('');
                                    setChangePwError('');
                                }}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.text }]}>বাতিল</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={handleChangePasswordSubmit}
                                disabled={changePwLoading}
                            >
                                {changePwLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={[styles.modalButtonText, { color: '#fff' }]}>সংরক্ষণ করুন</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        position: 'relative',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    // User Card
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 13,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        gap: 3,
    },
    verifiedBadgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    unverifiedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 20,
        gap: 10,
    },
    bannerTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    bannerDesc: {
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    verifyNowBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    verifyNowBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    // Menu
    menuSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginLeft: 4,
    },
    menuCard: {
        borderRadius: 16,
        paddingVertical: 4,
        borderWidth: 1,
        marginBottom: 24,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuItemLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuItemValue: {
        fontSize: 13,
    },
    toggle: {
        width: 44,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    toggleKnob: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 16,
        marginTop: 8,
        gap: 8,
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
    },
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        paddingVertical: 16,
        marginTop: 12,
        gap: 8,
        borderWidth: 1,
    },
    deleteAccountText: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    passwordInput: {
        width: '100%',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        borderWidth: 1,
        marginBottom: 20,
    },
});
