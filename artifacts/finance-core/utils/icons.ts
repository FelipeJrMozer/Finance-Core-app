import { Feather } from '@expo/vector-icons';

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
