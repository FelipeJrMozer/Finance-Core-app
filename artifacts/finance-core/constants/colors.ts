export const ACCENT_PRESETS = [
  { id: 'green',  label: 'Verde',   primary: '#00C853', primaryDark: '#00A846', primaryLight: '#4CAF50' },
  { id: 'blue',   label: 'Azul',    primary: '#2196F3', primaryDark: '#1565C0', primaryLight: '#64B5F6' },
  { id: 'purple', label: 'Roxo',    primary: '#9C27B0', primaryDark: '#6A0080', primaryLight: '#CE93D8' },
  { id: 'orange', label: 'Laranja', primary: '#FF6D00', primaryDark: '#E65100', primaryLight: '#FFAB40' },
  { id: 'teal',   label: 'Ciano',   primary: '#00BCD4', primaryDark: '#0097A7', primaryLight: '#80DEEA' },
  { id: 'pink',   label: 'Rosa',    primary: '#E91E63', primaryDark: '#AD1457', primaryLight: '#F48FB1' },
  { id: 'indigo', label: 'Índigo',  primary: '#3F51B5', primaryDark: '#283593', primaryLight: '#9FA8DA' },
  { id: 'amber',  label: 'Âmbar',   primary: '#FFC107', primaryDark: '#FF8F00', primaryLight: '#FFE082' },
] as const;

export type AccentId = typeof ACCENT_PRESETS[number]['id'];

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
  success: '#00C853',

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
