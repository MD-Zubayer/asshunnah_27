import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalculationParams } from './prayer-service';
import { Coordinates, PrayerTimes } from 'adhan';

export type UserProfile = 'regular' | 'imam' | 'itikaf';

export interface MosqueVisitLog {
  id: string;
  mosqueName: string;
  latitude: number;
  longitude: number;
  entryTime: string; // ISO string
  exitTime: string; // ISO string
  durationMs: number;
  prayerKey: string; // 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
}

export interface LearnedWindow {
  startOffsetMinutes: number; // offset relative to prayer start (negative means before)
  endOffsetMinutes: number;   // offset relative to prayer start (positive means after)
  isActive: boolean;
}

export interface HabitTrackerConfig {
  profile: UserProfile;
  homeWifiSSID: string | null;
  homeLatitude: number | null;
  homeLongitude: number | null;
  autoSilentEnabled: boolean;
  learningDaysRequired: number; // default: 3
  jumuahOverrideEnabled: boolean;
  ramadanTarawihEnabled: boolean;
  eidOverrideEnabled: boolean;
  wifiBypassEnabled: boolean;
  dwellFilterEnabled: boolean;
  defaultStartOffset: number; // minutes before prayer time
  defaultEndOffset: number;   // minutes after prayer time
}

const STORAGE_KEYS = {
  VISIT_LOGS: 'auto_silent_visit_logs',
  CONFIG: 'auto_silent_config',
  LEARNED_WINDOWS: 'auto_silent_learned_windows',
  ANOMALOUS_STAY_PROMPT: 'auto_silent_anomalous_prompt',
};

class HabitTracker {
  private config: HabitTrackerConfig = {
    profile: 'regular',
    homeWifiSSID: null,
    homeLatitude: null,
    homeLongitude: null,
    autoSilentEnabled: false,
    learningDaysRequired: 3,
    jumuahOverrideEnabled: true,
    ramadanTarawihEnabled: true,
    eidOverrideEnabled: true,
    wifiBypassEnabled: true,
    dwellFilterEnabled: true,
    defaultStartOffset: -5,
    defaultEndOffset: 25,
  };

  constructor() {
    this.loadConfig();
  }

