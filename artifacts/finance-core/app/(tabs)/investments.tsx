import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Pressable, Platform, Dimensions, Modal, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Investment } from '@/context/FinanceContext';
import { formatBRL, formatPercent } from '@/utils/formatters';
import { FeatureGate } from '@/components/FeatureGate';
import { listPortfolios, type Portfolio } from '@/services/portfolios';
import { AnaliseTab } from '@/components/investments/AnaliseTab';
import { DividendosTab } from '@/components/investments/DividendosTab';
import { CriptoTab } from '@/components/investments/CriptoTab';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const SELECTED_PORTFOLIO_KEY = '@finance_core/selected_portfolio_id';

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Ações BR', fii: 'FIIs', reit: 'REITs', fixed: 'Renda Fixa', crypto: 'Cripto', etf: 'ETFs',
};
const TYPE_COLORS: Record<string, string> = {
  stocks: '#2196F3', fii: '#9C27B0', reit: '#FF9800', fixed: '#4CAF50', crypto: '#FF6B35', etf: '#00BCD4',
};
const FALLBACK_TYPE_COLOR = '#7C7C8A';
function typeColor(t: string): string { return TYPE_COLORS[t] || FALLBACK_TYPE_COLOR; }
function typeLabel(t: string): string {
  return TYPE_LABELS[t] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Outros');
}
const TYPE_RISK: Record<string, number> = {
  fixed: 1, fii: 3, reit: 3, etf: 4, stocks: 7, crypto: 10,
};

