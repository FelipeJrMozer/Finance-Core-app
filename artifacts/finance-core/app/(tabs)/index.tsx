import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { useWallet } from '@/context/WalletContext';
import { WalletSelectorModal } from '@/components/WalletSelectorModal';
import { WalletIcon } from '@/components/WalletIcon';
import { HeaderActions } from '@/components/HeaderActions';
import { InsightsCards } from '@/components/InsightsCards';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionItem } from '@/components/TransactionItem';
import { BudgetProgress } from '@/components/BudgetProgress';
import { TransactionSkeleton, CardSkeleton } from '@/components/ui/SkeletonLoader';
import { OfflineBanner } from '@/components/OfflineBanner';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';
import { fetchDashboardSummary, invalidateDashboardCache, type DashboardSummary } from '@/services/dashboard';
import { fetchUpcomingBills, type UpcomingBill } from '@/services/upcomingBills';

// ── Weekly sparkline ──────────────────────────────────────
function WeeklyChart() {
  const { theme, colors } = useTheme();
  const { transactions } = useFinance();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
    const expense = transactions
      .filter((t) => {
        const effectiveDate = t.transactionDate ?? t.date;
        return effectiveDate === dateStr && t.type === 'expense';
      })
      .reduce((s, t) => s + t.amount, 0);
    return { dayName, expense, isToday: i === 6 };
  });

  const maxExpense = Math.max(...days.map((d) => d.expense), 1);
  const total7Days = days.reduce((s, d) => s + d.expense, 0);

  return (
    <View style={wStyles.wrap}>
      <View style={wStyles.container}>
        {days.map((day, idx) => {
          const barPct = day.expense > 0 ? (day.expense / maxExpense) : 0.03;
          return (
            <View key={idx} style={wStyles.barCol}>
              {day.expense > 0 && (
                <Text style={[wStyles.barAmt, { color: day.isToday ? colors.primary : theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {formatBRL(day.expense, true)}
                </Text>
              )}
              <View style={[wStyles.barBg, { backgroundColor: theme.surfaceElevated }]}>
                <View
                  style={[wStyles.barFill, {
                    backgroundColor: day.isToday ? colors.primary : `${colors.primary}55`,
                    height: `${barPct * 100}%`,
                  }]}
                />
              </View>
              <Text style={[wStyles.dayLabel, {
                color: day.isToday ? colors.primary : theme.textTertiary,
                fontFamily: day.isToday ? 'Inter_600SemiBold' : 'Inter_400Regular'
              }]}>
                {day.dayName}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={wStyles.footer}>
        <Text style={[wStyles.footerLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Total 7 dias</Text>
        <Text style={[wStyles.footerVal, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{formatBRL(total7Days)}</Text>
      </View>
    </View>
  );
}

const wStyles = StyleSheet.create({
  wrap: { gap: 8 },
  container: { height: 90, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 3 },
  barAmt: { fontSize: 7 },
  barBg: { flex: 1, width: '75%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  dayLabel: { fontSize: 9 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 12 },
  footerVal: { fontSize: 14 },
});

// ── Health Score Gauge ──────────────────────────────────────
function HealthGauge({ score }: { score: number }) {
  const { theme, colors } = useTheme();
  const pct = Math.min(score / 100, 1);
  const getColor = () => {
    if (pct >= 0.7) return colors.primary;
    if (pct >= 0.4) return colors.warning;
    return colors.danger;
  };
  const getLabel = () => {
    if (pct >= 0.8) return 'Excelente';
    if (pct >= 0.6) return 'Boa';
    if (pct >= 0.4) return 'Regular';
    return 'Atenção';
  };

  const segments = 20;
  const filled = Math.round(pct * segments);
  const color = getColor();

  return (
    <View style={hgStyles.container}>
      <View style={hgStyles.segments}>
        {Array.from({ length: segments }, (_, i) => (
          <View
            key={i}
            style={[
              hgStyles.segment,
              {
                backgroundColor: i < filled ? color : theme.surfaceElevated,
                opacity: i < filled ? 1 : 0.4,
              }
            ]}
          />
        ))}
      </View>
      <View style={hgStyles.scoreRow}>
        <View>
          <Text style={[hgStyles.scoreNum, { color, fontFamily: 'Inter_700Bold' }]}>{score}</Text>
          <Text style={[hgStyles.scoreMax, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>/100</Text>
        </View>
        <View style={[hgStyles.labelPill, { backgroundColor: `${color}20` }]}>
          <Feather name="award" size={13} color={color} />
          <Text style={[hgStyles.labelText, { color, fontFamily: 'Inter_600SemiBold' }]}>{getLabel()}</Text>
        </View>
      </View>
    </View>
  );
}

const hgStyles = StyleSheet.create({
  container: { gap: 10 },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  scoreNum: { fontSize: 32 },
  scoreMax: { fontSize: 13 },
  labelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  labelText: { fontSize: 14 },
});

// ── Upcoming Bills (server-driven) ──────────────────────────────────────
function UpcomingBillsWidget({ items, loading }: { items: UpcomingBill[]; loading: boolean }) {
  const { theme, colors, maskValue } = useTheme();

  if (loading && items.length === 0) {
    return (
      <View style={[ubStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="upcoming-bills-loading">
        <View style={ubStyles.header}>
          <Feather name="clock" size={16} color={colors.warning} />
          <Text style={[ubStyles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Próximos Vencimentos
          </Text>
        </View>
        <Text style={[ubStyles.billDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Carregando…
        </Text>
      </View>
    );
  }

  const upcoming = items.slice(0, 5);
  if (upcoming.length === 0) return null;

  const sourceIcon = (s: UpcomingBill['source']): keyof typeof Feather.glyphMap => {
    if (s === 'invoice') return 'credit-card';
    if (s === 'recurring') return 'repeat';
    return 'file-text';
  };

  const sourceColor = (s: UpcomingBill['source']): string => {
    if (s === 'invoice') return colors.info;
    if (s === 'recurring') return colors.warning;
    return colors.primary;
  };

  const navigateForSource = (b: UpcomingBill) => {
    Haptics.selectionAsync();
    if (b.source === 'invoice' && b.cardId) {
      router.push({ pathname: '/card/[id]', params: { id: b.cardId } });
    } else if (b.source === 'recurring') {
      router.push('/(more)/recurring');
    } else {
      router.push('/(more)/bills');
    }
  };

  return (
    <View style={[ubStyles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="upcoming-bills">
      <View style={ubStyles.header}>
        <Feather name="clock" size={16} color={colors.warning} />
        <Text style={[ubStyles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Próximos Vencimentos
        </Text>
      </View>
      {upcoming.map((bill) => {
        const days = bill.daysUntil;
        const urgent = days <= 3;
        const overdue = days < 0;
        const color = sourceColor(bill.source);
        return (
          <Pressable
            key={`${bill.source}-${bill.id}`}
            testID={`upcoming-bill-${bill.id}`}
            onPress={() => navigateForSource(bill)}
            style={[ubStyles.bill, { borderColor: theme.border }]}
          >
            <View style={[ubStyles.billIcon, { backgroundColor: `${color}20` }]}>
              <Feather name={sourceIcon(bill.source)} size={14} color={color} />
            </View>
            <View style={ubStyles.billInfo}>
              <Text style={[ubStyles.billLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                {bill.description || bill.cardName || 'Vencimento'}
              </Text>
              <Text style={[ubStyles.billDate, {
                color: overdue || urgent ? colors.danger : theme.textTertiary,
                fontFamily: 'Inter_400Regular',
              }]}>
                {overdue
                  ? `Vencido há ${Math.abs(days)} dia${Math.abs(days) !== 1 ? 's' : ''}`
                  : days === 0 ? 'Vence hoje!' : `Vence em ${days} dia${days !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <Text style={[ubStyles.billAmount, {
              color: overdue || urgent ? colors.danger : theme.text,
              fontFamily: 'Inter_600SemiBold',
            }]}>
              {maskValue(formatBRL(bill.amount, true))}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const ubStyles = StyleSheet.create({
  card: { borderRadius: 16, padding: 14, gap: 10, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15 },
  bill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1 },
  billIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  billInfo: { flex: 1 },
  billLabel: { fontSize: 14 },
  billDate: { fontSize: 12, marginTop: 1 },
  billAmount: { fontSize: 14 },
});

// ── Quick Actions ──────────────────────────────────────
function QuickActions() {
  const { colors } = useTheme();
  const actions = [
    { icon: 'plus-circle' as const, label: 'Transação', color: colors.primary, route: '/transaction/add' },
    { icon: 'maximize' as const, label: 'Escanear', color: '#22C55E', route: '/scan' },
    { icon: 'repeat' as const, label: 'Transferir', color: '#26C6DA', route: '/transfer' },
    { icon: 'trending-up' as const, label: 'Investir', color: colors.info, route: '/investment/add' },
    { icon: 'cpu' as const, label: 'IA', color: '#A855F7', route: '/chat' },
  ];

  return (
    <View style={qaStyles.grid}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          onPress={() => { Haptics.selectionAsync(); router.push(action.route as any); }}
          style={({ pressed }) => [qaStyles.btn, { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
        >
          <View style={[qaStyles.iconCircle, { backgroundColor: `${action.color}20` }]}>
            <Feather name={action.icon} size={22} color={action.color} />
          </View>
          <Text style={[qaStyles.label, { color: action.color, fontFamily: 'Inter_500Medium' }]}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const qaStyles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, alignItems: 'center', gap: 6 },
  iconCircle: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, textAlign: 'center' },
});

// ── Main Screen ──────────────────────────────────────
export default function DashboardScreen() {
  const { theme, colors, isDark, valuesVisible, toggleValuesVisible, maskValue } = useTheme();
  const { user } = useAuth();
  const {
    totalBalance, monthlyIncome, monthlyExpenses, prevMonthIncome, prevMonthExpenses,
    netResult, healthScore,
    transactions, budgets, isLoading, accounts, investments, creditCards
  } = useFinance();
  const { selectedWallet, selectedWalletId } = useWallet();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [upcomingItems, setUpcomingItems] = useState<UpcomingBill[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);

  const loadServerData = useCallback(async (fresh = false) => {
    try {
      const [summary, upcoming] = await Promise.allSettled([
        fetchDashboardSummary(fresh),
        fetchUpcomingBills(30),
      ]);
      if (summary.status === 'fulfilled') setDashboardSummary(summary.value);
      if (upcoming.status === 'fulfilled') setUpcomingItems(upcoming.value);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    setLoadingUpcoming(true);
    loadServerData(false);
  }, [loadServerData, selectedWalletId]);

  const recentTransactions = transactions.slice(0, 5);
  const currentMonth = getCurrentMonth();
  const monthlyTx = transactions.filter((t) => (t.transactionDate ?? t.date).startsWith(currentMonth));

  // Server-driven KPIs (preferred when dashboard summary is available);
  // fall back to local calculations for offline/legacy support.
  const incomeForCards = dashboardSummary?.monthlyIncome ?? monthlyIncome;
  const expensesForCards = dashboardSummary?.monthlyExpenses ?? monthlyExpenses;
  const prevIncomeForCards = dashboardSummary?.prevMonthIncome ?? prevMonthIncome;
  const prevExpensesForCards = dashboardSummary?.prevMonthExpenses ?? prevMonthExpenses;
  const netResultForCards = incomeForCards - expensesForCards;
  const totalInvestmentsForCards = dashboardSummary?.totalInvestments
    ?? investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCreditUsedForCards = dashboardSummary?.totalCardDebt
    ?? creditCards.reduce((s, c) => s + c.used, 0);
  const balanceForCards = dashboardSummary?.cashBalance ?? totalBalance;
  const netWorthForCards = dashboardSummary?.netWorth
    ?? (balanceForCards + totalInvestmentsForCards - totalCreditUsedForCards);
  const healthScoreForCards = dashboardSummary?.healthScore ?? healthScore;

  // Legacy locals retained for sections that still depend on transactions[]
  const totalInvestments = totalInvestmentsForCards;
  const totalCreditUsed = totalCreditUsedForCards;
  const netWorth = netWorthForCards;

  const savingsRate = incomeForCards > 0 ? ((incomeForCards - expensesForCards) / incomeForCards) * 100 : 0;

  const incomeTrend = prevIncomeForCards > 0 ? ((incomeForCards - prevIncomeForCards) / prevIncomeForCards) * 100 : undefined;
  const expensesTrend = prevExpensesForCards > 0 ? ((expensesForCards - prevExpensesForCards) / prevExpensesForCards) * 100 : undefined;

  const topExpenseCategory = (() => {
    const cats: Record<string, number> = {};
    monthlyTx.filter((t) => t.type === 'expense').forEach((t) => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { name: sorted[0][0], amount: sorted[0][1] } : null;
  })();

  const CAT_LABELS: Record<string, string> = {
    food: 'Alimentação', transport: 'Transporte', housing: 'Moradia',
    health: 'Saúde', entertainment: 'Lazer', education: 'Educação',
    clothing: 'Compras', investment: 'Investimento', other: 'Outros'
  };

  const topBudgets = budgets.filter((b) => b.month === currentMonth).slice(0, 3);
  const getBudgetSpent = (b: { category: string; categoryId?: string }) =>
    monthlyTx
      .filter((t) => {
        if (t.type !== 'expense') return false;
        if (b.categoryId && t.categoryId) return t.categoryId === b.categoryId;
        return (t.category || '').toLowerCase() === (b.category || '').toLowerCase();
      })
      .reduce((s, t) => s + t.amount, 0);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await invalidateDashboardCache();
      await loadServerData(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <OfflineBanner />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Wallet Selector Modal */}
        <WalletSelectorModal
          visible={walletModalVisible}
          onClose={() => setWalletModalVisible(false)}
        />

        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#0A0A0F', '#091520'] : ['#EBF8FF', '#F5F7FA']}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.headerTop}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Olá, {user?.name?.split(' ')[0] || 'Usuário'} 👋
              </Text>
              <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                Visão Geral
              </Text>
              {selectedWallet && (
                <Pressable
                  onPress={() => { Haptics.selectionAsync(); setWalletModalVisible(true); }}
                  style={styles.walletBadge}
                >
                  <View style={[styles.walletDot, { backgroundColor: selectedWallet.color || colors.primary }]} />
                  <Text style={[styles.walletBadgeText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                    {selectedWallet.name}
                  </Text>
                  <Feather name="chevron-down" size={11} color={theme.textTertiary} />
                </Pressable>
              )}
            </View>
            <HeaderActions />
          </View>

          {/* Balance Card */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.balanceCard}
          >
            <Text style={[styles.balanceLabel, { fontFamily: 'Inter_400Regular' }]}>Saldo Total</Text>
            <Text style={[styles.balanceValue, { fontFamily: 'Inter_700Bold' }]} testID="balance-total">
              {maskValue(formatBRL(balanceForCards))}
            </Text>
            <View style={styles.balanceFooter}>
              <View style={styles.balanceMetric}>
                <Feather name="arrow-up-circle" size={13} color="rgba(0,0,0,0.7)" />
                <Text style={[styles.balanceMeta, { fontFamily: 'Inter_400Regular' }]} testID="balance-income">
                  {maskValue(formatBRL(incomeForCards, true))}
                </Text>
              </View>
              <View style={styles.balanceMetric}>
                <Feather name="arrow-down-circle" size={13} color="rgba(0,0,0,0.7)" />
                <Text style={[styles.balanceMeta, { fontFamily: 'Inter_400Regular' }]} testID="balance-expenses">
                  {maskValue(formatBRL(expensesForCards, true))}
                </Text>
              </View>
              <View style={styles.balanceMetric}>
                <Feather name="activity" size={13} color="rgba(0,0,0,0.7)" />
                <Text style={[styles.balanceMeta, { fontFamily: 'Inter_400Regular' }]}>
                  {savingsRate.toFixed(0)}% poupado
                </Text>
              </View>
            </View>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.content}>
          {/* Quick Actions */}
          <QuickActions />

          {/* Net Worth + Summary */}
          {isLoading ? (
            <View style={styles.summaryRow}><CardSkeleton /><CardSkeleton /></View>
          ) : (
            <>
              {/* Net Worth */}
              <View style={[styles.netWorthCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.netWorthHeader}>
                  <Text style={[styles.netWorthLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    Patrimônio Líquido
                  </Text>
                  <Text
                    style={[styles.netWorthValue, { color: netWorthForCards >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    testID="networth-value"
                  >
                    {maskValue(formatBRL(netWorthForCards))}
                  </Text>
                  <View style={styles.netWorthBreakdown}>
                    <View style={styles.nwRow}>
                      <View style={[styles.nwDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.nwLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Contas</Text>
                      <Text style={[styles.nwVal, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                        {maskValue(formatBRL(balanceForCards, true))}
                      </Text>
                    </View>
                    <View style={styles.nwRow}>
                      <View style={[styles.nwDot, { backgroundColor: colors.info }]} />
                      <Text style={[styles.nwLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Invest.</Text>
                      <Text style={[styles.nwVal, { color: colors.info, fontFamily: 'Inter_500Medium' }]}>
                        {maskValue(formatBRL(totalInvestmentsForCards, true))}
                      </Text>
                    </View>
                    <View style={styles.nwRow}>
                      <View style={[styles.nwDot, { backgroundColor: colors.danger }]} />
                      <Text style={[styles.nwLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Crédito</Text>
                      <Text style={[styles.nwVal, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                        -{maskValue(formatBRL(totalCreditUsedForCards, true))}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Summary Cards (server-driven when summary available) */}
              <View style={styles.summaryRow}>
                <SummaryCard label="Receitas" value={formatBRL(incomeForCards, true)} icon="arrow-up" color={colors.primary} trend={incomeTrend} testID="income-card" />
                <SummaryCard label="Despesas" value={formatBRL(expensesForCards, true)} icon="arrow-down" color={colors.danger} trend={expensesTrend} testID="expenses-card" />
              </View>
              <View style={styles.summaryRow}>
                <SummaryCard label="Resultado" value={formatBRL(netResultForCards, true)} icon="activity" color={netResultForCards >= 0 ? colors.primary : colors.danger} testID="net-card" />
                <SummaryCard label="Invest." value={formatBRL(totalInvestmentsForCards, true)} icon="trending-up" color={colors.info} testID="invest-card" />
              </View>
            </>
          )}

          {/* Financial Health Gauge */}
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Saúde Financeira
              </Text>
              <Pressable onPress={() => router.push('/(more)/health-score')} hitSlop={8}>
                <Text style={[styles.seeAllText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                  Ver análise →
                </Text>
              </Pressable>
            </View>
            <HealthGauge score={healthScoreForCards} />
            <View style={styles.healthFactors}>
              {[
                { label: 'Taxa de poupança', ok: savingsRate >= 20, val: `${savingsRate.toFixed(0)}%` },
                { label: 'Metas ativas', ok: true, val: 'Sim' },
                { label: 'Orçamentos', ok: true, val: 'Sim' },
                { label: 'Investimentos', ok: totalInvestments > 0, val: totalInvestments > 0 ? 'Sim' : 'Não' },
              ].map((f, idx) => (
                <View key={idx} style={styles.healthFactor}>
                  <Feather
                    name={f.ok ? 'check-circle' : 'alert-circle'}
                    size={13}
                    color={f.ok ? colors.primary : colors.warning}
                  />
                  <Text style={[styles.factorLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {f.label}
                  </Text>
                  <Text style={[styles.factorVal, { color: f.ok ? colors.primary : colors.warning, fontFamily: 'Inter_500Medium' }]}>
                    {f.val}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 7-Day Spending Chart */}
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Gastos — Últimos 7 dias
              </Text>
              <Feather name="bar-chart-2" size={16} color={theme.textTertiary} />
            </View>
            <WeeklyChart />
          </View>

          {/* Upcoming Bills (server-driven, /api/upcoming-bills?days=30) */}
          <UpcomingBillsWidget items={upcomingItems} loading={loadingUpcoming} />

          {/* Insights inteligentes (anomalies/recap/emergency-fund) */}
          <InsightsCards />

          {/* Insights */}
          {(topExpenseCategory || savingsRate > 0) && (
            <View style={[styles.insightsCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.insightsTitle, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  💡 Insights do Mês
                </Text>
              </View>
              <View style={styles.insightsList}>
                {savingsRate >= 20 && (
                  <View style={styles.insightRow}>
                    <Feather name="trending-up" size={14} color={colors.primary} />
                    <Text style={[styles.insightText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
                      Você poupou <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>{savingsRate.toFixed(0)}%</Text> da sua renda este mês. Excelente!
                    </Text>
                  </View>
                )}
                {savingsRate > 0 && savingsRate < 20 && (
                  <View style={styles.insightRow}>
                    <Feather name="alert-circle" size={14} color={colors.warning} />
                    <Text style={[styles.insightText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
                      Taxa de poupança de <Text style={{ color: colors.warning, fontFamily: 'Inter_600SemiBold' }}>{savingsRate.toFixed(0)}%</Text>. A meta recomendada é 20%.
                    </Text>
                  </View>
                )}
                {topExpenseCategory && (
                  <View style={styles.insightRow}>
                    <Feather name="pie-chart" size={14} color={colors.accent} />
                    <Text style={[styles.insightText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
                      Maior gasto: <Text style={{ color: colors.accent, fontFamily: 'Inter_600SemiBold' }}>
                        {CAT_LABELS[topExpenseCategory.name] || topExpenseCategory.name}
                      </Text> com {maskValue(formatBRL(topExpenseCategory.amount, true))}
                    </Text>
                  </View>
                )}
                {totalInvestments > 0 && (
                  <View style={styles.insightRow}>
                    <Feather name="activity" size={14} color={colors.info} />
                    <Text style={[styles.insightText, { color: theme.text, fontFamily: 'Inter_400Regular' }]}>
                      Carteira de investimentos: <Text style={{ color: colors.info, fontFamily: 'Inter_600SemiBold' }}>{maskValue(formatBRL(totalInvestments, true))}</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Budget Progress */}
          {topBudgets.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Orçamento do Mês
                </Text>
                <Pressable onPress={() => router.push('/(tabs)/more')} testID="see-budgets">
                  <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Ver tudo</Text>
                </Pressable>
              </View>
              {topBudgets.map((b) => (
                <BudgetProgress key={b.id} category={b.category} limit={b.limit} spent={getBudgetSpent(b)} compact />
              ))}
            </View>
          )}

          {/* Recent Transactions */}
          <View>
            <View style={[styles.sectionHeader, { paddingHorizontal: 0 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Últimas Transações
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/transactions')} testID="see-all-transactions">
                <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Ver todas</Text>
              </Pressable>
            </View>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <TransactionSkeleton key={i} />)
              : recentTransactions.length === 0
                ? (
                  <View style={styles.emptyState}>
                    <Feather name="inbox" size={40} color={theme.textTertiary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      Nenhuma transação ainda
                    </Text>
                  </View>
                )
                : recentTransactions.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    onPress={(tx) => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
                    testID={`transaction-${t.id}`}
                  />
                ))
            }
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        testID="add-transaction-fab"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/transaction/add');
        }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 80, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }
        ]}
      >
        <Feather name="plus" size={24} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { fontSize: 14 },
  headerTitle: { fontSize: 26 },
  walletBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 2 },
  walletDot: { width: 7, height: 7, borderRadius: 4 },
  walletBadgeText: { fontSize: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#000', fontSize: 20 },
  balanceCard: { borderRadius: 20, padding: 20, gap: 8 },
  balanceLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  balanceValue: { color: '#000', fontSize: 36 },
  balanceFooter: { flexDirection: 'row', gap: 14, marginTop: 4, flexWrap: 'wrap' },
  balanceMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 12 },
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  netWorthCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  netWorthHeader: { gap: 8 },
  netWorthLabel: { fontSize: 13, marginBottom: 4 },
  netWorthValue: { fontSize: 28 },
  netWorthBreakdown: { gap: 6 },
  nwRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  nwDot: { width: 6, height: 6, borderRadius: 3 },
  nwLbl: { fontSize: 12, flex: 1 },
  nwVal: { fontSize: 13 },
  section: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16 },
  seeAll: { fontSize: 14 },
  seeAllText: { fontSize: 13 },
  healthFactors: { gap: 8 },
  healthFactor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  factorLabel: { flex: 1, fontSize: 13 },
  factorVal: { fontSize: 13 },
  insightsCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  insightsTitle: { fontSize: 15 },
  insightsList: { gap: 10 },
  insightRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightText: { flex: 1, fontSize: 13, lineHeight: 19 },
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 15 },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
});