  async loadConfig(): Promise<HabitTrackerConfig> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.CONFIG);
      if (data) {
        this.config = { ...this.config, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Error loading habit tracker config:', e);
    }
    return this.config;
  }

  async getConfig(): Promise<HabitTrackerConfig> {
    return this.loadConfig();
  }

  async saveConfig(newConfig: Partial<HabitTrackerConfig>): Promise<HabitTrackerConfig> {
    this.config = { ...this.config, ...newConfig };
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (e) {
      console.error('Error saving habit tracker config:', e);
    }
    return this.config;
  }

  /**
   * Log a new mosque visit and run stay duration checks.
   */
  async logVisit(
    mosqueName: string,
    latitude: number,
    longitude: number,
    entryTime: Date,
    exitTime: Date
  ): Promise<MosqueVisitLog | null> {
    try {
      const durationMs = exitTime.getTime() - entryTime.getTime();
      if (durationMs < 60 * 1000) return null; // Ignore visits less than 1 minute

      const prayerKey = this.getNearestPrayerKey(latitude, longitude, entryTime);
      const logId = `${entryTime.getTime()}_${Math.random().toString(36).substr(2, 5)}`;

      const newLog: MosqueVisitLog = {
        id: logId,
        mosqueName,
        latitude,
        longitude,
        entryTime: entryTime.toISOString(),
        exitTime: exitTime.toISOString(),
        durationMs,
        prayerKey,
      };

      const logs = await this.getVisitLogs();
      logs.push(newLog);
      await AsyncStorage.setItem(STORAGE_KEYS.VISIT_LOGS, JSON.stringify(logs));

      // 1. If visit duration > 90 minutes and user is regular, trigger anomalous stay prompt flag
      const minutesDuration = durationMs / (60 * 1000);
      if (minutesDuration >= 90 && this.config.profile === 'regular') {
        await AsyncStorage.setItem(STORAGE_KEYS.ANOMALOUS_STAY_PROMPT, 'true');
      }

      // 2. Set home location to the first logged mosque if not already set
      if (!this.config.homeLatitude || !this.config.homeLongitude) {
        await this.saveConfig({
          homeLatitude: latitude,
          homeLongitude: longitude,
        });
      }

      // 3. Re-calculate learned habits with the new logs
      await this.calculateHabits(logs);

      return newLog;
    } catch (e) {
      console.error('Error logging mosque visit:', e);
      return null;
    }
  }

  async getVisitLogs(): Promise<MosqueVisitLog[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.VISIT_LOGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  async clearVisitLogs(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.VISIT_LOGS);
    await AsyncStorage.removeItem(STORAGE_KEYS.LEARNED_WINDOWS);
  }

  /**
   * Identifies which prayer key (fajr, dhuhr, asr, maghrib, isha) matches the time.
   */
  getNearestPrayerKey(lat: number, lng: number, time: Date): string {
    const coords = new Coordinates(lat, lng);
    const params = getCalculationParams('Karachi', 'Hanafi');
    const pt = new PrayerTimes(coords, time, params);

    const diffs = [
      { key: 'fajr', time: pt.fajr },
      { key: 'dhuhr', time: pt.dhuhr },
      { key: 'asr', time: pt.asr },
      { key: 'maghrib', time: pt.maghrib },
      { key: 'isha', time: pt.isha },
    ];

    let nearestKey = 'dhuhr';
    let minDiff = Infinity;

    for (const item of diffs) {
      const diff = Math.abs(time.getTime() - item.time.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestKey = item.key;
      }
    }

    return nearestKey;
  }

  /**
   * Process logs to calculate learned habits for each prayer.
   */
  async calculateHabits(logs: MosqueVisitLog[]): Promise<Record<string, LearnedWindow>> {
    const start = this.config.defaultStartOffset;
    const end = this.config.defaultEndOffset;
    const learnedWindows: Record<string, LearnedWindow> = {
      fajr: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      dhuhr: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      asr: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      maghrib: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      isha: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
    };

    try {
      // Group logs by prayerKey
      const grouped: Record<string, MosqueVisitLog[]> = {};
      for (const log of logs) {
        if (!grouped[log.prayerKey]) {
          grouped[log.prayerKey] = [];
        }
        grouped[log.prayerKey].push(log);
      }

      for (const prayerKey of Object.keys(learnedWindows)) {
        const prayerLogs = grouped[prayerKey] || [];
        
        // Count distinct days of logs
        const distinctDays = new Set(
          prayerLogs.map(l => new Date(l.entryTime).toDateString())
        );

        // Learn patterns if we have met the required days count (e.g. 3)
        if (distinctDays.size >= this.config.learningDaysRequired) {
          let totalStartOffset = 0;
          let totalEndOffset = 0;

          for (const log of prayerLogs) {
            const entry = new Date(log.entryTime);
            const exit = new Date(log.exitTime);
            
            // Get prayer actual time for the log date
            const coords = new Coordinates(log.latitude, log.longitude);
            const params = getCalculationParams('Karachi', 'Hanafi');
            const pt = new PrayerTimes(coords, entry, params);
            
            let actualPrayerTime = pt.dhuhr;
            if (prayerKey === 'fajr') actualPrayerTime = pt.fajr;
            else if (prayerKey === 'asr') actualPrayerTime = pt.asr;
            else if (prayerKey === 'maghrib') actualPrayerTime = pt.maghrib;
            else if (prayerKey === 'isha') actualPrayerTime = pt.isha;

            const startOffset = (entry.getTime() - actualPrayerTime.getTime()) / (60 * 1000);
            const endOffset = (exit.getTime() - actualPrayerTime.getTime()) / (60 * 1000);

            totalStartOffset += startOffset;
            totalEndOffset += endOffset;
          }

          learnedWindows[prayerKey] = {
            startOffsetMinutes: Math.round(totalStartOffset / prayerLogs.length),
            endOffsetMinutes: Math.round(totalEndOffset / prayerLogs.length),
            isActive: true,
          };
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.LEARNED_WINDOWS, JSON.stringify(learnedWindows));
    } catch (e) {
      console.error('Error calculating habits:', e);
    }

    return learnedWindows;
  }

  async getLearnedWindows(): Promise<Record<string, LearnedWindow>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LEARNED_WINDOWS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {}

    const start = this.config.defaultStartOffset;
    const end = this.config.defaultEndOffset;
    return {
      fajr: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      dhuhr: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      asr: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      maghrib: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
      isha: { startOffsetMinutes: start, endOffsetMinutes: end, isActive: false },
    };
  }

  /**
   * Check if user is near Home Area (within 5 km)
   */
  isUserInHomeArea(latitude: number, longitude: number): boolean {
    if (!this.config.homeLatitude || !this.config.homeLongitude) return true; // Default to true if not set yet

    const R = 6371; // Earth radius in km
    const dLat = ((latitude - this.config.homeLatitude) * Math.PI) / 180;
    const dLon = ((longitude - this.config.homeLongitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((this.config.homeLatitude * Math.PI) / 180) *
        Math.cos((latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    return distanceKm <= 5.0; // Home radius is 5 km
  }

  async checkAnomalousStayPrompt(): Promise<boolean> {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ANOMALOUS_STAY_PROMPT);
    return value === 'true';
  }

  async resetAnomalousStayPrompt(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.ANOMALOUS_STAY_PROMPT);
  }
}

export default new HabitTracker();
