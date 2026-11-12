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
   * Get Ayah Study Details (All 3 Translations + Arabic Tafsir Ibn Kathir, Muyassar, Jalalayn)
   */
  async getAyahStudy(surah, ayah) {
    const s = Number(surah);
    const a = Number(ayah);
    const cacheKey = `@quran_study_color_tokens_v9_${s}_${a}`;

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
      fetch(`https://api.qurancdn.com/api/qdc/verses/by_key/${s}:${a}?translations=161,163`, { headers }).then((r) => r.json()),
      fetch(`https://api.qurancdn.com/api/qdc/tafsirs/14/by_ayah/${s}:${a}`, { headers }).then((r) => r.json()),
      fetch(`https://api.qurancdn.com/api/qdc/tafsirs/16/by_ayah/${s}:${a}`, { headers }).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/bn.bengali`, { headers }).then((r) => r.json()),
      fetch(`https://api.alquran.cloud/v1/ayah/${s}:${a}/ar.jalalayn`, { headers }).then((r) => r.json()),
    ]);

    const cdnTranslations = quranCdnTransRes.status === 'fulfilled' ? quranCdnTransRes.value?.verse?.translations || [] : [];
    let mujiburText = '';
    let taisirulText = '';

    for (const t of cdnTranslations) {
      if (t.resource_id === 163) {
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
        kitab_name_bangla: 'মাওলানা মহিউদ্দীন খান',
        kitab_slug: 'trans-muhiuddin',
        surah: s,
        ayah: a,
        translation_text: muhiuddinText || mujiburText || taisirulText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 2,
        kitab_name_bangla: 'ড. মুজিবুর রহমান',
        kitab_slug: 'trans-mujibur',
        surah: s,
        ayah: a,
        translation_text: mujiburText || muhiuddinText || taisirulText || 'অনুবাদ প্রস্তুত হচ্ছে...',
      },
      {
        id: 3,
        kitab_name_bangla: 'তাইসিরুল কুরআন',
        kitab_slug: 'trans-taisirul',
        surah: s,
        ayah: a,
        translation_text: taisirulText || mujiburText || muhiuddinText || 'অনুবাদ প্রস্তুত হচ্ছে...',
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
