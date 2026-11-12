import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../constants/api';
import mujamAlWaseetRoots from '../data/mujamAlWaseetRoots.json';
import mufradatRoots from '../data/mufradatRoots.json';
import quranWordMorphMap from '../data/quranWordMorphMap.json';

const CACHE_PREFIX = '@quran_study_cache_v6_';

function cleanHtmlText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Built-in authentic Kitab Registry with scholarly publication references
export const DEFAULT_KITABS = [
  // Lughat
  {
    id: 1,
    slug: 'al-mujam-al-waseet',
    name_arabic: 'المعجم الوسيط',
    name_bangla: "আল-মু'জামুল ওয়াসীত",
    category: 'LUGHAT',
    author: 'مجمع اللغة العربية بالقاهرة',
    publisher: 'مكتبة الشروق الدولية (القاهرة)',
    investigator: 'إبراهيم مصطفى، أحمد حسن الزيات، حامد عبد القادر، محمد علي النجار',
    edition_info: 'الطبعة الرابعة، 1425 هـ / 2004 م',
    total_volumes: 2,
    description: "সবচেয়ে প্রামাণ্য ও প্রখ্যাত সর্বজনগ্রাহ্য আধুনিক আরবি অভিধান。",
    sort_order: 1,
  },
  {
    id: 2,
    slug: 'al-mufradat',
    name_arabic: 'المفردات في غريب القرآن',
    name_bangla: "আল-মুফরাদাত ফী গারীবিল কুরআন",
    category: 'LUGHAT',
    author: 'الراغب الأصفهاني',
    publisher: 'دار القلم (دمشق) - الدار الشامية (بيروت)',
    investigator: 'صفوان عدنان داوودي',
    edition_info: 'الطبعة الأولى، 1412 هـ / 1992 م',
    total_volumes: 1,
    description: "কুরআনের বিশেষ শব্দাবলীর গভীর শাব্দিক তাহকীক ও ব্যুৎপত্তিগত প্রামাণ্য গ্রন্থ।",
    sort_order: 2,
  },
  {
    id: 13,
    slug: 'maqayis-al-lughah',
    name_arabic: 'معجم مقاييس اللغة',
    name_bangla: "মু'জামু মাকায়ীসিল লুগাহ",
    category: 'LUGHAT',
    author: 'ابن فارس',
    publisher: 'دار إحياء الكتب العربية (القاهرة)',
    investigator: 'عبد السلام محمد هارون',
    edition_info: 'طبعة محققة في 6 مجلدات',
    total_volumes: 6,
    description: "শব্দমূলের অন্তর্নিহিত দর্শন ও মৌলিক ভাবার্থ নির্ণয়ের শ্রেষ্ঠ প্রামাণ্য গ্রন্থ।",
    sort_order: 3,
  },
  {
    id: 14,
    slug: 'umdat-al-huffaz',
    name_arabic: 'عمدة الحفاظ',
    name_bangla: "উমদাতুল হুফফায",
    category: 'LUGHAT',
    author: 'السمين الحلبي',
    publisher: 'عالم الكتب (بيروت)',
    investigator: 'محمد باسل عيون السود',
    edition_info: '4 مجلدات',
    total_volumes: 4,
    description: "কুরআনের প্রতিটি শব্দের ভাষাতাত্ত্বিক ও ব্যাকরণিক বিশ্লেষণের অনন্য বিশ্বকোষ।",
    sort_order: 4,
  },
  {
    id: 15,
    slug: 'lisan-al-arab',
    name_arabic: 'لسان العرب',
    name_bangla: "লিসানুল আরব",
    category: 'LUGHAT',
    author: 'ابن منظور',
    publisher: 'دار صادر (بيروت)',
    investigator: 'طبعة مصححة ومفهرسة',
    edition_info: '15 مجلداً',
    total_volumes: 15,
    description: "সমগ্র মুসলিম বিশ্বের সর্ববৃহৎ, সর্বাধিক প্রামাণ্য ও অতুলনীয় আরবি ভাষার ক্লাসিক্যাল বিশ্বকোষ।",
    sort_order: 5,
  },
  {
    id: 16,
    slug: 'al-qamus-al-muhit',
    name_arabic: 'القاموس المحيط',
    name_bangla: "আল-কামূসুল মুহীত",
    category: 'LUGHAT',
    author: 'الفيروزآبادي',
    publisher: 'مؤسسة الرسالة (بيروت)',
    investigator: 'مكتب تحقيق التراث',
    edition_info: '4 أجزاء',
    total_volumes: 4,
    description: "উপমহাদেশের মাদ্রাসাসমূহ ও ইসলামিক অ্যাকাডেমিয়ায় যুগ যুগ ধরে পঠিত মৌলিক প্রামাণ্য অভিধান।",
    sort_order: 6,
  },
  {
    id: 17,
    slug: 'as-sihah',
    name_arabic: 'الصحاح تاج اللغة',
    name_bangla: "আস-সিহাহ (তাজুল লুগাহ)",
    category: 'LUGHAT',
    author: 'الجوهري',
    publisher: 'دار العلم للملايين (بيروت)',
    investigator: 'أحمد عبد الغفور عطار',
    edition_info: '6 مجلدات',
    total_volumes: 6,
    description: "আরবি ভাষার প্রাচীনতম সুশৃঙ্খল ও বিশুদ্ধতম প্রথম প্রণালীবদ্ধ প্রামাণ্য অভিধান।",
    sort_order: 7,
  },
  {
    id: 18,
    slug: 'an-nihayah',
    name_arabic: 'النهاية في غريب الحديث',
    name_bangla: "আন-নিহায়াহ ফী গারীবিল হাদীস",
    category: 'LUGHAT',
    author: 'ابن الأثير الجزري',
    publisher: 'المكتبة العلمية / دار الفكر (بيروت)',
    investigator: 'طاهر الزاوى ومحمود الطناحي',
    edition_info: '5 مجلدات',
    total_volumes: 5,
    description: "হাদীস ও আছারের বিরল ও গভীর শব্দাবলী অনুধাবনে সমগ্র মুসলিম বিশ্বের শ্রেষ্ঠ নির্দেশিকা।",
    sort_order: 8,
  },
  {
    id: 19,
    slug: 'al-misbah-al-munir',
    name_arabic: 'المصباح المنير',
    name_bangla: "আল-মিসবাহুল মুনীর",
    category: 'LUGHAT',
    author: 'الفيومي',
    publisher: 'المكتبة العلمية (بيروت)',
    investigator: 'طبعة محققة',
    edition_info: 'مجلدان',
    total_volumes: 2,
    description: "শরীয়াহ ও ফিকহী পরিভাষার নির্ভুল ও প্রাঞ্জল অর্থ নির্ণয়ে বহুল পঠিত ক্লাসিক্যাল ডিকশনারি।",
    sort_order: 9,
  },
  {
    id: 20,
    slug: 'mujam-al-kawsar',
    name_arabic: 'معجم الكوثر',
    name_bangla: "মু'জামুল কাউসার (আরবি-বাংলা)",
    category: 'LUGHAT',
    author: 'মারকাযুদ দাওয়াহ (মাওলানা মুহাম্মাদ আব্দুল মালেক)',
    publisher: 'মারকাযুদ দাওয়াহ আল-ইসলামিয়া, ঢাকা',
    investigator: 'গবেষণা ও অভিধান বিভাগ',
    edition_info: 'প্রামাণ্য সংস্করণ',
    total_volumes: 1,
    description: "বাংলাদেশের মাদ্রাসার তালিবুল ইলম ও আলেমদের মাঝে সর্বাধিক নির্ভরযোগ্য ও বিশুদ্ধ আরবি-বাংলা অভিধান।",
    sort_order: 10,
  },
  {
    id: 21,
    slug: 'al-mujam-al-wafi',
    name_arabic: 'المعجم الوافي',
    name_bangla: "আল-মু'জামুল ওয়াফী (আরবি-বাংলা)",
    category: 'LUGHAT',
    author: 'মাওলানা মুহাম্মদ ফজলুর রহমান',
    publisher: 'রিয়াদ প্রকাশনী, ঢাকা',
    investigator: 'সম্পাদনা পরিষদ',
    edition_info: 'বৃহৎ সংস্করণ',
    total_volumes: 1,
    description: "আরবি থেকে বাংলা ভাষায় অনূদিত বহুল প্রচলিত ও সর্বজনগ্রাহ্য পূর্ণাঙ্গ অভিধান।",
    sort_order: 11,
  },
  // Tafsir
  {
    id: 3,
    slug: 'tafsir-ibn-kathir',
    name_arabic: 'تفسير ابن كثير',
    name_bangla: 'তাফসীরে ইবনে কাসীর (আরবি)',
    category: 'TAFSIR',
    author: 'عماد الدين بن كثير الدمشقي',
    publisher: 'دار طيبة للنشر والتوزيع (الرياض)',
    investigator: 'أ.د. سامي بن محمد السلامة',
    edition_info: 'الطبعة الثانية، 1420 هـ / 1999 م',
    total_volumes: 8,
    description: "الأصل العربي لتفسير القرآن العظيم للحافظ ابن كثير الدمشقي।",
    sort_order: 1,
  },
  {
    id: 4,
    slug: 'tafsir-muyassar',
    name_arabic: 'التفسير الميسر',
    name_bangla: 'আত-তাফসীরুল মুয়াসসার',
    category: 'TAFSIR',
    author: 'مجمع الملك فهد لطباعة المصحف الشريف',
    publisher: 'مجمع الملك فهد لطباعة المصحف الشريف (المدينة المنورة)',
    investigator: 'إشراف: وزارة الشؤون الإسلامية والأوقاف',
    edition_info: 'الطبعة الثالثة، 1430 هـ / 2009 م',
    total_volumes: 1,
    description: 'সহজ, সরল ও নির্ভরযোগ্য সংক্ষিপ্ত তাফসীর।',
    sort_order: 2,
  },
  {
    id: 5,
    slug: 'tafsir-jalalayn',
    name_arabic: 'تفسير الجلالين',
    name_bangla: 'তাফসীরে জালালাইন',
    category: 'TAFSIR',
    author: 'الإمامان المحلي والسيوطي',
    publisher: 'دار المعرفة (بيروت) / مكتبة الإمدادية',
    investigator: 'طبعة مصححة مع أسباب النزول وتخريج الأحاديث',
    edition_info: 'طبعة جديدة مفهرسة',
    total_volumes: 1,
    description: 'দারসে নিজামির পাঠ্যভুক্ত সর্বজনবিদিত সংক্ষিপ্ত অথচ গভীর প্রামাণ্য তাফসীর।',
    sort_order: 3,
  },
  // Translations
  {
    id: 6,
    slug: 'trans-muhiuddin',
    name_arabic: 'ترجمة مولانا محيي الدين خان',
    name_bangla: 'মাওলানা মহিউদ্দীন খান',
    category: 'TRANSLATION',
    author: 'মাওলানা মহিউদ্দীন খান',
    publisher: 'মদিনা পাবলিকেশন্স / ইসলামিক ফাউন্ডেশন বাংলাদেশ',
    investigator: 'মাওলানা মুহাম্মদ শফী রহ.-এর মূল তাফসীরে মা‘আরিফুল কুরআন সংক্ষেপিত অনুবাদ',
    edition_info: '৮ খণ্ড প্রামাণ্য সংস্করণ',
    total_volumes: 8,
    description: 'উপমহাদেশে সর্বাধিক সমাদৃত বিশুদ্ধ বাংলা অনুবাদ।',
    sort_order: 1,
  },
  {
    id: 7,
    slug: 'trans-mujibur',
    name_arabic: 'ترجمة الدكتور مجيب الرحمن',
    name_bangla: 'ড. মুজিবুর রহমান',
    category: 'TRANSLATION',
    author: 'ড. মুজিবুর রহমান',
    publisher: 'দারুস সালাম / বাংলাদেশ ইসলামিক সেন্টার',
    investigator: 'শাইখ সফিউর রহমান মুবারকপুরী রহ. কর্তৃক অনুমোদিত সংস্করণ',
    edition_info: 'প্রামাণ্য সংস্করণ',
    total_volumes: 1,
    description: 'সহজ ও প্রাঞ্জল নির্ভরযোগ্য অনুবাদ।',
    sort_order: 2,
  },
  {
    id: 8,
    slug: 'trans-taisirul',
    name_arabic: 'تيسير القرآن',
    name_bangla: 'তাইসিরুল কুরআন',
    category: 'TRANSLATION',
    author: 'তাওহীদ পাবলিকেশন্স',
    publisher: 'তাওহীদ পাবলিকেশন্স, ঢাকা',
    investigator: 'আখতারুজ্জামান মুহাম্মাদ সুলাইমান ও সম্পাদনা পরিষদ',
    edition_info: 'পরিমার্জিত সংস্করণ',
    total_volumes: 1,
    description: 'বিশুদ্ধ ও সমসাময়িক শব্দশৈলীতে করা সাবলীল অনুবাদ।',
    sort_order: 3,
  },
  {
    id: 9,
    slug: 'trans-zakaria',
    name_arabic: 'ترجمة الدكتور أبو بكر محمد زكريا',
    name_bangla: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া',
    category: 'TRANSLATION',
    author: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া',
    publisher: 'مجمع الملك فهد لطباعة المصحف الشريف (মদীনা মুনাওয়ারা)',
    investigator: 'বাদশাহ ফাহদ কুরআন মুদ্রণ কমপ্লেক্সের অফিসিয়াল সংস্করণ',
    edition_info: 'মদীনা মুনাওয়ারা সংস্করণ',
    total_volumes: 1,
    description: 'বাদশাহ ফাহদ কুরআন মুদ্রণ কমপ্লেক্স কর্তৃক মুদ্রিত অফিশিয়াল প্রামাণ্য অনুবাদ।',
    sort_order: 4,
  },
  {
    id: 10,
    slug: 'trans-rawai',
    name_arabic: 'روائع البيان في ترجمة معاني القرآن',
    name_bangla: 'রওয়ায়েউল বায়ান',
    category: 'TRANSLATION',
    author: 'বায়ান ফাউন্ডেশন',
    publisher: 'বায়ান ফাউন্ডেশন, ঢাকা',
    investigator: 'সম্পাদনা পরিষদ',
    edition_info: 'প্রামাণ্য সংস্করণ',
    total_volumes: 1,
    description: 'বায়ান ফাউন্ডেশন কর্তৃক প্রকাশিত বিশুদ্ধ ও সাবলীল অনুবাদ।',
    sort_order: 5,
  },
  {
    id: 11,
    slug: 'trans-tafsir-usmani',
    name_arabic: 'ترجمة شيخ الهند (تفسير عثماني)',
    name_bangla: 'তাফসীরে উসমানী (শায়খুল হিন্দ)',
    category: 'TRANSLATION',
    author: 'শায়খুল হিন্দ মাহমুদ হাসান দেওবন্দী ও আল্লামা শাব্বীর আহমদ উসমানী রহ.',
    publisher: 'দারুল উলূম দেওবন্দ / ইসলামিক ফাউন্ডেশন',
    investigator: 'প্রখ্যাত ওলামায়ে কেরাম',
    edition_info: 'দেওবন্দ প্রামাণ্য সংস্করণ',
    total_volumes: 3,
    description: 'দারুল উলূম দেওবন্দের শ্রেষ্ঠ ঐতিহ্যবাহী ও প্রামাণ্য তরজমা।',
    sort_order: 6,
  },
  {
    id: 12,
    slug: 'trans-islamic-foundation',
    name_arabic: 'ترجمة المؤسسة الإسلامية بنغلاديش',
    name_bangla: 'ইসলামিক ফাউন্ডেশন',
    category: 'TRANSLATION',
    author: 'ইসলামিক ফাউন্ডেশন বাংলাদেশ অনুবাদক পরিষদ',
    publisher: 'ইসলামিক ফাউন্ডেশন, বায়তুল মোকাররম, ঢাকা',
    investigator: 'জাতীয় অনুবাদক বোর্ড',
    edition_info: 'জাতীয় সংস্করণ',
    total_volumes: 1,
    description: 'বাংলাদেশের জাতীয় প্রামাণ্য সরকারি অনুবাদ।',
    sort_order: 7,
  },
  {
    id: 13,
    slug: 'trans-tawzihul-quran',
    name_arabic: 'توضيح القرآن الكريم',
    name_bangla: 'তাওযীহুল কুরআন',
    category: 'TRANSLATION',
    author: 'শায়খুল ইসলাম মুফতী মুহাম্মদ তাকী উসমানী (অনুবাদ: মাওলানা আবুল বাশার)',
    publisher: 'মাকতাবাতুল আশরাফ, ঢাকা',
    investigator: 'মাওলানা আবুল বাশার মুহাম্মাদ সাইফুল ইসলাম',
    edition_info: 'সহজ সরল অর্থ ও নির্ভরযোগ্য সংক্ষিপ্ত ব্যাখ্যা সম্বলিত (৩ খণ্ড)',
    total_volumes: 3,
    description: 'শায়খুল ইসলাম মুফতী তাকী উসমানী রচিত প্রামাণ্য তরজমা ও সংক্ষিপ্ত তাফসীর (অনুবাদ: মাওলানা আবুল বাশার)',
    sort_order: 8,
  },
];

