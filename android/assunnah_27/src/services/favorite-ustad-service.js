import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_USTADS_KEY = '@favorite_ustads_v1';

// All Jamia Ustads Master Dataset
export const ALL_USTADS = [
  // Shaikhul Hadith & Muhaddisin
  { id: 'u_1', name: 'মুহিউস সুন্নাহ শাইখুল হাদীস আল্লামা মাহমুদুল হাসান দা.বা.', title: 'শাইখুল হাদীস ও শাইখুল জামিয়া', address: 'মোমেনশাহী', phone: '', category: 'মুহাদ্দিসিন' },
  { id: 'u_2', name: 'শাইখুল হাদীস মাওলানা নেয়ামাতুল্লাহ আল ফরিদী', title: 'মুহতামিম ও মুহাদ্দিস', address: 'গোপালগঞ্জ', phone: '01732580023', category: 'মুহাদ্দিসিন' },
  { id: 'u_3', name: 'মাওঃ হাবীবুলল্লাহ', title: 'কমিটি ও মুহাদ্দিস (সহীহ বুখারী ২য় খন্ড)', address: 'খুলনা', phone: '01732580024', category: 'মুহাদ্দিসিন' },
  { id: 'u_4', name: 'মাওঃ আতাউর রহমান', title: 'কমিটি ও সিনিয়র উস্তাদ', address: 'শরীয়তপুর', phone: '01732580025', category: 'মুহাদ্দিসিন' },
  { id: 'u_5', name: 'মাওঃ আসাদুলল্লাহ', title: 'মুহাদ্দিস (তিরমিজী শরীফ ১ম খন্ড)', address: 'ফরিদপুর', phone: '01760476670', category: 'মুহাদ্দিসিন' },
  { id: 'u_6', name: 'মাওঃ ছিদ্দিকুর রহমান', title: 'কমিটি ও মুহাদ্দিস', address: 'গোপালগঞ্জ', phone: '01718327247', category: 'মুহাদ্দিসিন' },
  { id: 'u_7', name: 'মাওঃ আবু বকর সিদ্দীক', title: 'মুহাদ্দিস (সহীহ মুসলিম ১ম খন্ড)', address: 'ফরিদপুর', phone: '', category: 'মুহাদ্দিসিন' },
  { id: 'u_8', name: 'মাওঃ আমিনুল হক', title: 'কমিটি ও মুহাদ্দিস', address: 'মাদারীপুর', phone: '01722032832', category: 'মুহাদ্দিসিন' },
  { id: 'u_9', name: 'মাওঃ হিদায়াতুলল্লাহ', title: 'মুহাদ্দিস (আবু দাউদ শরীফ ১ম খন্ড)', address: 'ফরিদপুর', phone: '01733268583', category: 'মুহাদ্দিসিন' },
  { id: 'u_10', name: 'মাওঃ লুৎফুর রহমান', title: 'মুহাদ্দিস (তিরমিজী শরীফ ২য় খন্ড)', address: 'গোপালগঞ্জ', phone: '01721644286', category: 'মুহাদ্দিসিন' },
  { id: 'u_11', name: 'মাওঃ আব্দুল গাফফার', title: 'মুহাদ্দিস (সহীহ বুখারী ১ম খন্ড)', address: 'ফরিদপুর', phone: '01716259486', category: 'মুহাদ্দিসিন' },
  { id: 'u_12', name: 'মাওঃ ইব্রাহিম খলিল', title: 'মুহাদ্দিস ও মুঈনে তালীমাত', address: 'খুলনা', phone: '01920204867', category: 'মুহাদ্দিসিন' },
  { id: 'u_13', name: 'মাওঃ মোশাররফ হুসাইন', title: 'মুহাদ্দিস (নাসাঈ শরীফ ২য় খন্ড)', address: 'মাদারীপুর', phone: '01714542074', category: 'মুহাদ্দিসিন' },
  { id: 'u_14', name: 'মাওঃ ইয়াকুব আলী', title: 'মুহাদ্দিস', address: 'শরীয়তপুর', phone: '01724526850', category: 'মুহাদ্দিসিন' },
  { id: 'u_15', name: 'মাওঃ সালমান', title: 'মুহাদ্দিস (নাসাঈ শরীফ ২য় খন্ড)', address: 'দিনাজপুর', phone: '01741556333', category: 'মুহাদ্দিসিন' },
  { id: 'u_16', name: 'মাওঃ ইসহাক আহমাদ', title: 'মুহাদ্দিস (তিরমিজী শরীফ ২য় খন্ড)', address: 'মোমেনশাহী', phone: '01742842701', category: 'মুহাদ্দিসিন' },
  { id: 'u_17', name: 'মাওঃ আব্দুল কাদের', title: 'মুহাদ্দিস (তাহাবী শরীফ)', address: 'নোয়াখালী', phone: '01915486125', category: 'মুহাদ্দিসিন' },
  { id: 'u_18', name: 'মাওঃ নুরুল আমীন', title: 'মুহাদ্দিস (সহীহ মুসলিম ১ম খন্ড)', address: 'গাইবান্ধা', phone: '01700872481', category: 'মুহাদ্দিসিন' },
  { id: 'u_19', name: 'মাওঃ শামীম উসমান', title: 'মুহাদ্দিস (নাসাঈ শরীফ ১ম খন্ড)', address: 'বি.বাড়িয়া', phone: '01918436171', category: 'মুহাদ্দিসিন' },
  { id: 'u_20', name: 'মাওঃ সাইফ মাহমুদ (আলীনূর)', title: 'মুহাদ্দিস (সহীহ মুসলিম ২য় খন্ড)', address: 'ঢাকা/নারায়ণগঞ্জ', phone: '01831911802', category: 'মুহাদ্দিসিন' },
  { id: 'u_21', name: 'মাওঃ আব্দুলল্লাহ আল মামুন', title: 'মুহাদ্দিস', address: 'পাবনা', phone: '01304125411', category: 'মুহাদ্দিসিন' },

  // কিতাব বিভাগ ও মুদাররিসগণ
  { id: 'u_22', name: 'মাওঃ মুফিজুল ইসলাম', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01716521151', category: 'কিতাব বিভাগ' },
  { id: 'u_23', name: 'মাওঃ আব্দুলল্লাহ শাহ', title: 'সহ-নাযেমে তাবলীগ', address: 'তথ্য নেই', phone: '01739954205', category: 'কিতাব বিভাগ' },
  { id: 'u_24', name: 'মাওঃ রাশেদুল ইসলাম', title: 'মুদাররিস', address: 'নোয়াখালী', phone: '01745682855', category: 'কিতাব বিভাগ' },
  { id: 'u_25', name: 'মাওঃ আবু তালহা', title: 'মুদাররিস', address: 'নড়াইল', phone: '01717463694', category: 'কিতাব বিভাগ' },
  { id: 'u_26', name: 'মাওঃ আফফান হুসাইন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গাজিপুর', phone: '01727560249', category: 'কিতাব বিভাগ' },
  { id: 'u_27', name: 'মাওঃ শওকাতুল ইসলাম', title: 'সহ: নাযেমে দারুল ইক্বামা', address: 'খুলনা', phone: '01918607363', category: 'কিতাব বিভাগ' },
  { id: 'u_28', name: 'মাওঃ জামালুদ্দীন', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'গোপালগঞ্জ', phone: '01733128970', category: 'কিতাব বিভাগ' },
  { id: 'u_29', name: 'মাওঃ মনিরুল ইসলাম', title: 'সহ: নাযেমে কুতুবখানা', address: 'মাগুরা', phone: '01725928280', category: 'কিতাব বিভাগ' },
  { id: 'u_30', name: 'মাওঃ মুজাহিদুল ইসলাম', title: 'সহ: নাযেমে কুতুবখানা', address: 'ফরিদপুর', phone: '01765586361', category: 'কিতাব বিভাগ' },
  { id: 'u_31', name: 'মাওঃ জসীম উদ্দীন', title: 'নাযেমে ছাত্র পাঠাগার', address: 'গোপালগঞ্জ', phone: '01740513440', category: 'কিতাব বিভাগ' },
  { id: 'u_32', name: 'মাওঃ জোবায়ের আহমদ', title: 'মুদাররিস', address: 'বগুড়া', phone: '01755807791', category: 'কিতাব বিভাগ' },
  { id: 'u_33', name: 'মাওঃ আব্দুর রহমান', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01754308482', category: 'কিতাব বিভাগ' },
  { id: 'u_34', name: 'মাওঃ মাসউদ আনসারী', title: 'মুদাররিস', address: 'টাঙ্গাইল', phone: '01780264496', category: 'কিতাব বিভাগ' },
  { id: 'u_35', name: 'মাওঃ মাসউদুর রহমান', title: 'মুদাররিস', address: 'নারায়নগঞ্জ', phone: '01798645533', category: 'কিতাব বিভাগ' },
  { id: 'u_36', name: 'মাওঃ হাসান শেখ', title: 'সহ: নাযেমে ছাত্র পাঠাগার', address: 'মাদারীপুর', phone: '01779936907', category: 'কিতাব বিভাগ' },
  { id: 'u_37', name: 'মাওঃ জহিরুল ইসলাম', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01775701035', category: 'কিতাব বিভাগ' },
  { id: 'u_38', name: 'মাওঃ আব্দুল ওয়াজেদ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01780389036', category: 'কিতাব বিভাগ' },
  { id: 'u_39', name: 'মাওঃ তারেক হোসেন', title: 'মুদাররিস', address: 'লক্ষীপুর', phone: '01828649360', category: 'কিতাব বিভাগ' },
  { id: 'u_40', name: 'মাওঃ আযীমুদ্দীন', title: 'মুদাররিস', address: 'জামালপুর', phone: '01643542158', category: 'কিতাব বিভাগ' },
  { id: 'u_41', name: 'মাওঃ কিফায়াতুলল্লাহ', title: 'মুদাররিস', address: 'রাজবাড়ী', phone: '01751670076', category: 'কিতাব বিভাগ' },
  { id: 'u_42', name: 'মাওঃ জাকারিয়া', title: 'মুদাররিস', address: 'খুলনা', phone: '01725189086', category: 'কিতাব বিভাগ' },
  { id: 'u_43', name: 'মাওঃ আবু জাফর মিয়া', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01734793940', category: 'কিতাব বিভাগ' },
  { id: 'u_44', name: 'মাওঃ আব্দুলল্লাহ মুহা. সালিহ', title: 'মুদাররিস', address: 'মাদারীপুর', phone: '01317265946', category: 'কিতাব বিভাগ' },
  { id: 'u_45', name: 'মাওঃ মুস্তাফিজুর রহমান', title: 'সহ- তালীমাত অফিস', address: 'ফরিদপুর', phone: '01300670723', category: 'কিতাব বিভাগ' },
  { id: 'u_46', name: 'মাওঃ নিয়ামাতুলল্লাহ', title: 'মুদাররিস', address: 'নড়াইল', phone: '01798222386', category: 'কিতাব বিভাগ' },
  { id: 'u_47', name: 'মাওঃ আব্দুল বাতেন', title: 'সহ-নাযেমে ছাত্র পাঠাগার', address: 'শরীয়তপুর', phone: '01760866231', category: 'কিতাব বিভাগ' },
  { id: 'u_48', name: 'মাওঃ মাহবুবুর রহমান', title: 'মুদাররিস', address: 'পটুয়াখালী', phone: '01770682416', category: 'কিতাব বিভাগ' },
  { id: 'u_49', name: 'মাওঃ সাইফুল আলম', title: 'মুদাররিস', address: 'খুলনা', phone: '01766279402', category: 'কিতাব বিভাগ' },
  { id: 'u_50', name: 'মাওঃ ক্বারী যোবায়ের আহমাদ', title: 'মুদাররিস', address: 'বগুড়া', phone: '01755807791', category: 'কিতাব বিভাগ' },
  { id: 'u_51', name: 'মাওঃ গোলাম মোস্তফা', title: 'মুদাররিস (আব্দুল্লাহ মাসুম)', address: 'নেত্রকোনা', phone: '01968660585', category: 'কিতাব বিভাগ' },
  { id: 'u_52', name: 'মাওঃ সিরাজুল ইসলাম', title: 'মুদাররিস', address: 'সিরাজগঞ্জ', phone: '01727935370', category: 'কিতাব বিভাগ' },
  { id: 'u_53', name: 'মাওঃ শাহাজালাল মুন্সী', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01781402928', category: 'কিতাব বিভাগ' },
  { id: 'u_54', name: 'মাওঃ নাইম হোসেন', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01758561818', category: 'কিতাব বিভাগ' },
  { id: 'u_55', name: 'মাওঃ রাকিবুল ইসলাম', title: 'মুদাররিস', address: 'গোপালগঞ্জ', phone: '01827750134', category: 'কিতাব বিভাগ' },
  { id: 'u_56', name: 'মাওঃ জুনায়েদ আহমাদ', title: 'মুদাররিস', address: 'ফরিদপুর', phone: '01771642988', category: 'কিতাব বিভাগ' },

  // হিফজ ও নাজেরা বিভাগ
  { id: 'u_h1', name: 'হাফেজ ক্বারী নাজমুল হুসাইন', title: 'প্রধান উস্তাদ (হিফজ বিভাগ)', address: 'ফরিদপুর', phone: '01712000001', category: 'হিফজ বিভাগ' },
  { id: 'u_h2', name: 'হাফেজ মোশাররফ হোসেন', title: 'উস্তাদ (হিফজ বিভাগ)', address: 'মাদারীপুর', phone: '01712000002', category: 'হিফজ বিভাগ' },
  { id: 'u_h3', name: 'হাফেজ ক্বারী আব্দুল হাই', title: 'উস্তাদ (নাজেরা বিভাগ)', address: 'গোপালগঞ্জ', phone: '01712000003', category: 'হিফজ বিভাগ' },
];

/**
 * Get all available ustads
 * @returns {Array}
 */
export function getAllUstads() {
  return ALL_USTADS;
}

/**
 * Search ustads by query string
 * @param {string} query
 * @param {string} [category]
 * @returns {Array}
 */
export function searchUstads(query = '', category = 'সব') {
  let list = ALL_USTADS;
  if (category && category !== 'সব') {
    list = list.filter((u) => u.category === category);
  }
  if (!query || !query.trim()) return list;

  const q = query.trim().toLowerCase();
  return list.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.title.toLowerCase().includes(q) ||
      u.address.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q))
  );
}

/**
 * Get user's saved favorite ustads (objects)
 * @returns {Promise<Array>}
 */
export async function getFavoriteUstads() {
  try {
    const raw = await AsyncStorage.getItem(FAVORITE_USTADS_KEY);
    if (!raw) {
      // Default to top 2 renowned Ustads on first install
      const defaultIds = ['u_1', 'u_2'];
      const defaultList = ALL_USTADS.filter((u) => defaultIds.includes(u.id));
      await AsyncStorage.setItem(FAVORITE_USTADS_KEY, JSON.stringify(defaultIds));
      return defaultList;
    }
    const ids = JSON.parse(raw);
    if (Array.isArray(ids)) {
      return ALL_USTADS.filter((u) => ids.includes(u.id));
    }
  } catch (e) {
    console.log('[FavoriteUstadService] Error loading favorites:', e.message);
  }
  return [];
}

/**
 * Get array of favorite ustad IDs
 * @returns {Promise<string[]>}
 */
export async function getFavoriteUstadIds() {
  try {
    const raw = await AsyncStorage.getItem(FAVORITE_USTADS_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) return ids;
    }
  } catch (e) {
    console.log('[FavoriteUstadService] Error reading IDs:', e.message);
  }
  return ['u_1', 'u_2'];
}

/**
 * Save array of favorite ustad IDs
 * @param {string[]} ids
 * @returns {Promise<boolean>}
 */
export async function saveFavoriteUstadIds(ids) {
  try {
    await AsyncStorage.setItem(FAVORITE_USTADS_KEY, JSON.stringify(ids));
    return true;
  } catch (e) {
    console.log('[FavoriteUstadService] Error saving IDs:', e.message);
    return false;
  }
}

/**
 * Toggle favorite status of a single ustad
 * @param {string} ustadId
 * @returns {Promise<string[]>} updated IDs
 */
export async function toggleFavoriteUstad(ustadId) {
  const currentIds = await getFavoriteUstadIds();
  let updatedIds;
  if (currentIds.includes(ustadId)) {
    updatedIds = currentIds.filter((id) => id !== ustadId);
  } else {
    updatedIds = [...currentIds, ustadId];
  }
  await saveFavoriteUstadIds(updatedIds);
  return updatedIds;
}

const favoriteUstadService = {
  ALL_USTADS,
  getAllUstads,
  searchUstads,
  getFavoriteUstads,
  getFavoriteUstadIds,
  saveFavoriteUstadIds,
  toggleFavoriteUstad,
};

export default favoriteUstadService;
