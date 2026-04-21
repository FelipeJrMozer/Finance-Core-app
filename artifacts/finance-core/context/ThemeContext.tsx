import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, ACCENT_PRESETS, AccentId, DEFAULT_ACCENT_ID } from '@/constants/colors';
import { safeGet, safeSet } from '@/utils/storage';
import { getAccessToken } from '@/services/api';
import { DISABLE_BACKGROUND_TASKS } from '@/config/featureFlags';

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
  syncPreferences: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

async function fetchRemotePrefs(): Promise<{
  accentId?: string; themeMode?: string; valuesVisible?: boolean;
} | null> {
  if (!API_URL) return null;
  try {
    const token = getAccessToken();
    if (!token) return null;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const res = await fetch(`${API_URL}/api/preferences`, { headers, signal: AbortSignal.timeout(4000) });
    if (res.ok) return await res.json();
  } catch { /* offline */ }
  return null;
}

async function pushRemotePrefs(data: { accentId?: string; themeMode?: string; valuesVisible?: boolean }) {
  if (!API_URL) return;
  try {
    const token = getAccessToken();
    if (!token) return;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
    await fetch(`${API_URL}/api/preferences`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* ignore */ }
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
        safeGet<string>('themeMode'),
        safeGet<string>('accentColor'),
        safeGet<string>('valuesVisible'),
        safeGet<string>('notifyDARF'),
        safeGet<string>('notifyBudget'),
        safeGet<string>('notifyWeekly'),
      ]);

      if (tm) setThemeModeState(tm as ThemeMode);
      const localAccent = ac as AccentId | null;
      if (localAccent) setAccentId(localAccent);
      if (vv !== null) setValuesVisible(vv === 'true');
      if (nd !== null) setNotifyDARF(nd === 'true');
      if (nb !== null) setNotifyBudget(nb === 'true');
      if (nw !== null) setNotifyWeekly(nw === 'true');

      // Sync from API — API is source of truth for accent/theme/valuesVisible
      if (API_URL) {
        setIsSyncingColors(true);
        const remote = await fetchRemotePrefs();
        setIsSyncingColors(false);
        if (remote) {
          if (remote.accentId && remote.accentId !== localAccent) {
            const id = remote.accentId as AccentId;
            setAccentId(id);
            await safeSet('accentColor', id);
          }
          if (remote.themeMode && remote.themeMode !== tm) {
            setThemeModeState(remote.themeMode as ThemeMode);
            await safeSet('themeMode', remote.themeMode);
          }
          if (typeof remote.valuesVisible === 'boolean' && vv === null) {
            setValuesVisible(remote.valuesVisible);
            await safeSet('valuesVisible', String(remote.valuesVisible));
          }
        }
      }
    };

    init();

    // Poll API every 30s to pick up web changes
    if (API_URL && !DISABLE_BACKGROUND_TASKS) {
      syncIntervalRef.current = setInterval(async () => {
        const remote = await fetchRemotePrefs();
        if (!remote) return;
        if (remote.accentId) {
          setAccentId((prev) => {
            if (prev !== remote.accentId) {
              safeSet('accentColor', remote.accentId!);
              return remote.accentId as AccentId;
            }
            return prev;
          });
        }
        if (remote.themeMode) {
          setThemeModeState((prev) => {
            if (prev !== remote.themeMode) {
              safeSet('themeMode', remote.themeMode!);
              return remote.themeMode as ThemeMode;
            }
            return prev;
          });
        }
        if (typeof remote.valuesVisible === 'boolean') {
          setValuesVisible((prev) => {
            if (prev !== remote.valuesVisible) {
              safeSet('valuesVisible', String(remote.valuesVisible));
              return remote.valuesVisible!;
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
    await safeSet('themeMode', mode);
    pushRemotePrefs({ themeMode: mode });
  }, []);

  const setAccentColor = useCallback(async (id: AccentId) => {
    setAccentId(id);
    await safeSet('accentColor', id);
    pushRemotePrefs({ accentId: id });
  }, []);

  const toggleValuesVisible = useCallback(() => {
    setValuesVisible((prev) => {
      const next = !prev;
      safeSet('valuesVisible', String(next));
      pushRemotePrefs({ valuesVisible: next });
      return next;
    });
  }, []);

  const syncPreferences = useCallback(async () => {
    await pushRemotePrefs({ accentId, themeMode, valuesVisible });
  }, [accentId, themeMode, valuesVisible]);

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
    await safeSet(key, String(value));
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
      isSyncingColors, syncPreferences,
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
