import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, formatPercent } from '@/utils/formatters';

const { width } = Dimensions.get('window');
const CHART_W = width - 64;
const CDI_ANNUAL = 12.0;
const IBOV_ANNUAL = 8.5;

type TabId = 'dividendos' | 'performance' | 'historico';

export default function InvestmentReportScreen() {
  const { theme, colors } = useTheme();
  const { investments } = useFinance();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('dividendos');

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dividendos', label: 'Dividendos', icon: 'dollar-sign' },
    { id: 'performance', label: 'Performance', icon: 'trending-up' },
    { id: 'historico', label: 'Histórico', icon: 'clock' },
  ];

  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.avgPrice, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  // Simulate dividends (in a real app, fetch from /api/dividends)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    return d.toLocaleDateString('pt-BR', { month: 'short' });
  });

  const dividendData = months.map((m, i) => ({
    value: Math.round(totalCurrent * 0.005 * (0.7 + Math.random() * 0.6)),
    label: m,
    frontColor: colors.primary,
  }));

  const totalDividends = dividendData.reduce((s, d) => s + d.value, 0);

  const performanceData = [
    { label: 'Carteira', value: totalReturn, color: totalReturn >= 0 ? colors.success : colors.danger },
    { label: 'CDI', value: CDI_ANNUAL, color: '#F59E0B' },
    { label: 'IBOV', value: IBOV_ANNUAL, color: '#9C27B0' },
  ];

  const historyData = Array.from({ length: 6 }, (_, i) => {
    const base = totalInvested * (1 + (totalReturn / 100) * (i / 5));
    return { value: Math.round(base), label: months[i] };
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}
            style={[styles.tab, tab === t.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Feather name={t.icon as any} size={14} color={tab === t.id ? colors.primary : theme.textTertiary} />
            <Text style={[styles.tabLabel, { color: tab === t.id ? colors.primary : theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Investido</Text>
              <Text style={[styles.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalInvested)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Retorno total</Text>
              <Text style={[styles.summaryReturn, { color: totalReturn >= 0 ? colors.success : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {tab === 'dividendos' && (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Total recebido no semestre</Text>
              <Text style={[styles.bigValue, { color: colors.success, fontFamily: 'Inter_800ExtraBold' }]}>{formatBRL(totalDividends)}</Text>
              <BarChart
                data={dividendData}
                width={CHART_W}
                height={150}
                barWidth={30}
                spacing={10}
                frontColor={colors.primary}
                xAxisColor={theme.border}
                yAxisColor={theme.border}
                yAxisTextStyle={{ color: theme.textTertiary, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
                noOfSections={4}
                isAnimated
              />
            </View>
            {investments.filter((i) => ['stocks', 'fii', 'reit', 'etf'].includes(i.type)).map((inv) => (
              <View key={inv.id} style={[styles.divRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View>
                  <Text style={[styles.ticker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{inv.ticker}</Text>
                  <Text style={[styles.invName, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{inv.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.divAmount, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>
                    {formatBRL(inv.quantity * 0.8)}
                  </Text>
                  <Text style={[styles.divLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>estimado</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'performance' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Comparativo de Rentabilidade</Text>
            {performanceData.map((p) => (
              <View key={p.label} style={styles.perfRow}>
                <Text style={[styles.perfLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', width: 70 }]}>{p.label}</Text>
                <View style={[styles.perfBarBg, { backgroundColor: theme.surfaceElevated, flex: 1 }]}>
                  <View style={[styles.perfBarFill, {
                    width: `${Math.min(100, Math.abs(p.value) * 4)}%`,
                    backgroundColor: p.color,
                  }]} />
                </View>
                <Text style={[styles.perfPct, { color: p.color, fontFamily: 'Inter_700Bold', width: 52, textAlign: 'right' }]}>
                  {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}%
                </Text>
              </View>
            ))}
            <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              * CDI e IBOV usam referências anuais
            </Text>
          </View>
        )}

        {tab === 'historico' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Evolução Patrimonial</Text>
            <LineChart
              data={historyData}
              width={CHART_W}
              height={160}
              color={colors.primary}
              thickness={2}
              curved
              areaChart
              startFillColor={`${colors.primary}40`}
              endFillColor={`${colors.primary}00`}
              xAxisColor={theme.border}
              yAxisColor={theme.border}
              yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
              noOfSections={4}
              isAnimated
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabLabel: { fontSize: 13 },
  summaryCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, marginBottom: 2 },
  summaryValue: { fontSize: 18 },
  summaryReturn: { fontSize: 20 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  cardTitle: { fontSize: 15 },
  bigValue: { fontSize: 24 },
  divRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1 },
  ticker: { fontSize: 15 },
  invName: { fontSize: 12, marginTop: 2 },
  divAmount: { fontSize: 15 },
  divLabel: { fontSize: 11, marginTop: 2 },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perfLabel: { fontSize: 13 },
  perfBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  perfBarFill: { height: 10, borderRadius: 5 },
  perfPct: { fontSize: 13 },
  perfNote: { fontSize: 11, marginTop: 4 },
});
