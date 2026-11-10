/**
 * Facebook-style Post Background Themes & Auto-Typography Helpers
 */

export const MAX_THEMED_POST_LENGTH = 260;
export const MAX_THEMED_POST_LINES = 8;

export const POST_BACKGROUND_THEMES = [
  {
    id: '',
    label: 'সাধারণ',
    colors: ['#F1F5F9', '#E2E8F0'],
    textColor: '#0F172A',
    placeholderColor: '#64748B',
    isNone: true,
    pattern: null,
  },
  {
    id: 'emerald_noor',
    label: 'ইসলামিক নূর',
    colors: ['#064E3B', '#059669'],
    textColor: '#FEF3C7',
    placeholderColor: 'rgba(254,243,199,0.65)',
    pattern: 'moon',
    accentDecor: '#FDE68A',
  },
  {
    id: 'royal_magenta',
    label: 'রয়েল বেগুনি',
    colors: ['#6D28D9', '#EC4899'],
    textColor: '#FFFFFF',
    placeholderColor: 'rgba(255,255,255,0.65)',
    pattern: 'sparkles',
    accentDecor: '#FFFFFF',
  },
  {
    id: 'sunset_gold',
    label: 'সূর্যাস্ত',
    colors: ['#C2410C', '#F59E0B'],
    textColor: '#FFFFFF',
    placeholderColor: 'rgba(255,255,255,0.7)',
    pattern: 'sunny',
    accentDecor: '#FEF08A',
  },
  {
    id: 'ocean_sky',
    label: 'সমুদ্র নীল',
    colors: ['#1E3A8A', '#0EA5E9'],
    textColor: '#FFFFFF',
    placeholderColor: 'rgba(255,255,255,0.7)',
    pattern: 'water',
    accentDecor: '#BAE6FD',
  },
  {
    id: 'midnight_stars',
    label: 'রাতের তারা',
    colors: ['#0F172A', '#1E293B'],
    textColor: '#FDE68A',
    placeholderColor: 'rgba(253,230,138,0.6)',
    pattern: 'star',
    accentDecor: '#FBBF24',
  },
  {
    id: 'rose_blossom',
    label: 'গোলাপি',
    colors: ['#9F1239', '#FB7185'],
    textColor: '#FFFFFF',
    placeholderColor: 'rgba(255,255,255,0.7)',
    pattern: 'flower',
    accentDecor: '#FFE4E6',
  },
  {
    id: 'teal_serenity',
    label: 'প্রশান্ত সবুজ',
    colors: ['#0F766E', '#2DD4BF'],
    textColor: '#FFFFFF',
    placeholderColor: 'rgba(255,255,255,0.72)',
    pattern: 'leaf',
    accentDecor: '#CCFBF1',
  },
  {
    id: 'warm_parchment',
    label: 'ক্রিম কাগজ',
    colors: ['#FEF3C7', '#FDE68A'],
    textColor: '#78350F',
    placeholderColor: 'rgba(120,53,15,0.5)',
    pattern: 'book',
    accentDecor: '#B45309',
  },
  {
    id: 'lavender_soft',
    label: 'ল্যাভেন্ডার',
    colors: ['#EDE9FE', '#C4B5FD'],
    textColor: '#4C1D95',
    placeholderColor: 'rgba(76,29,149,0.5)',
    pattern: 'sparkles',
    accentDecor: '#6D28D9',
  },
  {
    id: 'crimson_red',
    label: 'লাল আভা',
    colors: ['#991B1B', '#EF4444'],
    textColor: '#FFFFFF',
    placeholderColor: 'rgba(255,255,255,0.7)',
    pattern: 'heart',
    accentDecor: '#FECACA',
  },
  {
    id: 'classic_dark',
    label: 'ডার্ক ক্লাসিক',
    colors: ['#18181B', '#27272A'],
    textColor: '#FAFAFA',
    placeholderColor: 'rgba(250,250,250,0.55)',
    pattern: null,
    accentDecor: '#A1A1AA',
  },
];

export function getPostTheme(themeId) {
  if (!themeId) return null;
  const found = POST_BACKGROUND_THEMES.find((t) => t.id === themeId);
  return found && !found.isNone ? found : null;
}

export function canUsePostTheme(text, hasImage = false) {
  if (hasImage) return false;
  const trimmed = (text || '').trim();
  const lines = trimmed.split('\n').length;
  return trimmed.length <= MAX_THEMED_POST_LENGTH && lines <= MAX_THEMED_POST_LINES;
}

/**
 * Returns Facebook-style auto-enlarged typography config for short posts
 */
export function getShortPostTypography(text, hasImage = false, themeId = '') {
  const trimmed = (text || '').trim();
  const len = trimmed.length;
  const lineCount = trimmed ? trimmed.split('\n').length : 1;
  const hasMarkdownSyntax = /(^#{1,6}\s|```|^>\s)/m.test(trimmed);

  const activeTheme = !hasImage && canUsePostTheme(trimmed, hasImage) ? getPostTheme(themeId) : null;

  if (activeTheme) {
    if (len <= 60 && lineCount <= 3) {
      return { isThemed: true, theme: activeTheme, fontSize: 28, lineHeight: 38, fontWeight: '800', isShortAuto: true };
    }
    if (len <= 135 && lineCount <= 5) {
      return { isThemed: true, theme: activeTheme, fontSize: 24, lineHeight: 34, fontWeight: '800', isShortAuto: true };
    }
    return { isThemed: true, theme: activeTheme, fontSize: 20, lineHeight: 30, fontWeight: '700', isShortAuto: true };
  }

  // Plain short post without image (Facebook auto-big text!)
  if (!hasImage && !hasMarkdownSyntax && len > 0) {
    if (len <= 85 && lineCount <= 3) {
      return { isThemed: false, theme: null, fontSize: 23, lineHeight: 33, fontWeight: '600', isShortAuto: true };
    }
    if (len <= 145 && lineCount <= 4) {
      return { isThemed: false, theme: null, fontSize: 19.5, lineHeight: 29, fontWeight: '500', isShortAuto: true };
    }
  }

  return { isThemed: false, theme: null, fontSize: 16, lineHeight: 24, fontWeight: '400', isShortAuto: false };
}
