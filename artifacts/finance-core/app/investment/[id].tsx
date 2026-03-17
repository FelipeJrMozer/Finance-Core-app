import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Button } from '@/components/ui/Button';
import { formatBRL, formatPercent } from '@/utils/formatters';

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Ações BR', fii: 'FIIs', reit: 'REITs', fixed: 'Renda Fixa', crypto: 'Cripto', etf: 'ETFs'
};
const TYPE_COLORS: Record<string, string> = {
  stocks: '#2196F3', fii: '#9C27B0', reit: '#FF9800', fixed: '#4CAF50', crypto: '#FF6B35', etf: '#00BCD4'
};

export default function InvestmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors } = useTheme();
  const { investments } = useFinance();
  const insets = useSafeAreaInsets();

  const inv = investments.find((i) => i.id === id);
  if (!inv) return null;

  const invested = inv.quantity * inv.avgPrice;
  const current = inv.quantity * inv.currentPrice;
  const profit = current - invested;
  const pctReturn = invested > 0 ? ((current - invested) / invested) * 100 : 0;
  const typeColor = TYPE_COLORS[inv.type] || colors.primary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
    >
      <LinearGradient
        colors={profit >= 0 ? [colors.primary, colors.primaryDark] : [colors.danger, '#CC0000']}
        style={styles.hero}
      >
        <View style={[styles.typeTag, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Text style={[styles.typeText, { fontFamily: 'Inter_600SemiBold' }]}>{TYPE_LABELS[inv.type]}</Text>
        </View>
        <Text style={[styles.ticker, { fontFamily: 'Inter_700Bold' }]}>{inv.ticker}</Text>
        <Text style={[styles.name, { fontFamily: 'Inter_400Regular' }]}>{inv.name}</Text>
        <Text style={[styles.currentValue, { fontFamily: 'Inter_700Bold' }]}>{formatBRL(current)}</Text>
        <View style={[styles.returnBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Feather name={pctReturn >= 0 ? 'trending-up' : 'trending-down'} size={14} color="#000" />
          <Text style={[styles.returnText, { fontFamily: 'Inter_600SemiBold' }]}>{formatPercent(pctReturn)}</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {[
          { label: 'Investido', value: formatBRL(invested), icon: 'dollar-sign' as const, color: colors.info },
          { label: 'Lucro/Perda', value: formatBRL(profit), icon: 'activity' as const, color: profit >= 0 ? colors.primary : colors.danger },
          { label: 'Quantidade', value: `${inv.quantity}`, icon: 'layers' as const, color: typeColor },
          { label: 'Preço Médio', value: formatBRL(inv.avgPrice), icon: 'bar-chart-2' as const, color: colors.accent },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name={stat.icon} size={18} color={stat.color} />
            <Text style={[styles.statValue, { color: stat.color, fontFamily: 'Inter_700Bold' }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  typeTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typeText: { color: '#000', fontSize: 13 },
  ticker: { color: '#000', fontSize: 36, marginTop: 4 },
  name: { color: 'rgba(0,0,0,0.7)', fontSize: 16 },
  currentValue: { color: '#000', fontSize: 30, marginTop: 4 },
  returnBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  returnText: { color: '#000', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 16, marginTop: 4 },
  statLabel: { fontSize: 12 },
});
