import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform, Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Investment } from '@/context/FinanceContext';
import { formatBRL, formatPercent } from '@/utils/formatters';
import { WalletHeaderButton } from '@/components/WalletHeaderButton';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Ações BR', fii: 'FIIs', reit: 'REITs', fixed: 'Renda Fixa', crypto: 'Cripto', etf: 'ETFs'
};
const TYPE_COLORS: Record<string, string> = {
  stocks: '#2196F3', fii: '#9C27B0', reit: '#FF9800', fixed: '#4CAF50', crypto: '#FF6B35', etf: '#00BCD4'
};
const TYPE_RISK: Record<string, number> = {
  fixed: 1, fii: 3, reit: 3, etf: 4, stocks: 7, crypto: 10
};

function SectionCard({ title, icon, children, badge }: { title: string; icon: string; children: React.ReactNode; badge?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={sc.header}>
        <Feather name={icon as any} size={15} color={theme.textSecondary} />
        <Text style={[sc.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{title}</Text>
        {badge && (
          <View style={[sc.badge, { backgroundColor: `${theme.textTertiary}20` }]}>
            <Text style={[sc.badgeText, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 14, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11 },
});

function InvestmentCard({ investment, onPress }: { investment: Investment; onPress: () => void }) {
  const { theme, colors, maskValue } = useTheme();
  const invested = investment.quantity * investment.avgPrice;
  const current = investment.quantity * investment.currentPrice;
  const profit = current - invested;
  const pctReturn = invested > 0 ? ((current - invested) / invested) * 100 : 0;
  const typeColor = TYPE_COLORS[investment.type] || colors.primary;
  const isGain = profit >= 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[inv.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Color accent bar */}
        <View style={[inv.accentBar, { backgroundColor: isGain ? colors.primary : colors.danger }]} />
        <View style={inv.inner}>
          <View style={inv.top}>
            <View>
              <View style={inv.tickerRow}>
                <Text style={[inv.ticker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{investment.ticker}</Text>
                <View style={[inv.typeTag, { backgroundColor: `${typeColor}15` }]}>
                  <Text style={[inv.typeText, { color: typeColor, fontFamily: 'Inter_600SemiBold' }]}>{TYPE_LABELS[investment.type]}</Text>
                </View>
              </View>
              <Text style={[inv.name, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                {investment.name}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[inv.currentValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                {maskValue(formatBRL(current))}
              </Text>
              <View style={[inv.badge, { backgroundColor: isGain ? `${colors.primary}15` : `${colors.danger}15` }]}>
                <Feather name={isGain ? 'trending-up' : 'trending-down'} size={11} color={isGain ? colors.primary : colors.danger} />
                <Text style={[inv.badgeText, { color: isGain ? colors.primary : colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                  {formatPercent(pctReturn)}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress bar: invested vs current */}
          <View style={[inv.progressBg, { backgroundColor: `${colors.danger}20` }]}>
            <View style={[inv.progressFill, { backgroundColor: isGain ? colors.primary : colors.danger, width: `${Math.min((current / Math.max(current, invested)) * 100, 100)}%` }]} />
          </View>

          <View style={inv.bottom}>
            {[
              { label: 'Investido', val: maskValue(formatBRL(invested)), color: theme.textSecondary },
              { label: 'Qtd', val: String(investment.quantity), color: theme.textSecondary },
              { label: 'Preço médio', val: maskValue(formatBRL(investment.avgPrice)), color: theme.textSecondary },
              { label: isGain ? 'Lucro' : 'Perda', val: maskValue(formatBRL(Math.abs(profit))), color: isGain ? colors.primary : colors.danger },
            ].map((m) => (
              <View key={m.label} style={{ alignItems: 'center' }}>
                <Text style={[inv.metaLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{m.label}</Text>
                <Text style={[inv.metaValue, { color: m.color, fontFamily: m.label === (isGain ? 'Lucro' : 'Perda') ? 'Inter_600SemiBold' : 'Inter_500Medium' }]}>{m.val}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
const inv = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, flexDirection: 'row' },
  accentBar: { width: 4 },
  inner: { flex: 1, padding: 14, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticker: { fontSize: 20 },
  typeTag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 10 },
  name: { fontSize: 12, marginTop: 2 },
  currentValue: { fontSize: 18 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 12 },
  progressBg: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 10 },
  metaValue: { fontSize: 13, marginTop: 1 },
});

export default function InvestmentsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { investments } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'name'>('value');
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.avgPrice, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalProfit = totalCurrent - totalInvested;
  const pctReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const byType = useMemo(() => Object.entries(
    investments.reduce((acc, inv) => {
      const v = inv.quantity * inv.currentPrice;
      acc[inv.type] = (acc[inv.type] || 0) + v;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]), [investments]);

  const pieData = useMemo(() => byType.map(([type, value]) => ({
    value,
    color: TYPE_COLORS[type] || '#999',
    text: `${((value / totalCurrent) * 100).toFixed(0)}%`,
  })), [byType, totalCurrent]);

  const riskScore = useMemo(() => {
    if (totalCurrent === 0) return 0;
    return Math.round(byType.reduce((s, [type, val]) => s + (TYPE_RISK[type] || 5) * (val / totalCurrent), 0));
  }, [byType, totalCurrent]);

  const riskLabel = riskScore <= 2 ? 'Conservador' : riskScore <= 4 ? 'Moderado Conservador' : riskScore <= 6 ? 'Moderado' : riskScore <= 8 ? 'Arrojado' : 'Agressivo';
  const riskColor = riskScore <= 2 ? '#4CAF50' : riskScore <= 4 ? colors.primary : riskScore <= 6 ? colors.warning : riskScore <= 8 ? '#FF6B35' : colors.danger;

  const diversificationScore = Math.min(100, byType.length * 20);

  const sortedPerformers = useMemo(() => [...investments].sort((a, b) => {
    const retA = (a.currentPrice - a.avgPrice) / a.avgPrice;
    const retB = (b.currentPrice - b.avgPrice) / b.avgPrice;
    return retB - retA;
  }), [investments]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? investments : investments.filter((i) => i.type === filter);
    if (sortBy === 'value') list = [...list].sort((a, b) => (b.quantity * b.currentPrice) - (a.quantity * a.currentPrice));
    else if (sortBy === 'return') list = [...list].sort((a, b) => ((b.currentPrice - b.avgPrice) / b.avgPrice) - ((a.currentPrice - a.avgPrice) / a.avgPrice));
    else list = [...list].sort((a, b) => a.ticker.localeCompare(b.ticker));
    return list;
  }, [investments, filter, sortBy]);

  const perfBarData = useMemo(() =>
    sortedPerformers.slice(0, 6).map((inv) => {
      const ret = ((inv.currentPrice - inv.avgPrice) / inv.avgPrice) * 100;
      return {
        value: Math.abs(ret),
        label: inv.ticker,
        frontColor: ret >= 0 ? colors.primary : colors.danger,
      };
    }), [sortedPerformers, colors]
  );

  const estimatedMonthlyYield = useMemo(() =>
    investments
      .filter((i) => i.type === 'fii')
      .reduce((s, i) => s + i.quantity * i.currentPrice * 0.007, 0), // ~0.7% avg FII yield/month
    [investments]
  );

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  const types = ['all', ...Object.keys(TYPE_LABELS).filter((t) => investments.some((i) => i.type === t))];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#0A0A0F', '#0D1A14'] : ['#F0FFF4', '#F5F7FA']}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.headerTop}>
            <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Carteira</Text>
            <WalletHeaderButton />
            <Pressable
              testID="add-investment"
              onPress={() => { Haptics.selectionAsync(); router.push('/investment/add'); }}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color="#000" />
            </Pressable>
          </View>

          {/* Portfolio Hero */}
          <LinearGradient
            colors={totalProfit >= 0 ? [colors.primary, colors.primaryDark] : [colors.danger, '#CC0000']}
            style={styles.portfolioCard}
          >
            <Text style={[styles.portfolioLabel, { fontFamily: 'Inter_400Regular' }]}>Valor atual da carteira</Text>
            <Text style={[styles.portfolioValue, { fontFamily: 'Inter_700Bold' }]}>
              {maskValue(formatBRL(totalCurrent))}
            </Text>
            <View style={styles.portfolioStats}>
              {[
                { label: 'Investido', val: maskValue(formatBRL(totalInvested)) },
                { label: totalProfit >= 0 ? 'Lucro' : 'Perda', val: maskValue(formatBRL(totalProfit)) },
                { label: 'Retorno', val: formatPercent(pctReturn) },
              ].map((s, i, arr) => (
                <React.Fragment key={s.label}>
                  <View>
                    <Text style={[styles.portfolioMeta, { fontFamily: 'Inter_400Regular' }]}>{s.label}</Text>
                    <Text style={[styles.portfolioMetaVal, { fontFamily: 'Inter_600SemiBold' }]}>{s.val}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={[styles.dividerV, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />}
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>

          {/* KPI mini row */}
          {investments.length > 0 && (
            <View style={styles.miniKpiRow}>
              {[
                { label: 'Ativos', val: `${investments.length}`, color: colors.primary, icon: 'layers' },
                { label: 'Classes', val: `${byType.length}`, color: '#9C27B0', icon: 'grid' },
                { label: 'Risco', val: riskLabel.split(' ')[0], color: riskColor, icon: 'shield' },
                ...(estimatedMonthlyYield > 0 ? [{ label: 'Yield/mês est.', val: maskValue(formatBRL(estimatedMonthlyYield, true)), color: '#FF9800', icon: 'dollar-sign' }] : []),
              ].map((k) => (
                <View key={k.label} style={[styles.miniKpi, { backgroundColor: `${k.color}12`, borderColor: `${k.color}30` }]}>
                  <Feather name={k.icon as any} size={12} color={k.color} />
                  <Text style={[styles.miniKpiVal, { color: k.color, fontFamily: 'Inter_700Bold' }]}>{k.val}</Text>
                  <Text style={[styles.miniKpiLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{k.label}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>

          {investments.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="pie-chart" size={56} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Nenhum ativo cadastrado</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Adicione seus investimentos para ver análises detalhadas
              </Text>
              <Pressable
                onPress={() => { Haptics.selectionAsync(); router.push('/investment/add'); }}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={16} color="#000" />
                <Text style={[styles.emptyBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Adicionar investimento</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Allocation Donut */}
              <SectionCard title="Alocação por Classe" icon="pie-chart">
                <View style={{ alignItems: 'center' }}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={88}
                    innerRadius={54}
                    innerCircleColor={theme.surface}
                    centerLabelComponent={() => (
                      <View style={{ alignItems: 'center' }}>
                        <Text style={[{ color: theme.text, fontSize: 14, fontFamily: 'Inter_700Bold' }]}>
                          {maskValue(formatBRL(totalCurrent, true))}
                        </Text>
                        <Text style={[{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_400Regular' }]}>
                          total
                        </Text>
                      </View>
                    )}
                    showText
                    textColor="#fff"
                    textSize={11}
                    isAnimated
                    animationDuration={800}
                  />
                </View>
                <View style={styles.allocLegend}>
                  {byType.map(([type, value]) => (
                    <View key={type} style={styles.allocItem}>
                      <View style={[styles.allocDot, { backgroundColor: TYPE_COLORS[type] }]} />
                      <Text style={[styles.allocLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        {TYPE_LABELS[type]}
                      </Text>
                      <Text style={[styles.allocPct, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {((value / totalCurrent) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Allocation bars */}
                <View style={{ gap: 6 }}>
                  {byType.map(([type, value]) => (
                    <View key={type} style={alloc.row}>
                      <Text style={[alloc.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{TYPE_LABELS[type]}</Text>
                      <View style={[alloc.track, { backgroundColor: theme.surfaceElevated }]}>
                        <LinearGradient
                          colors={[TYPE_COLORS[type], `${TYPE_COLORS[type]}80`]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[alloc.fill, { width: `${(value / totalCurrent) * 100}%` }]}
                        />
                      </View>
                      <Text style={[alloc.amount, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                        {maskValue(formatBRL(value, true))}
                      </Text>
                    </View>
                  ))}
                </View>
              </SectionCard>

              {/* Risk & Diversification */}
              <View style={styles.twoCol}>
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: theme.border, borderColor: `${riskColor}30` }]}>
                  <Feather name="shield" size={20} color={riskColor} />
                  <Text style={[styles.metricTitle, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Perfil de risco</Text>
                  <Text style={[styles.metricScore, { color: riskColor, fontFamily: 'Inter_700Bold' }]}>{riskScore}/10</Text>
                  <Text style={[styles.metricLabel, { color: riskColor, fontFamily: 'Inter_600SemiBold' }]}>{riskLabel}</Text>
                  <View style={[styles.riskTrack, { backgroundColor: theme.surfaceElevated }]}>
                    <LinearGradient
                      colors={[colors.primary, riskColor]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.riskFill, { width: `${(riskScore / 10) * 100}%` }]}
                    />
                  </View>
                </View>
                <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: `${colors.primary}30` }]}>
                  <Feather name="layers" size={20} color={colors.primary} />
                  <Text style={[styles.metricTitle, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Diversificação</Text>
                  <Text style={[styles.metricScore, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{diversificationScore}/100</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
                    {byType.length} {byType.length === 1 ? 'classe' : 'classes'}
                  </Text>
                  <View style={[styles.riskTrack, { backgroundColor: theme.surfaceElevated }]}>
                    <LinearGradient
                      colors={[colors.primary, `${colors.primary}80`]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.riskFill, { width: `${diversificationScore}%` }]}
                    />
                  </View>
                </View>
              </View>

              {/* Performance Chart */}
              {perfBarData.length > 0 && (
                <SectionCard title="Desempenho por Ativo (retorno %)" icon="bar-chart-2">
                  <View style={{ alignItems: 'center' }}>
                    <BarChart
                      data={perfBarData}
                      width={CHART_WIDTH - 20}
                      height={140}
                      barWidth={Math.max(18, (CHART_WIDTH - 60) / perfBarData.length - 8)}
                      barBorderRadius={5}
                      noOfSections={4}
                      rulesColor={theme.border}
                      yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                      xAxisColor={theme.border}
                      yAxisColor="transparent"
                      yAxisSuffix="%"
                      xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}
                      isAnimated
                      animationDuration={700}
                    />
                  </View>
                </SectionCard>
              )}

              {/* Best & Worst + FII yield */}
              {sortedPerformers.length >= 2 && (
                <View style={styles.twoCol}>
                  <View style={[styles.perfCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                    <View style={styles.perfHeader}>
                      <Feather name="award" size={14} color={colors.primary} />
                      <Text style={[styles.perfLabel, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Melhor ativo</Text>
                    </View>
                    <Text style={[styles.perfTicker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{sortedPerformers[0].ticker}</Text>
                    <Text style={[styles.perfReturn, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                      {formatPercent(((sortedPerformers[0].currentPrice - sortedPerformers[0].avgPrice) / sortedPerformers[0].avgPrice) * 100)}
                    </Text>
                    <Text style={[styles.perfName, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                      {TYPE_LABELS[sortedPerformers[0].type]}
                    </Text>
                  </View>
                  <View style={[styles.perfCard, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}25` }]}>
                    <View style={styles.perfHeader}>
                      <Feather name="trending-down" size={14} color={colors.danger} />
                      <Text style={[styles.perfLabel, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>Pior ativo</Text>
                    </View>
                    <Text style={[styles.perfTicker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{sortedPerformers[sortedPerformers.length - 1].ticker}</Text>
                    <Text style={[styles.perfReturn, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
                      {formatPercent(((sortedPerformers[sortedPerformers.length - 1].currentPrice - sortedPerformers[sortedPerformers.length - 1].avgPrice) / sortedPerformers[sortedPerformers.length - 1].avgPrice) * 100)}
                    </Text>
                    <Text style={[styles.perfName, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                      {TYPE_LABELS[sortedPerformers[sortedPerformers.length - 1].type]}
                    </Text>
                  </View>
                </View>
              )}

              {/* FII Yield estimate */}
              {estimatedMonthlyYield > 0 && (
                <View style={[styles.yieldCard, { backgroundColor: '#FF9800' + '15', borderColor: '#FF980030' }]}>
                  <Feather name="dollar-sign" size={18} color="#FF9800" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.yieldTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      Renda Passiva Estimada (FIIs)
                    </Text>
                    <Text style={[styles.yieldSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      ~0,7% a.m. sobre FIIs • {investments.filter((i) => i.type === 'fii').length} fundos
                    </Text>
                  </View>
                  <Text style={[styles.yieldValue, { color: '#FF9800', fontFamily: 'Inter_700Bold' }]}>
                    {maskValue(formatBRL(estimatedMonthlyYield))}/mês
                  </Text>
                </View>
              )}

              {/* Filters + Sort */}
              <View style={{ gap: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row' }}>
                  {types.map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => { setFilter(type); Haptics.selectionAsync(); }}
                      style={[styles.filterChip, { backgroundColor: filter === type ? colors.primary : theme.surfaceElevated, borderColor: filter === type ? colors.primary : theme.border }]}
                    >
                      <Text style={[styles.filterText, { color: filter === type ? '#000' : theme.textSecondary, fontFamily: filter === type ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                        {type === 'all' ? 'Todos' : TYPE_LABELS[type]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>Ordenar:</Text>
                  {([['value', 'Valor'], ['return', 'Retorno'], ['name', 'Ticker']] as const).map(([id, label]) => (
                    <Pressable
                      key={id}
                      onPress={() => { setSortBy(id); Haptics.selectionAsync(); }}
                      style={[styles.sortChip, { backgroundColor: sortBy === id ? `${colors.primary}15` : 'transparent', borderColor: sortBy === id ? colors.primary : theme.border }]}
                    >
                      <Text style={[styles.sortText, { color: sortBy === id ? colors.primary : theme.textTertiary, fontFamily: sortBy === id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Investment Cards */}
              <View style={{ gap: 12, paddingBottom: 16 }}>
                {filtered.map((inv) => (
                  <InvestmentCard
                    key={inv.id}
                    investment={inv}
                    onPress={() => router.push({ pathname: '/investment/[id]', params: { id: inv.id } })}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 26 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  portfolioCard: { borderRadius: 20, padding: 18, gap: 14 },
  portfolioLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 13 },
  portfolioValue: { color: '#000', fontSize: 34 },
  portfolioStats: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  portfolioMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 12 },
  portfolioMetaVal: { color: '#000', fontSize: 14, marginTop: 2 },
  dividerV: { width: 1, height: 28 },
  miniKpiRow: { flexDirection: 'row', gap: 8 },
  miniKpi: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, borderWidth: 1 },
  miniKpiVal: { fontSize: 13 },
  miniKpiLabel: { fontSize: 9, textAlign: 'center' },
  allocLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  allocItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  allocDot: { width: 8, height: 8, borderRadius: 4 },
  allocLabel: { fontSize: 12 },
  allocPct: { fontSize: 12 },
  twoCol: { flexDirection: 'row', gap: 12 },
  metricCard: { flex: 1, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1 },
  metricTitle: { fontSize: 11, marginTop: 4 },
  metricScore: { fontSize: 26 },
  metricLabel: { fontSize: 12 },
  riskTrack: { height: 5, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  riskFill: { height: 5, borderRadius: 3 },
  perfCard: { flex: 1, borderRadius: 14, padding: 14, gap: 5, borderWidth: 1 },
  perfHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  perfLabel: { fontSize: 11 },
  perfTicker: { fontSize: 22 },
  perfReturn: { fontSize: 18 },
  perfName: { fontSize: 11 },
  yieldCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1 },
  yieldTitle: { fontSize: 14 },
  yieldSub: { fontSize: 12, marginTop: 2 },
  yieldValue: { fontSize: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  sortText: { fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 20 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: '#000', fontSize: 15 },
});

const alloc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, width: 88 },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  amount: { fontSize: 12, textAlign: 'right', width: 76 },
});