type TabId = 'carteira' | 'analise' | 'dividendos' | 'cripto';
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'carteira',   label: 'Carteira',   icon: 'pie-chart' },
  { id: 'analise',    label: 'Análise',    icon: 'activity' },
  { id: 'dividendos', label: 'Dividendos', icon: 'calendar' },
  { id: 'cripto',     label: 'Cripto',     icon: 'hexagon' },
];

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
  const tColor = typeColor(investment.type) || colors.primary;
  const isGain = profit >= 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={[inv.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[inv.accentBar, { backgroundColor: isGain ? colors.primary : colors.danger }]} />
        <View style={inv.inner}>
          <View style={inv.top}>
            <View>
              <View style={inv.tickerRow}>
                <Text style={[inv.ticker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{investment.ticker}</Text>
                <View style={[inv.typeTag, { backgroundColor: `${tColor}15` }]}>
                  <Text style={[inv.typeText, { color: tColor, fontFamily: 'Inter_600SemiBold' }]}>{typeLabel(investment.type)}</Text>
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

interface CarteiraProps {
  investments: Investment[];
}

function CarteiraTabContent({ investments }: CarteiraProps) {
  const { theme, colors, maskValue } = useTheme();
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'name'>('value');

  const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);

  const byType = useMemo(() => Object.entries(
    investments.reduce((acc, i) => {
      const v = i.quantity * i.currentPrice;
      acc[i.type] = (acc[i.type] || 0) + v;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]), [investments]);

  const pieData = useMemo(() => byType.map(([type, value]) => ({
    value,
    color: typeColor(type) || '#999',
    text: totalCurrent > 0 ? `${((value / totalCurrent) * 100).toFixed(0)}%` : '',
  })), [byType, totalCurrent]);

  const riskScore = useMemo(() => {
    if (totalCurrent === 0) return 0;
    return Math.round(byType.reduce((s, [type, val]) => s + (TYPE_RISK[type] || 5) * (val / totalCurrent), 0));
  }, [byType, totalCurrent]);
  const riskLabel = riskScore <= 2 ? 'Conservador' : riskScore <= 4 ? 'Moderado Conservador' : riskScore <= 6 ? 'Moderado' : riskScore <= 8 ? 'Arrojado' : 'Agressivo';
  const riskColor = riskScore <= 2 ? '#4CAF50' : riskScore <= 4 ? colors.primary : riskScore <= 6 ? colors.warning : riskScore <= 8 ? '#FF6B35' : colors.danger;
  const diversificationScore = Math.min(100, byType.length * 20);

  const sortedPerformers = useMemo(() => [...investments].sort((a, b) => {
    const retA = a.avgPrice > 0 ? (a.currentPrice - a.avgPrice) / a.avgPrice : 0;
    const retB = b.avgPrice > 0 ? (b.currentPrice - b.avgPrice) / b.avgPrice : 0;
    return retB - retA;
  }), [investments]);

  const filtered = useMemo(() => {
    let list = filter === 'all' ? investments : investments.filter((i) => i.type === filter);
    if (sortBy === 'value') list = [...list].sort((a, b) => (b.quantity * b.currentPrice) - (a.quantity * a.currentPrice));
    else if (sortBy === 'return') list = [...list].sort((a, b) => {
      const ra = a.avgPrice > 0 ? (a.currentPrice - a.avgPrice) / a.avgPrice : 0;
      const rb = b.avgPrice > 0 ? (b.currentPrice - b.avgPrice) / b.avgPrice : 0;
      return rb - ra;
    });
    else list = [...list].sort((a, b) => a.ticker.localeCompare(b.ticker));
    return list;
  }, [investments, filter, sortBy]);

  const perfBarData = useMemo(() =>
    sortedPerformers.slice(0, 6).map((it) => {
      const ret = it.avgPrice > 0 ? ((it.currentPrice - it.avgPrice) / it.avgPrice) * 100 : 0;
      return {
        value: Math.abs(ret),
        label: it.ticker,
        frontColor: ret >= 0 ? colors.primary : colors.danger,
      };
    }), [sortedPerformers, colors]
  );

  const estimatedMonthlyYield = useMemo(() =>
    investments
      .filter((i) => i.type === 'fii')
      .reduce((s, i) => s + i.quantity * i.currentPrice * 0.007, 0),
    [investments]
  );

  const types = ['all', ...Object.keys(TYPE_LABELS).filter((t) => investments.some((i) => i.type === t))];

  if (investments.length === 0) {
    return (
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
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {/* Allocation Donut */}
      <SectionCard title="Alocação por classe" icon="pie-chart">
        <View style={{ alignItems: 'center' }}>
          <PieChart
            data={pieData}
            donut
            radius={88}
            innerRadius={54}
            innerCircleColor={theme.surface}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Inter_700Bold' }}>
                  {maskValue(formatBRL(totalCurrent, true))}
                </Text>
                <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_400Regular' }}>total</Text>
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
              <View style={[styles.allocDot, { backgroundColor: typeColor(type) }]} />
              <Text style={[styles.allocLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{typeLabel(type)}</Text>
              <Text style={[styles.allocPct, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                {totalCurrent > 0 ? ((value / totalCurrent) * 100).toFixed(1) : '0'}%
              </Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 6 }}>
          {byType.map(([type, value]) => (
            <View key={type} style={alloc.row}>
              <Text style={[alloc.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{typeLabel(type)}</Text>
              <View style={[alloc.track, { backgroundColor: theme.surfaceElevated }]}>
                <LinearGradient
                  colors={[typeColor(type), `${typeColor(type)}80`]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[alloc.fill, { width: `${totalCurrent > 0 ? (value / totalCurrent) * 100 : 0}%` }]}
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
        <View style={[styles.metricCard, { backgroundColor: theme.surface, borderColor: `${riskColor}30` }]}>
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

      {perfBarData.length > 0 && (
        <SectionCard title="Desempenho por ativo (retorno %)" icon="bar-chart-2">
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
              xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}
              isAnimated
              animationDuration={700}
            />
          </View>
        </SectionCard>
      )}

      {sortedPerformers.length >= 2 && (
        <View style={styles.twoCol}>
          <View style={[styles.perfCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <View style={styles.perfHeader}>
              <Feather name="award" size={14} color={colors.primary} />
              <Text style={[styles.perfLabel, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Melhor ativo</Text>
            </View>
            <Text style={[styles.perfTicker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{sortedPerformers[0].ticker}</Text>
            <Text style={[styles.perfReturn, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {formatPercent(sortedPerformers[0].avgPrice > 0 ? ((sortedPerformers[0].currentPrice - sortedPerformers[0].avgPrice) / sortedPerformers[0].avgPrice) * 100 : 0)}
            </Text>
            <Text style={[styles.perfName, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
              {typeLabel(sortedPerformers[0].type)}
            </Text>
          </View>
          <View style={[styles.perfCard, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}25` }]}>
            <View style={styles.perfHeader}>
              <Feather name="trending-down" size={14} color={colors.danger} />
              <Text style={[styles.perfLabel, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>Pior ativo</Text>
            </View>
            <Text style={[styles.perfTicker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{sortedPerformers[sortedPerformers.length - 1].ticker}</Text>
            <Text style={[styles.perfReturn, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
              {formatPercent(sortedPerformers[sortedPerformers.length - 1].avgPrice > 0
                ? ((sortedPerformers[sortedPerformers.length - 1].currentPrice - sortedPerformers[sortedPerformers.length - 1].avgPrice) / sortedPerformers[sortedPerformers.length - 1].avgPrice) * 100
                : 0)}
            </Text>
            <Text style={[styles.perfName, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
              {typeLabel(sortedPerformers[sortedPerformers.length - 1].type)}
            </Text>
          </View>
        </View>
      )}

      {estimatedMonthlyYield > 0 && (
        <View style={[styles.yieldCard, { backgroundColor: '#FF9800' + '15', borderColor: '#FF980030' }]}>
          <Feather name="dollar-sign" size={18} color="#FF9800" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.yieldTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Renda passiva estimada (FIIs)
            </Text>
            <Text style={[styles.yieldSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              ~0,7% a.m. sobre FIIs · {investments.filter((i) => i.type === 'fii').length} fundos
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
              testID={`filter-${type}`}
            >
              <Text style={[styles.filterText, { color: filter === type ? '#000' : theme.textSecondary, fontFamily: filter === type ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {type === 'all' ? 'Todos' : typeLabel(type)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>Ordenar:</Text>
          {([['value', 'Valor'], ['return', 'Retorno'], ['name', 'Ticker']] as const).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => { setSortBy(id); Haptics.selectionAsync(); }}
              style={[styles.sortChip, { backgroundColor: sortBy === id ? `${colors.primary}15` : 'transparent', borderColor: sortBy === id ? colors.primary : theme.border }]}
              testID={`sort-${id}`}
            >
              <Text style={[styles.sortText, { color: sortBy === id ? colors.primary : theme.textTertiary, fontFamily: sortBy === id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 12, paddingBottom: 16 }}>
        {filtered.map((it) => (
          <InvestmentCard
            key={it.id}
            investment={it}
            onPress={() => router.push({ pathname: '/investment/[id]', params: { id: it.id } })}
          />
        ))}
      </View>
    </View>
  );
}

export default function InvestmentsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { investments } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('carteira');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | undefined>(undefined);
  const [showPortfolios, setShowPortfolios] = useState(false);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [list, savedId] = await Promise.all([
          listPortfolios(),
          AsyncStorage.getItem(SELECTED_PORTFOLIO_KEY),
        ]);
        if (!active) return;
        setPortfolios(list);
        const validId = savedId && list.some((p) => p.id === savedId)
          ? savedId
          : (list.find((p) => p.isDefault)?.id || list[0]?.id);
        setSelectedPortfolioId(validId || undefined);
      } finally {
        if (active) setLoadingPortfolios(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handlePortfolioSelect = useCallback(async (id: string | undefined) => {
    setSelectedPortfolioId(id);
    setShowPortfolios(false);
    Haptics.selectionAsync();
    try {
      if (id) await AsyncStorage.setItem(SELECTED_PORTFOLIO_KEY, id);
      else await AsyncStorage.removeItem(SELECTED_PORTFOLIO_KEY);
    } catch { /* ignora */ }
  }, []);

  const selectedPortfolio = portfolios.find((p) => p.id === selectedPortfolioId);
  const portfolioLabel = selectedPortfolio?.name || 'Todos os portfólios';

  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.avgPrice, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalProfit = totalCurrent - totalInvested;
  const pctReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  return (
    <FeatureGate
      feature="investments"
      title="Investimentos profissionais"
      icon="trending-up"
      description="Acompanhe carteira, rentabilidade e diversificação com gráficos avançados, DARF automático e análise de risco. Disponível no plano PREMIUM ou superior."
    >
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Investimentos</Text>
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setShowPortfolios(true); }}
                  style={[styles.portfolioPicker, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
                  testID="portfolio-selector"
                >
                  {loadingPortfolios ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Feather name="briefcase" size={12} color={colors.primary} />
                      <Text style={[styles.portfolioName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                        {portfolioLabel}
                      </Text>
                      <Feather name="chevron-down" size={14} color={theme.textTertiary} />
                    </>
                  )}
                </Pressable>
              </View>
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

            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
              {TABS.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => { setActiveTab(t.id); Haptics.selectionAsync(); }}
                  style={[styles.tabChip, {
                    backgroundColor: activeTab === t.id ? colors.primary : theme.surfaceElevated,
                    borderColor: activeTab === t.id ? colors.primary : theme.border,
                  }]}
                  testID={`tab-${t.id}`}
                >
                  <Feather name={t.icon as any} size={13} color={activeTab === t.id ? '#000' : theme.textSecondary} />
                  <Text style={[styles.tabText, {
                    color: activeTab === t.id ? '#000' : theme.textSecondary,
                    fontFamily: activeTab === t.id ? 'Inter_700Bold' : 'Inter_500Medium',
                  }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </LinearGradient>

          {/* Tab content */}
          <View style={{ padding: 16 }}>
            {activeTab === 'carteira'   && <CarteiraTabContent investments={investments} />}
            {activeTab === 'analise'    && <AnaliseTab portfolioId={selectedPortfolioId} />}
            {activeTab === 'dividendos' && <DividendosTab portfolioId={selectedPortfolioId} />}
            {activeTab === 'cripto'     && <CriptoTab portfolioId={selectedPortfolioId} />}
          </View>
        </ScrollView>

        {/* Portfolio picker modal */}
        <Modal visible={showPortfolios} transparent animationType="slide" onRequestClose={() => setShowPortfolios(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Portfólios</Text>
                <Pressable onPress={() => setShowPortfolios(false)} hitSlop={10} testID="close-portfolio-picker">
                  <Feather name="x" size={22} color={theme.textTertiary} />
                </Pressable>
              </View>

              <Pressable
                onPress={() => handlePortfolioSelect(undefined)}
                style={[styles.portfolioRow, {
                  borderColor: selectedPortfolioId == null ? colors.primary : theme.border,
                  backgroundColor: selectedPortfolioId == null ? `${colors.primary}10` : theme.surfaceElevated,
                }]}
                testID="select-portfolio-all"
              >
                <Feather name="grid" size={18} color={colors.primary} />
                <Text style={{ color: theme.text, flex: 1, fontFamily: 'Inter_600SemiBold' }}>Todos os portfólios</Text>
                {selectedPortfolioId == null && <Feather name="check" size={18} color={colors.primary} />}
              </Pressable>

              {portfolios.map((p) => {
                const isSel = p.id === selectedPortfolioId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => handlePortfolioSelect(p.id)}
                    style={[styles.portfolioRow, {
                      borderColor: isSel ? colors.primary : theme.border,
                      backgroundColor: isSel ? `${colors.primary}10` : theme.surfaceElevated,
                    }]}
                    testID={`select-portfolio-${p.id}`}
                  >
                    <Feather name="briefcase" size={18} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold' }}>
                        {p.name}{p.isDefault ? ' · padrão' : ''}
                      </Text>
                      {p.description ? (
                        <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 1, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                          {p.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSel && <Feather name="check" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => { setShowPortfolios(false); router.push('/(more)/portfolios'); }}
                style={[styles.manageBtn, { borderColor: theme.border }]}
                testID="manage-portfolios"
              >
                <Feather name="settings" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Gerenciar portfólios</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  screenTitle: { fontSize: 26 },
  portfolioPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginTop: 6, alignSelf: 'flex-start', maxWidth: 240 },
  portfolioName: { fontSize: 12 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  portfolioCard: { borderRadius: 20, padding: 18, gap: 14 },
  portfolioLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 13 },
  portfolioValue: { color: '#000', fontSize: 34 },
  portfolioStats: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  portfolioMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 12 },
  portfolioMetaVal: { color: '#000', fontSize: 14, marginTop: 2 },
  dividerV: { width: 1, height: 28 },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 13 },
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
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28, gap: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  portfolioRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 8, borderStyle: 'dashed' },
});

const alloc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 12, width: 88 },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  amount: { fontSize: 12, textAlign: 'right', width: 76 },
});
