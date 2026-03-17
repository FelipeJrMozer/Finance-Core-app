import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof Colors.dark;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof Colors;
  valuesVisible: boolean;
  toggleValuesVisible: () => void;
  maskValue: (value: string) => string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [valuesVisible, setValuesVisible] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('themeMode').then((val) => {
      if (val) setThemeModeState(val as ThemeMode);
    });
    AsyncStorage.getItem('valuesVisible').then((val) => {
      if (val !== null) setValuesVisible(val === 'true');
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
  };

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

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{
      theme, isDark, themeMode, setThemeMode, colors: Colors,
      valuesVisible, toggleValuesVisible, maskValue,
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
