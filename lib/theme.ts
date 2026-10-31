// FBF design tokens — black + gold "clean" redesign (Oct 2026).
// One accent only: gold. Text on gold backgrounds must use `onAccent`.
export const colors = {
  background: '#0a0a0b',
  surface: '#141416',
  surfaceHover: '#1b1b1e',
  surfaceSunken: '#0a0a0b',
  border: '#26262a',
  borderLight: '#2f2f34',
  borderAccent: '#3a3320',
  accent: '#D4A93A',
  accentHover: '#E2C26B',
  accentMuted: 'rgba(212, 169, 58, 0.15)',
  accentText: '#E2C26B',
  onAccent: '#0a0a0b',
  gold: '#D4A93A',
  goldMuted: 'rgba(212, 169, 58, 0.15)',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  blue: '#7FA7D9',
  textPrimary: '#f5f5f4',
  textSecondary: '#a1a1aa',
  // Was #555 (2.6:1 on black, unreadable). #8a8a93 passes 4.5:1 on surface.
  textTertiary: '#8a8a93',
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
  card: 20,
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

// Display face for headings and big numbers. Loaded in app/_layout.tsx;
// falls back to the system font until (or if) it fails to load.
export const fonts = {
  display: 'Oswald_600SemiBold',
  displayBold: 'Oswald_700Bold',
} as const;
