import React from 'react';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const glyphs = Feather.glyphMap as Record<string, number>;

const ALIASES: Record<string, keyof typeof Feather.glyphMap> = {
  Car: 'truck',
  car: 'truck',
  House: 'home',
  house: 'home',
  Plane: 'send',
  plane: 'send',
  Home: 'home',
  'bell-plus': 'bell',
  'bell-off': 'bell',
  Plus: 'plus',
};

export function safeFeatherIcon(
  name: string | undefined | null,
  fallback: keyof typeof Feather.glyphMap = 'target'
): keyof typeof Feather.glyphMap {
  if (!name) return fallback;
  if (glyphs[name] !== undefined) return name as keyof typeof Feather.glyphMap;
  const lower = name.toLowerCase();
  if (glyphs[lower] !== undefined) return lower as keyof typeof Feather.glyphMap;
  if (ALIASES[name]) return ALIASES[name];
  if (ALIASES[lower]) return ALIASES[lower];
  return fallback;
}

// ---------------------------------------------------------------------------
// Mapeamento de ícones — alinhado semanticamente com `lucide-react` do web.
// Cada chave é referenciada por nome em todo o app (componente <Icon name>).
// Se um ícone do Feather não existir, caímos para MaterialCommunityIcons.
// ---------------------------------------------------------------------------

type IconLib = 'Feather' | 'MaterialCommunityIcons' | 'MaterialIcons';

interface IconSpec {
  lib: IconLib;
  name: string;
}

export const ICONS = {
  // Navegação principal
  dashboard:        { lib: 'Feather', name: 'home' },
  transaction:      { lib: 'Feather', name: 'list' },
  investments:      { lib: 'Feather', name: 'trending-up' },
  reports:          { lib: 'Feather', name: 'bar-chart-2' },
  more:             { lib: 'Feather', name: 'more-horizontal' },

  // Contas / Cartões / Fluxo
  account:          { lib: 'Feather', name: 'briefcase' },
  card:             { lib: 'Feather', name: 'credit-card' },
  bills:            { lib: 'Feather', name: 'file-text' },
  recurring:        { lib: 'Feather', name: 'repeat' },
  budget:           { lib: 'Feather', name: 'pie-chart' },
  goal:             { lib: 'Feather', name: 'target' },
  pending:          { lib: 'Feather', name: 'clock' },
  capture:          { lib: 'Feather', name: 'zap' },
  debt:             { lib: 'Feather', name: 'trending-down' },

  // Controle pessoal
  health:           { lib: 'Feather', name: 'activity' },
  netWorth:         { lib: 'Feather', name: 'pie-chart' },
  categories:       { lib: 'Feather', name: 'tag' },
  rules:            { lib: 'Feather', name: 'filter' },
  sinking:          { lib: 'Feather', name: 'archive' },
  family:           { lib: 'Feather', name: 'users' },

  // Investimentos
  watchlist:        { lib: 'Feather', name: 'eye' },
  priceAlert:       { lib: 'Feather', name: 'bell' },
  dividends:        { lib: 'Feather', name: 'calendar' },
  comparator:       { lib: 'Feather', name: 'bar-chart' },
  brokerageImport:  { lib: 'Feather', name: 'upload' },
  crypto:           { lib: 'MaterialCommunityIcons', name: 'bitcoin' },
  investmentReport: { lib: 'Feather', name: 'bar-chart-2' },

  // Imposto de Renda
  taxes:            { lib: 'Feather', name: 'percent' },
  darf:             { lib: 'Feather', name: 'file-text' },
  taxCalendar:      { lib: 'Feather', name: 'calendar' },
  irpfExport:       { lib: 'Feather', name: 'download' },

  // PJ / MEI / Freelancer
  pj:               { lib: 'Feather', name: 'briefcase' },
  pjRevenue:        { lib: 'Feather', name: 'trending-up' },
  pjExpenses:       { lib: 'Feather', name: 'trending-down' },
  pjClients:        { lib: 'Feather', name: 'users' },
  pjDas:            { lib: 'Feather', name: 'file-text' },
  pjDasn:           { lib: 'Feather', name: 'file-plus' },
  pjProlabore:      { lib: 'Feather', name: 'dollar-sign' },
  pjInvoices:       { lib: 'Feather', name: 'paperclip' },
  pjCashflow:       { lib: 'Feather', name: 'activity' },
  pjBusinessHealth: { lib: 'Feather', name: 'heart' },

  // Ferramentas
  ai:               { lib: 'MaterialCommunityIcons', name: 'robot' },
  simulators:       { lib: 'Feather', name: 'sliders' },
  customAlerts:     { lib: 'Feather', name: 'bell' },
  education:        { lib: 'Feather', name: 'book-open' },

  // Configurações
  settings:         { lib: 'Feather', name: 'settings' },
  subscriptions:    { lib: 'Feather', name: 'award' },
  sessions:         { lib: 'Feather', name: 'shield' },
  referral:         { lib: 'Feather', name: 'gift' },
  privacy:          { lib: 'Feather', name: 'lock' },
  notifications:    { lib: 'Feather', name: 'bell' },
  logout:           { lib: 'Feather', name: 'log-out' },

  // UI utilitários
  chevronRight:     { lib: 'Feather', name: 'chevron-right' },
  chevronLeft:      { lib: 'Feather', name: 'chevron-left' },
  plus:             { lib: 'Feather', name: 'plus' },
  minus:            { lib: 'Feather', name: 'minus' },
  search:           { lib: 'Feather', name: 'search' },
  edit:             { lib: 'Feather', name: 'edit-2' },
  delete:           { lib: 'Feather', name: 'trash-2' },
  check:            { lib: 'Feather', name: 'check' },
  close:            { lib: 'Feather', name: 'x' },
  info:             { lib: 'Feather', name: 'info' },
  alert:            { lib: 'Feather', name: 'alert-circle' },
} as const satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof Feather>['style'];
}

/**
 * Componente unificado de ícone — aceita um nome semântico do mapa `ICONS`
 * e resolve a biblioteca correta (Feather, MaterialCommunityIcons, etc.).
 * Use em vez de `<Feather name="..." />` solto sempre que possível para
 * manter consistência com o web (lucide-react).
 */
export function Icon({ name, size = 20, color, style }: IconProps) {
  const spec = ICONS[name];
  if (!spec) return null;
  if (spec.lib === 'MaterialCommunityIcons') {
    return React.createElement(
      MaterialCommunityIcons as React.ComponentType<{ name: string; size?: number; color?: string; style?: unknown }>,
      { name: spec.name, size, color, style }
    );
  }
  if (spec.lib === 'MaterialIcons') {
    return React.createElement(
      MaterialIcons as React.ComponentType<{ name: string; size?: number; color?: string; style?: unknown }>,
      { name: spec.name, size, color, style }
    );
  }
  return React.createElement(
    Feather as React.ComponentType<{ name: string; size?: number; color?: string; style?: unknown }>,
    { name: spec.name, size, color, style }
  );
}

export default Icon;
