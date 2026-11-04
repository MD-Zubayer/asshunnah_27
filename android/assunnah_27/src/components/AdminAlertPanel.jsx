import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';
import {
    getGlobalAlertConfigs,
    saveGlobalAlertConfigs,
    getAlertAnalytics,
    getUserAlertStats,
    sendPushNotification,
    toggleGlobalAlerts,
} from '../services/alert-service';

const PRAYER_LIST = [
    { key: 'fajr', name: 'ফজর', icon: 'moon-outline' },
    { key: 'dhuhr', name: 'যোহর', icon: 'sunny' },
    { key: 'asr', name: 'আসর', icon: 'partly-sunny' },
    { key: 'maghrib', name: 'মাগরিব', icon: 'partly-sunny-outline' },
    { key: 'isha', name: 'এশা', icon: 'moon' },
];

export default function AdminAlertPanel({ visible, onClose }) {
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const colors = Colors[isDark ? 'dark' : 'light'];
    const { token, user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('config'); // 'config', 'analytics', 'push'
    const [configs, setConfigs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [userStats, setUserStats] = useState([]);
    const [saving, setSaving] = useState(false);

    // Push notification form
    const [pushTitle, setPushTitle] = useState('');
    const [pushBody, setPushBody] = useState('');
    const [pushTarget, setPushTarget] = useState('all');
    const [pushSending, setPushSending] = useState(false);

    useEffect(() => {
        if (visible && token) {
            loadData();
        }
    }, [visible, token]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadConfigs(), loadAnalytics(), loadUserStats()]);
        } catch (e) {
            console.log('Error loading admin data', e);
        } finally {
            setLoading(false);
        }
    };

    const loadConfigs = async () => {
        const result = await getGlobalAlertConfigs(token);
        if (result.ok && Array.isArray(result.data)) {
            setConfigs(result.data);
        }
    };

    const loadAnalytics = async () => {
        const result = await getAlertAnalytics(token, 30);
        if (result.ok) {
            setAnalytics(result.data);
        }
    };

    const loadUserStats = async () => {
        const result = await getUserAlertStats(token, 30);
        if (result.ok && Array.isArray(result.data)) {
            setUserStats(result.data.slice(0, 10));
        }
    };

    const getConfigForPrayer = (prayerName) => {
        return configs.find(c => c.prayer_name === prayerName) || {
            prayer_name: prayerName,
            is_globally_enabled: true,
            default_offset_minutes: 0,
            notification_title_template: 'নামাজের সময় হয়েছে ({prayer_name})',
            notification_body_template: 'হালকা বিরতি নিন এবং নামাজের জন্য প্রস্তুতি নিন। এখন {prayer_name}-এর ওয়াক্ত।',
            is_adhan_enabled: false,
        };
    };

    const updateConfig = (prayerName, field, value) => {
        setConfigs(prev => prev.map(c =>
            c.prayer_name === prayerName
                ? { ...c, [field]: value }
                : c
        ));
        // If prayer not in configs yet, add it
        if (!configs.find(c => c.prayer_name === prayerName)) {
            setConfigs(prev => [...prev, {
                prayer_name: prayerName,
                is_globally_enabled: true,
                default_offset_minutes: 0,
                notification_title_template: 'নামাজের সময় হয়েছে ({prayer_name})',
                notification_body_template: 'হালকা বিরতি নিন এবং নামাজের জন্য প্রস্তুতি নিন। এখন {prayer_name}-এর ওয়াক্ত।',
                is_adhan_enabled: false,
                [field]: value,
            }]);
        }
    };

    const handleSaveConfigs = async () => {
        setSaving(true);
        try {
            const result = await saveGlobalAlertConfigs(token, configs);
            if (result.ok) {
                Alert.alert('সফল', 'গ্লোবাল অ্যালার্ট কনফিগ সেভ করা হয়েছে');
                await loadConfigs();
            } else {
                Alert.alert('ত্রুটি', typeof result.data === 'string' ? result.data : 'সেভ করা যায়নি');
            }
        } catch (e) {
            Alert.alert('ত্রুটি', e.message || 'নেটওয়ার্ক সমস্যা');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleAll = async (enable) => {
        Alert.alert(
            enable ? 'সব অ্যালার্ট চালু করুন' : 'সব অ্যালার্ট বন্ধ করুন',
            enable ? 'সব নামাজের অ্যালার্ট চালু হবে?' : 'সব নামাজের অ্যালার্ট বন্ধ হবে?',
            [
                { text: 'বাতিল', style: 'cancel' },
                {
                    text: 'নিশ্চিত',
                    onPress: async () => {
                        const result = await toggleGlobalAlerts(token, enable);
                        if (result.ok) {
                            Alert.alert('সফল', result.data?.message || 'আপডেট করা হয়েছে');
                            await loadConfigs();
                        }
                    }
                }
            ]
        );
    };

    const handleSendPush = async () => {
        if (!pushTitle.trim() || !pushBody.trim()) {
            Alert.alert('ত্রুটি', 'Title এবং Body আবশ্যক');
            return;
        }
        setPushSending(true);
        try {
            const result = await sendPushNotification(token, {
                title: pushTitle,
                body: pushBody,
                target: pushTarget,
            });
            if (result.ok) {
                Alert.alert('সফল', 'পুশ নোটিফিকেশন পাঠানো হয়েছে');
                setPushTitle('');
                setPushBody('');
            } else {
                Alert.alert('ত্রুটি', typeof result.data === 'string' ? result.data : 'পাঠানো যায়নি');
            }
        } catch (e) {
            Alert.alert('ত্রুটি', e.message);
        } finally {
            setPushSending(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>👑 Admin Alert Panel</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Tabs */}
                <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
                    {[
                        { key: 'config', label: 'কনফিগ', icon: 'settings-outline' },
                        { key: 'analytics', label: 'Analytics', icon: 'analytics-outline' },
                        { key: 'push', label: 'পুশ', icon: 'send-outline' },
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                            onPress={() => setActiveTab(tab.key)}
                        >
                            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1 }} />
                ) : (
                    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                        {/* Config Tab */}
                        {activeTab === 'config' && (
                            <View>
                                {/* Global Toggle */}
                                <View style={styles.globalToggleRow}>
                                    <TouchableOpacity
                                        style={[styles.globalToggleBtn, { backgroundColor: '#10B981' }]}
                                        onPress={() => handleToggleAll(true)}
                                    >
                                        <Ionicons name="power" size={16} color="#fff" />
                                        <Text style={styles.globalToggleText}>সব চালু</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.globalToggleBtn, { backgroundColor: '#EF4444' }]}
                                        onPress={() => handleToggleAll(false)}
                                    >
                                        <Ionicons name="power" size={16} color="#fff" />
                                        <Text style={styles.globalToggleText}>সব বন্ধ</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Per-prayer configs */}
                                {PRAYER_LIST.map(prayer => {
                                    const config = getConfigForPrayer(prayer.key);
                                    return (
                                        <View key={prayer.key} style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                            <View style={styles.configHeader}>
                                                <View style={styles.configHeaderLeft}>
                                                    <Ionicons name={prayer.icon} size={22} color={colors.primary} />
                                                    <Text style={[styles.configPrayerName, { color: colors.text }]}>{prayer.name}</Text>
                                                </View>
                                                <Switch
                                                    value={config.is_globally_enabled}
                                                    onValueChange={(val) => updateConfig(prayer.key, 'is_globally_enabled', val)}
                                                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                                                    thumbColor={config.is_globally_enabled ? colors.primary : '#f4f3f4'}
                                                />
                                            </View>

                                            {config.is_globally_enabled && (
                                                <>
                                                    <View style={styles.configRow}>
                                                        <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Default Offset (মিনিট)</Text>
                                                        <TextInput
                                                            style={[styles.configInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                                                            value={String(config.default_offset_minutes)}
                                                            onChangeText={(val) => updateConfig(prayer.key, 'default_offset_minutes', parseInt(val) || 0)}
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                            placeholderTextColor={colors.textSecondary}
                                                        />
                                                    </View>

                                                    <View style={styles.configRow}>
                                                        <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Notification Title</Text>
                                                        <TextInput
                                                            style={[styles.configInput, styles.configInputWide, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                                                            value={config.notification_title_template}
                                                            onChangeText={(val) => updateConfig(prayer.key, 'notification_title_template', val)}
                                                            placeholder="নামাজের সময় হয়েছে"
                                                            placeholderTextColor={colors.textSecondary}
                                                        />
                                                    </View>

                                                    <View style={styles.configRow}>
                                                        <Text style={[styles.configLabel, { color: colors.textSecondary }]}>Notification Body</Text>
                                                        <TextInput
                                                            style={[styles.configInput, styles.configInputWide, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                                                            value={config.notification_body_template}
                                                            onChangeText={(val) => updateConfig(prayer.key, 'notification_body_template', val)}
                                                            placeholder="বিবরণ"
                                                            placeholderTextColor={colors.textSecondary}
                                                            multiline
                                                        />
                                                    </View>

                                                    <View style={styles.configRow}>
                                                        <Text style={[styles.configLabel, { color: colors.textSecondary }]}>আজান চালু</Text>
                                                        <Switch
                                                            value={config.is_adhan_enabled}
                                                            onValueChange={(val) => updateConfig(prayer.key, 'is_adhan_enabled', val)}
                                                            trackColor={{ false: '#767577', true: '#81b0ff' }}
                                                            thumbColor={config.is_adhan_enabled ? colors.primary : '#f4f3f4'}
                                                        />
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    );
                                })}

                                <TouchableOpacity
                                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleSaveConfigs}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.saveBtnText}>কনফিগ সেভ করুন</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && analytics && (
                            <View>
                                {/* Summary Cards */}
                                <View style={styles.analyticsRow}>
                                    <View style={[styles.analyticsCard, { backgroundColor: '#EEF2FF' }]}>
                                        <Text style={styles.analyticsValue}>{analytics.summary?.total_alerts || 0}</Text>
                                        <Text style={styles.analyticsLabel}>মোট অ্যালার্ট</Text>
                                    </View>
                                    <View style={[styles.analyticsCard, { backgroundColor: '#ECFDF5' }]}>
                                        <Text style={styles.analyticsValue}>{analytics.summary?.delivered || 0}</Text>
                                        <Text style={styles.analyticsLabel}>ডেলিভার্ড</Text>
                                    </View>
                                    <View style={[styles.analyticsCard, { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={styles.analyticsValue}>{analytics.summary?.read || 0}</Text>
                                        <Text style={styles.analyticsLabel}>পঠিত</Text>
                                    </View>
                                </View>

                                <View style={styles.analyticsRow}>
                                    <View style={[styles.analyticsCard, { backgroundColor: '#F0FDF4' }]}>
                                        <Text style={[styles.analyticsValue, { color: '#059669' }]}>
                                            {analytics.summary?.delivery_rate || 0}%
                                        </Text>
                                        <Text style={styles.analyticsLabel}>Delivery Rate</Text>
                                    </View>
                                    <View style={[styles.analyticsCard, { backgroundColor: '#FFF7ED' }]}>
                                        <Text style={[styles.analyticsValue, { color: '#D97706' }]}>
                                            {analytics.summary?.read_rate || 0}%
                                        </Text>
                                        <Text style={styles.analyticsLabel}>Read Rate</Text>
                                    </View>
                                </View>

                                {/* Prayer Breakdown */}
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>ওয়াক্ত ভিত্তিক</Text>
                                {analytics.prayer_breakdown?.map(item => (
                                    <View key={item.prayer_name} style={[styles.statRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                        <Text style={[styles.statName, { color: colors.text }]}>
                                            {PRAYER_LIST.find(p => p.key === item.prayer_name)?.name || item.prayer_name}
                                        </Text>
                                        <View style={styles.statValues}>
                                            <Text style={[styles.statNum, { color: colors.text }]}>{item.total}</Text>
                                            <Text style={[styles.statSub, { color: '#10B981' }]}>✓{item.delivered}</Text>
                                            <Text style={[styles.statSub, { color: '#D97706' }]}>👁{item.read}</Text>
                                        </View>
                                    </View>
                                ))}

                                {/* Top Users */}
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Users (৩০ দিন)</Text>
                                {userStats.map((stat, idx) => (
                                    <View key={stat.user__id} style={[styles.userStatRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                        <Text style={[styles.userStatRank, { color: colors.primary }]}>#{idx + 1}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.userStatName, { color: colors.text }]}>
                                                {stat.user__first_name || stat.user__email}
                                            </Text>
                                            <Text style={[styles.userStatEmail, { color: colors.textSecondary }]}>
                                                {stat.user__email}
                                            </Text>
                                        </View>
                                        <View style={styles.statValues}>
                                            <Text style={[styles.statNum, { color: colors.text }]}>{stat.total_alerts}</Text>
                                            <Text style={[styles.statSub, { color: '#10B981' }]}>✓{stat.delivered}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Push Notification Tab */}
                        {activeTab === 'push' && (
                            <View>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>কাস্টম পুশ নোটিফিকেশন</Text>

                                <View style={[styles.pushForm, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
                                    <TextInput
                                        style={[styles.pushInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                                        value={pushTitle}
                                        onChangeText={setPushTitle}
                                        placeholder="নোটিফিকেশন টাইটেল"
                                        placeholderTextColor={colors.textSecondary}
                                    />

                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Body</Text>
                                    <TextInput
                                        style={[styles.pushInput, styles.pushInputMultiline, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.inputBorder }]}
                                        value={pushBody}
                                        onChangeText={setPushBody}
                                        placeholder="নোটিফিকেশন বিবরণ"
                                        placeholderTextColor={colors.textSecondary}
                                        multiline
                                        numberOfLines={4}
                                    />

                                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target</Text>
                                    <View style={styles.targetRow}>
                                        {[
                                            { key: 'all', label: 'সবাই' },
                                            { key: 'takmil', label: 'তাকমিল ছাত্র' },
                                            { key: 'non_takmil', label: 'নন-তাকমিল' },
                                        ].map(t => (
                                            <TouchableOpacity
                                                key={t.key}
                                                style={[
                                                    styles.targetBtn,
                                                    {
                                                        backgroundColor: pushTarget === t.key ? colors.primary : colors.inputBg,
                                                        borderColor: pushTarget === t.key ? colors.primary : colors.inputBorder,
                                                    }
                                                ]}
                                                onPress={() => setPushTarget(t.key)}
                                            >
                                                <Text style={[styles.targetBtnText, { color: pushTarget === t.key ? '#fff' : colors.text }]}>
                                                    {t.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                                        onPress={handleSendPush}
                                        disabled={pushSending}
                                    >
                                        {pushSending ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <>
                                                <Ionicons name="send" size={18} color="#fff" />
                                                <Text style={styles.sendBtnText}>পুশ পাঠান</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    tabs: { flexDirection: 'row', borderBottomWidth: 1 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
    tabText: { fontSize: 11, fontWeight: '700' },
    content: { flex: 1 },
    scrollContent: { padding: 16 },

    // Global toggle
    globalToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    globalToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    globalToggleText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    // Config
    configCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
    configHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    configHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    configPrayerName: { fontSize: 16, fontWeight: '700' },
    configRow: { marginTop: 12 },
    configLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
    configInput: { height: 36, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 14 },
    configInputWide: { height: 'auto', minHeight: 36, paddingVertical: 8 },
    saveBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    // Analytics
    analyticsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    analyticsCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
    analyticsValue: { fontSize: 22, fontWeight: '800', color: '#1E40AF' },
    analyticsLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 8 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 10, marginBottom: 6 },
    statName: { fontSize: 14, fontWeight: '600' },
    statValues: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    statNum: { fontSize: 14, fontWeight: '700' },
    statSub: { fontSize: 12, fontWeight: '600' },
    userStatRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderRadius: 10, marginBottom: 6, gap: 10 },
    userStatRank: { fontSize: 14, fontWeight: '800', width: 30 },
    userStatName: { fontSize: 13, fontWeight: '600' },
    userStatEmail: { fontSize: 10 },

    // Push
    pushForm: { borderWidth: 1, borderRadius: 14, padding: 16 },
    inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4, marginTop: 12 },
    pushInput: { height: 40, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 14 },
    pushInputMultiline: { height: 100, textAlignVertical: 'top', paddingTop: 10 },
    targetRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    targetBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
    targetBtnText: { fontSize: 11, fontWeight: '700' },
    sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
    sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});