/**
 * Physical Diary Themes, Fonts, Moods, Weather & Tags
 */

export const PAPER_THEMES = {
  cream: {
    id: 'cream',
    label: 'ক্রিম কাগজ',
    paperBg: '#FDF8EC',
    headerBg: '#F8EED8',
    spineColor: '#E5D3B3',
    lineColor: '#DCE4EC',
    marginColor: '#E88585',
    borderColor: '#E5D5B5',
    textColor: '#1F2937',
    mutedColor: '#6B5E4A',
    accentColor: '#9A3412',
    holeBg: '#E6DCC8',
    previewSwatch: '#FDF8EC',
  },
  white: {
    id: 'white',
    label: 'শুভ্র সাদা',
    paperBg: '#FFFFFF',
    headerBg: '#F8FAFC',
    spineColor: '#E2E8F0',
    lineColor: '#DCE7F3',
    marginColor: '#F07878',
    borderColor: '#CBD5E1',
    textColor: '#0F172A',
    mutedColor: '#64748B',
    accentColor: '#1D4ED8',
    holeBg: '#E2E8F0',
    previewSwatch: '#FFFFFF',
  },
  vintage: {
    id: 'vintage',
    label: 'ভিন্টেজ',
    paperBg: '#F3E5C8',
    headerBg: '#EAD5AC',
    spineColor: '#D4B98A',
    lineColor: '#D8C29D',
    marginColor: '#B85D48',
    borderColor: '#C9AF82',
    textColor: '#3B281E',
    mutedColor: '#755B4B',
    accentColor: '#7C2D12',
    holeBg: '#D8C39C',
    previewSwatch: '#F3E5C8',
  },
  night: {
    id: 'night',
    label: 'নাইট পেপার',
    paperBg: '#19202D',
    headerBg: '#20293A',
    spineColor: '#111621',
    lineColor: '#293448',
    marginColor: '#9F4A54',
    borderColor: '#2E3A4F',
    textColor: '#E2E8F0',
    mutedColor: '#94A3B8',
    accentColor: '#F59E0B',
    holeBg: '#0F141E',
    previewSwatch: '#19202D',
  },
};

export const DIARY_FONTS = [
  {
    id: 'handwriting',
    label: 'হাতের লেখা',
    sublabel: 'ডিফল্ট কলমের লেখা',
    fontFamily: 'Atma-Regular',
    boldFontFamily: 'Atma-Bold',
    cssFont: "'Atma', cursive",
  },
  {
    id: 'calligraphy',
    label: 'শিল্পিত',
    sublabel: 'কাব্যিক ও কার্সিভ',
    fontFamily: 'Galada-Regular',
    boldFontFamily: 'Galada-Regular',
    cssFont: "'Galada', cursive",
  },
  {
    id: 'classic',
    label: 'ক্লাসিক বই',
    sublabel: 'মার্জিত ছাপা অক্ষর',
    fontFamily: 'NotoSerifBengali-Regular',
    boldFontFamily: 'NotoSerifBengali-Regular',
    cssFont: "'Noto Serif Bengali', serif",
  },
  {
    id: 'modern',
    label: 'আধুনিক',
    sublabel: 'পরিচ্ছন্ন ও স্পষ্ট',
    fontFamily: 'HindSiliguri-Regular',
    boldFontFamily: 'HindSiliguri-Bold',
    cssFont: "'Hind Siliguri', sans-serif",
  },
  {
    id: 'arabic',
    label: 'আরবি/নাসখ',
    sublabel: 'দোয়া ও আরবি নোট',
    fontFamily: 'Amiri-Regular',
    boldFontFamily: 'Amiri-Regular',
    cssFont: "'Amiri', serif",
  },
];

export function getDiaryFont(fontId) {
  return DIARY_FONTS.find((f) => f.id === fontId) || DIARY_FONTS[0];
}

export function getPaperTheme(themeId) {
  return PAPER_THEMES[themeId] || PAPER_THEMES.cream;
}

export const TAG_OPTIONS = [
  { label: 'আমল', emoji: '🌙', color: '#2563EB' },
  { label: 'নামাজ', emoji: '🕌', color: '#9333EA' },
  { label: 'কুরআন', emoji: '📖', color: '#059669' },
  { label: 'দোয়া', emoji: '🤲', color: '#D97706' },
  { label: 'ইলম', emoji: '📚', color: '#EC4899' },
  { label: 'সাধারণ', emoji: '📝', color: '#6B7280' },
];

export const TAG_COLORS = {
  'আমল': { tagColor: '#2563EB', colorBg: '#2563EB15', colorBorder: '#2563EB30' },
  'নামাজ': { tagColor: '#9333EA', colorBg: '#9333EA15', colorBorder: '#9333EA30' },
  'কুরআন': { tagColor: '#059669', colorBg: '#05966915', colorBorder: '#05966930' },
  'দোয়া': { tagColor: '#D97706', colorBg: '#D9770615', colorBorder: '#D9770630' },
  'ইলম': { tagColor: '#EC4899', colorBg: '#EC489915', colorBorder: '#EC489930' },
  'সাধারণ': { tagColor: '#6B7280', colorBg: '#6B728015', colorBorder: '#6B728030' },
};

export const MOOD_OPTIONS = [
  { id: 'শুকরিয়া', emoji: '🤲', label: 'শুকরিয়া' },
  { id: 'প্রশান্ত', emoji: '😌', label: 'প্রশান্ত' },
  { id: 'উৎফুল্ল', emoji: '😊', label: 'উৎফুল্ল' },
  { id: 'চিন্তিত', emoji: '🤔', label: 'চিন্তিত' },
  { id: 'আবেগাপ্লুত', emoji: '🥹', label: 'আবেগাপ্লুত' },
  { id: 'ক্লান্ত', emoji: '😴', label: 'ক্লান্ত' },
];

export const WEATHER_OPTIONS = [
  { id: 'রৌদ্রোজ্জ্বল', emoji: '☀️', label: 'রৌদ্রোজ্জ্বল' },
  { id: 'বৃষ্টি', emoji: '🌧️', label: 'বৃষ্টি' },
  { id: 'মেঘলা', emoji: '⛅', label: 'মেঘলা' },
  { id: 'শীতল', emoji: '❄️', label: 'শীতল' },
  { id: 'রাত', emoji: '🌙', label: 'শান্ত রাত' },
];
