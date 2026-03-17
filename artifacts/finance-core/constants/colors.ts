export const Colors = {
  primary: '#00C853',
  primaryDark: '#00A846',
  primaryLight: '#4CAF50',
  primaryGlow: 'rgba(0, 200, 83, 0.15)',

  accent: '#00E5FF',
  accentWarm: '#FFD600',
  danger: '#FF3D57',
  warning: '#FF9800',
  info: '#2196F3',

  dark: {
    background: '#0A0A0F',
    surface: '#13131A',
    surfaceElevated: '#1C1C26',
    surfaceHigh: '#252532',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.15)',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.35)',
    tabBar: '#0A0A0F',
    card: '#13131A',
  },

  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F2F5',
    surfaceHigh: '#E8EBF0',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.15)',
    text: '#0D0D14',
    textSecondary: 'rgba(13,13,20,0.6)',
    textTertiary: 'rgba(13,13,20,0.35)',
    tabBar: '#FFFFFF',
    card: '#FFFFFF',
  },

  chart: {
    green: '#00C853',
    red: '#FF3D57',
    blue: '#2196F3',
    purple: '#9C27B0',
    orange: '#FF9800',
    teal: '#009688',
  },

  categories: {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    housing: '#45B7D1',
    health: '#96CEB4',
    entertainment: '#FFEAA7',
    education: '#DDA0DD',
    clothing: '#FFA07A',
    investment: '#98FB98',
    income: '#00C853',
    other: '#95A5A6',
  }
};

export type ColorScheme = 'light' | 'dark';
export default Colors;
