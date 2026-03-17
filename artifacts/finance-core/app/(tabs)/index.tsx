import React, { useState } from 'react';
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
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionItem } from '@/components/TransactionItem';
import { BudgetProgress } from '@/components/BudgetProgress';
import { CardSkeleton, TransactionSkeleton } from '@/components/ui/SkeletonLoader';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';

function WeeklyChart() {
  const { theme, colors } = useTheme();
  const { transactions } = useFinance();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
    const expense = transactions
      .filter((t) => t.date === dateStr && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return { dayName, expense, isToday: i === 6 };
  });

  const maxExpense = Math.max(...days.map((d) => d.expense), 1);

  return (
    <View style={wStyles.container}>
      <View style={wStyles.bars}>
        {days.map((day, idx) => {
          const barPct = day.expense > 0 ? (day.expense / maxExpense) : 0.03;
          return (
            <View key={idx} style={wStyles.barCol}>
              <View style={[wStyles.barBg, { backgroundColor: theme.surfaceElevated }]}>
                <View
                  style={[
                    wStyles.barFill,
                    {
                      backgroundColor: day.isToday ? colors.primary : `${colors.primary}60`,
                      height: `${barPct * 100}%`,
                    }
                  ]}
                />
              </View>
              <Text style={[wStyles.dayLabel, { color: day.isToday ? colors.primary : theme.textTertiary, fontFamily: day.isToday ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {day.dayName}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const wStyles = StyleSheet.create({
  container: { height: 80, paddingTop: 4 },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barBg: { flex: 1, width: '70%', borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 3 },
  dayLabel: { fontSize: 9 },
});

function QuickActions() {
  const { colors } = useTheme();
  const actions = [
    { icon: 'plus-circle' as const, label: 'Transação', color: colors.primary, route: '/transaction/add' },
    { icon: 'trending-up' as const, label: 'Investimento', color: colors.info, route: '/investment/add' },
    { icon: 'target' as const, label: 'Metas', color: '#9C27B0', route: '/(more)/goals' },
    { icon: 'cpu' as const, label: 'IA Financeira', color: colors.accent, route: '/chat' },
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

export default function DashboardScreen() {
  const { theme, colors, isDark, valuesVisible, toggleValuesVisible, maskValue } = useTheme();
  const { user } = useAuth();
  const {
    totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore,
    transactions, budgets, isLoading, accounts, investments, creditCards
  } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const recentTransactions = transactions.slice(0, 5);
  const currentMonth = getCurrentMonth();
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));

  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCreditUsed = creditCards.reduce((s, c) => s + c.used, 0);
  const netWorth = totalBalance + totalInvestments - totalCreditUsed;

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

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

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getBudgetSpent = (category: string) =>
    monthlyTx.filter((t) => t.category === category && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

  const topBudgets = budgets.filter((b) => b.month === currentMonth).slice(0, 3);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

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
            <View>
              <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Olá, {user?.name?.split(' ')[0] || 'Usuário'} 👋
              </Text>
              <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                Visão Geral
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                testID="toggle-all-values"
                onPress={() => { toggleValuesVisible(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.iconBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
              >
                <Feather name={valuesVisible ? 'eye' : 'eye-off'} size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                style={[styles.avatarBtn, { backgroundColor: colors.primary }]}
                testID="profile-avatar"
                onPress={() => router.push('/(more)/settings')}
              >
                <Text style={[styles.avatarInitial, { fontFamily: 'Inter_700Bold' }]}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Balance Card */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.balanceCard}
          >
            <Text style={[styles.balanceLabel, { fontFamily: 'Inter_400Regular' }]}>Saldo Total</Text>
            <Text style={[styles.balanceValue, { fontFamily: 'Inter_700Bold' }]}>
              {maskValue(formatBRL(totalBalance))}
            </Text>
            <View style={styles.balanceFooter}>
              <View style={styles.balanceMetric}>
                <Feather name="arrow-up-circle" size={14} color="rgba(0,0,0,0.7)" />
                <Text style={[styles.balanceMeta, { fontFamily: 'Inter_400Regular' }]}>
                  {maskValue(formatBRL(monthlyIncome, true))}
                </Text>
              </View>
              <View style={styles.balanceMetric}>
                <Feather name="arrow-down-circle" size={14} color="rgba(0,0,0,0.7)" />
                <Text style={[styles.balanceMeta, { fontFamily: 'Inter_400Regular' }]}>
                  {maskValue(formatBRL(monthlyExpenses, true))}
                </Text>
              </View>
              <View style={styles.balanceMetric}>
                <Feather name="activity" size={14} color="rgba(0,0,0,0.7)" />
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

          {/* Net Worth + Summary row */}
          {isLoading ? (
            <View style={styles.summaryRow}><CardSkeleton /><CardSkeleton /></View>
          ) : (
            <>
              {/* Net Worth Card */}
              <View style={[styles.netWorthCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.netWorthHeader}>
                  <View>
                    <Text style={[styles.netWorthLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      Patrimônio Líquido
                    </Text>
                    <Text style={[styles.netWorthValue, { color: netWorth >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                      {maskValue(formatBRL(netWorth))}
                    </Text>
                  </View>
                  <View style={styles.netWorthBreakdown}>
                    <View style={styles.nwRow}>
                      <Text style={[styles.nwLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Contas</Text>
                      <Text style={[styles.nwVal, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                        {maskValue(formatBRL(totalBalance, true))}
                      </Text>
                    </View>
                    <View style={styles.nwRow}>
                      <Text style={[styles.nwLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Investimentos</Text>
                      <Text style={[styles.nwVal, { color: colors.info, fontFamily: 'Inter_500Medium' }]}>
                        {maskValue(formatBRL(totalInvestments, true))}
                      </Text>
                    </View>
                    <View style={styles.nwRow}>
                      <Text style={[styles.nwLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Crédito usado</Text>
                      <Text style={[styles.nwVal, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                        -{maskValue(formatBRL(totalCreditUsed, true))}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Summary Cards */}
              <View style={styles.summaryRow}>
                <SummaryCard
                  label="Receitas"
                  value={formatBRL(monthlyIncome, true)}
                  icon="arrow-up"
                  color={colors.primary}
                  trend={5.2}
                  testID="income-card"
                />
                <SummaryCard
                  label="Despesas"
                  value={formatBRL(monthlyExpenses, true)}
                  icon="arrow-down"
                  color={colors.danger}
                  trend={-3.1}
                  testID="expenses-card"
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryCard
                  label="Resultado"
                  value={formatBRL(netResult, true)}
                  icon="activity"
                  color={netResult >= 0 ? colors.primary : colors.danger}
                  testID="net-card"
                />
                <SummaryCard
                  label="Saúde"
                  value={`${healthScore}/1000`}
                  icon="shield"
                  color={colors.accent}
                  testID="health-card"
                />
              </View>
            </>
          )}

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

          {/* Insights */}
          {(topExpenseCategory || savingsRate > 0) && (
            <View style={[styles.insightsCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.insightsTitle, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                💡 Insights do Mês
              </Text>
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
                  <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                    Ver tudo
                  </Text>
                </Pressable>
              </View>
              {topBudgets.map((b) => (
                <BudgetProgress
                  key={b.id}
                  category={b.category}
                  limit={b.limit}
                  spent={getBudgetSpent(b.category)}
                  compact
                />
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
                <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                  Ver todas
                </Text>
              </Pressable>
            </View>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <TransactionSkeleton key={i} />)
            ) : recentTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="inbox" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Nenhuma transação ainda
                </Text>
              </View>
            ) : (
              recentTransactions.map((t) => (
                <TransactionItem
                  key={t.id}
                  transaction={t}
                  onPress={(tx) => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
                  testID={`transaction-${t.id}`}
                />
              ))
            )}
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
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 80,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          }
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
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#000', fontSize: 20 },
  balanceCard: { borderRadius: 20, padding: 20, gap: 8 },
  balanceLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  balanceValue: { color: '#000', fontSize: 36 },
  balanceFooter: { flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' },
  balanceMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 13 },
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  netWorthCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  netWorthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  netWorthLabel: { fontSize: 13, marginBottom: 4 },
  netWorthValue: { fontSize: 28 },
  netWorthBreakdown: { gap: 4, alignItems: 'flex-end' },
  nwRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nwLbl: { fontSize: 12 },
  nwVal: { fontSize: 13 },
  section: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16 },
  seeAll: { fontSize: 14 },
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
    shadowColor: '#00C853', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
