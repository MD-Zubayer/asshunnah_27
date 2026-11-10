/**
 * Diary Date & Calendar Utilities
 * Provides English (Bangla formatted), Bangla (Bangabda), Hijri (Islamic), and Weekday strings.
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(input) {
  return String(input ?? '').replace(/\d/g, (d) => BN_DIGITS[Number(d)]);
}

const EN_MONTHS_BN = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const WEEKDAYS_BN = [
  'রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার',
];

const BN_MONTHS = [
  'বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন',
  'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র',
];

const HIJRI_MONTHS_BN = [
  'মুহররম', 'সফর', 'রবিউল আউয়াল', 'রবিউস সানি',
  'জমাদিউল আউয়াল', 'জমাদিউস সানি', 'রজব', 'শাবান',
  'রমজান', 'শাওয়াল', 'জিলকদ', 'জিলহজ',
];

function isGregorianLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Convert Gregorian Date to Bangladesh Revised Bangla Calendar (বঙ্গাব্দ)
 */
export function getBanglaDate(dateObj) {
  const d = new Date(dateObj);
  const gYear = d.getFullYear();
  const gMonth = d.getMonth() + 1; // 1-12
  const gDay = d.getDate();

  // Bangla new year starts April 14
  let banglaYear = gYear - 593;
  if (gMonth < 4 || (gMonth === 4 && gDay < 14)) {
    banglaYear = gYear - 594;
  }

  // Reference start of Bangla year (April 14)
  const startGregYear = gMonth < 4 || (gMonth === 4 && gDay < 14) ? gYear - 1 : gYear;
  const pahelaBaishakh = new Date(startGregYear, 3, 14);
  const currentMid = new Date(gYear, gMonth - 1, gDay);
  const diffDays = Math.round((currentMid - pahelaBaishakh) / (1000 * 60 * 60 * 24));

  // Revised BD Bangla month lengths: first 6 months = 31 days (since 2019 reform: Boishakh-Ashwin 31? Actually Boishakh-Bhadro 31, Ashwin 30, Kartik-Falgun 30, Chaitra 30; Falgun 31 in leap year)
  // Specifically, in 2019 BD revised calendar: Baishakh-Ashwin (6 months) = 31 days, Kartik-Chaitra = 30 days, Falgun = 31 in leap year.
  const gregLeapForFalgun = isGregorianLeapYear(startGregYear + 1);
  const monthLengths = [
    31, 31, 31, 31, 31, 31, // বৈশাখ - আশ্বিন (৬ মাস ৩১ দিন)
    30, 30, 30, 30,
    gregLeapForFalgun ? 31 : 30, // ফাল্গুন
    30, // চৈত্র
  ];

  let remaining = diffDays;
  let bMonthIdx = 0;
  for (let i = 0; i < monthLengths.length; i++) {
    if (remaining < monthLengths[i]) {
      bMonthIdx = i;
      break;
    }
    remaining -= monthLengths[i];
  }

  const bDay = remaining + 1;
  return `${toBanglaDigits(bDay)} ${BN_MONTHS[bMonthIdx]}, ${toBanglaDigits(banglaYear)} বঙ্গাব্দ`;
}

/**
 * Pure JS Kuwaiti / Tabular Islamic Calendar calculation (safe fallback across all devices)
 */
export function getHijriDate(dateObj, adjustmentDays = 0) {
  const d = new Date(dateObj);
  if (adjustmentDays) {
    d.setDate(d.getDate() + adjustmentDays);
  }
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();

  let m = month + 1;
  let y = year;
  if (m < 3) {
    y -= 1;
    m += 12;
  }

  let a = Math.floor(y / 100);
  let b = 2 - a + Math.floor(a / 4);
  if (y < 1583) b = 0;
  if (y === 1582) {
    if (m > 10) b = -10;
    if (m === 10) {
      b = 0;
      if (day > 4) b = -10;
    }
  }

  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;

  b = 0;
  if (jd > 2299160) {
    a = Math.floor((jd - 1867216.25) / 36524.25);
    b = 1 + a - Math.floor(a / 4);
  }
  const bb = jd + b + 1524;
  let cc = Math.floor((bb - 122.1) / 365.25);
  const dd = Math.floor(365.25 * cc);
  const ee = Math.floor((bb - dd) / 30.6001);
  const dayCalc = bb - dd - Math.floor(30.6001 * ee);
  let monthCalc = ee - 1;
  if (ee > 13) {
    cc += 1;
    monthCalc = ee - 13;
  }
  const yearCalc = cc - 4716;

  const iyear = 10631.0 / 30.0;
  const epochastro = 1948084;
  const shift1 = 8.01 / 60.0;

  let z = jd - epochastro;
  const cyc = Math.floor(z / 10631.0);
  z = z - 10631 * cyc;
  const j = Math.floor((z - shift1) / iyear);
  const iy = 30 * cyc + j;
  z = z - Math.floor(j * iyear + shift1);
  let im = Math.floor((z + 28.5001) / 29.5);
  if (im === 13) im = 12;
  const id = z - Math.floor(29.5001 * im - 29);

  // Keep unused variables tidy
  void dayCalc;
  void monthCalc;
  void yearCalc;

  const monthName = HIJRI_MONTHS_BN[Math.max(0, Math.min(11, im - 1))];
  return `${toBanglaDigits(id)} ${monthName}, ${toBanglaDigits(iy)} হিজরি`;
}

export function getEnglishDateBn(dateObj) {
  const d = new Date(dateObj);
  return `${toBanglaDigits(d.getDate())} ${EN_MONTHS_BN[d.getMonth()]}, ${toBanglaDigits(d.getFullYear())}`;
}

export function getWeekdayBn(dateObj) {
  const d = new Date(dateObj);
  return WEEKDAYS_BN[d.getDay()];
}

export function toISODateString(dateObj) {
  const d = new Date(dateObj);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getMonthYearKey(entry) {
  const raw = entry?.entry_date || entry?.created_at || new Date().toISOString();
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return 'অন্যান্য';
  return `${EN_MONTHS_BN[d.getMonth()]} ${toBanglaDigits(d.getFullYear())}`;
}

export function getFullDiaryDateMeta(dateInput, customHijri) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  return {
    dateObj: safeDate,
    iso: toISODateString(safeDate),
    englishBn: getEnglishDateBn(safeDate),
    banglaDate: getBanglaDate(safeDate),
    hijriDate: customHijri || getHijriDate(safeDate),
    weekday: getWeekdayBn(safeDate),
  };
}
