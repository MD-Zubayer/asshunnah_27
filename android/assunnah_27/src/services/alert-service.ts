/**
 * Prayer Alert Service
 * Handles user alert preferences, admin alert management, and device token registration.
 */

import { API_ENDPOINTS } from '../constants/api';

// ============================================
// Types
// ============================================

export interface PrayerAlertPreference {
    prayer_name: string;
    prayer_name_display?: string;
    is_enabled: boolean;
    offset_minutes: number;
    is_silent: boolean;
    use_custom_adhan?: boolean;
}

export interface TodayAlert {
    prayer_name: string;
    prayer_name_display: string;
    is_enabled: boolean;
    offset_minutes: number;
    is_silent: boolean;
    is_adhan_enabled: boolean;
    notification_title_template: string;
    notification_body_template: string;
}

export interface GlobalAlertConfig {
    id: number;
    prayer_name: string;
    prayer_name_display: string;
    is_globally_enabled: boolean;
    default_offset_minutes: number;
    notification_title_template: string;
    notification_body_template: string;
    adhan_audio: string | null;
    adhan_audio_url: string | null;
    is_adhan_enabled: boolean;
    updated_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface AlertLog {
    id: number;
    prayer_name: string;
    prayer_name_display: string;
    scheduled_time: string;
    delivered_at: string | null;
    is_read: boolean;
    read_at: string | null;
    location_used: string;
    calculation_method: string;
    notification_type: string;
    created_at: string;
}

export interface AlertAnalytics {
    period_days: number;
    summary: {
        total_alerts: number;
        delivered: number;
        read: number;
        delivery_rate: number;
        read_rate: number;
    };
    prayer_breakdown: Array<{
        prayer_name: string;
        total: number;
        delivered: number;
        read: number;
    }>;
    daily_trend: Array<{
        date: string;
        total: number;
        delivered: number;
    }>;
    notification_types: Array<{
        notification_type: string;
        total: number;
    }>;
}

export interface UserAlertStat {
    user__id: number;
    user__email: string;
    user__first_name: string;
    user__last_name: string;
    total_alerts: number;
    delivered: number;
    read: number;
}

// ============================================
// Helper
// ============================================

function authHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
    };
}

async function safeFetch(url: string, options: RequestInit) {
    try {
        const response = await fetch(url, options);
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
        return { ok: response.ok, status: response.status, data };
    } catch (error: any) {
        return { ok: false, status: 0, data: error.message || 'Network error' };
    }
}

// ============================================
// User Alert Preferences
// ============================================

/**
 * Get all prayer alert preferences for the current user.
 */
export async function getUserAlertPreferences(token: string) {
    return safeFetch(API_ENDPOINTS.ALERT_PREFERENCES, {
        method: 'GET',
        headers: authHeaders(token),
    });
}

/**
 * Bulk create/update prayer alert preferences.
 */
export async function saveUserAlertPreferences(
    token: string,
    settings: PrayerAlertPreference[]
) {
    return safeFetch(API_ENDPOINTS.ALERT_PREFERENCES, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ settings }),
    });
}

/**
 * Update a single prayer alert preference.
 */
export async function updateSingleAlertPreference(
    token: string,
    prayerName: string,
    updates: Partial<PrayerAlertPreference>
) {
    return safeFetch(`${API_ENDPOINTS.ALERT_PREFERENCES}${prayerName}/`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(updates),
    });
}

/**
 * Get today's alert schedule with user preferences applied.
 */
export async function getTodayAlertSchedule(token: string) {
    return safeFetch(API_ENDPOINTS.ALERT_TODAY, {
        method: 'GET',
        headers: authHeaders(token),
    });
}

// ============================================
// Alert Logs
// ============================================

/**
 * Get user's alert delivery history.
 */
export async function getUserAlertLogs(token: string, days: number = 7) {
    return safeFetch(`${API_ENDPOINTS.ALERT_LOGS}?days=${days}`, {
        method: 'GET',
        headers: authHeaders(token),
    });
}

/**
 * Log an alert delivery event.
 */
export async function createAlertLog(token: string, logData: {
    prayer_name: string;
    scheduled_time: string;
    delivered_at?: string;
    is_read?: boolean;
    location_used?: string;
    calculation_method?: string;
    notification_type?: string;
    device_token?: string;
}) {
    return safeFetch(API_ENDPOINTS.ALERT_LOG_CREATE, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(logData),
    });
}

/**
 * Mark an alert log as read.
 */
export async function markAlertAsRead(token: string, logId: number) {
    return safeFetch(`${API_ENDPOINTS.ALERT_LOGS}${logId}/read/`, {
        method: 'POST',
        headers: authHeaders(token),
    });
}

// ============================================
// Device Token (FCM)
// ============================================

