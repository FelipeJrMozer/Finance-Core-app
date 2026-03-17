import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { getCategoryInfo } from '@/components/CategoryBadge';
import { Feather } from '@expo/vector-icons';
import { formatBRL } from '@/utils/formatters';

interface BudgetProgressProps {
  category: string;
  limit: number;
  spent: number;
  compact?: boolean;
}

export function BudgetProgress({ category, limit, spent, compact }: BudgetProgressProps) {
  const { theme, colors } = useTheme();
  const info = getCategoryInfo(category);
  const pct = Math.min(spent / limit, 1);
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const barColor = pct > 0.9 ? colors.danger : pct > 0.7 ? colors.warning : colors.primary;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: pct * 100,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: info.color }]} />
            <Text style={[styles.compactLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{info.label}</Text>
          </View>
          <Text style={[styles.compactPct, { color: pct > 0.9 ? colors.danger : theme.textSecondary }]}>
            {(pct * 100).toFixed(0)}%
          </Text>
        </View>
        <View style={[styles.bar, { backgroundColor: theme.surfaceElevated }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: barColor,
                width: animatedWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              }
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: `${info.color}20` }]}>
            <Feather name={info.icon} size={14} color={info.color} />
          </View>
          <Text style={[styles.label, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{info.label}</Text>
        </View>
        <View style={styles.amounts}>
          <Text style={[styles.spent, { color: barColor, fontFamily: 'Inter_600SemiBold' }]}>
            {formatBRL(spent)}
          </Text>
          <Text style={[styles.limit, { color: theme.textTertiary }]}>/ {formatBRL(limit)}</Text>
        </View>
      </View>
      <View style={[styles.bar, { backgroundColor: theme.surfaceElevated, height: 8 }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: barColor,
              height: 8,
              borderRadius: 4,
              width: animatedWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
            }
          ]}
        />
      </View>
      <Text style={[styles.remaining, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
        {pct >= 1 ? (
          <Text style={{ color: colors.danger }}>Limite ultrapassado em {formatBRL(spent - limit)}</Text>
        ) : (
          `Restam ${formatBRL(limit - spent)}`
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14 },
  amounts: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  spent: { fontSize: 14 },
  limit: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  bar: { borderRadius: 4, overflow: 'hidden' },
  fill: { borderRadius: 4 },
  remaining: { fontSize: 12 },
  compactContainer: { gap: 4 },
  compactHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  compactLabel: { fontSize: 12 },
  compactPct: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
