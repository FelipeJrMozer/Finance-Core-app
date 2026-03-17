import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Colors, ACCENT_PRESETS, AccentId } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

export type DynamicColors = typeof Colors & {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryGlow: string;
};

interface ThemeContextType {
  theme: typeof Colors.dark;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: DynamicColors;
  accentId: AccentId;
  setAccentColor: (id: AccentId) => void;
  valuesVisible: boolean;
  toggleValuesVisible: () => void;
  maskValue: (value: string) => string;
  notifyDARF: boolean;
  notifyBudget: boolean;
  notifyWeekly: boolean;
  setNotifySetting: (key: 'notifyDARF' | 'notifyBudget' | 'notifyWeekly', value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentId, setAccentId] = useState<AccentId>('green');
  const [valuesVisible, setValuesVisible] = useState(true);
  const [notifyDARF, setNotifyDARF] = useState(true);
  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('themeMode'),
      AsyncStorage.getItem('accentColor'),
      AsyncStorage.getItem('valuesVisible'),
      AsyncStorage.getItem('notifyDARF'),
      AsyncStorage.getItem('notifyBudget'),
      AsyncStorage.getItem('notifyWeekly'),
    ]).then(([tm, ac, vv, nd, nb, nw]) => {
      if (tm) setThemeModeState(tm as ThemeMode);
      if (ac) setAccentId(ac as AccentId);
      if (vv !== null) setValuesVisible(vv === 'true');
      if (nd !== null) setNotifyDARF(nd === 'true');
      if (nb !== null) setNotifyBudget(nb === 'true');
      if (nw !== null) setNotifyWeekly(nw === 'true');
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

  const setAccentColor = useCallback(async (id: AccentId) => {
    setAccentId(id);
    await AsyncStorage.setItem('accentColor', id);
  }, []);

  const toggleValuesVisible = useCallback(async () => {
    setValuesVisible((prev) => {
      const next = !prev;
      AsyncStorage.setItem('valuesVisible', String(next));
      return next;
    });
  }, []);

  const maskValue = useCallback(
    (value: string) => (valuesVisible ? value : '•••••'),
    [valuesVisible]
  );

  const setNotifySetting = useCallback(async (
    key: 'notifyDARF' | 'notifyBudget' | 'notifyWeekly',
    value: boolean
  ) => {
    if (key === 'notifyDARF') setNotifyDARF(value);
    if (key === 'notifyBudget') setNotifyBudget(value);
    if (key === 'notifyWeekly') setNotifyWeekly(value);
    await AsyncStorage.setItem(key, String(value));
  }, []);

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const preset = ACCENT_PRESETS.find(p => p.id === accentId) ?? ACCENT_PRESETS[0];
  const colors: DynamicColors = {
    ...Colors,
    primary: preset.primary,
    primaryDark: preset.primaryDark,
    primaryLight: preset.primaryLight,
    primaryGlow: `${preset.primary}26`,
  };

  return (
    <ThemeContext.Provider value={{
      theme, isDark, themeMode, setThemeMode, colors, accentId, setAccentColor,
      valuesVisible, toggleValuesVisible, maskValue,
      notifyDARF, notifyBudget, notifyWeekly, setNotifySetting,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
