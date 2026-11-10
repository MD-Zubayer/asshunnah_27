/**
 * Account / Profile Type metadata and display helpers
 */

export const ACCOUNT_TYPES = [
  {
    id: 'current_student',
    title: 'জামিয়ার ছাত্রবৃন্দ',
    shortLabel: 'জামিয়ার ছাত্র',
    subtitle: 'বর্তমানে অধ্যয়নরত সকল জামাতের ছাত্র',
    icon: 'book-outline',
    color: '#2563EB',
  },
  {
    id: 'jamia_faregin',
    title: 'জামিয়ার ফারেগীন ছাত্র',
    shortLabel: 'জামিয়ার ফারেগীন',
    subtitle: 'তাকমিল ও প্রাক্তন ফারেগীন ব্যাচ',
    icon: 'school-outline',
    color: '#059669',
  },
  {
    id: 'jamia_ustad',
    title: 'জামিয়ার উস্তাদগণ',
    shortLabel: 'জামিয়ার উস্তাদ',
    subtitle: 'জামিয়ার সম্মানিত শিক্ষকমণ্ডলী',
    icon: 'ribbon-outline',
    color: '#7C3AED',
  },
  {
    id: 'general_user',
    title: 'অন্যান্য (সাধারণ)',
    shortLabel: 'সাধারণ ব্যবহারকারী',
    subtitle: 'শুভাকাঙ্ক্ষী ও সাধারণ ব্যবহারকারী',
    icon: 'person-outline',
    color: '#D97706',
  },
];

export function normalizeProfileType(profileType) {
  if (profileType === 'takmil_student') return 'jamia_faregin';
  if (profileType === 'non_takmil_student') return 'general_user';
  return profileType || 'general_user';
}

export function getAccountTypeInfo(profileType) {
  const normalized = normalizeProfileType(profileType);
  return ACCOUNT_TYPES.find((t) => t.id === normalized) || ACCOUNT_TYPES[3];
}
