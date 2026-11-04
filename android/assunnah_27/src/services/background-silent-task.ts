import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RingerModeService from './native/RingerModeModule';
import MosqueDetector from './mosque-detector';
import HabitTracker from './habit-tracker';
import { getCalculationParams } from './prayer-service';
import { Coordinates, PrayerTimes } from 'adhan';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_SILENT_TASK';

interface DwellState {
  mosqueName: string;
  latitude: number;
  longitude: number;
  detectedTime: string; // ISO string
  confirmedEntryTime: string | null; // ISO string (populated after 2 mins)
}

const STORAGE_KEYS = {
  DWELL_STATE: 'auto_silent_temp_dwell',
  IS_SILENCED: 'auto_silent_is_currently_silenced',
  PREVIOUS_RINGER_MODE: 'auto_silent_previous_ringer_mode',
};

/**
 * Register background task
 */
export function registerBackgroundSilentTask() {
  if (TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    return;
  }

  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Background task error:', error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (locations && locations.length > 0) {
        const location = locations[0];
        const { latitude, longitude } = location.coords;

        await processLocationUpdate(latitude, longitude);
      }
    }
  });
}

/**
 * Starts background location tracking.
 */
export async function startBackgroundSilentTracking(): Promise<boolean> {
  try {
    const hasForeground = await Location.requestForegroundPermissionsAsync();
    if (hasForeground.status !== 'granted') return false;

    const hasBackground = await Location.requestBackgroundPermissionsAsync();
    if (hasBackground.status !== 'granted') return false;

    registerBackgroundSilentTask();

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000, // 1 minute
      distanceInterval: 10, // 10 meters
      foregroundService: {
        notificationTitle: 'Auto Silent Active',
        notificationBody: 'Monitoring prayer locations in the background.',
        notificationColor: '#4C6EF5',
      },
    });

    return true;
  } catch (e) {
    console.error('Error starting background silent tracking:', e);
    return false;
  }
}

/**
 * Stops background tracking.
 */
export async function stopBackgroundSilentTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (e) {
    console.error('Error stopping background silent tracking:', e);
  }
}

/**
 * Process location updates to determine ringer mode triggers.
 */
async function processLocationUpdate(lat: number, lng: number): Promise<void> {
  const config = await HabitTracker.loadConfig();
  if (!config.autoSilentEnabled) return;

  const now = new Date();

  // 1. Home Wi-Fi bypass check
  const netState = await NetInfo.fetch();
  if (config.wifiBypassEnabled && netState.type === 'wifi' && config.homeWifiSSID) {
    const details = netState.details as any;
    // SSID check (requires location permissions, which we have)
    if (details && details.ssid && details.ssid === config.homeWifiSSID) {
      console.log('[BackgroundSilentTask] Connected to Home Wifi. Bypassing silent triggers.');
      await restoreRingerMode();
      await clearDwellState();
      return;
    }
  }

  // 2. Resolve Multi-Layer priority
  const inHomeArea = HabitTracker.isUserInHomeArea(lat, lng);

  // Layer 1: Dynamic Geofencing (If user enters a Mosque)
  const mosqueCheck = await MosqueDetector.checkIsNearMosque(lat, lng);
  
  if (mosqueCheck.isInsideMosque) {
    const mosqueName = mosqueCheck.mosqueName || 'মসজিদ';
    await handleMosquePresence(mosqueName, lat, lng, now, config);
    return;
  } else {
    // If we were inside, handle exit
    await handleMosqueExit(now);
  }

  // If we are not inside a mosque:
  if (config.profile === 'imam' || config.profile === 'itikaf') {
    // Imam/Itikaf: Silence ONLY during congregation windows
    await checkAndApplyCongregationSilent(lat, lng, now, config);
  } else if (!inHomeArea) {
    // Travel Mode Fallback: Standard Schedule
    await checkAndApplyStandardScheduleSilent(lat, lng, now, config);
  } else {
    // Home Area: Apply 3-4 Day Learned Habit Pattern
    await checkAndApplyLearnedHabitsSilent(lat, lng, now, config);
  }
}

/**
 * Handles user presence in a mosque (Dwell filter + Profile constraints).
 */
