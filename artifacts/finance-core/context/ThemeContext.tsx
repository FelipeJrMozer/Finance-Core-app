import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Colors, ACCENT_PRESETS, AccentId, DEFAULT_ACCENT_ID } from '@/constants/colors';

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
  setAccentColor: (id: AccentId) => Promise<void>;
  valuesVisible: boolean;
  toggleValuesVisible: () => void;
  maskValue: (value: string) => string;
  notifyDARF: boolean;
  notifyBudget: boolean;
  notifyWeekly: boolean;
  setNotifySetting: (key: 'notifyDARF' | 'notifyBudget' | 'notifyWeekly', value: boolean) => void;
  isSyncingColors: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function fetchRemotePrefs(): Promise<{ accentId?: string; themeMode?: string } | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}/api/preferences`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) return await res.json();
  } catch {
    // offline or API unavailable
  }
  return null;
}

async function pushRemotePrefs(data: { accentId?: string; themeMode?: string }) {
  if (!API_URL) return;
  try {
    await fetch(`${API_URL}/api/preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentId, setAccentId] = useState<AccentId>(DEFAULT_ACCENT_ID);
  const [valuesVisible, setValuesVisible] = useState(true);
  const [notifyDARF, setNotifyDARF] = useState(true);
  const [notifyBudget, setNotifyBudget] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(false);
  const [isSyncingColors, setIsSyncingColors] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const init = async () => {
      const [tm, ac, vv, nd, nb, nw] = await Promise.all([
        AsyncStorage.getItem('themeMode'),
        AsyncStorage.getItem('accentColor'),
        AsyncStorage.getItem('valuesVisible'),
        AsyncStorage.getItem('notifyDARF'),
        AsyncStorage.getItem('notifyBudget'),
        AsyncStorage.getItem('notifyWeekly'),
      ]);

      if (tm) setThemeModeState(tm as ThemeMode);
      const localAccent = ac as AccentId | null;
      if (localAccent) setAccentId(localAccent);
      if (vv !== null) setValuesVisible(vv === 'true');
      if (nd !== null) setNotifyDARF(nd === 'true');
      if (nb !== null) setNotifyBudget(nb === 'true');
      if (nw !== null) setNotifyWeekly(nw === 'true');

      // Sync from API — API is source of truth for accent/theme
      if (API_URL) {
        setIsSyncingColors(true);
        const remote = await fetchRemotePrefs();
        setIsSyncingColors(false);
        if (remote) {
          if (remote.accentId && remote.accentId !== localAccent) {
            const id = remote.accentId as AccentId;
            setAccentId(id);
            await AsyncStorage.setItem('accentColor', id);
          }
          if (remote.themeMode && remote.themeMode !== tm) {
            setThemeModeState(remote.themeMode as ThemeMode);
            await AsyncStorage.setItem('themeMode', remote.themeMode);
          }
        }
      }
    };

    init();

    // Poll API every 30s to pick up web changes
    if (API_URL) {
      syncIntervalRef.current = setInterval(async () => {
        const remote = await fetchRemotePrefs();
        if (remote?.accentId) {
          setAccentId((prev) => {
            if (prev !== remote.accentId) {
              AsyncStorage.setItem('accentColor', remote.accentId!);
              return remote.accentId as AccentId;
            }
            return prev;
          });
        }
      }, 30000);
    }

    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
    pushRemotePrefs({ themeMode: mode });
  }, []);

  const setAccentColor = useCallback(async (id: AccentId) => {
    setAccentId(id);
    await AsyncStorage.setItem('accentColor', id);
    pushRemotePrefs({ accentId: id });
  }, []);

  const toggleValuesVisible = useCallback(() => {
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
      isSyncingColors,
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
