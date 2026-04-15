export const ACCENT_PRESETS = [
  {
    id: 'ocean',
    label: 'Azul Oceano',
    desc: 'Padrão — azul oceano vibrante',
    primary: '#0096C7',
    primaryDark: '#0B8EC9',
    primaryLight: '#48CAE4',
    primaryOnDark: '#26B1F2',
  },
  {
    id: 'green',
    label: 'Verde Esmeralda',
    desc: 'Verde financeiro e natural',
    primary: '#10B981',
    primaryDark: '#059669',
    primaryLight: '#34D399',
    primaryOnDark: '#34D399',
  },
  {
    id: 'royalblue',
    label: 'Azul Royal',
    desc: 'Azul profundo e profissional',
    primary: '#1976D2',
    primaryDark: '#1565C0',
    primaryLight: '#64B5F6',
    primaryOnDark: '#64B5F6',
  },
  {
    id: 'purple',
    label: 'Roxo Real',
    desc: 'Roxo elegante e moderno',
    primary: '#9C27B0',
    primaryDark: '#7B1FA2',
    primaryLight: '#CE93D8',
    primaryOnDark: '#CE93D8',
  },
  {
    id: 'orange',
    label: 'Laranja Vibrante',
    desc: 'Laranja energético e caloroso',
    primary: '#FF6D00',
    primaryDark: '#E65100',
    primaryLight: '#FFAB40',
    primaryOnDark: '#FFAB40',
  },
  {
    id: 'red',
    label: 'Vermelho Intenso',
    desc: 'Vermelho forte e impactante',
    primary: '#EF4444',
    primaryDark: '#DC2626',
    primaryLight: '#FCA5A5',
    primaryOnDark: '#FCA5A5',
  },
  {
    id: 'neutral',
    label: 'Neutro Elegante',
    desc: 'Cinza sofisticado e minimalista',
    primary: '#78909C',
    primaryDark: '#546E7A',
    primaryLight: '#B0BEC5',
    primaryOnDark: '#B0BEC5',
  },
] as const;

export type AccentId = typeof ACCENT_PRESETS[number]['id'];

export const DEFAULT_ACCENT_ID: AccentId = 'ocean';

export const Colors = {
  primary: '#0096C7',
  primaryDark: '#0B8EC9',
  primaryLight: '#48CAE4',
  primaryGlow: 'rgba(0, 150, 199, 0.15)',

  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#2196F3',

  income: '#10B981',
  expense: '#EF4444',
  transfer: '#F59E0B',

  dark: {
    background: '#0A0F1E',
    surface: '#131929',
    surfaceElevated: '#1A2235',
    surfaceHigh: '#1E2D45',
    border: '#1E2D45',
    borderStrong: '#2A3F5F',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    tabBar: '#0A0F1E',
    card: '#131929',
    shadow: '#000000',
  },

  light: {
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceElevated: '#F0F4F8',
    surfaceHigh: '#E8ECF2',
    border: '#DDE4EE',
    borderStrong: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    tabBar: '#FFFFFF',
    card: '#FFFFFF',
    shadow: '#0F172A',
  },

  chart: {
    green: '#10B981',
    red: '#EF4444',
    blue: '#0096C7',
    purple: '#9C27B0',
    orange: '#F59E0B',
    teal: '#009688',
  },

  categories: {
    food: '#FF6B6B',
    transport: '#4ECDC4',
    housing: '#45B7D1',
    health: '#96CEB4',
    entertainment: '#F59E0B',
    education: '#DDA0DD',
    clothing: '#FFA07A',
    investment: '#10B981',
    income: '#10B981',
    other: '#94A3B8',
  },

  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { card: 16, cardMd: 12, button: 10, chip: 6 },
};

export type ColorScheme = 'light' | 'dark';
export default Colors;
