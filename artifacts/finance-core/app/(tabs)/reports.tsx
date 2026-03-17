import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Platform, Dimensions, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, formatMonthYear, getCurrentMonth, getMonthName } from '@/utils/formatters';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;

type TabId = 'overview' | 'categories' | 'cashflow' | 'health';

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={sc.header}>
        <Feather name={icon as any} size={15} color={theme.textSecondary} />
        <Text style={[sc.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 14, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15 },
});

function KpiTile({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color: string; icon: string }) {
  const { theme } = useTheme();
  return (
    <View style={[kpi.tile, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[kpi.iconBox, { backgroundColor: `${color}15` }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <Text style={[kpi.value, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      <Text style={[kpi.label, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
      {sub && <Text style={[kpi.sub, { color, fontFamily: 'Inter_500Medium' }]}>{sub}</Text>}
    </View>
  );
}
const kpi = StyleSheet.create({
  tile: { flex: 1, borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, alignItems: 'center', minWidth: 80 },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  value: { fontSize: 16, textAlign: 'center' },
  label: { fontSize: 10, textAlign: 'center' },
  sub: { fontSize: 11, textAlign: 'center' },
});

function GaugeBar({ value, max, color, label, sublabel }: { value: number; max: number; color: string; label: string; sublabel?: string }) {
  const { theme } = useTheme();
  const pct = Math.min(value / max, 1);
  return (
    <View style={gb.row}>
      <View style={{ flex: 1 }}>
        <View style={gb.labelRow}>
          <Text style={[gb.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
          <Text style={[gb.pct, { color, fontFamily: 'Inter_600SemiBold' }]}>{(pct * 100).toFixed(0)}%</Text>
        </View>
        <View style={[gb.track, { backgroundColor: theme.surfaceElevated }]}>
          <LinearGradient
            colors={[color, `${color}99`]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[gb.fill, { width: `${pct * 100}%` }]}
          />
        </View>
        {sublabel && <Text style={[gb.sublabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{sublabel}</Text>}
      </View>
    </View>
  );
}
const gb = StyleSheet.create({
  row: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 13 },
  pct: { fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  sublabel: { fontSize: 11, marginTop: 2 },
});

function HealthScore({ score, label, color }: { score: number; label: string; color: string }) {
  const { theme } = useTheme();
  const segments = 20;
  const filled = Math.round((score / 100) * segments);
  return (
    <View style={hs.container}>
      <View style={hs.gaugeRow}>
        {Array.from({ length: segments }).map((_, i) => (
          <View
            key={i}
            style={[
              hs.segment,
              {
                backgroundColor: i < filled ? color : theme.surfaceElevated,
                opacity: i < filled ? (0.4 + (i / segments) * 0.6) : 1,
              }
            ]}
          />
        ))}
      </View>
      <View style={hs.scoreRow}>
        <Text style={[hs.score, { color, fontFamily: 'Inter_700Bold' }]}>{score}</Text>
        <Text style={[hs.maxScore, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>/100</Text>
      </View>
      <Text style={[hs.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
    </View>
  );
}
const hs = StyleSheet.create({
  container: { alignItems: 'center', gap: 10 },
  gaugeRow: { flexDirection: 'row', gap: 3, flexWrap: 'wrap', justifyContent: 'center' },
  segment: { width: 10, height: 24, borderRadius: 3 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  score: { fontSize: 48 },
  maxScore: { fontSize: 20 },
  label: { fontSize: 15 },
});

export default function ReportsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { transactions, accounts, investments, creditCards, budgets } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const currentMonth = getCurrentMonth();
  const currentMonthTx = useMemo(() =>
    transactions.filter((t) => t.date.startsWith(currentMonth)), [transactions, currentMonth]
  );
  const totalIncome = currentMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = currentMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netResult = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netResult / totalIncome) * 100 : 0;

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const avgDailyExpense = totalExpense / dayOfMonth;
  const forecastExpense = avgDailyExpense * daysInMonth;

  const totalAccounts = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCredit = creditCards.reduce((s, c) => s + c.used, 0);
  const netWorth = totalAccounts + totalInvestments - totalCredit;

  const monthlyData = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthTx = transactions.filter((t) => t.date.startsWith(m));
    const inc = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { label: formatMonthYear(m), income: inc, expense: exp, net: inc - exp, month: m };
  }), [transactions]);

  const savingsRateData = monthlyData.map((d) => ({
    value: d.income > 0 ? Math.max(0, (d.net / d.income) * 100) : 0,
  }));

  const categoryData = useMemo(() => Object.keys(CATEGORIES)
    .filter((cat) => cat !== 'income')
    .map((cat) => {
      const info = getCategoryInfo(cat);
      const total = currentMonthTx.filter((t) => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { label: info.label, value: total, color: info.color, category: cat };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value), [currentMonthTx]
  );

  const topTransactions = useMemo(() =>
    [...currentMonthTx]
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5), [currentMonthTx]
  );

  const dailyExpenses = useMemo(() => {
    const days: number[] = Array(dayOfMonth).fill(0);
    currentMonthTx
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const d = parseInt(t.date.split('-')[2], 10);
        if (d >= 1 && d <= dayOfMonth) days[d - 1] += t.amount;
      });
    return days.map((v) => ({ value: v }));
  }, [currentMonthTx, dayOfMonth]);

  const cumulativeExpenses = useMemo(() => {
    let cum = 0;
    return dailyExpenses.map((d) => { cum += d.value; return { value: cum }; });
  }, [dailyExpenses]);

  const barData = useMemo(() => {
    const barW = Math.max(12, (CHART_WIDTH - 40) / (monthlyData.length * 2) - 4);
    return monthlyData.flatMap((d, i) => [
      { value: d.income, label: i === 0 || i === monthlyData.length - 1 ? d.label : '', frontColor: colors.primary, spacing: 2, barWidth: barW },
      { value: d.expense, frontColor: colors.danger, spacing: i < monthlyData.length - 1 ? barW * 1.5 : 0, barWidth: barW },
    ]);
  }, [monthlyData, colors]);

  const pieData = useMemo(() => categoryData.slice(0, 6).map((d) => ({
    value: d.value,
    color: d.color,
    text: `${((d.value / totalExpense) * 100).toFixed(0)}%`,
  })), [categoryData, totalExpense]);

  const currentBudgets = budgets.filter((b) => b.month === currentMonth);
  const budgetData = currentBudgets.map((b) => {
    const spent = currentMonthTx
      .filter((t) => t.category === b.category && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return { ...b, spent, pct: spent / b.limit };
  });

  const healthScore = useMemo(() => {
    let score = 0;
    const s = savingsRate;
    if (s >= 20) score += 30; else if (s >= 10) score += 20; else if (s >= 0) score += 10;
    const emergencyMonths = totalAccounts / (avgDailyExpense * 30 || 1);
    if (emergencyMonths >= 6) score += 25; else if (emergencyMonths >= 3) score += 15; else if (emergencyMonths >= 1) score += 5;
    const investRatio = totalIncome > 0 ? (totalInvestments / (totalIncome * 12)) * 100 : 0;
    if (investRatio >= 100) score += 25; else if (investRatio >= 50) score += 18; else if (investRatio >= 20) score += 10; else if (investRatio > 0) score += 5;
    const debtRatio = totalIncome > 0 ? (totalCredit / totalIncome) * 100 : 0;
    if (debtRatio <= 10) score += 20; else if (debtRatio <= 30) score += 14; else if (debtRatio <= 50) score += 7;
    return Math.min(100, Math.round(score));
  }, [savingsRate, totalAccounts, avgDailyExpense, totalIncome, totalInvestments, totalCredit]);

  const healthLabel = healthScore >= 80 ? 'Excelente' : healthScore >= 60 ? 'Bom' : healthScore >= 40 ? 'Regular' : 'Atenção';
  const healthColor = healthScore >= 80 ? colors.primary : healthScore >= 60 ? '#4CAF50' : healthScore >= 40 ? colors.warning : colors.danger;

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Visão Geral', icon: 'layout' },
    { id: 'cashflow', label: 'Fluxo', icon: 'bar-chart-2' },
    { id: 'categories', label: 'Categorias', icon: 'pie-chart' },
    { id: 'health', label: 'Saúde', icon: 'activity' },
  ];

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Relatórios</Text>
          <Text style={[styles.period, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {getMonthName(currentMonth)} • Análise financeira
          </Text>

          {/* Net Worth Card */}
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.nwCard}>
            <Text style={[styles.nwLabel, { fontFamily: 'Inter_400Regular' }]}>Patrimônio Líquido</Text>
            <Text style={[styles.nwValue, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(netWorth))}</Text>
            <View style={styles.nwRow}>
              {[
                { icon: 'briefcase', label: 'Contas', val: totalAccounts, sign: 1 },
                { icon: 'trending-up', label: 'Investimentos', val: totalInvestments, sign: 1 },
                { icon: 'credit-card', label: 'Dívidas', val: totalCredit, sign: -1 },
              ].map((item) => (
                <View key={item.label} style={styles.nwItem}>
                  <Feather name={item.icon as any} size={11} color="rgba(0,0,0,0.6)" />
                  <Text style={[styles.nwMeta, { fontFamily: 'Inter_400Regular' }]}>
                    {item.label}: {maskValue(formatBRL(item.val, true))}
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, { borderBottomColor: activeTab === tab.id ? colors.primary : 'transparent', borderBottomWidth: 2 }]}
            >
              <Feather name={tab.icon as any} size={14} color={activeTab === tab.id ? colors.primary : theme.textTertiary} />
              <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : theme.textTertiary, fontFamily: activeTab === tab.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.content}>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {/* KPI Row */}
              <View style={styles.kpiRow}>
                <KpiTile
                  label="Receitas" value={maskValue(formatBRL(totalIncome, true))}
                  color={colors.primary} icon="arrow-down-circle"
                />
                <KpiTile
                  label="Despesas" value={maskValue(formatBRL(totalExpense, true))}
                  color={colors.danger} icon="arrow-up-circle"
                />
                <KpiTile
                  label="Resultado" value={maskValue(formatBRL(Math.abs(netResult), true))}
                  sub={netResult >= 0 ? '+ Sobra' : '- Déficit'}
                  color={netResult >= 0 ? colors.primary : colors.danger}
                  icon={netResult >= 0 ? 'trending-up' : 'trending-down'}
                />
              </View>

              {/* DRE + KPIs */}
              <SectionCard title="Demonstrativo do Mês" icon="file-text">
                {[
                  { label: '(+) Receitas', val: totalIncome, color: colors.primary },
                  { label: '(-) Despesas', val: totalExpense, color: colors.danger },
                ].map((r) => (
                  <View key={r.label} style={dre.row}>
                    <Text style={[dre.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{r.label}</Text>
                    <Text style={[dre.value, { color: r.color, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(r.val))}</Text>
                  </View>
                ))}
                <View style={[dre.divider, { backgroundColor: theme.border }]} />
                <View style={dre.row}>
                  <Text style={[dre.label, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>(=) Resultado</Text>
                  <Text style={[dre.value, { color: netResult >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                    {maskValue(formatBRL(netResult))}
                  </Text>
                </View>

                <View style={[dre.kpis, { backgroundColor: theme.surfaceElevated }]}>
                  {[
                    { label: 'Média/dia', val: maskValue(formatBRL(avgDailyExpense, true)), color: colors.danger },
                    { label: 'Taxa poupança', val: `${savingsRate.toFixed(1)}%`, color: savingsRate >= 20 ? colors.primary : colors.warning },
                    { label: 'Transações', val: `${currentMonthTx.length}`, color: theme.text },
                    { label: 'Previsão mês', val: maskValue(formatBRL(forecastExpense, true)), color: forecastExpense > totalIncome ? colors.danger : colors.primary },
                  ].map((k, i, arr) => (
                    <React.Fragment key={k.label}>
                      <View style={dre.kpiItem}>
                        <Text style={[dre.kpiLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{k.label}</Text>
                        <Text style={[dre.kpiVal, { color: k.color, fontFamily: 'Inter_600SemiBold' }]}>{k.val}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={[dre.kpiDiv, { backgroundColor: theme.border }]} />}
                    </React.Fragment>
                  ))}
                </View>

                {totalIncome > 0 && (
                  <View style={[dre.insight, { backgroundColor: `${savingsRate >= 20 ? colors.primary : colors.warning}15` }]}>
                    <Feather name={savingsRate >= 20 ? 'check-circle' : 'alert-circle'} size={14} color={savingsRate >= 20 ? colors.primary : colors.warning} />
                    <Text style={[dre.insightText, { color: savingsRate >= 20 ? colors.primary : colors.warning, fontFamily: 'Inter_500Medium' }]}>
                      {savingsRate >= 20
                        ? `Poupança de ${savingsRate.toFixed(1)}% — acima da meta de 20%`
                        : `Poupança de ${savingsRate.toFixed(1)}% — aumente para 20%`}
                    </Text>
                  </View>
                )}
              </SectionCard>

              {/* Savings Rate Trend */}
              {savingsRateData.some((d) => d.value > 0) && (
                <SectionCard title="Taxa de Poupança — 6 meses" icon="trending-up">
                  <LineChart
                    data={savingsRateData}
                    width={CHART_WIDTH - 20}
                    height={100}
                    color={colors.primary}
                    thickness={2.5}
                    curved
                    hideDataPoints={false}
                    dataPointsColor={colors.primary}
                    dataPointsRadius={4}
                    startFillColor={colors.primary}
                    endFillColor={`${colors.primary}00`}
                    startOpacity={0.25}
                    endOpacity={0}
                    areaChart
                    noOfSections={4}
                    rulesColor={theme.border}
                    yAxisTextStyle={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_400Regular' }}
                    yAxisSuffix="%"
                    hideYAxisText={false}
                    xAxisColor={theme.border}
                    initialSpacing={10}
                    spacing={(CHART_WIDTH - 50) / Math.max(savingsRateData.length - 1, 1)}
                  />
                  <View style={styles.miniLegend}>
                    {monthlyData.map((d, i) => (
                      <Text key={i} style={[styles.miniLegendLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {d.label}
                      </Text>
                    ))}
                  </View>
                </SectionCard>
              )}

              {/* Top 5 Expenses */}
              {topTransactions.length > 0 && (
                <SectionCard title="Maiores Despesas do Mês" icon="arrow-up-circle">
                  {topTransactions.map((t, i) => {
                    const info = getCategoryInfo(t.category);
                    return (
                      <View key={t.id} style={top.row}>
                        <View style={[top.rankBadge, { backgroundColor: `${info.color}15` }]}>
                          <Text style={[top.rank, { color: info.color, fontFamily: 'Inter_700Bold' }]}>#{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[top.desc, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                            {t.description}
                          </Text>
                          <Text style={[top.cat, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{info.label}</Text>
                        </View>
                        <Text style={[top.amount, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                          {maskValue(formatBRL(t.amount))}
                        </Text>
                      </View>
                    );
                  })}
                </SectionCard>
              )}

              {/* Monthly History Table */}
              <SectionCard title="Histórico Mensal" icon="calendar">
                <View style={tbl.header}>
                  {['Mês', 'Receitas', 'Despesas', 'Saldo'].map((h, i) => (
                    <Text key={h} style={[tbl.th, { color: theme.textTertiary, flex: i === 0 ? 1.5 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>{h}</Text>
                  ))}
                </View>
                {[...monthlyData].reverse().map((d, idx) => {
                  const net = d.income - d.expense;
                  return (
                    <View key={idx} style={[tbl.row, idx % 2 === 0 && { backgroundColor: theme.surfaceElevated }]}>
                      <Text style={[tbl.td, { color: theme.text, flex: 1.5, textAlign: 'left', fontFamily: 'Inter_500Medium' }]}>{d.label}</Text>
                      <Text style={[tbl.td, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>{maskValue(formatBRL(d.income, true))}</Text>
                      <Text style={[tbl.td, { color: colors.danger, fontFamily: 'Inter_400Regular' }]}>{maskValue(formatBRL(d.expense, true))}</Text>
                      <Text style={[tbl.td, { color: net >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_500Medium' }]}>{maskValue(formatBRL(net, true))}</Text>
                    </View>
                  );
                })}
              </SectionCard>
            </>
          )}

          {/* ── CASH FLOW TAB ── */}
          {activeTab === 'cashflow' && (
            <>
              <SectionCard title="Receitas vs Despesas — 6 meses" icon="bar-chart-2">
                <View style={{ alignItems: 'center' }}>
                  <BarChart
                    data={barData}
                    width={CHART_WIDTH - 20}
                    height={160}
                    barBorderRadius={4}
                    noOfSections={4}
                    rulesColor={theme.border}
                    yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                    xAxisColor={theme.border}
                    yAxisColor="transparent"
                    hideRules={false}
                    maxValue={Math.max(...monthlyData.flatMap((d) => [d.income, d.expense]), 100) * 1.1}
                    xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                    isAnimated
                    animationDuration={600}
                  />
                </View>
                <View style={styles.legend}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Receitas</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.danger }]} /><Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Despesas</Text></View>
                </View>
              </SectionCard>

              <SectionCard title="Gastos Diários Acumulados" icon="trending-up">
                {cumulativeExpenses.length > 1 ? (
                  <>
                    <LineChart
                      data={cumulativeExpenses}
                      width={CHART_WIDTH - 20}
                      height={120}
                      color={colors.danger}
                      thickness={2}
                      curved
                      hideDataPoints
                      startFillColor={colors.danger}
                      endFillColor={`${colors.danger}00`}
                      startOpacity={0.2}
                      endOpacity={0}
                      areaChart
                      noOfSections={4}
                      rulesColor={theme.border}
                      yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                      xAxisColor={theme.border}
                      initialSpacing={8}
                      spacing={Math.max(6, (CHART_WIDTH - 60) / Math.max(cumulativeExpenses.length, 1))}
                    />
                    <View style={dre.row}>
                      <Text style={[dre.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        Dia {dayOfMonth} • Acumulado
                      </Text>
                      <Text style={[dre.value, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                        {maskValue(formatBRL(totalExpense))}
                      </Text>
                    </View>
                    <View style={dre.row}>
                      <Text style={[dre.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        Projeção para o mês
                      </Text>
                      <Text style={[dre.value, { color: forecastExpense > totalIncome ? colors.danger : theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {maskValue(formatBRL(forecastExpense))}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={[styles.empty, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    Sem dados suficientes neste mês
                  </Text>
                )}
              </SectionCard>

              {budgetData.length > 0 && (
                <SectionCard title="Orçamentos vs Gastos" icon="target">
                  {budgetData.map((b) => {
                    const info = getCategoryInfo(b.category);
                    const pctColor = b.pct >= 1 ? colors.danger : b.pct >= 0.8 ? colors.warning : colors.primary;
                    return (
                      <GaugeBar
                        key={b.id}
                        label={info.label}
                        value={b.spent}
                        max={b.limit}
                        color={pctColor}
                        sublabel={`${maskValue(formatBRL(b.spent))} de ${maskValue(formatBRL(b.limit))}`}
                      />
                    );
                  })}
                </SectionCard>
              )}
            </>
          )}

          {/* ── CATEGORIES TAB ── */}
          {activeTab === 'categories' && (
            <>
              {pieData.length > 0 ? (
                <SectionCard title="Despesas por Categoria" icon="pie-chart">
                  <View style={{ alignItems: 'center' }}>
                    <PieChart
                      data={pieData}
                      donut
                      radius={90}
                      innerRadius={55}
                      innerCircleColor={theme.surface}
                      centerLabelComponent={() => (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={[{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }]}>
                            {maskValue(formatBRL(totalExpense, true))}
                          </Text>
                          <Text style={[{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_400Regular' }]}>
                            total
                          </Text>
                        </View>
                      )}
                      showText
                      textColor={theme.surface}
                      textSize={11}
                      font="Inter_600SemiBold"
                      isAnimated
                      animationDuration={800}
                    />
                  </View>
                  <View style={{ gap: 8 }}>
                    {categoryData.map((item, idx) => (
                      <View key={idx} style={catRow.row}>
                        <View style={[catRow.dot, { backgroundColor: item.color }]} />
                        <Text style={[catRow.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        <View style={[catRow.barBg, { backgroundColor: theme.surfaceElevated }]}>
                          <View style={[catRow.barFill, { backgroundColor: item.color, width: `${(item.value / totalExpense) * 100}%` }]} />
                        </View>
                        <Text style={[catRow.pct, { color: item.color, fontFamily: 'Inter_600SemiBold' }]}>
                          {((item.value / totalExpense) * 100).toFixed(0)}%
                        </Text>
                        <Text style={[catRow.amount, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                          {maskValue(formatBRL(item.value, true))}
                        </Text>
                      </View>
                    ))}
                  </View>
                </SectionCard>
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="pie-chart" size={48} color={theme.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                    Sem despesas este mês
                  </Text>
                </View>
              )}

              {/* Category bar chart */}
              {categoryData.length > 0 && (
                <SectionCard title="Ranking por Valor" icon="bar-chart">
                  <View style={{ alignItems: 'center' }}>
                    <BarChart
                      data={categoryData.slice(0, 7).map((d) => ({
                        value: d.value,
                        frontColor: d.color,
                        label: d.label.substring(0, 6),
                      }))}
                      width={CHART_WIDTH - 20}
                      height={140}
                      barWidth={Math.max(16, (CHART_WIDTH - 60) / Math.min(categoryData.length, 7) - 8)}
                      barBorderRadius={4}
                      noOfSections={4}
                      rulesColor={theme.border}
                      yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                      xAxisColor={theme.border}
                      yAxisColor="transparent"
                      xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                      isAnimated
                      animationDuration={600}
                    />
                  </View>
                </SectionCard>
              )}
            </>
          )}

          {/* ── HEALTH TAB ── */}
          {activeTab === 'health' && (
            <>
              <SectionCard title="Score de Saúde Financeira" icon="activity">
                <HealthScore score={healthScore} label={healthLabel} color={healthColor} />
                <View style={[dre.insight, { backgroundColor: `${healthColor}15` }]}>
                  <Feather name="info" size={14} color={healthColor} />
                  <Text style={[dre.insightText, { color: healthColor, fontFamily: 'Inter_500Medium' }]}>
                    {healthScore >= 80
                      ? 'Finanças excelentes! Continue investindo e mantendo a poupança.'
                      : healthScore >= 60
                        ? 'Boa situação. Foque em aumentar reservas e investimentos.'
                        : healthScore >= 40
                          ? 'Atenção: revise gastos e aumente a taxa de poupança.'
                          : 'Situação crítica. Priorize redução de dívidas e controle de gastos.'
                    }
                  </Text>
                </View>
              </SectionCard>

              <SectionCard title="Indicadores" icon="sliders">
                <GaugeBar
                  label="Taxa de poupança"
                  value={Math.max(0, savingsRate)}
                  max={30}
                  color={savingsRate >= 20 ? colors.primary : savingsRate >= 10 ? colors.warning : colors.danger}
                  sublabel={`${savingsRate.toFixed(1)}% — Meta: 20%`}
                />
                <GaugeBar
                  label="Reserva de emergência"
                  value={Math.min(totalAccounts / (avgDailyExpense * 30 || 1), 6)}
                  max={6}
                  color={totalAccounts / (avgDailyExpense * 30 || 1) >= 6 ? colors.primary : colors.warning}
                  sublabel={`${(totalAccounts / (avgDailyExpense * 30 || 1)).toFixed(1)} meses — Meta: 6 meses`}
                />
                <GaugeBar
                  label="Alocação em investimentos"
                  value={totalInvestments}
                  max={Math.max(totalInvestments, totalAccounts + totalInvestments) || 1}
                  color={colors.primary}
                  sublabel={`${totalInvestments > 0 ? ((totalInvestments / (totalAccounts + totalInvestments)) * 100).toFixed(0) : 0}% do patrimônio em investimentos`}
                />
                <GaugeBar
                  label="Comprometimento de crédito"
                  value={totalCredit}
                  max={Math.max(totalIncome, 1)}
                  color={totalCredit / (totalIncome || 1) > 0.5 ? colors.danger : totalCredit / (totalIncome || 1) > 0.3 ? colors.warning : colors.primary}
                  sublabel={`${totalIncome > 0 ? ((totalCredit / totalIncome) * 100).toFixed(0) : 0}% da renda — Limite: 30%`}
                />
              </SectionCard>

              <SectionCard title="Projeções" icon="trending-up">
                {[
                  {
                    label: 'Riqueza em 12 meses (mesmo ritmo)',
                    val: netWorth + netResult * 12,
                    icon: 'calendar',
                    color: netResult >= 0 ? colors.primary : colors.danger,
                  },
                  {
                    label: 'Riqueza em 5 anos (poupança + juros 10% a.a.)',
                    val: netWorth * Math.pow(1.1, 5) + (Math.max(0, netResult) * 12) * ((Math.pow(1.1, 5) - 1) / 0.1),
                    icon: 'star',
                    color: colors.primary,
                  },
                  {
                    label: 'Custo de vida mensal',
                    val: avgDailyExpense * 30,
                    icon: 'shopping-bag',
                    color: colors.danger,
                  },
                ].map((p) => (
                  <View key={p.label} style={proj.row}>
                    <View style={[proj.icon, { backgroundColor: `${p.color}15` }]}>
                      <Feather name={p.icon as any} size={14} color={p.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[proj.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{p.label}</Text>
                      <Text style={[proj.val, { color: p.color, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(p.val))}</Text>
                    </View>
                  </View>
                ))}
              </SectionCard>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  screenTitle: { fontSize: 26 },
  period: { fontSize: 14 },
  nwCard: { borderRadius: 20, padding: 18, gap: 8 },
  nwLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 13 },
  nwValue: { color: '#000', fontSize: 30 },
  nwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  nwItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nwMeta: { color: 'rgba(0,0,0,0.65)', fontSize: 11 },
  tabBar: { borderBottomWidth: 1 },
  tabBarContent: { flexDirection: 'row', paddingHorizontal: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12 },
  tabText: { fontSize: 13 },
  content: { padding: 16, gap: 16 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  miniLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  miniLegendLabel: { fontSize: 9 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16 },
  empty: { textAlign: 'center', paddingVertical: 20, fontSize: 14 },
});

const dre = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14 },
  value: { fontSize: 14 },
  divider: { height: 1, marginVertical: 2 },
  kpis: { flexDirection: 'row', borderRadius: 12, padding: 12 },
  kpiItem: { flex: 1, alignItems: 'center', gap: 3 },
  kpiDiv: { width: 1 },
  kpiLabel: { fontSize: 10 },
  kpiVal: { fontSize: 14 },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 18 },
});

const tbl = StyleSheet.create({
  header: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 8 },
  th: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  row: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 6 },
  td: { fontSize: 12, flex: 1, textAlign: 'right' },
});

const top = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rankBadge: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rank: { fontSize: 12 },
  desc: { fontSize: 14 },
  cat: { fontSize: 11, marginTop: 1 },
  amount: { fontSize: 14 },
});

const catRow = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, width: 80 },
  barBg: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, width: 28, textAlign: 'right' },
  amount: { fontSize: 12, width: 72, textAlign: 'right' },
});

const proj = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, marginBottom: 2 },
  val: { fontSize: 17 },
});
