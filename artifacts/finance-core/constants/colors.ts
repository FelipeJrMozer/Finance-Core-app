// Pilar Financeiro — design tokens
//
// Sincronizado com o web (`client/src/index.css` + design system) — IDs e
// hexadecimais alinhados com o sistema de 8 acentos do tema HSL do web.
// Para que `/api/preferences` consiga sincronizar mobile ↔ web, os IDs DEVEM
// ser exatamente: ocean | indigo | green | blue | purple | orange | red | neutral.

export const ACCENT_PRESETS = [
  {
    id: 'ocean',
    label: 'Ocean Blue',
    desc: 'Padrão — azul oceano vibrante',
    primary: '#0EA5E9',        // hsl(199 89% 48%)
    primaryDark: '#0369A1',    // hsl(201 96% 32%)
    primaryLight: '#7DD3FC',   // hsl(199 95% 74%)
    primaryOnDark: '#38BDF8',  // hsl(199 95% 60%)
  },
  {
    id: 'indigo',
    label: 'Índigo',
    desc: 'Índigo profundo e moderno',
    primary: '#6366F1',        // hsl(239 84% 67%)
    primaryDark: '#4338CA',    // hsl(244 75% 53%)
    primaryLight: '#A5B4FC',   // hsl(231 96% 82%)
    primaryOnDark: '#818CF8',  // hsl(234 89% 74%)
  },
  {
    id: 'green',
    label: 'Verde Esmeralda',
    desc: 'Verde financeiro e natural',
    primary: '#10B981',        // hsl(160 84% 39%)
    primaryDark: '#047857',
    primaryLight: '#6EE7B7',
    primaryOnDark: '#34D399',
  },
  {
    id: 'blue',
    label: 'Azul Royal',
    desc: 'Azul profundo e profissional',
    primary: '#3B82F6',        // hsl(217 91% 60%)
    primaryDark: '#1D4ED8',
    primaryLight: '#93C5FD',
    primaryOnDark: '#60A5FA',
  },
  {
    id: 'purple',
    label: 'Roxo',
    desc: 'Roxo elegante e moderno',
    primary: '#A855F7',        // hsl(271 91% 65%)
    primaryDark: '#7E22CE',
    primaryLight: '#D8B4FE',
    primaryOnDark: '#C084FC',
  },
  {
    id: 'orange',
    label: 'Laranja',
    desc: 'Laranja energético e caloroso',
    primary: '#F97316',        // hsl(25 95% 53%)
    primaryDark: '#C2410C',
    primaryLight: '#FDBA74',
    primaryOnDark: '#FB923C',
  },
  {
    id: 'red',
    label: 'Vermelho',
    desc: 'Vermelho intenso e impactante',
    primary: '#EF4444',        // hsl(0 84% 60%)
    primaryDark: '#B91C1C',
    primaryLight: '#FCA5A5',
    primaryOnDark: '#F87171',
  },
  {
    id: 'neutral',
    label: 'Neutro',
    desc: 'Cinza sofisticado e minimalista',
    primary: '#64748B',        // hsl(215 20% 47%)
    primaryDark: '#334155',
    primaryLight: '#CBD5E1',
    primaryOnDark: '#94A3B8',
  },
] as const;

export type AccentId = typeof ACCENT_PRESETS[number]['id'];

export const DEFAULT_ACCENT_ID: AccentId = 'ocean';

// Mapeamento legacy → novos IDs (para preferências antigas dos usuários).
const LEGACY_ACCENT_MAP: Record<string, AccentId> = {
  royalblue: 'blue',
};

export function normalizeAccentId(id: string | null | undefined): AccentId {
  if (!id) return DEFAULT_ACCENT_ID;
  const mapped = LEGACY_ACCENT_MAP[id];
  if (mapped) return mapped;
  if ((ACCENT_PRESETS as readonly { id: string }[]).some(p => p.id === id)) {
    return id as AccentId;
  }
  return DEFAULT_ACCENT_ID;
}

export const Colors = {
  primary: '#0EA5E9',
  primaryDark: '#0369A1',
  primaryLight: '#7DD3FC',
  primaryGlow: 'rgba(14, 165, 233, 0.15)',

  success: '#059669',          // hsl(160 84% 39%) — destaque positivo
  warning: '#D97706',          // âmbar
  danger:  '#DC2626',          // hsl(0 72% 51%) — destrutivo
  info:    '#0EA5E9',

  income:   '#059669',
  expense:  '#DC2626',
  transfer: '#D97706',

  // Tema escuro — alinhado com `--background: 222 30% 7%` etc. do web.
  dark: {
    background: '#0B1220',          // hsl(222 30% 7%)
    surface: '#111827',             // hsl(220 30% 11%) — card
    surfaceElevated: '#1F2937',     // hsl(217 19% 27%) — bg secundário
    surfaceHigh: '#273245',
    border: '#1F2937',              // hsl(217 19% 27%)
    borderStrong: '#334155',
    text: '#F1F5F9',                // hsl(210 40% 95%)
    textSecondary: '#94A3B8',       // hsl(215 20% 65%)
    textTertiary: '#64748B',        // hsl(215 20% 47%)
    tabBar: '#0B1220',
    card: '#111827',
    shadow: '#000000',
    destructive: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
  },

  // Tema claro — alinhado com `--background: 210 40% 98%` etc. do web.
  light: {
    background: '#F8FAFC',          // hsl(210 40% 98%)
    surface: '#FFFFFF',             // hsl(0 0% 100%) — card
    surfaceElevated: '#F1F5F9',     // hsl(210 40% 96%) — bg secundário
    surfaceHigh: '#E2E8F0',
    border: '#E2E8F0',              // hsl(214 32% 91%)
    borderStrong: '#CBD5E1',
    text: '#0F172A',                // hsl(222 47% 11%)
    textSecondary: '#64748B',       // hsl(215 20% 47%)
    textTertiary: '#94A3B8',        // hsl(215 20% 65%)
    tabBar: '#FFFFFF',
    card: '#FFFFFF',
    shadow: '#0F172A',
    destructive: '#DC2626',         // hsl(0 72% 51%)
    success: '#059669',             // hsl(160 84% 39%)
    warning: '#D97706',
  },

  chart: {
    green: '#10B981',
    red: '#EF4444',
    blue: '#0EA5E9',
    purple: '#A855F7',
    orange: '#F59E0B',
    teal: '#14B8A6',
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
  // Raios alinhados com web (rounded-xl = 12px, rounded-2xl = 16px, etc.)
  radius: { card: 12, cardLg: 16, cardMd: 12, button: 8, chip: 999 },
  // Sombra suave equivalente a `shadow-sm` do Tailwind.
  shadow: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  } as const,
};

export type ColorScheme = 'light' | 'dark';
export default Colors;