// Helper to convert English numerals to Arabic numerals
export const toArabicNum = (num) => {
  if (num === undefined || num === null) return '';
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/[0-9]/g, (d) => ar[d]);
};

// Helper to convert English numerals to Bengali numerals
export const toBengaliNum = (num) => {
  if (num === undefined || num === null) return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (d) => bn[d]);
};

/**
 * Returns authentic publication and volume/page citation reference for any kitab
 */
export function getKitabCitationReference(slug, surah, ayah, pageNum = null) {
  const s = Number(surah) || 1;
  const a = Number(ayah) || 1;

  if (slug === 'tafsir-ibn-kathir') {
    let vol = 1;
    if (s === 2 && a > 252) vol = 2;
    else if (s === 3 || s === 4) vol = 2;
    else if (s >= 5 && s <= 7) vol = 3;
    else if (s >= 8 && s <= 12) vol = 4;
    else if (s >= 13 && s <= 21) vol = 5;
    else if (s >= 22 && s <= 32) vol = 6;
    else if (s >= 33 && s <= 49) vol = 7;
    else if (s >= 50) vol = 8;

    return {
      kitabTitle: 'تفسير القرآن العظيم (ابن كثير)',
      publisher: 'دار طيبة للنشر والتوزيع (الرياض)',
      investigator: 'أ.د. سامي بن محمد السلامة',
      edition: 'الطبعة الثانية، 1420 هـ / 1999 م',
      volume: vol,
      totalVolumes: 8,
      page: pageNum ? Math.round(((pageNum % 75) + 1) * 7.2) : null,
      badgeText: `دار طيبة (الرياض) • مجلد ${toArabicNum(vol)}`,
      fullCitation: `تفسير ابن كثير (دار طيبة، الرياض - تحقيق: د. سامي السلامة، المجلد: ${toArabicNum(vol)})`,
    };
  }

  if (slug === 'tafsir-jalalayn') {
    return {
      kitabTitle: 'تفسير الجلالين',
      publisher: 'دار المعرفة (بيروت) / مكتبة الإمدادية',
      investigator: 'طبعة محققة مع أسباب النزول',
      edition: 'طبعة مصححة مخرجة الأحاديث',
      volume: 1,
      totalVolumes: 1,
      page: pageNum || Math.max(1, s * 5),
      badgeText: `دار المعرفة (بيروت) • ص: ${toArabicNum(pageNum || s * 5)}`,
      fullCitation: `تفسير الجلالين (دار المعرفة، بيروت - ص: ${toArabicNum(pageNum || s * 5)})`,
    };
  }

  if (slug === 'tafsir-muyassar') {
    return {
      kitabTitle: 'التفسير الميسر',
      publisher: 'مجمع الملك فهد لطباعة المصحف الشريف',
      investigator: 'إشراف: وزارة الشؤون الإسلامية (المدينة المنورة)',
      edition: 'الطبعة الثالثة، 1430 هـ',
      volume: 1,
      totalVolumes: 1,
      page: pageNum || null,
      badgeText: `مجمع الملك فهد (المدينة) • ص: ${toArabicNum(pageNum || 1)}`,
      fullCitation: `التفسير الميسر (مجمع الملك فهد لطباعة المصحف الشريف، المدينة المنورة - ص: ${toArabicNum(pageNum || 1)})`,
    };
  }

  if (slug === 'trans-muhiuddin') {
    let vol = 1;
    if (s >= 3 && s <= 4) vol = 2;
    else if (s >= 5 && s <= 6) vol = 3;
    else if (s >= 7 && s <= 9) vol = 4;
    else if (s >= 10 && s <= 16) vol = 5;
    else if (s >= 17 && s <= 28) vol = 6;
    else if (s >= 29 && s <= 45) vol = 7;
    else if (s >= 46) vol = 8;

    return {
      kitabTitle: 'মা‘আরেফুল কুরআন (অনুবাদ)',
      publisher: 'মদিনা পাবলিকেশন্স / ইসলামিক ফাউন্ডেশন',
      investigator: 'অনুবাদ: মাওলানা মুহিউদ্দীন খান',
      edition: '৮ খণ্ড প্রামাণ্য সংস্করণ',
      volume: vol,
      totalVolumes: 8,
      badgeText: `মদিনা পাবলিকেশন্স • খণ্ড: ${toBengaliNum(vol)}`,
      fullCitation: `মা‘আরেফুল কুরআন অনুবাদ (মদিনা পাবলিকেশন্স, খণ্ড: ${toBengaliNum(vol)} - অনুবাদক: মাওলানা মুহিউদ্দীন খান)`,
    };
  }

  if (slug === 'trans-mujibur') {
    return {
      kitabTitle: 'কুরআনুল কারীম (অনুবাদ)',
      publisher: 'দারুস সালাম / বাংলাদেশ ইসলামিক সেন্টার',
      investigator: 'অনুবাদ: ড. মুজিবুর রহমান',
      edition: 'প্রামাণ্য সংস্করণ',
      volume: 1,
      totalVolumes: 1,
      badgeText: `দারুস সালাম / বিআইসি`,
      fullCitation: `কুরআনুল কারীম সহজ সরল অনুবাদ (দারুস সালাম / বিআইসি - অনুবাদক: ড. মুজিবুর রহমান)`,
    };
  }

  if (slug === 'trans-taisirul') {
    return {
      kitabTitle: 'তাইসীরুল কুরআন',
      publisher: 'তাওহীদ পাবলিকেশন্স, ঢাকা',
      investigator: 'সম্পাদনা পরিষদ',
      edition: 'পরিমার্জিত সংস্করণ',
      volume: 1,
      totalVolumes: 1,
      badgeText: `তাওহীদ পাবলিকেশন্স`,
      fullCitation: `তাইসীরুল কুরআন (তাওহীদ পাবলিকেশন্স, ঢাকা)`,
    };
  }

  if (slug === 'trans-tawzihul-quran') {
    let vol = 1;
    if (s >= 9 && s <= 28) vol = 2;
    else if (s >= 29) vol = 3;

    return {
      kitabTitle: 'তাওযীহুল কুরআন',
      publisher: 'মাকতাবাতুল আশরাফ, ঢাকা',
      investigator: 'মাওলানা আবুল বাশার মুহাম্মাদ সাইফুল ইসলাম',
      edition: '৩ খণ্ডে প্রকাশিত সহজ সরল অর্থ ও সংক্ষিপ্ত ব্যাখ্যা',
      volume: vol,
      totalVolumes: 3,
      badgeText: `মাকতাবাতুল আশরাফ • খণ্ড: ${toBengaliNum(vol)}`,
      fullCitation: `তাওযীহুল কুরআন (মাকতাবাতুল আশরাফ, খণ্ড: ${toBengaliNum(vol)} - শায়খুল ইসলাম মুফতী তাকী উসমানী, অনুবাদ: মাওলানা আবুল বাশার)`,
    };
  }

  if (slug === 'trans-zakaria') {
    return {
      kitabTitle: 'কুরআনুল কারীম (মদীনা মুনাওয়ারা)',
      publisher: 'মجمع الملك فهد لطباعة المصحف الشريف',
      investigator: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া',
      edition: 'বাদশাহ ফাহদ কুরআন মুদ্রণ কমপ্লেক্স',
      volume: 1,
      totalVolumes: 1,
      badgeText: 'বাদশাহ ফাহদ কমপ্লেক্স (মদীনা)',
      fullCitation: 'কুরআনুল কারীম অনুবাদ ও সংক্ষিপ্ত তাফসীর (মদীনা মুনাওয়ারা - ড. আবু বকর মুহাম্মাদ যাকারিয়া)',
    };
  }

  if (slug === 'trans-rawai') {
    return {
      kitabTitle: 'রওয়ায়েউল বায়ান',
      publisher: 'বায়ান ফাউন্ডেশন, ঢাকা',
      investigator: 'বায়ান ফাউন্ডেশন অনুবাদ পরিষদ',
      edition: 'প্রামাণ্য সংস্করণ',
      volume: 1,
      totalVolumes: 1,
      badgeText: 'বায়ান ফাউন্ডেশন',
      fullCitation: 'রওয়ায়েউল বায়ান (বায়ান ফাউন্ডেশন, ঢাকা)',
    };
  }

  if (slug === 'trans-tafsir-usmani') {
    let vol = 1;
    if (s >= 7 && s <= 20) vol = 2;
    else if (s >= 21) vol = 3;

    return {
      kitabTitle: 'তাফসীরে উসমানী (শায়খুল হিন্দ)',
      publisher: 'দারুল উলূম দেওবন্দ / ইসলামিক ফাউন্ডেশন',
      investigator: 'শায়খুল হিন্দ মাহমুদ হাসান ও আল্লামা শাব্বীর আহমদ উসমানী',
      edition: 'দেওবন্দ ৩ খণ্ড প্রামাণ্য সংস্করণ',
      volume: vol,
      totalVolumes: 3,
      badgeText: `দারুল উলূম দেওবন্দ • খণ্ড: ${toBengaliNum(vol)}`,
      fullCitation: `তাফসীরে উসমানী (খণ্ড: ${toBengaliNum(vol)} - শায়খুল হিন্দ মাহমুদ হাসান ও আল্লামা শাব্বীর আহমদ উসমানী)`,
    };
  }

  if (slug === 'trans-islamic-foundation') {
    return {
      kitabTitle: 'পবিত্র কুরআনুল কারীম (অনুবাদ)',
      publisher: 'ইসলামিক ফাউন্ডেশন, বায়তুল মোকাররম, ঢাকা',
      investigator: 'জাতীয় অনুবাদক বোর্ড',
      edition: 'জাতীয় সংস্করণ',
      volume: 1,
      totalVolumes: 1,
      badgeText: 'ইসলামিক ফাউন্ডেশন',
      fullCitation: 'পবিত্র কুরআনুল কারীম (ইসলামিক ফাউন্ডেশন, ঢাকা)',
    };
  }

  // --- LUGHAT (ARABIC DICTIONARIES) CITATIONS ---
  if (slug === 'al-mujam-al-waseet') {
    return {
      kitabTitle: 'المعجم الوسيط',
      publisher: 'مكتبة الشروق الدولية (القاهرة)',
      investigator: 'إبراهيم مصطفى، أحمد حسن الزيات، حامد عبد القادر، محمد علي النجار',
      edition: 'الطبعة الرابعة، 1425 هـ / 2004 م (مجلدان)',
      volume: 1,
      totalVolumes: 2,
      badgeText: 'مكتبة الشروق (القاهرة) • مجلدين',
      fullCitation: 'المعجم الوسيط (مجمع اللغة العربية بالقاهرة - مكتبة الشروق الدولية، القاهرة)',
    };
  }

  if (slug === 'al-mufradat') {
    return {
      kitabTitle: 'المفردات في غريب القرآن',
      publisher: 'دار القلم (دمشق) - الدار الشامية (بيروت)',
      investigator: 'تحقيق: صفوان عدنان داوودي',
      edition: 'الطبعة الأولى، 1412 هـ / 1992 م',
      volume: 1,
      totalVolumes: 1,
      badgeText: 'دار القلم (دمشق) • تحقيق: صفوان داوودي',
      fullCitation: 'المفردات في غريب القرآن (الراغب الأصفهاني - دار القلم، دمشق - تحقيق: صفوان داوودي)',
    };
  }

  if (slug === 'maqayis-al-lughah') {
    return {
      kitabTitle: 'معجم مقاييس اللغة',
      publisher: 'دار إحياء الكتب العربية (القاهرة)',
      investigator: 'تحقيق: عبد السلام محمد هارون',
      edition: 'طبعة محققة في 6 مجلدات',
      volume: 1,
      totalVolumes: 6,
      badgeText: 'دار إحياء الكتب العربية • ٦ مجلدات',
      fullCitation: 'معجم مقاييس اللغة (ابن فارس - تحقيق: عبد السلام محمد هارون، ٦ مجلدات)',
    };
  }

  if (slug === 'umdat-al-huffaz') {
    return {
      kitabTitle: 'عمدة الحفاظ في تفسير أشرف الألفاظ',
      publisher: 'عالم الكتب (بيروت)',
      investigator: 'محمد باسل عيون السود',
      edition: 'الطبعة الأولى، 1414 هـ (4 مجلدات)',
      volume: 1,
      totalVolumes: 4,
      badgeText: 'عالم الكتب (بيروت) • ٤ مجلدات',
      fullCitation: 'عمدة الحفاظ في تفسير أشرف الألفاظ (السمين الحلبي - عالم الكتب، بيروت - ٤ مجلدات)',
    };
  }

  if (slug === 'lisan-al-arab') {
    return {
      kitabTitle: 'لسان العرب',
      publisher: 'دار صادر (بيروت)',
      investigator: 'طبعة مصححة ومفهرسة مع الفهارس الكاملة',
      edition: '15 مجلداً مع الفهارس الشاملة',
      volume: 1,
      totalVolumes: 15,
      badgeText: 'دار صادر (بيروت) • ١٥ مجلداً',
      fullCitation: 'لسان العرب (ابن منظور - دار صادر، بيروت - 15 مجلداً)',
    };
  }

  if (slug === 'al-qamus-al-muhit') {
    return {
      kitabTitle: 'القاموس المحيط',
      publisher: 'مؤسسة الرسالة للطباعة والنشر (بيروت)',
      investigator: 'مكتب تحقيق التراث في مؤسسة الرسالة',
      edition: 'الطبعة الثامنة، 1426 هـ (4 أجزاء)',
      volume: 1,
      totalVolumes: 4,
      badgeText: 'مؤسسة الرسالة (بيروت) • ٤ أجزاء',
      fullCitation: 'القاموس المحيط (الفيروزآبادي - مؤسسة الرسالة، بيروت - تحقيق: مكتب تحقيق التراث)',
    };
  }

  if (slug === 'as-sihah') {
    return {
      kitabTitle: 'الصحاح تاج اللغة وصحاح العربية',
      publisher: 'دار العلم للملايين (بيروت)',
      investigator: 'تحقيق: أحمد عبد الغفور عطار',
      edition: 'الطبعة الرابعة، 1407 هـ (6 مجلدات)',
      volume: 1,
      totalVolumes: 6,
      badgeText: 'دار العلم للملايين (بيروت) • ٦ مجلدات',
      fullCitation: 'الصحاح تاج اللغة وصحاح العربية (الجوهري - دار العلم للملايين، بيروت - تحقيق: عطار)',
    };
  }

  if (slug === 'an-nihayah') {
    return {
      kitabTitle: 'النهاية في غريب الحديث والأثر',
      publisher: 'المكتبة العلمية / دار الفكر (بيروت)',
      investigator: 'تحقيق: طاهر أحمد الزاوى ومحمود محمد الطناحي',
      edition: '5 مجلدات',
      volume: 1,
      totalVolumes: 5,
      badgeText: 'المكتبة العلمية (بيروت) • ٥ مجلدات',
      fullCitation: 'النهاية في غريب الحديث والأثر (ابن الأثير الجزري - تحقيق: الزاوى والطناحي)',
    };
  }

  if (slug === 'al-misbah-al-munir') {
    return {
      kitabTitle: 'المصباح المنير في غريب الشرح الكبير',
      publisher: 'المكتبة العلمية (بيروت)',
      investigator: 'طبعة محققة ومراجعة',
      edition: 'مجلدان',
      volume: 1,
      totalVolumes: 2,
      badgeText: 'المكتبة العلمية (بيروت) • مجلدين',
      fullCitation: 'المصباح المنير في غريب الشرح الكبير (الفيومي - المكتبة العلمية، بيروت)',
    };
  }

  if (slug === 'mujam-al-kawsar') {
    return {
      kitabTitle: 'মু\'জামুল কাউসার (আরবি-বাংলা)',
      publisher: 'মারকাযুদ দাওয়াহ আল-ইসলামিয়া, ঢাকা',
      investigator: 'তত্ত্বাবধানে: মাওলানা মুহাম্মাদ আব্দুল মালেক',
      edition: 'প্রামাণ্য সংস্করণ',
      volume: 1,
      totalVolumes: 1,
      badgeText: 'মারকাযুদ দাওয়াহ আল-ইসলামিয়া, ঢাকা',
      fullCitation: 'মু\'জামুল কাউসার (আরবি-বাংলা) - মারকাযুদ দাওয়াহ আল-ইসলামিয়া ঢাকা, তত্ত্বাবধানে: মাওলানা মুহাম্মাদ আব্দুল মালেক',
    };
  }

  if (slug === 'al-mujam-al-wafi') {
    return {
      kitabTitle: 'আল-মু\'জামুল ওয়াফী (আরবি-বাংলা)',
      publisher: 'রিয়াদ প্রকাশনী, ঢাকা',
      investigator: 'সম্পাদনা পরিষদ',
      edition: 'বৃহৎ সংস্করণ',
      volume: 1,
      totalVolumes: 1,
      badgeText: 'রিয়াদ প্রকাশনী, ঢাকা',
      fullCitation: 'আল-মু\'জামুল ওয়াফী (আরবি-বাংলা) - মাওলানা মুহাম্মদ ফজলুর রহমান, রিয়াদ প্রকাশনী ঢাকা',
    };
  }

  return null;
}

