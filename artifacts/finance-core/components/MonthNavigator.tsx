import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';

interface MonthNavigatorProps {
  value: string; // 'YYYY-MM'
  onChange: (month: string) => void;
  style?: ViewStyle;
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase());
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  return `${ny}-${nm}`;
}

export function MonthNavigator({ value, onChange, style }: MonthNavigatorProps) {
  const { theme, colors } = useTheme();

  const prev = useCallback(() => {
    Haptics.selectionAsync();
    onChange(addMonths(value, -1));
  }, [value, onChange]);

  const next = useCallback(() => {
    const nextMonth = addMonths(value, 1);
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (nextMonth <= currentMonth) {
      Haptics.selectionAsync();
      onChange(nextMonth);
    }
  }, [value, onChange]);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = value >= currentMonth;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>
      <Pressable onPress={prev} style={styles.arrow} hitSlop={12}>
        <Feather name="chevron-left" size={20} color={colors.primary} />
      </Pressable>
      <Text style={[styles.label, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
        {formatMonthLabel(value)}
      </Text>
      <Pressable onPress={next} style={styles.arrow} hitSlop={12}
        disabled={isCurrentMonth}>
        <Feather name="chevron-right" size={20}
          color={isCurrentMonth ? theme.textTertiary : colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  arrow: { padding: 4 },
  label: { fontSize: 15, flex: 1, textAlign: 'center' },
});
