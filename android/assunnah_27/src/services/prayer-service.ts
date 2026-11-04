import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';
import * as Location from 'expo-location';

// Dynamically load expo-notifications to prevent crashes in Expo Go environments (SDK 53+)
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  if (typeof Notifications?.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (_e) {
  Notifications = null;
}

// ============================================
// Types & Interfaces
// ============================================

export interface PrayerTimeItem {
  key: string;
  name: string;
  nameEn: string;
  time: Date;
  icon: string;
  color: string;
}

export interface PrayerWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface MakruhTime {
  start: Date;
  end: Date;
  durationMinutes: number;
  name: string;
  nameEn: string;
}

export interface PrayerTimesData {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  sunrise: string;
  sunset: string;
  nextPrayerKey: string;
  nextPrayerTime: string;
  remainingMinutes: number;
}

export interface FullPrayerData {
  items: PrayerTimeItem[];
  prayerWindows: Record<string, PrayerWindow>;
  makruhTimes: { sunrise: MakruhTime; midday: MakruhTime; sunset: MakruhTime };
  nextDayFajr: Date;
  hijriDate: string;
  gregorianDate: string;
  bengaliDate: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  timezone: string;
}

export type CalculationMethodName = 'MWL' | 'Karachi' | 'Egypt' | 'UmmAlQura' | 'Singapore';
export type MadhabName = 'Hanafi' | 'Shafi';

// ============================================
// Constants
// ============================================

export const CALCULATION_METHODS: Record<CalculationMethodName, { name: string; nameBn: string; get: () => any }> = {
  MWL: { name: 'Muslim World League', nameBn: 'মুসলিম ওয়ার্ল্ড লীগ', get: CalculationMethod.MuslimWorldLeague },
  Karachi: { name: 'University of Islamic Sciences, Karachi', nameBn: 'কারাচি বিশ্ববিদ্যালয়', get: CalculationMethod.Karachi },
  Egypt: { name: 'Egyptian General Authority', nameBn: 'মিশরীয় কর্তৃপক্ষ', get: CalculationMethod.Egyptian },
  UmmAlQura: { name: 'Umm al-Qura, Makkah', nameBn: 'উম্মুল কুরা, মক্কা', get: CalculationMethod.UmmAlQura },
  Singapore: { name: 'Singapore', nameBn: 'সিঙ্গাপুর', get: CalculationMethod.Singapore },
};

// Default: Kawna, Sherpur, Bangladesh
const DEFAULT_LATITUDE = 25.0833;
const DEFAULT_LONGITUDE = 90.0167;

// ============================================
// Helper Functions
// ============================================

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// বাংলা সংখ্যায় রূপান্তর ফাংশন
export const toBanglaDigits = (num: number | string): string => {
  const digits: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
  };
  return String(num).replace(/[0-9]/g, d => digits[d] || d);
};

// ============================================
// Time Conversion
// ============================================

/**
 * adhan প্যাকেজ Date.UTC() ব্যবহার করে সময় তৈরি করে, যেখানে
 * UTC hours/minutes আসলে LOCAL prayer time encode করা থাকে।
 * 
 * উদাহরণ: যোহর 12:00 PM হলে adhan তৈরি করে Date.UTC(2026, 6, 30, 12, 0, 0)
 * যা UTC তে 12:00 কিন্তু local (UTC+6) তে 18:00 দেখায়।
 * 
 * এই ফাংশন UTC components নিয়ে local Date তৈরি করে যাতে
 * getHours() সঠিক local prayer time রিটার্ন করে।
 */
export function adhanTimeToLocal(adhanTime: Date): Date {
  return adhanTime;
}

// ============================================
// Time Formatting
// ============================================

export function formatTime(date: Date, locale: string = 'bn'): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  if (locale === 'bn') {
    return `${toBanglaDigits(displayHours)}:${toBanglaDigits(displayMinutes)} ${period}`;
  } else if (locale === 'ar') {
    return `${displayHours}:${displayMinutes} ${period}`;
  }
  return `${displayHours}:${displayMinutes} ${period}`;
}

export function formatTime24(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ============================================
// Location Functions
// ============================================

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function fetchCurrentLocation(): Promise<LocationData> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return {
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE,
        city: 'কবনা, শেরপুর',
        timezone: 'Asia/Dhaka',
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    let city = 'অজানা স্থান';
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        city = geocode[0].district || geocode[0].city || geocode[0].subregion || 'ঢাকা';
      }
    } catch (_e) {
      console.log('Reverse geocoding error', _e);
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      city,
      timezone: 'Asia/Dhaka',
    };
  } catch (error) {
    console.log('Error fetching location', error);
    return {
      latitude: DEFAULT_LATITUDE,
      longitude: DEFAULT_LONGITUDE,
      city: 'কবনা, শেরপুর',
      timezone: 'Asia/Dhaka',
    };
  }
}