/**
 * Register FCM device token.
 */
export async function registerDeviceToken(token: string, fcmToken: string, deviceType: string = 'android') {
    return safeFetch(API_ENDPOINTS.DEVICE_TOKEN, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ token: fcmToken, device_type: deviceType }),
    });
}

/**
 * Deactivate FCM device token.
 */
export async function deactivateDeviceToken(authToken: string, fcmToken: string) {
    return safeFetch(API_ENDPOINTS.DEVICE_TOKEN, {
        method: 'DELETE',
        headers: authHeaders(authToken),
        body: JSON.stringify({ token: fcmToken }),
    });
}

// ============================================
// Admin Alert Management
// ============================================

/**
 * Get all global prayer alert configs (admin only).
 */
export async function getGlobalAlertConfigs(token: string) {
    return safeFetch(API_ENDPOINTS.ADMIN_ALERT_GLOBAL_CONFIG, {
        method: 'GET',
        headers: authHeaders(token),
    });
}

/**
 * Create or update global prayer alert configs (admin only, bulk).
 */
export async function saveGlobalAlertConfigs(token: string, configs: Partial<GlobalAlertConfig>[]) {
    return safeFetch(API_ENDPOINTS.ADMIN_ALERT_GLOBAL_CONFIG, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ configs }),
    });
}

/**
 * Update a single global alert config (admin only).
 */
export async function updateGlobalAlertConfig(
    token: string,
    prayerName: string,
    updates: Partial<GlobalAlertConfig>
) {
    return safeFetch(`${API_ENDPOINTS.ADMIN_ALERT_GLOBAL_CONFIG}${prayerName}/`, {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify(updates),
    });
}

/**
 * Get alert analytics (admin only).
 */
export async function getAlertAnalytics(token: string, days: number = 30) {
    return safeFetch(`${API_ENDPOINTS.ADMIN_ALERT_ANALYTICS}?days=${days}`, {
        method: 'GET',
        headers: authHeaders(token),
    });
}

/**
 * Get per-user alert statistics (admin only).
 */
export async function getUserAlertStats(token: string, days: number = 30) {
    return safeFetch(`${API_ENDPOINTS.ADMIN_ALERT_USER_STATS}?days=${days}`, {
        method: 'GET',
        headers: authHeaders(token),
    });
}

/**
 * Send custom push notification to users (admin only).
 */
export async function sendPushNotification(
    token: string,
    data: {
        title: string;
        body: string;
        target: 'all' | 'takmil' | 'non_takmil';
        prayer_name?: string;
        sound?: boolean;
        data?: Record<string, any>;
    }
) {
    return safeFetch(API_ENDPOINTS.ADMIN_SEND_PUSH, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(data),
    });
}

/**
 * Toggle all alerts on/off globally (admin only).
 */
export async function toggleGlobalAlerts(token: string, enable: boolean) {
    return safeFetch(API_ENDPOINTS.ADMIN_ALERT_TOGGLE_GLOBAL, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ enable }),
    });
}

/**
 * Upload adhan audio for a prayer (admin only).
 */
export async function uploadAdhanAudio(
    token: string,
    prayerName: string,
    audioFile: { uri: string; name: string; type: string }
) {
    const formData = new FormData();
    formData.append('adhan_audio', {
        uri: audioFile.uri,
        name: audioFile.name,
        type: audioFile.type,
    } as any);

    return safeFetch(
        `${API_ENDPOINTS.ADMIN_ALERT_GLOBAL_CONFIG.replace('/global-config/', `/adhan/${prayerName}/`)}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'multipart/form-data',
            },
            body: formData,
        }
    );
}

// ============================================
// Default Alert Settings Helper
// ============================================

/**
 * Get default alert settings for all 5 prayers.
 */
export function getDefaultAlertSettings(): PrayerAlertPreference[] {
    return [
        { prayer_name: 'fajr', is_enabled: true, offset_minutes: 0, is_silent: false },
        { prayer_name: 'dhuhr', is_enabled: true, offset_minutes: 0, is_silent: false },
        { prayer_name: 'asr', is_enabled: true, offset_minutes: 0, is_silent: false },
        { prayer_name: 'maghrib', is_enabled: true, offset_minutes: 0, is_silent: false },
        { prayer_name: 'isha', is_enabled: true, offset_minutes: 0, is_silent: false },
    ];
}

/**
 * Get Bengali name for a prayer.
 */
export function getPrayerNameBn(prayerName: string): string {
    const names: Record<string, string> = {
        fajr: 'ফজর',
        dhuhr: 'যোহর',
        asr: 'আসর',
        maghrib: 'মাগরিব',
        isha: 'এশা',
    };
    return names[prayerName] || prayerName;
}