import '../global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#EC4899',          // Neon Pink Accent (matching border-pink-500 in code)
    primaryLight: '#F472B6',
    primaryDark: '#DB2777',
    primaryBg: 'rgba(236, 72, 153, 0.1)',
    
    accentBlue: '#2563EB',
    accentPurple: '#9333EA',
    accentAmber: '#D97706',
    accentRed: '#DC2626',
    accentEmerald: '#059669',

    heroBg: '#0F172A',            // Deep Slate Hero Card
    heroCardText: '#FFFFFF',

    text: '#0F172A',             // Dark Slate text
    textSecondary: '#64748B',    // Muted Slate text
    textMuted: '#94A3B8',
    
    background: '#F8FAFC',       // Slate 50 background (matching bg-[#f8fafc])
    card: '#FFFFFF',             // Pure White Card
    cardBorder: '#F1F5F9',
    
    inputBg: '#F1F5F9',
    inputBorder: '#E2E8F0',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    
    // Soft Pastel Card Gradients / Accent Badges from Code:
    blueCardBg: 'rgba(59, 130, 246, 0.08)',
    blueCardBorder: 'rgba(59, 130, 246, 0.2)',
    purpleCardBg: 'rgba(168, 85, 247, 0.08)',
    purpleCardBorder: 'rgba(168, 85, 247, 0.2)',
    amberCardBg: 'rgba(245, 158, 11, 0.08)',
    amberCardBorder: 'rgba(245, 158, 11, 0.2)',
    redCardBg: 'rgba(239, 68, 68, 0.08)',
    redCardBorder: 'rgba(239, 68, 68, 0.2)',
    emeraldCardBg: 'rgba(16, 185, 129, 0.08)',
    emeraldCardBorder: 'rgba(16, 185, 129, 0.2)',

    error: '#DC2626',
    errorBg: 'rgba(220, 38, 38, 0.08)',
    success: '#059669',
    successBg: 'rgba(5, 150, 105, 0.08)',
    backgroundElement: '#F1F5F9',
    backgroundSelected: '#E2E8F0',
  },
  dark: {
    primary: '#EC4899',          // Neon Pink Accent
    primaryLight: '#F472B6',
    primaryDark: '#DB2777',
    primaryBg: 'rgba(236, 72, 153, 0.18)',
    
    accentBlue: '#60A5FA',
    accentPurple: '#C084FC',
    accentAmber: '#FBBF24',
    accentRed: '#F87171',
    accentEmerald: '#34D399',

    heroBg: '#020617',            // Ultra Dark Slate Hero Card
    heroCardText: '#FFFFFF',

    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    
    background: '#0B0F19',       // Deep Dark Slate
    card: '#111827',             // Sleek Card
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    
    inputBg: '#1F2937',
    inputBorder: '#374151',
    shadowColor: '#000000',
    
    blueCardBg: 'rgba(59, 130, 246, 0.15)',
    blueCardBorder: 'rgba(59, 130, 246, 0.3)',
    purpleCardBg: 'rgba(168, 85, 247, 0.15)',
    purpleCardBorder: 'rgba(168, 85, 247, 0.3)',
    amberCardBg: 'rgba(245, 158, 11, 0.15)',
    amberCardBorder: 'rgba(245, 158, 11, 0.3)',
    redCardBg: 'rgba(239, 68, 68, 0.15)',
    redCardBorder: 'rgba(239, 68, 68, 0.3)',
    emeraldCardBg: 'rgba(16, 185, 129, 0.15)',
    emeraldCardBorder: 'rgba(16, 185, 129, 0.3)',

    error: '#F87171',
    errorBg: 'rgba(248, 113, 113, 0.15)',
    success: '#34D399',
    successBg: 'rgba(52, 211, 153, 0.15)',
    backgroundElement: '#1F2937',
    backgroundSelected: '#374151',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
