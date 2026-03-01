export const colors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceHover: '#1a1a1a',
  border: '#2a2a2a',
  borderLight: '#333333',
  accent: '#FF6A00',
  accentHover: '#FF8533',
  accentMuted: 'rgba(255, 106, 0, 0.15)',
  gold: '#D4A017',
  goldMuted: 'rgba(212, 160, 23, 0.15)',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  textPrimary: '#ffffff',
  textSecondary: '#888888',
  textTertiary: '#555555',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;