// ============================================
// Prayer Times Calculation
// ============================================

export function getCalculationParams(method: CalculationMethodName = 'Karachi', madhab: MadhabName = 'Hanafi') {
  const params = CALCULATION_METHODS[method].get();
  params.madhab = madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

export interface PrayerTimesData {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  sunrise: string;
  sunset: string;
  chast: string;
  zawal: string;
  nextPrayerKey: string;
  nextPrayerTime: string;
  remainingMinutes: number;
  currentWaqtKey: string;
}

export function calculatePrayerTimes(
  latitude: number,
  longitude: number,
  locale: string = 'bn',
  method: CalculationMethodName = 'Karachi',
  madhab: MadhabName = 'Hanafi',
  targetDate?: Date
): PrayerTimesData {
  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParams(method, madhab);
  const date = targetDate || new Date();
  const rawTimes = new PrayerTimes(coordinates, date, params);

  // Convert all adhan UTC times to local times
  const fajr = adhanTimeToLocal(rawTimes.fajr);
  const sunrise = adhanTimeToLocal(rawTimes.sunrise);
  const dhuhr = adhanTimeToLocal(rawTimes.dhuhr);
  const asr = adhanTimeToLocal(rawTimes.asr);
  const sunset = adhanTimeToLocal(rawTimes.sunset);
  const maghrib = adhanTimeToLocal(rawTimes.maghrib);
  const isha = adhanTimeToLocal(rawTimes.isha);

  const sunriseMakruhEnd = addMinutes(sunrise, 15);
  const middayMakruhStart = addMinutes(dhuhr, -10);
  const sunsetMakruhStart = addMinutes(sunset, -1);
  const sunsetMakruhEnd = addMinutes(sunset, 1);

  const formattedTimes = {
    fajr: formatTime(fajr, locale),
    sunrise: formatTime(sunrise, locale),
    chast: formatTime(sunriseMakruhEnd, locale),
    zawal: formatTime(middayMakruhStart, locale),
    dhuhr: formatTime(dhuhr, locale),
    asr: formatTime(asr, locale),
    sunset: formatTime(sunset, locale),
    maghrib: formatTime(maghrib, locale),
    isha: formatTime(isha, locale),
  };

  const now = new Date();

  // Determine current active period
  let currentWaqtKey = 'isha';
  if (now >= fajr && now < sunrise) {
    currentWaqtKey = 'fajr';
  } else if (now >= sunrise && now < sunriseMakruhEnd) {
    currentWaqtKey = 'sunrise';
  } else if (now >= sunriseMakruhEnd && now < middayMakruhStart) {
    currentWaqtKey = 'chast';
  } else if (now >= middayMakruhStart && now < dhuhr) {
    currentWaqtKey = 'zawal';
  } else if (now >= dhuhr && now < asr) {
    currentWaqtKey = 'dhuhr';
  } else if (now >= asr && now < sunsetMakruhStart) {
    currentWaqtKey = 'asr';
  } else if (now >= sunsetMakruhStart && now < sunsetMakruhEnd) {
    currentWaqtKey = 'sunset';
  } else if (now >= sunsetMakruhEnd && now < isha) {
    currentWaqtKey = 'maghrib';
  } else {
    currentWaqtKey = 'isha';
  }

  // Determine next Fard (obligatory) prayer using local times
  const fardPrayers = [
    { key: 'fajr', time: fajr },
    { key: 'dhuhr', time: dhuhr },
    { key: 'asr', time: asr },
    { key: 'maghrib', time: maghrib },
    { key: 'isha', time: isha },
  ];

  let nextPrayerKey = 'fajr';
  let nextPrayerTime = formattedTimes.fajr;
  let remainingMs = 0;

  let found = false;
  for (const prayer of fardPrayers) {
    if (prayer.time > now) {
      nextPrayerKey = prayer.key;
      nextPrayerTime = formattedTimes[prayer.key as keyof typeof formattedTimes] || formattedTimes.fajr;
      remainingMs = prayer.time.getTime() - now.getTime();
      found = true;
      break;
    }
  }

  if (!found) {
    // All prayers passed, next is tomorrow's fajr
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowRaw = new PrayerTimes(coordinates, tomorrow, params);
    const tomorrowFajr = adhanTimeToLocal(tomorrowRaw.fajr);
    nextPrayerKey = 'fajr';
    nextPrayerTime = formatTime(tomorrowFajr, locale);
    remainingMs = tomorrowFajr.getTime() - now.getTime();
  }

  const remainingMinutes = Math.max(0, Math.floor(remainingMs / (1000 * 60)));

  return {
    ...formattedTimes,
    nextPrayerKey,
    nextPrayerTime,
    remainingMinutes,
    currentWaqtKey,
  };
}

// ============================================
// Full Prayer Data (for advanced UI)
// ============================================

export function calculateFullPrayerData(
  latitude: number,
  longitude: number,
  locale: string = 'bn',
  method: CalculationMethodName = 'Karachi',
  madhab: MadhabName = 'Hanafi',
  targetDate?: Date
): FullPrayerData {
  const coordinates = new Coordinates(latitude, longitude);
  const params = getCalculationParams(method, madhab);
  const date = targetDate || new Date();
  const rawTimes = new PrayerTimes(coordinates, date, params);

  // Convert all adhan UTC times to local times
  const fajr = adhanTimeToLocal(rawTimes.fajr);
  const sunrise = adhanTimeToLocal(rawTimes.sunrise);
  const dhuhr = adhanTimeToLocal(rawTimes.dhuhr);
  const asr = adhanTimeToLocal(rawTimes.asr);
  const sunset = adhanTimeToLocal(rawTimes.sunset);
  const maghrib = adhanTimeToLocal(rawTimes.maghrib);
  const isha = adhanTimeToLocal(rawTimes.isha);

  // Next day for Isha window - use local date components
  const nextLocalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const nextRawTimes = new PrayerTimes(coordinates, nextLocalDate, params);
  const nextDayFajr = adhanTimeToLocal(nextRawTimes.fajr);

  // Makruh times
  const sunriseMakruhStart = addMinutes(sunrise, -3);
  const sunriseMakruhEnd = addMinutes(sunrise, 15);
  const middayMakruhStart = addMinutes(dhuhr, -10);
  const middayMakruhEnd = dhuhr;
  const sunsetMakruhStart = addMinutes(sunset, -1);
  const sunsetMakruhEnd = addMinutes(sunset, 1);

  // Prayer items
  const items: PrayerTimeItem[] = [
    { key: 'fajr', name: 'ফজর', nameEn: 'Fajr', time: fajr, icon: 'moon-outline', color: '#4F46E5' },
    { key: 'sunrise', name: 'সূর্যোদয়', nameEn: 'Sunrise', time: sunrise, icon: 'sunny-outline', color: '#F59E0B' },
    { key: 'chast', name: 'চাশত (নফল)', nameEn: 'Chasht', time: sunriseMakruhEnd, icon: 'sunny-outline', color: '#10B981' },
    { key: 'zawal', name: 'জাওয়াল (মাকরূহ)', nameEn: 'Zawal', time: middayMakruhStart, icon: 'warning-outline', color: '#F59E0B' },
    { key: 'dhuhr', name: 'যোহর', nameEn: 'Dhuhr', time: dhuhr, icon: 'sunny', color: '#EA580C' },
    { key: 'asr', name: 'আসর', nameEn: 'Asr', time: asr, icon: 'partly-sunny', color: '#CA8A04' },
    { key: 'sunset', name: 'সূর্যাস্ত', nameEn: 'Sunset', time: sunset, icon: 'sunny-outline', color: '#F97316' },
    { key: 'maghrib', name: 'মাগরিব', nameEn: 'Maghrib', time: addMinutes(maghrib, 1), icon: 'partly-sunny-outline', color: '#EF4444' },
    { key: 'isha', name: 'এশা', nameEn: 'Isha', time: isha, icon: 'moon', color: '#1D4ED8' },
  ];

  const makruhTimes = {
    sunrise: {
      start: sunrise,
      end: sunriseMakruhEnd,
      durationMinutes: 15,
      name: 'সূর্যোদয়ের মাকরূহ সময়',
      nameEn: 'Sunrise Makruh Time',
    },
    midday: {
      start: middayMakruhStart,
      end: middayMakruhEnd,
      durationMinutes: 10,
      name: 'मध्यাহ্নের মাকরূহ সময় (যাওয়াল)',
      nameEn: 'Midday Makruh Time (Zawal)',
    },
    sunset: {
      start: sunsetMakruhStart,
      end: sunsetMakruhEnd,
      durationMinutes: 2,
      name: 'সূর্যাস্তের মাকরূহ সময়',
      nameEn: 'Sunset Makruh Time',
    },
  };

  // Prayer windows (duration between prayers) - all local times
  const prayerWindows: Record<string, PrayerWindow> = {};

  prayerWindows.fajr = {
    start: fajr,
    end: sunrise,
    durationMinutes: Math.floor((sunrise.getTime() - fajr.getTime()) / 60000),
  };

  prayerWindows.sunrise = {
    start: sunrise,
    end: sunriseMakruhEnd,
    durationMinutes: 15,
  };

  prayerWindows.chast = {
    start: sunriseMakruhEnd,
    end: middayMakruhStart,
    durationMinutes: Math.max(0, Math.floor((middayMakruhStart.getTime() - sunriseMakruhEnd.getTime()) / 60000)),
  };

  prayerWindows.zawal = {
    start: middayMakruhStart,
    end: dhuhr,
    durationMinutes: 10,
  };

  prayerWindows.dhuhr = {
    start: dhuhr,
    end: asr,
    durationMinutes: Math.floor((asr.getTime() - dhuhr.getTime()) / 60000),
  };

  prayerWindows.asr = {
    start: asr,
    end: sunset,
    durationMinutes: Math.floor((sunset.getTime() - asr.getTime()) / 60000),
  };

  prayerWindows.sunset = {
    start: sunset,
    end: addMinutes(maghrib, 1),
    durationMinutes: Math.floor((addMinutes(maghrib, 1).getTime() - sunset.getTime()) / 60000),
  };

  prayerWindows.maghrib = {
    start: addMinutes(maghrib, 1),
    end: isha,
    durationMinutes: Math.floor((isha.getTime() - maghrib.getTime()) / 60000),
  };

  prayerWindows.isha = {
    start: isha,
    end: addMinutes(nextDayFajr, -1),
    durationMinutes: Math.floor((addMinutes(nextDayFajr, -1).getTime() - isha.getTime()) / 60000),
  };

  return {
    items,
    prayerWindows,
    makruhTimes,
    nextDayFajr,
    hijriDate: getHijriDate(date),
    gregorianDate: getGregorianDate(date, locale),
    bengaliDate: getBengaliDate(date),
  };
}

// ============================================
// Prayer Window Status
// ============================================

export type PrayerStatus = 'upcoming' | 'active' | 'passed';

export interface PrayerTimingStatus {
  status: PrayerStatus;
  elapsedMinutes: number;
  remainingMinutes: number;
  totalMinutes: number;
  percent: number;
}

export function getPrayerTimingStatus(window: PrayerWindow, now: Date): PrayerTimingStatus {
  if (now.getTime() < window.start.getTime()) {
    return {
      status: 'upcoming',
      elapsedMinutes: 0,
      remainingMinutes: Math.floor((window.start.getTime() - now.getTime()) / 60000),
      totalMinutes: window.durationMinutes,
      percent: 0,
    };
  }
  if (now.getTime() < window.end.getTime()) {
    const elapsed = Math.floor((now.getTime() - window.start.getTime()) / 60000);
    const remaining = window.durationMinutes - elapsed;
    return {
      status: 'active',
      elapsedMinutes: elapsed,
      remainingMinutes: remaining,
      totalMinutes: window.durationMinutes,
      percent: Math.round((elapsed / window.durationMinutes) * 100),
    };
  }
  return {
    status: 'passed',
    elapsedMinutes: window.durationMinutes,
    remainingMinutes: 0,
    totalMinutes: window.durationMinutes,
    percent: 100,
  };
}

export function formatRemainingTime(minutes: number): string {
  if (minutes < 0) return '০ মি';
  if (minutes < 60) return `${toBanglaDigits(minutes)} মি`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${toBanglaDigits(hours)} ঘ ${toBanglaDigits(mins)} মি`;
}

// ============================================
// Date Functions
// ============================================

export function getHijriDate(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('bn-BD-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(date).replace(/\s*যুগ\s*/g, '').trim();
    return formatted + ' হিজরি';
  } catch (_e) {
    return 'হিজরি তারিখ';
  }
}

export function getGregorianDate(date: Date = new Date(), locale: string = 'bn'): string {
  const langTag = locale === 'en' ? 'en-US' : 'bn-BD';
  try {
    return new Intl.DateTimeFormat(langTag, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch (_e) {
    return date.toLocaleDateString(langTag);
  }
}

export function getBengaliDate(date: Date = new Date()): string {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const bMonthNames = [
    'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
    'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'
  ];

  const toBanglaDigits = (num: number) => {
    const digits: Record<string, string> = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return num.toString().split('').map(d => digits[d] || d).join('');
  };

  let bDay = 1;
  let bMonthIdx = 0;
  let bYear = 1433;

  if (month > 3 || (month === 3 && day >= 14)) {
    bYear = year - 593;
  } else {
    bYear = year - 594;
  }

  if (month === 0) {
    if (day <= 14) { bDay = day + 16; bMonthIdx = 8; }
    else { bDay = day - 14; bMonthIdx = 9; }
  } else if (month === 1) {
    if (day <= 13) { bDay = day + 17; bMonthIdx = 9; }
    else { bDay = day - 13; bMonthIdx = 10; }
  } else if (month === 2) {
    if (day <= 14) { bDay = day + 16; bMonthIdx = 10; }
    else { bDay = day - 14; bMonthIdx = 11; }
  } else if (month === 3) {
    if (day <= 13) { bDay = day + 17; bMonthIdx = 11; }
    else { bDay = day - 13; bMonthIdx = 0; }
  } else if (month === 4) {
    if (day <= 14) { bDay = day + 17; bMonthIdx = 0; }
    else { bDay = day - 14; bMonthIdx = 1; }
  } else if (month === 5) {
    if (day <= 15) { bDay = day + 16; bMonthIdx = 1; }
    else { bDay = day - 15; bMonthIdx = 2; }
  } else if (month === 6) {
    if (day <= 16) { bDay = day + 15; bMonthIdx = 2; }
    else { bDay = day - 16; bMonthIdx = 3; }
  } else if (month === 7) {
    if (day <= 16) { bDay = day + 15; bMonthIdx = 3; }
    else { bDay = day - 16; bMonthIdx = 4; }
  } else if (month === 8) {
    if (day <= 16) { bDay = day + 15; bMonthIdx = 4; }
    else { bDay = day - 16; bMonthIdx = 5; }
  } else if (month === 9) {
    if (day <= 16) { bDay = day + 14; bMonthIdx = 5; }
    else { bDay = day - 16; bMonthIdx = 6; }
  } else if (month === 10) {
    if (day <= 15) { bDay = day + 15; bMonthIdx = 6; }
    else { bDay = day - 15; bMonthIdx = 7; }
  } else if (month === 11) {
    if (day <= 15) { bDay = day + 15; bMonthIdx = 7; }
    else { bDay = day - 15; bMonthIdx = 8; }
  }

  return `${toBanglaDigits(bDay)} ${bMonthNames[bMonthIdx]}, ${toBanglaDigits(bYear)} বঙ্গাব্দ`;
}

// ============================================
// Adhan Notifications
// ============================================

export async function scheduleAdhanNotifications(
  latitude: number,
  longitude: number,
  method: CalculationMethodName = 'Karachi',
  madhab: MadhabName = 'Hanafi'
): Promise<void> {
  if (!Notifications?.requestPermissionsAsync || !Notifications?.cancelAllScheduledNotificationsAsync || !Notifications?.scheduleNotificationAsync) {
    return;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const coordinates = new Coordinates(latitude, longitude);
    const params = getCalculationParams(method, madhab);
    const date = new Date();
    const rawTimes = new PrayerTimes(coordinates, date, params);

    const prayers = [
      { name: 'fajr', label: 'ফজর', time: adhanTimeToLocal(rawTimes.fajr) },
      { name: 'dhuhr', label: 'যোহর', time: adhanTimeToLocal(rawTimes.dhuhr) },
      { name: 'asr', label: 'আসর', time: adhanTimeToLocal(rawTimes.asr) },
      { name: 'maghrib', label: 'মাগরিব', time: adhanTimeToLocal(rawTimes.maghrib) },
      { name: 'isha', label: 'এশা', time: adhanTimeToLocal(rawTimes.isha) },
    ];

    const now = new Date();
    for (const prayer of prayers) {
      if (prayer.time > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `নামাজের সময় হয়েছে (${prayer.label})`,
            body: `হালকা বিরতি নিন এবং নামাজের জন্য প্রস্তুতি নিন। এখন ${prayer.label}-এর ওয়াক্ত।`,
            sound: true,
          },
          trigger: { date: prayer.time },
        });
      }
    }
  } catch (error) {
    console.log('Error scheduling notifications', error);
  }
}