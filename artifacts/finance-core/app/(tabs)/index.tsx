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
import { HealthScore } from '@/components/HealthScore';
import { BudgetProgress } from '@/components/BudgetProgress';
import { CardSkeleton, TransactionSkeleton } from '@/components/ui/SkeletonLoader';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';

export default function DashboardScreen() {
  const { theme, colors, isDark, valuesVisible, toggleValuesVisible, maskValue } = useTheme();
  const { user } = useAuth();
  const {
    totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore,
    transactions, budgets, isLoading, accounts
  } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const recentTransactions = transactions.slice(0, 5);
  const currentMonth = getCurrentMonth();
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));

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
                Olá, {user?.name?.split(' ')[0] || 'Usuário'}
              </Text>
              <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                Visão Geral
              </Text>
            </View>
            <View style={styles.headerActions}>
              {/* Global eye toggle */}
              <Pressable
                testID="toggle-all-values"
                onPress={() => { toggleValuesVisible(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.iconBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
              >
                <Feather name={valuesVisible ? 'eye' : 'eye-off'} size={18} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => Haptics.selectionAsync()}
                style={[styles.avatarBtn, { backgroundColor: colors.primaryGlow, borderColor: `${colors.primary}40` }]}
                testID="profile-avatar"
              >
                <Feather name="user" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Balance Card */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <Text style={[styles.balanceLabel, { fontFamily: 'Inter_400Regular' }]}>Saldo Total</Text>
            </View>
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
                <Feather name="credit-card" size={14} color="rgba(0,0,0,0.7)" />
                <Text style={[styles.balanceMeta, { fontFamily: 'Inter_400Regular' }]}>
                  {accounts.length} contas
                </Text>
              </View>
            </View>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.content}>
          {/* Summary Cards */}
          {isLoading ? (
            <View style={styles.summaryRow}>
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : (
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
          )}
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

          {/* Health Score */}
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Saúde Financeira
            </Text>
            <HealthScore score={healthScore} />
          </View>

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
  avatarBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  balanceCard: { borderRadius: 20, padding: 20, gap: 8 },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  balanceValue: { color: '#000', fontSize: 36 },
  balanceFooter: { flexDirection: 'row', gap: 16, marginTop: 4 },
  balanceMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 13 },
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  section: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16 },
  seeAll: { fontSize: 14 },
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 15 },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00C853', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
