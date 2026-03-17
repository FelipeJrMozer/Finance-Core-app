export const ACCENT_PRESETS = [
  {
    id: 'ocean',
    label: 'Azul Oceano',
    desc: 'Padrão — azul oceano vibrante',
    primary: '#0096C7',
    primaryDark: '#005F99',
    primaryLight: '#48CAE4',
  },
  {
    id: 'green',
    label: 'Verde Esmeralda',
    desc: 'Verde financeiro e natural',
    primary: '#00C853',
    primaryDark: '#00A846',
    primaryLight: '#4CAF50',
  },
  {
    id: 'royalblue',
    label: 'Azul Royal',
    desc: 'Azul profundo e profissional',
    primary: '#1976D2',
    primaryDark: '#1565C0',
    primaryLight: '#64B5F6',
  },
  {
    id: 'purple',
    label: 'Roxo Real',
    desc: 'Roxo elegante e moderno',
    primary: '#9C27B0',
    primaryDark: '#7B1FA2',
    primaryLight: '#CE93D8',
  },
  {
    id: 'orange',
    label: 'Laranja Vibrante',
    desc: 'Laranja energético e caloroso',
    primary: '#FF6D00',
    primaryDark: '#E65100',
    primaryLight: '#FFAB40',
  },
  {
    id: 'red',
    label: 'Vermelho Intenso',
    desc: 'Vermelho forte e impactante',
    primary: '#EF5350',
    primaryDark: '#C62828',
    primaryLight: '#EF9A9A',
  },
  {
    id: 'neutral',
    label: 'Neutro Elegante',
    desc: 'Cinza sofisticado e minimalista',
    primary: '#78909C',
    primaryDark: '#546E7A',
    primaryLight: '#B0BEC5',
  },
] as const;

export type AccentId = typeof ACCENT_PRESETS[number]['id'];

export const DEFAULT_ACCENT_ID: AccentId = 'ocean';

export const Colors = {
  primary: '#0096C7',
  primaryDark: '#005F99',
  primaryLight: '#48CAE4',
  primaryGlow: 'rgba(0, 150, 199, 0.15)',

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
    blue: '#0096C7',
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
    income: '#0096C7',
    other: '#95A5A6',
  }
};

export type ColorScheme = 'light' | 'dark';
export default Colors;