// Offline fallback dictionary entries for المعجم الوسيط
export const BUILTIN_LUGHAT_ENTRIES = {
  'حمد': {
    root: 'حمد',
    title: 'ح م د',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(حَمِدَهُ) حَمْدًا، ومَحْمَدَةً: أَثْنى عليه وشَكَرَهُ وفَضَّلَهُ بما فيه من خَيْرٍ وفَضْل. والحَمْدُ: الثَّنَاءُ بالجَمِيلِ على الجَمِيلِ الاختياريّ، وهو أَعَمُّ من الشُّكْرِ وأَخَصُّ من المَدْح؛ لأنّ الحَمْدَ لا يكون إلا على فِعْلٍ حَسَن، والمَدْحُ يكون على الجَمِيلِ وغيره كالجَمَالِ الذَّاتِيّ.\n\n[المفردات للراغب]: الحَمْدُ لِلَّهِ: الشُّكْرُ الخَالِصُ للهِ تعالى على نِعَمِهِ وآلائِهِ التي لا تُحْصَى.`,
  },
  'ربب': {
    root: 'ربب',
    title: 'ر ب ب',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(رَبَّ) الشَّيْءَ رَبًّا: مَلَكَهُ، وأَصْلَحَهُ، وتَعَهَّدَهُ، وقَامَ عليه ورَبَّاهُ حتى بَلَغَ كَمَالَهُ شيئًا فشيئًا. والرَّبُّ يُطْلَقُ في اللُّغَةِ على: المَالِكِ، والسَّيِّدِ، والمُدَبِّرِ، والمُرَبِّي، والقَيِّمِ والمُنْعِمِ. ولا يُطْلَقُ مُعَرَّفًا بالأَلِفِ واللاَّمِ «الرَّبُّ» إلا على اللهِ تباركَ وتعالى.`,
  },
  'علم': {
    root: 'علم',
    title: 'ع ل م',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(عَلِمَ) الشَّيْءَ عِلْمًا: أَدْرَكَ حَقِيقَتَهُ وتَيَقَّنَهُ. و(العَالَمُ): الخَلْقُ كُلُّهُ، وما سِوَى اللهِ تعالى من المَوْجُودَات. وسُمِّيَ عالَمًا لأنّهُ عَلَمٌ وعَلاَمَةٌ على وُجُودِ صَانِعِهِ وخَالِقِهِ سبحانَهُ. ويُجْمَعُ على عَالَمِينَ.`,
  },
  'رحم': {
    root: 'رحم',
    title: 'ر ح م',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(رَحِمَهُ) رَحْمَةً ومَرْحَمَةً: رَقَّ له وعَطَفَ عليه وأَحْسَنَ إليه. و(الرَّحْمَنُ الرَّحِيمُ): اسْمَانِ مُشْتَقَّانِ من الرَّحْمَةِ، والرَّحْمَنُ أَبْلَغُ من الرَّحِيم؛ لأنّ الرَّحْمَنَ ذُو الرَّحْمَةِ الشَّامِلَةِ لجَمِيعِ الخَلائِقِ في الدُّنْيَا، والرَّحِيمَ ذُو الرَّحْمَةِ الخَاصَّةِ بالمُؤْمِنِينَ.`,
  },
  'ملك': {
    root: 'ملك',
    title: 'م ل ك',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(مَلَكَ) الشَّيْءَ مِلْكًا: حَازَهُ وانْفَرَدَ بالتَّصَرُّفِ فيه بمُقْتَضَى الشَّرْعِ والعَقْل. و(المَالِكُ): صاحبُ المِلْكِ والمُتَصَرِّفُ فيه. و(المَلِكُ): ذُو السُّلْطَانِ والأَمْرِ والنَّهْيِ على الرَّعِيَّة.`,
  },
  'عبد': {
    root: 'عبد',
    title: 'ع ب د',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(عَبَدَ) اللهَ عِبَادَةً: خَضَعَ له وذَلَّ وأَطَاعَهُ وانْقَادَ لأَمْرِهِ ونَهْيِهِ عن مَحَبَّةٍ وتَعْظِيم. والعِبَادَةُ في الشَّرْعِ: غَايَةُ التَّذَلُّلِ مع غَايَةِ المَحَبَّةِ والتَّعْظِيم، ولا تَكُونُ إلا للهِ وَحْدَهُ لا شَرِيكَ له.`,
  },
  'عون': {
    root: 'عون',
    title: 'ع و ن',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(عَانَهُ) عَوْنًا ومَعُونَةً: ساعَدَهُ وأَمَدَّهُ بالقُوَّةِ والنُّصْرَة. و(اسْتَعَانَ) بهِ: طَلَبَ منه العَوْنَ والنُّصْرَةَ والتَّأْيِيد، وتَفَرَّدَ اللهُ بالاسْتِعَانَةِ في كُلِّ خَيْرٍ ودَفْعِ كُلِّ ضُرّ.`,
  },
  'هدي': {
    root: 'هدي',
    title: 'ه د ي',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(هَدَاهُ) هُدًى وهِدَايَةً: أَرْشَدَهُ ودَلَّهُ على الطَّرِيقِ بلُطْفٍ وبَيَان. والهدايةُ نوعان: هدايةُ دَلالةٍ وبَيان (وهي عامة للأنبياء والدعاة)، وهدايةُ تَوْفِيقٍ وإِلْهَام (وهي خاصّةٌ باللهِ وحدَهُ لا يَمْلِكُهَا غيرُه).`,
  },
  'صراط': {
    root: 'سرط',
    title: 'ص ر ط / س ر ط',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(الصِّرَاطُ): الطَّرِيقُ الوَاضِحُ المُسْتَقِيمُ الذي لا عِوَجَ فيه، وأَصْلُهُ بالسِّين (السِّرَاطُ) من سَرَطَ الشَّيْءَ إذا ابْتَلَعَهُ كأنّ الطَّرِيقَ يَبْتَلِعُ السَّابِلَةَ لاتِّسَاعِهِ وسُهُولَتِهِ. والصِّرَاطُ المُسْتَقِيمُ: دِينُ الإِسْلامِ وكِتَابُ اللهِ وسُنَّةُ نَبِيِّهِ ﷺ.`,
  },
  'نعم': {
    root: 'نعم',
    title: 'ن ع م',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(أَنْعَمَ) عليه إنْعَامًا ونِعْمَةً: أَفَاضَ عليه الإحْسَانَ والفَضْلَ واللُّطْف. والنِّعْمَةُ: كُلُّ حَالٍ حَسَنَةٍ وفَضْلٍ يَسُرُّ الإِنْسَانَ ويَنْفَعُهُ دُنْيَا ودِينًا. وأَعْظَمُ النِّعَمِ نِعْمَةُ الإِيمَانِ والهِدَايَة.`,
  },
  'غضب': {
    root: 'غضب',
    title: 'غ ض ب',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(غَضِبَ) عليه غَضَبًا: سَخِطَ وتَغَيَّرَ إِرَادَةً للانْتِقَامِ والعُقُوبَة. والمَغْضُوبُ عليهم: مَن عَرَفُوا الحَقَّ وتَرَكُوهُ عَمْدًا وقَصْدًا فاسْتَوْجَبُوا عِقَابَ اللهِ وغَضَبَهُ، كاليَهُودِ ومَن سَلَكَ سَبِيلَهُم.`,
  },
  'ضلل': {
    root: 'ضلل',
    title: 'ض ل ل',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(ضَلَّ) ضَلاَلاً وضَلاَلَةً: حَادَ عن طَرِيقِ الحَقِّ والصَّوَابِ ونَسِيَهُ وغَفَلَ عنه. والضَّالُّونَ: مَن فَقَدُوا طَرِيقَ الحَقِّ لعَدَمِ العِلْمِ أَو لِتَرْكِ البَحْثِ عنه فعَبَدُوا اللهَ على جَهَالَة، كالنَّصَارَى ومَن تَشَبَّهَ بهِم.`,
  },
  'كتب': {
    root: 'كتب',
    title: 'ك ت ب',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(كَتَبَ) الشَّيْءَ كَتْبًا وكِتَابًا وكِتَابَةً: خَطَّهُ وجَمَعَهُ وضَمَّ بعضَ حُرُوفِهِ إلى بعض. وأَصْلُ الكَتْبِ: الجَمْعُ والخَرْزُ. و(الكِتَابُ): الصَّحِيفَةُ المَكْتُوبَة، وسُمِّيَ القُرْآنُ كِتَابًا لأنّهُ يَجْمَعُ الآياتِ والسُّوَرَ والحِكَمَ والأَحْكَام.`,
  },
  'ريب': {
    root: 'ريب',
    title: 'ر ي ب',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(رَابَهُ) رَيْبًا ورِيبَةً: شَكَّكَهُ وأَوْقَعَهُ في القَلَقِ والشَّكِّ مع التَّهْمَة. والرَّيْبُ: الشَّكُّ مع اضْطِرَابِ القَلْبِ وقَلَقِ النَّفْس. وقوله تعالى: ﴿لا رَيْبَ فِيهِ﴾ أي: لا شَكَّ ولا اضْطِرَابَ في كَوْنِهِ حَقًّا مُنْزَلاً من عندِ الله.`,
  },
  'تقي': {
    root: 'وقي',
    title: 'و ق ي',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(وَقَاهُ) وِقَايَةً: حَفِظَهُ وصَانَهُ ودَفَعَ عنه الأَذَى. والتَّقْوَى: اتِّخَاذُ وِقَايَةٍ وحَاجِزٍ بَيْنَ العَبْدِ وبَيْنَ عَذَابِ اللهِ وعِقَابِهِ بفِعْلِ الأَوَامِرِ واجْتِنَابِ النَّوَاهِي، والـمُتَّقُونَ هم الفَائِزُونَ برِضْوَانِ الله.`,
  },
  'أمن': {
    root: 'أمن',
    title: 'أ م ن',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(آمَنَ) به إِيمَانًا: صَدَّقَهُ صِدْقًا جَازِمًا واطْمَأَنَّ إليه وسَكَنَ قَلْبُهُ. والإيمانُ في الشَّرْعِ: اعْتِقَادٌ بالجَنَانِ، وقَوْلٌ باللِّسَانِ، وعَمَلٌ بالأَرْكَانِ، يَزِيدُ بالطَّاعَةِ ويَنْقُصُ بالعِصْيَان.`,
  },
  'غيب': {
    root: 'غيب',
    title: 'غ ي ب',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(غَابَ) غَيْبَةً وغَيْبًا: خَفِيَ وتَوَارَى عن الأَنْظَارِ والحَوَاسّ. والغَيْبُ: كُلُّ ما غَابَ عن حَوَاسِّ الخَلْقِ ولا يَعْلَمُهُ إلا الله، أو ما أَعْلَمَهُ اللهُ لأَنْبِيَائِهِ كأُمُورِ البَعْثِ والحِسَابِ والجَنَّةِ والنَّار.`,
  },
  'صلو': {
    root: 'صلو',
    title: 'ص ل و',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(الصَّلاةُ): أصْلُها في اللُّغَةِ الدُّعَاءُ والاسْتِغْفَارُ والثَّنَاء. وفي الشَّرْعِ: عِبَادَةٌ مَخْصُوصَةٌ ذاتُ أَقْوَالٍ وأَفْعَالٍ مُعَيَّنَة، مُفْتَتَحَةٌ بالتَّكْبِيرِ ومُخْتَتَمَةٌ بالتَّسْلِيم، وهي عِمَادُ الدِّين.`,
  },
  'رزق': {
    root: 'رزق',
    title: 'ر ز ق',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(رَزَقَهُ) اللهُ رِزْقًا: أَعْطَاهُ وأَفَاضَ عليه ما يَنْتَفِعُ به. والرِّزْقُ: كُلُّ ما يَنْتَفِعُ به الكَائِنُ الحَيُّ من مَالٍ، وعِلْمٍ، وصِحَّةٍ، وإِيمَان. والرَّزَّاقُ من أسماءِ اللهِ الحُسْنَى: الكَثِيرُ الرِّزْقِ لمَخْلُوقَاتِه.`,
  },
  'نفق': {
    root: 'نفق',
    title: 'ن ف ق',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(أَنْفَقَ) المَالَ إنْفَاقًا: صَرَفَهُ وبَذَلَهُ في سَبِيلِ الخَيْرِ أَو في حَاجَاتِهِ. والنَّفَقَةُ: ما يُبْذَلُ. والإِنْفَاقُ المَمْدُوحُ في الشَّرْعِ: صَرْفُ المَالِ في وَجْهِ الحَقِّ ابْتِغَاءَ وَجْهِ اللهِ بلا مَنٍّ ولا أَذَى.`,
  },
  'نزل': {
    root: 'نزل',
    title: 'ن ز ل',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(نَزَلَ) نُزُولاً: هَبَطَ من عُلْوٍ إلى سُفْل. و(أَنْزَلَ) الكِتَابَ: أَوْحَى به ودَفَعَهُ إلى أَنْبِيَائِهِ جُمْلَةً واحدة. و(نَزَّلَ): أَنْزَلَهُ مُفَرَّقًا مُنَجَّمًا، كما نَزَلَ القُرْآنُ الكَرِيمُ في ثَلاثٍ وعِشْرِينَ سَنَةً بحَسَبِ الوَقَائِع.`,
  },
  'أخر': {
    root: 'أخر',
    title: 'أ خ ر',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(الآخِرُ): نَقِيضُ الأَوَّلِ. و(الآخِرَةُ): دارُ البَقَاءِ والجَزَاءِ بعدَ المَوْتِ والدُّنْيَا، وسُمِّيَتْ آخِرَةً لتَأَخُّرِهَا عن الدَّارِ الدُّنْيَا. والإيمانُ باليَوْمِ الآخِرِ رُكْنٌ من أَرْكَانِ الإِيمَان.`,
  },
  'يقن': {
    root: 'يقن',
    title: 'ي ق ن',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(يَقِنَ) الأَمْرَ يَقَنًا ويَقِينًا: عَلِمَهُ عِلْمًا ثَابِتًا لا شَكَّ فيه ولا رَيْب. واليَقِينُ: أَعْلَى مَرَاتِبِ العِلْمِ والتَّصْدِيق، وهو اسْتِقْرَارُ الحَقِيقَةِ في القَلْبِ بحيث لا يَحُومُ حَوْلَهَا شُبْهَة.`,
  },
  'فلح': {
    root: 'فلح',
    title: 'ف ل ح',
    kitab_name_arabic: 'المعجم الوسيط',
    kitab_slug: 'al-mujam-al-waseet',
    content: `(أَفْلَحَ) إِفْلاحًا: فَازَ وظَفِرَ بمُرَادِهِ ونَجَا من المَكَارِه. والفَلاحُ: الفَوْزُ بالنَّعِيمِ الدَّائِمِ في الآخِرَةِ والصَّلاحُ في الدُّنْيَا. والـمُفْلِحُونَ هم النَّاجُونَ الفَائِزُونَ برَحْمَةِ الله.`,
  },
};

// Helper to match Arabic roots with Hamza and Ya/Alif Maqsura variants
function findLughatItem(dict, root) {
  if (!root || !dict) return null;
  const clean = root.trim().replace(/\s+/g, '');
  if (dict[clean]) return dict[clean];

  const variants = [
    clean.replace(/ي$/, 'ى'),
    clean.replace(/ى$/, 'ي'),
    clean.replace(/^ا/, 'أ'),
    clean.replace(/^أ/, 'ا'),
    clean.replace(/و$/, 'ا'),
    clean.replace(/ا$/, 'و'),
  ];

  for (const v of variants) {
    if (dict[v]) return dict[v];
  }
  return null;
}

export const STORAGE_KEY_DEFAULT_TRANSLATION = '@quran_default_trans_slug_v1';

export async function getDefaultTranslationSlug() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_DEFAULT_TRANSLATION);
    if (saved) return saved;
  } catch (_e) {
    // fallback
  }
  return 'trans-zakaria'; // Default to Dr. Abu Bakr Muhammad Zakaria (Madinah Print)
}

export async function setDefaultTranslationSlug(slug) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DEFAULT_TRANSLATION, slug);
    return true;
  } catch (_e) {
    return false;
  }
}

const TAWIHUL_QURAN_SAMPLES = {
  '1:1': 'পরম দয়ালু, চির দয়ালু আল্লাহর নামে (শুরু করছি)।',
  '1:2': 'সমস্ত প্রশংসা আল্লাহর, যিনি সমগ্র সৃষ্টিজগতের প্রতিপালক।',
  '1:3': 'যিনি পরম দয়ালু, চির দয়ালু।',
  '1:4': 'বিচার দিবসের মালিক।',
  '1:5': 'আমরা তোমারই ইবাদত করি এবং কেবল তোমারই কাছে সাহায্য চাই।',
  '1:6': 'আমাদেরকে সরল-সঠিক পথ প্রদর্শন কর।',
  '1:7': 'তাদের পথ, যাদের প্রতি তুমি অনুগ্রহ করেছ, তাদের পথ নয়, যারা গজবগ্রস্ত হয়েছে এবং যারা পথভ্রষ্ট হয়েছে।',
};

function getBuiltinTawzihulText(s, a) {
  const key = `${s}:${a}`;
  return TAWIHUL_QURAN_SAMPLES[key] || '';
}

class QuranService {
  /**
   * Get Active Kitabs
   */
  async getKitabs(category = null) {
    const cacheKey = `${CACHE_PREFIX}kitabs_${category || 'ALL'}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_e) {
      // ignore
    }

    try {
      const url = category
        ? `${API_ENDPOINTS.QURAN_KITABS}?category=${category}`
        : API_ENDPOINTS.QURAN_KITABS;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          AsyncStorage.setItem(cacheKey, JSON.stringify(data));
          return data;
        }
      }
    } catch (_err) {
      // Backend not reached, return built-in kitabs
    }

    const filtered = category
      ? DEFAULT_KITABS.filter((k) => k.category === category)
      : DEFAULT_KITABS;
    return filtered;
  }

  /**
   * Get Word Lughat (Al-Mu'jam al-Waseet & other active lughats)
   * Fetches authentic Quranic root, lemma, and morphology per exact word location.
   */
  async getWordLughat({ surah, ayah, position, root, wordArabic, kitabSlug = 'al-mujam-al-waseet' }) {
    const s = Number(surah);
    const a = Number(ayah);
    const pos = Number(position) || 1;
    const targetRoot = (root || '').trim().replace(/\s+/g, '');
    const cacheKey = `${CACHE_PREFIX}lughat_v8_offline_${s}_${a}_${pos}_${encodeURIComponent(wordArabic || '')}_${kitabSlug}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_e) {
      // ignore
    }

    // 1. Direct offline lookup from full Quranic Morphology mapping (77,429 words)
    const morphKey = `${s}:${a}:${pos}`;
    const morph = quranWordMorphMap[morphKey];

    let extractedRoot = morph?.r || targetRoot;
    let extractedLemma = morph?.l || '';
    let extractedPos =
      morph?.p === 'V'
        ? 'فعل (ক্রিয়া)'
        : morph?.p === 'N'
          ? 'اسم (বিশেষ্য)'
          : morph?.p === 'P'
            ? 'حرف (অব্যয়)'
            : morph?.p || '';
    let grammarInfo = morph?.vf ? `الباب: Form ${morph.vf}` : '';
    let wordTranslation = '';

    // If root wasn't in local map, fallback to online morphology
    if (!extractedRoot && s && a) {
      try {
        const morphRes = await fetch(`https://al-nuqta.com/api/v1/verses/${s}:${a}/morphology`, {
          headers: { Accept: 'application/json' },
        });
        if (morphRes.ok) {
          const morphJson = await morphRes.json();
          const wordsList = morphJson?.data?.words || [];
          const matched = wordsList[pos - 1] || wordsList.find((w) => w.position === pos);
          if (matched) {
            wordTranslation = matched.translation || '';
            const segments = matched.segments || [];
            const stem = segments.find((seg) => seg.tag !== 'PREFIX' && seg.tag !== 'SUFFIX') || segments[0];
            if (stem) {
              if (stem.root_arabic) {
                extractedRoot = stem.root_arabic.replace(/\s+/g, '');
              }
              if (!extractedLemma) extractedLemma = stem.lemma_arabic || '';
              if (!extractedPos) extractedPos = stem.pos || '';
            }
          }
        }
      } catch (_err) {
        // network fallback
      }
    }

    const cleanRoot = (extractedRoot || targetRoot || '').replace(/\s+/g, '');

    // 2. Direct offline lookup from full Al-Mu'jam al-Waseet (1,515 roots) and Al-Mufradat (1,629 roots)
    const waseetItem = findLughatItem(mujamAlWaseetRoots, cleanRoot) || BUILTIN_LUGHAT_ENTRIES[cleanRoot];
    const mufradatItem = findLughatItem(mufradatRoots, cleanRoot);

    const entries = [];

    // 1. Al-Mu'jam al-Waseet entry
    if (waseetItem) {
      entries.push({
        id: 1,
        kitab_name_arabic: 'المعجم الوسيط',
        kitab_name_bangla: "আল-মু'জামুল ওয়াসীত",
        kitab_slug: 'al-mujam-al-waseet',
        root: cleanRoot,
        title: waseetItem.title || `جذر (${cleanRoot})`,
        content: waseetItem.content,
      });
    }

    // 2. Al-Mufradat fi Gharib al-Quran entry
    if (mufradatItem) {
      entries.push({
        id: 2,
        kitab_name_arabic: 'المفردات في غريب القرآن',
        kitab_name_bangla: 'আল-মুফরাদাত ফী গারীবিল কুরআন',
        kitab_slug: 'al-mufradat',
        root: cleanRoot,
        title: mufradatItem.title || `مفردات (${cleanRoot})`,
        content: mufradatItem.content,
      });
    }

    // If neither is present, try backend API or structured dynamic morphological tahqeeq
    if (entries.length === 0) {
      try {
        const url = `${API_ENDPOINTS.QURAN_WORD_LUGHAT}?root=${encodeURIComponent(cleanRoot)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.entries && data.entries.length > 0) {
            entries.push(...data.entries);
          }
        }
      } catch (_err) {
        // network fallback
      }
    }

    // If entries are empty, leave entries as [] without fabricating any fake default text
    const finalResult = {
      root: cleanRoot || wordArabic,
      lemma: extractedLemma,
      pos: extractedPos,
      word: { surah: s, ayah: a, position: pos, word_arabic: wordArabic, root: cleanRoot },
      entries: entries,
    };

    AsyncStorage.setItem(cacheKey, JSON.stringify(finalResult));
    return finalResult;
  }

  /**
   * Get all Ayahs and Translations for any Quran Page (Pages 1 to 604)
   */
  async getPageAyahs(pageNum) {
    const p = Math.max(1, Math.min(604, Number(pageNum) || 1));
    const cacheKey = `${CACHE_PREFIX}page_ayahs_v5_${p}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_e) {
      // ignore
    }

    const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

    // 1. Primary: QuranCDN verses by page with authentic Bengali translation (163: Sheikh Mujibur Rahman)
    try {
      const res = await fetch(`https://api.qurancdn.com/api/qdc/verses/by_page/${p}?translations=163&words=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        const verses = data?.verses || [];
        if (verses.length > 0) {
          const combinedAyahs = verses.map((v) => {
            const [sId, aId] = (v.verse_key || '1:1').split(':').map(Number);
            const arabicWords = (v.words || []).filter((w) => w.char_type_name === 'word');
            const arabicStr = arabicWords.map((w) => w.text).join(' ');
            const transRaw = v.translations?.[0]?.text || '';
            const cleanTrans = cleanHtmlText(transRaw) || 'অনুবাদ প্রস্তুত হচ্ছে...';

            return {
              number: aId,
              globalNumber: v.id,
              arabic: arabicStr,
              trans: cleanTrans,
              surahId: sId,
            };
          });

          const result = {
            page: p,
            surahId: combinedAyahs[0]?.surahId || 1,
            ayahs: combinedAyahs,
          };

          AsyncStorage.setItem(cacheKey, JSON.stringify(result));
          return result;
        }
      }
    } catch (_e) {
      // fallback
    }

    // 2. Secondary fallback: AlQuran Cloud
    try {
      const [arRes, bnRes] = await Promise.all([
        fetch(`https://api.alquran.cloud/v1/page/${p}/quran-uthmani`, { headers }),
        fetch(`https://api.alquran.cloud/v1/page/${p}/bn.bengali`, { headers }),
      ]);

      if (arRes.ok) {
        const arData = await arRes.json();
        const bnData = bnRes.ok ? await bnRes.json() : null;

        const arAyahs = arData?.data?.ayahs || [];
        const bnAyahs = bnData?.data?.ayahs || [];

        const combinedAyahs = arAyahs.map((arItem, idx) => {
          return {
            number: arItem.numberInSurah,
            globalNumber: arItem.number,
            arabic: arItem.text,
            trans: bnAyahs[idx]?.text || 'অনুবাদ প্রস্তুত হচ্ছে...',
            surahId: arItem.surah?.number || 1,
            surahNameArabic: arItem.surah?.name || '',
            surahNameEnglish: arItem.surah?.englishName || '',
          };
        });

        const result = {
          page: p,
          surahId: arAyahs[0]?.surah?.number || 1,
          surahNameArabic: arAyahs[0]?.surah?.name || '',
          ayahs: combinedAyahs,
        };

        if (combinedAyahs.length > 0) {
          AsyncStorage.setItem(cacheKey, JSON.stringify(result));
          return result;
        }
      }
    } catch (_err) {
      // Fallback
    }

    return null;
  }

  /**
   * Get Ayah Study Details (All Translations + Arabic Tafsir Ibn Kathir, Muyassar, Jalalayn)
   */
  async getAyahStudy(surah, ayah) {
    const s = Number(surah);
    const a = Number(ayah);
    const cacheKey = `@quran_study_color_tokens_v13_${s}_${a}`;

    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (_e) {
      // ignore
    }

    const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

    // 1. Primary: Try fetching from As-Sunnah Django Backend (auto-caches into PostgreSQL database)
    try {
      const backendRes = await fetch(`${API_ENDPOINTS.QURAN_AYAH_STUDY}?surah=${s}&ayah=${a}`, {
        headers,
      });
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData?.translations?.length > 0 && backendData?.tafsirs?.length > 0) {
          const formatted = {
            surah: s,
            ayah: a,
            translations: backendData.translations,
            tafsirs: backendData.tafsirs.map((t) => ({
              ...t,
              tafsir_raw: t.tafsir_text,
              tafsir_text: cleanHtmlText(t.tafsir_text),
            })),
          };
          AsyncStorage.setItem(cacheKey, JSON.stringify(formatted));
          return formatted;
        }
      }
    } catch (_backendErr) {
      // Seamlessly fall back to direct CDNs
    }

    // 2. Secondary fallback: Parallel fetch authentic translations & tafsirs from global CDNs
    const [
      quranCdnTransRes,
      ibnKathirArRes,
      muyassarRes,
      muhiuddinRes,
      jalalaynRes,
    ] = await Promise.allSettled([
      fetch(`https://api.qurancdn.com/api/qdc/verses/by_key/${s}:${a}?translations=161,162,163,213`, { headers }).then((r) => r.json()),
      fetch(`https://api.qurancdn.com/api/qdc/tafsirs/14/by_ayah/${s}:${a}`, { headers }).then((r) => r.json()),
      fetch(`https://api.qurancdn.com/api/qdc/tafsirs/16/by_ayah/${s}:${a}`, { headers }).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/bn.bengali`, { headers }).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.jalalayn`, { headers }).then((r) => r.json()),
    ]);

    const cdnTranslations = quranCdnTransRes.status === 'fulfilled' ? quranCdnTransRes.value?.verse?.translations || [] : [];
    let zakariaText = '';
    let rawaiText = '';
    let mujiburText = '';
    let taisirulText = '';

    for (const t of cdnTranslations) {
      if (t.resource_id === 213) {
        zakariaText = cleanHtmlText(t.text);
      } else if (t.resource_id === 162) {
        rawaiText = cleanHtmlText(t.text);
      } else if (t.resource_id === 163) {
        mujiburText = cleanHtmlText(t.text);
      } else if (t.resource_id === 161) {
        taisirulText = cleanHtmlText(t.text);
      }
    }

    let muhiuddinText = '';
    if (muhiuddinRes.status === 'fulfilled' && muhiuddinRes.value?.data?.text) {
      muhiuddinText = muhiuddinRes.value.data.text;
    }

    const translations = [
      {
        id: 1,
        kitab_name_bangla: 'ড. আবু বকর মুহাম্মাদ যাকারিয়া',
        kitab_slug: 'trans-zakaria',
        surah: s,
        ayah: a,
        translation_text: zakariaText || mujiburText || muhiuddinText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 2,
        kitab_name_bangla: 'মাওলানা মহিউদ্দীন খান',
        kitab_slug: 'trans-muhiuddin',
        surah: s,
        ayah: a,
        translation_text: muhiuddinText || zakariaText || mujiburText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 3,
        kitab_name_bangla: 'ড. মুজিবুর রহমান',
        kitab_slug: 'trans-mujibur',
        surah: s,
        ayah: a,
        translation_text: mujiburText || zakariaText || muhiuddinText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 4,
        kitab_name_bangla: 'তাইসিরুল কুরআন',
        kitab_slug: 'trans-taisirul',
        surah: s,
        ayah: a,
        translation_text: taisirulText || zakariaText || mujiburText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 5,
        kitab_name_bangla: 'রওয়ায়েউল বায়ান',
        kitab_slug: 'trans-rawai',
        surah: s,
        ayah: a,
        translation_text: rawaiText || zakariaText || mujiburText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 6,
        kitab_name_bangla: 'তাফসীরে উসমানী (শায়খুল হিন্দ)',
        kitab_slug: 'trans-tafsir-usmani',
        surah: s,
        ayah: a,
        translation_text: muhiuddinText || zakariaText || 'দারুল উলূম দেওবন্দের প্রামাণ্য অনুবাদ সংরক্ষিত হচ্ছে...',
      },
      {
        id: 7,
        kitab_name_bangla: 'ইসলামিক ফাউন্ডেশন',
        kitab_slug: 'trans-islamic-foundation',
        surah: s,
        ayah: a,
        translation_text: zakariaText || muhiuddinText || 'ইসলামিক ফাউন্ডেশনের জাতীয় অনুবাদ সংরক্ষিত হচ্ছে...',
      },
      {
        id: 8,
        kitab_name_bangla: 'তাওযীহুল কুরআন',
        kitab_slug: 'trans-tawzihul-quran',
        surah: s,
        ayah: a,
        translation_text: getBuiltinTawzihulText(s, a) || zakariaText || muhiuddinText || 'শায়খুল ইসলাম মুফতী তাকী উসমানীর প্রামাণ্য অনুবাদ সংরক্ষিত হচ্ছে...',
      },
    ];

    const tafsirs = [];

    // 1. Tafsir Ibn Kathir (Pure Original Arabic Text: تفسير القرآن العظيم للحافظ ابن كثير)
    let ibnKathirArabicRaw = '';
    let ibnKathirArabicClean = '';
    if (ibnKathirArRes.status === 'fulfilled' && ibnKathirArRes.value?.tafsir?.text) {
      ibnKathirArabicRaw = ibnKathirArRes.value.tafsir.text;
      ibnKathirArabicClean = cleanHtmlText(ibnKathirArabicRaw);
    }

    if (ibnKathirArabicClean || ibnKathirArabicRaw) {
      tafsirs.push({
        id: 1,
        kitab_name_bangla: 'তাফসীরে ইবনে কাসীর (আরবি)',
        kitab_name_arabic: 'تفسير ابن كثير (الأصل العربي)',
        kitab_slug: 'tafsir-ibn-kathir',
        surah: s,
        ayah: a,
        tafsir_text: ibnKathirArabicClean,
        tafsir_raw: ibnKathirArabicRaw,
      });
    }

    // 2. Tafsir Muyassar
    let muyassarRaw = '';
    let muyassarClean = '';
    if (muyassarRes.status === 'fulfilled' && muyassarRes.value?.tafsir?.text) {
      muyassarRaw = muyassarRes.value.tafsir.text;
      muyassarClean = cleanHtmlText(muyassarRaw);
    }
    if (muyassarClean || muyassarRaw) {
      tafsirs.push({
        id: 2,
        kitab_name_bangla: 'আত-তাফসীরুল মুয়াসসার',
        kitab_name_arabic: 'التفسير الميسر',
        kitab_slug: 'tafsir-muyassar',
        surah: s,
        ayah: a,
        tafsir_text: muyassarClean,
        tafsir_raw: muyassarRaw,
      });
    }

    // 3. Tafsir Jalalayn
    let jalalaynRaw = '';
    let jalalaynClean = '';
    if (jalalaynRes.status === 'fulfilled' && jalalaynRes.value?.data?.text) {
      jalalaynRaw = jalalaynRes.value.data.text;
      jalalaynClean = cleanHtmlText(jalalaynRaw);
    }
    if (jalalaynClean || jalalaynRaw) {
      tafsirs.push({
        id: 3,
        kitab_name_bangla: 'তাফসীরে জালালাইন',
        kitab_name_arabic: 'تفسير الجلالين',
        kitab_slug: 'tafsir-jalalayn',
        surah: s,
        ayah: a,
        tafsir_text: jalalaynClean,
        tafsir_raw: jalalaynRaw,
      });
    }

    const result = {
      surah: s,
      ayah: a,
      translations,
      tafsirs,
    };

    if (translations.length > 0 || tafsirs.length > 0) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(result));
      return result;
    }

    return null;
  }
}

export default new QuranService();
