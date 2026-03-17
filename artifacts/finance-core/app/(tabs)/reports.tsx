import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Platform, Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, formatMonthYear, getCurrentMonth, getMonthName } from '@/utils/formatters';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';

const { width } = Dimensions.get('window');

function SimpleBarChart({ data }: { data: { label: string; income: number; expense: number }[] }) {
  const { theme, colors } = useTheme();
  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const barWidth = (width - 80) / data.length / 2 - 4;

  return (
    <View style={styles.chart}>
      <View style={styles.barsContainer}>
        {data.map((item, idx) => (
          <View key={idx} style={styles.barGroup}>
            <View style={styles.barPair}>
              <View style={[styles.barWrapper, { height: 120 }]}>
                <View
                  style={[styles.bar, {
                    backgroundColor: colors.primary,
                    height: `${(item.income / maxVal) * 100}%`,
                    width: barWidth, borderRadius: 4,
                  }]}
                />
              </View>
              <View style={[styles.barWrapper, { height: 120 }]}>
                <View
                  style={[styles.bar, {
                    backgroundColor: colors.danger,
                    height: `${(item.expense / maxVal) * 100}%`,
                    width: barWidth, borderRadius: 4,
                  }]}
                />
              </View>
            </View>
            <Text style={[styles.barLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Receitas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Despesas</Text>
        </View>
      </View>
    </View>
  );
}

function CategoryBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { theme, maskValue } = useTheme();
  const pct = total > 0 ? value / total : 0;
  return (
    <View style={cbStyles.row}>
      <Text style={[cbStyles.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={cbStyles.barArea}>
        <View style={[cbStyles.barBg, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[cbStyles.barFill, { backgroundColor: color, width: `${pct * 100}%` }]} />
        </View>
        <Text style={[cbStyles.pct, { color: color, fontFamily: 'Inter_600SemiBold' }]}>
          {(pct * 100).toFixed(0)}%
        </Text>
      </View>
      <Text style={[cbStyles.amount, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
        {maskValue(formatBRL(value))}
      </Text>
    </View>
  );
}

const cbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 13, width: 90 },
  barArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 11, width: 32, textAlign: 'right' },
  amount: { fontSize: 12, width: 80, textAlign: 'right' },
});

export default function ReportsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { transactions, accounts, investments, creditCards } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthTx = transactions.filter((t) => t.date.startsWith(m));
    return {
      label: formatMonthYear(m),
      income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      month: m,
    };
  });

  const currentMonth = getCurrentMonth();
  const currentMonthTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const totalIncome = currentMonthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = currentMonthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const avgDailyExpense = totalExpense / new Date().getDate();

  const totalAccounts = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCredit = creditCards.reduce((s, c) => s + c.used, 0);
  const netWorth = totalAccounts + totalInvestments - totalCredit;

  const categoryData = Object.keys(CATEGORIES)
    .filter((cat) => cat !== 'income')
    .map((cat) => {
      const info = getCategoryInfo(cat);
      const total = currentMonthTx.filter((t) => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { label: info.label, value: total, color: info.color };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1A14'] : ['#F0FFF4', '#F5F7FA']}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Relatórios
        </Text>
        <Text style={[styles.period, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          {getMonthName(currentMonth)} • Resumo do mês
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Net Worth Card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.netWorthCard}
        >
          <Text style={[styles.nwLabel, { fontFamily: 'Inter_400Regular' }]}>Patrimônio Líquido</Text>
          <Text style={[styles.nwValue, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(netWorth))}</Text>
          <View style={styles.nwRow}>
            <View style={styles.nwItem}>
              <Feather name="briefcase" size={13} color="rgba(0,0,0,0.7)" />
              <Text style={[styles.nwMeta, { fontFamily: 'Inter_400Regular' }]}>
                Contas: {maskValue(formatBRL(totalAccounts, true))}
              </Text>
            </View>
            <View style={styles.nwItem}>
              <Feather name="trending-up" size={13} color="rgba(0,0,0,0.7)" />
              <Text style={[styles.nwMeta, { fontFamily: 'Inter_400Regular' }]}>
                Invest.: {maskValue(formatBRL(totalInvestments, true))}
              </Text>
            </View>
            <View style={styles.nwItem}>
              <Feather name="credit-card" size={13} color="rgba(0,0,0,0.7)" />
              <Text style={[styles.nwMeta, { fontFamily: 'Inter_400Regular' }]}>
                Crédito: -{maskValue(formatBRL(totalCredit, true))}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* DRE Card */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            DRE — Demonstrativo do Mês
          </Text>
          <View style={styles.dreRow}>
            <Text style={[styles.dreLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              (+) Receitas
            </Text>
            <Text style={[styles.dreValue, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              {maskValue(formatBRL(totalIncome))}
            </Text>
          </View>
          <View style={styles.dreRow}>
            <Text style={[styles.dreLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              (-) Despesas
            </Text>
            <Text style={[styles.dreValue, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
              {maskValue(formatBRL(totalExpense))}
            </Text>
          </View>
          <View style={[styles.dreDivider, { backgroundColor: theme.border }]} />
          <View style={styles.dreRow}>
            <Text style={[styles.dreLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              (=) Resultado
            </Text>
            <Text style={[
              styles.dreValue,
              { color: totalIncome - totalExpense >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }
            ]}>
              {maskValue(formatBRL(totalIncome - totalExpense))}
            </Text>
          </View>

          {/* KPIs row */}
          <View style={[styles.kpiRow, { backgroundColor: theme.surfaceElevated, borderRadius: 12 }]}>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Média diária
              </Text>
              <Text style={[styles.kpiValue, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                {maskValue(formatBRL(avgDailyExpense, true))}
              </Text>
            </View>
            {totalIncome > 0 && (
              <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
            )}
            {totalIncome > 0 && (
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  Taxa poupança
                </Text>
                <Text style={[styles.kpiValue, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  {(((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
            <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Transações
              </Text>
              <Text style={[styles.kpiValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                {currentMonthTx.length}
              </Text>
            </View>
          </View>

          {totalIncome > 0 && (
            <View style={[styles.savingsRate, { backgroundColor: colors.primaryGlow }]}>
              <Feather name="trending-up" size={14} color={colors.primary} />
              <Text style={[styles.savingsText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                {((totalIncome - totalExpense) / totalIncome * 100) >= 20
                  ? `Parabéns! Você está poupando ${(((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)}% da renda — acima da meta de 20%`
                  : `Poupança de ${(((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)}% — tente aumentar para 20%`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Cash Flow Chart */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Fluxo de Caixa — Últimos 6 meses
          </Text>
          <SimpleBarChart data={monthlyData} />
        </View>

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Despesas por Categoria
            </Text>
            {categoryData.map((item, idx) => (
              <CategoryBar key={idx} label={item.label} value={item.value} total={totalExpense} color={item.color} />
            ))}
          </View>
        )}

        {/* Monthly Summary Table */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Histórico Mensal
          </Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { color: theme.textTertiary, flex: 1.5 }]}>Mês</Text>
            <Text style={[styles.th, { color: colors.primary }]}>Receitas</Text>
            <Text style={[styles.th, { color: colors.danger }]}>Despesas</Text>
            <Text style={[styles.th, { color: theme.textSecondary }]}>Saldo</Text>
          </View>
          {[...monthlyData].reverse().map((d, idx) => {
            const net = d.income - d.expense;
            return (
              <View key={idx} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[styles.td, { color: theme.text, flex: 1.5, fontFamily: 'Inter_500Medium' }]}>{d.label}</Text>
                <Text style={[styles.td, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>{maskValue(formatBRL(d.income, true))}</Text>
                <Text style={[styles.td, { color: colors.danger, fontFamily: 'Inter_400Regular' }]}>{maskValue(formatBRL(d.expense, true))}</Text>
                <Text style={[styles.td, { color: net >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_500Medium' }]}>{maskValue(formatBRL(net, true))}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  screenTitle: { fontSize: 26 },
  period: { fontSize: 14, marginTop: 2 },
  content: { padding: 16, gap: 16 },
  netWorthCard: { borderRadius: 20, padding: 20, gap: 8 },
  nwLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  nwValue: { color: '#000', fontSize: 34 },
  nwRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  nwItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nwMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 12 },
  section: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16 },
  dreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  dreLabel: { fontSize: 15 },
  dreValue: { fontSize: 15 },
  dreDivider: { height: 1, marginVertical: 4 },
  kpiRow: { flexDirection: 'row', padding: 12 },
  kpiItem: { flex: 1, alignItems: 'center', gap: 3 },
  kpiDivider: { width: 1 },
  kpiLabel: { fontSize: 11 },
  kpiValue: { fontSize: 16 },
  savingsRate: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 10 },
  savingsText: { flex: 1, fontSize: 13, lineHeight: 18 },
  chart: { gap: 12 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barGroup: { alignItems: 'center', gap: 4, flex: 1 },
  barPair: { flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  barWrapper: { justifyContent: 'flex-end' },
  bar: {},
  barLabel: { fontSize: 9 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 8 },
  th: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 6 },
  td: { fontSize: 12, flex: 1, textAlign: 'right' },
});
