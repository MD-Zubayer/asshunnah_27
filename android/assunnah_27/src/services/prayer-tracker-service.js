import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@daily_prayer_log_';
const STREAK_KEY = '@prayer_streak_data';

export const PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_LABELS = {
  fajr: { bn: 'ফজর', icon: 'moon-outline', color: '#6366F1' },
  dhuhr: { bn: 'যোহর', icon: 'sunny', color: '#F59E0B' },
  asr: { bn: 'আসর', icon: 'partly-sunny', color: '#EC4899' },
  maghrib: { bn: 'মাগরিব', icon: 'partly-sunny-outline', color: '#D97706' },
  isha: { bn: 'এশা', icon: 'moon', color: '#8B5CF6' },
};

function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getTodayDateString(d);
}

/**
 * Get prayer completion state for a specific date (defaults to today)
 * @param {string} [dateStr] - YYYY-MM-DD
 * @returns {Promise<{[key: string]: boolean}>}
 */
export async function getPrayerState(dateStr = getTodayDateString()) {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${dateStr}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.log('[PrayerTracker] Error reading prayer state:', e.message);
  }
  return {
    fajr: false,
    dhuhr: false,
    asr: false,
    maghrib: false,
    isha: false,
  };
}

/**
 * Toggle a specific waqt for today
 * @param {string} waqtKey - 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
 * @returns {Promise<{state: Object, count: number, streak: number}>}
 */
export async function togglePrayer(waqtKey) {
  const todayStr = getTodayDateString();
  const currentState = await getPrayerState(todayStr);

  const updatedState = {
    ...currentState,
    [waqtKey]: !currentState[waqtKey],
  };

  try {
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${todayStr}`,
      JSON.stringify(updatedState)
    );
  } catch (e) {
    console.log('[PrayerTracker] Error saving prayer state:', e.message);
  }

  const streak = await calculateAndUpdateStreak(todayStr, updatedState);
  const count = PRAYER_KEYS.filter((k) => updatedState[k]).length;

  return {
    state: updatedState,
    count,
    streak,
  };
}

/**
 * Calculate dynamic prayer streak
 */
async function calculateAndUpdateStreak(todayStr, todayState) {
  try {
    const todayCount = PRAYER_KEYS.filter((k) => todayState[k]).length;

    // Check yesterday's completion
    const yesterdayStr = getYesterdayDateString();
    const yesterdayState = await getPrayerState(yesterdayStr);
    const yesterdayCount = PRAYER_KEYS.filter((k) => yesterdayState[k]).length;

    let previousStreak = 0;
    const streakRaw = await AsyncStorage.getItem(STREAK_KEY);
    if (streakRaw) {
      const data = JSON.parse(streakRaw);
      // If yesterday was part of streak, or last date was yesterday
      if (data.lastDate === yesterdayStr || data.lastDate === todayStr) {
        previousStreak = data.streak || 0;
      }
    }

    let currentStreak = previousStreak;

    // If yesterday had at least 1 prayer and streak wasn't counted yet
    if (yesterdayCount > 0 && previousStreak === 0) {
      previousStreak = 1;
    }

    if (todayCount > 0) {
      if (previousStreak === 0) {
        currentStreak = 1;
      } else {
        currentStreak = Math.max(previousStreak, 1);
        if (todayCount === 5 && previousStreak > 0) {
          currentStreak = previousStreak + 1;
        }
      }
    }

    await AsyncStorage.setItem(
      STREAK_KEY,
      JSON.stringify({
        lastDate: todayStr,
        streak: currentStreak,
      })
    );

    return currentStreak;
  } catch (e) {
    console.log('[PrayerTracker] Error calculating streak:', e.message);
    return 1;
  }
}

/**
 * Get prayer stats (count today and current streak)
 * @returns {Promise<{today: number, streak: number, state: Object}>}
 */
export async function getPrayerStats() {
  const todayStr = getTodayDateString();
  const state = await getPrayerState(todayStr);
  const today = PRAYER_KEYS.filter((k) => state[k]).length;

  let streak = 0;
  try {
    const streakRaw = await AsyncStorage.getItem(STREAK_KEY);
    if (streakRaw) {
      const data = JSON.parse(streakRaw);
      const yesterdayStr = getYesterdayDateString();
      if (data.lastDate === todayStr || data.lastDate === yesterdayStr) {
        streak = data.streak || 0;
      }
    }
    if (today > 0 && streak === 0) {
      streak = 1;
    }
  } catch (e) {
    console.log('[PrayerTracker] Error reading streak:', e.message);
  }

  return {
    today,
    streak,
    state,
  };
}

const prayerTrackerService = {
  PRAYER_KEYS,
  PRAYER_LABELS,
  getPrayerState,
  togglePrayer,
  getPrayerStats,
};

export default prayerTrackerService;