async function handleMosquePresence(
  mosqueName: string,
  lat: number,
  lng: number,
  now: Date,
  config: any
): Promise<void> {
  const dwellStateStr = await AsyncStorage.getItem(STORAGE_KEYS.DWELL_STATE);
  let dwellState: DwellState;

  if (dwellStateStr) {
    dwellState = JSON.parse(dwellStateStr);
  } else {
    dwellState = {
      mosqueName,
      latitude: lat,
      longitude: lng,
      detectedTime: now.toISOString(),
      confirmedEntryTime: config.dwellFilterEnabled ? null : now.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.DWELL_STATE, JSON.stringify(dwellState));
    if (config.dwellFilterEnabled) {
      console.log(`[BackgroundSilentTask] Detected mosque entry. Starting 2-minute dwell filter.`);
      return;
    } else {
      console.log(`[BackgroundSilentTask] Detected mosque entry. Dwell filter disabled, silencing immediately.`);
      if (config.profile === 'regular') {
        await applySilentMode();
      } else {
        await checkAndApplyCongregationSilent(lat, lng, now, config);
      }
      return;
    }
  }

  const detectedTime = new Date(dwellState.detectedTime);
  const diffMinutes = (now.getTime() - detectedTime.getTime()) / (60 * 1000);

  // Dwell filter check
  if (!dwellState.confirmedEntryTime && (!config.dwellFilterEnabled || diffMinutes >= 2)) {
    dwellState.confirmedEntryTime = now.toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.DWELL_STATE, JSON.stringify(dwellState));
    console.log(`[BackgroundSilentTask] Mosque presence confirmed.`);

    if (config.profile === 'regular') {
      await applySilentMode();
    } else {
      await checkAndApplyCongregationSilent(lat, lng, now, config);
    }
  } else if (dwellState.confirmedEntryTime && config.profile !== 'regular') {
    await checkAndApplyCongregationSilent(lat, lng, now, config);
  }
}

/**
 * Handles exiting a mosque and logs the visit.
 */
async function handleMosqueExit(now: Date): Promise<void> {
  const dwellStateStr = await AsyncStorage.getItem(STORAGE_KEYS.DWELL_STATE);
  if (!dwellStateStr) return;

  const dwellState: DwellState = JSON.parse(dwellStateStr);
  if (dwellState.confirmedEntryTime) {
    const entryTime = new Date(dwellState.confirmedEntryTime);
    // Log the visit to calculate habits later
    await HabitTracker.logVisit(
      dwellState.mosqueName,
      dwellState.latitude,
      dwellState.longitude,
      entryTime,
      now
    );
    console.log(`[BackgroundSilentTask] Left mosque. Logged visit duration: ${(now.getTime() - entryTime.getTime()) / 60000} mins.`);
  }

  await restoreRingerMode();
  await clearDwellState();
}

/**
 * Layer 2: Applies 3-4 day learned habits in Home Area.
 */
async function checkAndApplyLearnedHabitsSilent(lat: number, lng: number, now: Date, config: any): Promise<void> {
  const learned = await HabitTracker.getLearnedWindows();
  const prayerTimes = getPrayerTimesForDate(lat, lng, now);

  let shouldSilence = false;

  for (const prayerKey of Object.keys(learned)) {
    const window = learned[prayerKey];
    const prayerTime = prayerTimes[prayerKey];
    if (!prayerTime) continue;

    const startSilent = new Date(prayerTime.getTime() + window.startOffsetMinutes * 60 * 1000);
    const endSilent = new Date(prayerTime.getTime() + window.endOffsetMinutes * 60 * 1000);

    // Apply adjustments for Friday Jumu'ah, Ramadan Tarawih, Eid
    const adjusted = adjustSpecialTimes(prayerKey, startSilent, endSilent, now, config);

    if (now >= adjusted.start && now <= adjusted.end) {
      shouldSilence = true;
      break;
    }
  }

  if (shouldSilence) {
    await applySilentMode();
  } else {
    await restoreRingerMode();
  }
}

/**
 * Layer 3: Standard Schedule silent buffer (for traveling or unlearned zones).
 */
async function checkAndApplyStandardScheduleSilent(lat: number, lng: number, now: Date, config: any): Promise<void> {
  const prayerTimes = getPrayerTimesForDate(lat, lng, now);
  let shouldSilence = false;

  for (const prayerKey of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    const prayerTime = prayerTimes[prayerKey];
    if (!prayerTime) continue;

    // Use custom default offsets
    let startSilent = new Date(prayerTime.getTime() + config.defaultStartOffset * 60 * 1000);
    let endSilent = new Date(prayerTime.getTime() + config.defaultEndOffset * 60 * 1000);

    const adjusted = adjustSpecialTimes(prayerKey, startSilent, endSilent, now, config);

    if (now >= adjusted.start && now <= adjusted.end) {
      shouldSilence = true;
      break;
    }
  }

  if (shouldSilence) {
    await applySilentMode();
  } else {
    await restoreRingerMode();
  }
}

