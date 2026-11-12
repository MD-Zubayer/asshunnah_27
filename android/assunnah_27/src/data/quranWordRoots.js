/**
 * Quran Word-to-Root Mapping Helper
 * Allows offline word-level identification for classical dictionary (المعجم الوسيط) lookup.
 */

export const KNOWN_WORD_ROOTS = {
  // Surah Al-Fatiha
  'بِسْمِ': { root: 'سمو', wordArabic: 'بِسْمِ' },
  'اللَّهِ': { root: 'اله', wordArabic: 'اللَّهِ' },
  'الرَّحْمَٰنِ': { root: 'رحم', wordArabic: 'الرَّحْمَٰنِ' },
  'الرَّحِيمِ': { root: 'رحم', wordArabic: 'الرَّحِيمِ' },
  'الْحَمْدُ': { root: 'حمد', wordArabic: 'الْحَمْدُ' },
  'لِلَّهِ': { root: 'اله', wordArabic: 'لِلَّهِ' },
  'رَبِّ': { root: 'ربب', wordArabic: 'رَبِّ' },
  'الْعَالَمِينَ': { root: 'علم', wordArabic: 'الْعَالَمِينَ' },
  'مَالِكِ': { root: 'ملك', wordArabic: 'مَالِكِ' },
  'يَوْمِ': { root: 'يوم', wordArabic: 'يَوْمِ' },
  'الدِّينِ': { root: 'دين', wordArabic: 'الدِّينِ' },
  'إِيَّاكَ': { root: 'ايا', wordArabic: 'إِيَّاكَ' },
  'نَعْبُدُ': { root: 'عبد', wordArabic: 'نَعْبُدُ' },
  'وَإِيَّاكَ': { root: 'ايا', wordArabic: 'وَإِيَّاكَ' },
  'نَسْتَعِينُ': { root: 'عون', wordArabic: 'نَسْتَعِينُ' },
  'اهْدِنَا': { root: 'هدي', wordArabic: 'اهْدِنَا' },
  'الصِّرَاطَ': { root: 'سرط', wordArabic: 'الصِّرَاطَ' },
  'الْمُسْتَقِيمَ': { root: 'قوم', wordArabic: 'الْمُسْتَقِيمَ' },
  'صِرَاطَ': { root: 'سرط', wordArabic: 'صِرَاطَ' },
  'الَّذِينَ': { root: 'الذين', wordArabic: 'الَّذِينَ' },
  'أَنْعَمْتَ': { root: 'نعم', wordArabic: 'أَنْعَمْتَ' },
  'عَلَيْهِمْ': { root: 'علي', wordArabic: 'عَلَيْهِمْ' },
  'غَيْرِ': { root: 'غير', wordArabic: 'غَيْرِ' },
  'الْمَغْضُوبِ': { root: 'غضب', wordArabic: 'الْمَغْضُوبِ' },
  'وَلَا': { root: 'لا', wordArabic: 'وَلَا' },
  'الضَّالِّينَ': { root: 'ضلل', wordArabic: 'الضَّالِّينَ' },

  // Surah Al-Baqarah (Beginning)
  'الم': { root: 'الم', wordArabic: 'الم' },
  'ذَٰلِكَ': { root: 'ذا', wordArabic: 'ذَٰلِكَ' },
  'الْكِتَابُ': { root: 'كتب', wordArabic: 'الْكِتَابُ' },
  'لَا': { root: 'لا', wordArabic: 'لَا' },
  'رَيْبَ': { root: 'ريب', wordArabic: 'رَيْبَ' },
  'فِيهِ': { root: 'في', wordArabic: 'فِيهِ' },
  'هُدًى': { root: 'هدي', wordArabic: 'هُدًى' },
  'لِلْمُتَّقِينَ': { root: 'وقي', wordArabic: 'لِلْمُتَّقِينَ' },
  'يُؤْمِنُونَ': { root: 'أمن', wordArabic: 'يُؤْمِنُونَ' },
  'بِالْغَيْبِ': { root: 'غيب', wordArabic: 'بِالْغَيْبِ' },
  'وَيُقِيمُونَ': { root: 'قوم', wordArabic: 'وَيُقِيمُونَ' },
  'الصَّلَاةَ': { root: 'صلو', wordArabic: 'الصَّلَاةَ' },
  'وَمِمَّا': { root: 'من', wordArabic: 'وَمِمَّا' },
  'رَزَقْنَاهُمْ': { root: 'رزق', wordArabic: 'رَزَقْنَاهُمْ' },
  'يُنْفِقُونَ': { root: 'نفق', wordArabic: 'يُنْفِقُونَ' },
  'أُنْزِلَ': { root: 'نزل', wordArabic: 'أُنْزِلَ' },
  'إِلَيْكَ': { root: 'الي', wordArabic: 'إِلَيْكَ' },
  'مِنْ': { root: 'من', wordArabic: 'مِنْ' },
  'قَبْلِكَ': { root: 'قبل', wordArabic: 'قَبْلِكَ' },
  'وَبِالْآخِرَةِ': { root: 'أخر', wordArabic: 'وَبِالْآخِرَةِ' },
  'هُمْ': { root: 'هم', wordArabic: 'هُمْ' },
  'يُوقِنُونَ': { root: 'يقن', wordArabic: 'يُوقِنُونَ' },
  'أُولَٰئِكَ': { root: 'اولاء', wordArabic: 'أُولَٰئِكَ' },
  'عَلَىٰ': { root: 'علي', wordArabic: 'عَلَىٰ' },
  'رَبِّهِمْ': { root: 'ربب', wordArabic: 'رَبِّهِمْ' },
  'الْمُفْلِحُونَ': { root: 'فلح', wordArabic: 'الْمُفْلِحُونَ' },
};

/**
 * Remove Arabic Tashkeel / Harakat for clean lookup
 */
export function removeTashkeel(text) {
  if (!text) return '';
  return text.replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Find root for any given Arabic word
 */
export function getRootForWord(word) {
  if (!word) return null;
  const trimmed = word.trim();

  // Exact match with tashkeel
  if (KNOWN_WORD_ROOTS[trimmed]) {
    return KNOWN_WORD_ROOTS[trimmed].root;
  }

  // Match without tashkeel
  const clean = removeTashkeel(trimmed);
  for (const [key, val] of Object.entries(KNOWN_WORD_ROOTS)) {
    if (removeTashkeel(key) === clean) {
      return val.root;
    }
  }

  // Heuristic fallbacks for 3-letter roots
  if (clean.length === 3) {
    return clean;
  }

  return clean;
}