/**
 * Imam/Itikaf Profile: Only silences during actual congregation timings.
 */
async function checkAndApplyCongregationSilent(lat: number, lng: number, now: Date, config: any): Promise<void> {
  const prayerTimes = getPrayerTimesForDate(lat, lng, now);
  let shouldSilence = false;

  for (const prayerKey of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
    const prayerTime = prayerTimes[prayerKey];
    if (!prayerTime) continue;

    // Congregation Window: Starts 5 mins after Adhan, ends 20 mins later
    let startSilent = new Date(prayerTime.getTime() + 5 * 60 * 1000);
    let endSilent = new Date(prayerTime.getTime() + 25 * 60 * 1000);

    const adjusted = adjustSpecialTimes(prayerKey, startSilent, endSilent, now, config);

    if (now >= adjusted.start && now <= adjusted.end) {
      shouldSilence = true;
      break;
    }
  }

  if (shouldSilence) {
    await applySilentMode();
  } else {
    await restoreRingerMode();
  }
}

/**
 * Adjusts silent windows dynamically for Friday, Ramadan Tarawih, and Eid.
 */
function adjustSpecialTimes(
  prayerKey: string,
  start: Date,
  end: Date,
  now: Date,
  config: any
): { start: Date; end: Date } {
  let finalStart = new Date(start);
  let finalEnd = new Date(end);

  // 1. Friday Jumu'ah override (for Dhuhr prayer)
  if (config.jumuahOverrideEnabled && prayerKey === 'dhuhr' && now.getDay() === 5) {
    finalStart.setHours(12, 30, 0, 0);
    finalEnd.setHours(13, 45, 0, 0);
  }

  // 2. Ramadan Tarawih override (for Isha prayer)
  const currentMonth = now.getMonth();
  const isRamadanActive = currentMonth === 1 || currentMonth === 2; // Feb/March 2026
  if (config.ramadanTarawihEnabled && prayerKey === 'isha' && isRamadanActive) {
    finalEnd = new Date(finalEnd.getTime() + 90 * 60 * 1000);
  }

  // 3. Eid overrides can go here
  return { start: finalStart, end: finalEnd };
}

/**
 * Helper to fetch local prayer times for a coordinate and date.
 */
function getPrayerTimesForDate(lat: number, lng: number, date: Date): Record<string, Date> {
  const coords = new Coordinates(lat, lng);
  const params = getCalculationParams('Karachi', 'Hanafi');
  const pt = new PrayerTimes(coords, date, params);
  return {
    fajr: pt.fajr,
    dhuhr: pt.dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
  };
}

async function applySilentMode(): Promise<void> {
  const isCurrentlySilenced = await AsyncStorage.getItem(STORAGE_KEYS.IS_SILENCED);
  if (isCurrentlySilenced === 'true') return;

  try {
    const currentMode = await RingerModeService.getRingerMode();
    await AsyncStorage.setItem(STORAGE_KEYS.PREVIOUS_RINGER_MODE, currentMode);
    
    // Switch to Vibrate (or Silent)
    await RingerModeService.setRingerMode('vibrate');
    await AsyncStorage.setItem(STORAGE_KEYS.IS_SILENCED, 'true');
    console.log('[BackgroundSilentTask] Phone silenced successfully.');
  } catch (e) {
    console.error('Error applying silent mode:', e);
  }
}

async function restoreRingerMode(): Promise<void> {
  const isCurrentlySilenced = await AsyncStorage.getItem(STORAGE_KEYS.IS_SILENCED);
  if (isCurrentlySilenced !== 'true') return;

  try {
    const previousMode = (await AsyncStorage.getItem(STORAGE_KEYS.PREVIOUS_RINGER_MODE)) || 'normal';
    await RingerModeService.setRingerMode(previousMode as any);
    await AsyncStorage.removeItem(STORAGE_KEYS.IS_SILENCED);
    await AsyncStorage.removeItem(STORAGE_KEYS.PREVIOUS_RINGER_MODE);
    console.log(`[BackgroundSilentTask] Phone ringer mode restored to: ${previousMode}`);
  } catch (e) {
    console.error('Error restoring ringer mode:', e);
  }
}

async function clearDwellState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.DWELL_STATE);
}
