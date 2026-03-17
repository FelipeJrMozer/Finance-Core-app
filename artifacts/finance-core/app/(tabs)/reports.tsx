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
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.primary,
                      height: `${(item.income / maxVal) * 100}%`,
                      width: barWidth,
                      borderRadius: 4,
                    }
                  ]}
                />
              </View>
              <View style={[styles.barWrapper, { height: 120 }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: colors.danger,
                      height: `${(item.expense / maxVal) * 100}%`,
                      width: barWidth,
                      borderRadius: 4,
                    }
                  ]}
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

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { theme, maskValue } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <View style={styles.donut}>
      {data.map((item, idx) => (
        <View key={idx} style={styles.donutItem}>
          <View style={styles.donutLeft}>
            <View style={[styles.donutBar, { backgroundColor: item.color, flex: item.value / total }]} />
          </View>
          <Text style={[styles.donutLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[styles.donutValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            {((item.value / total) * 100).toFixed(1)}%
          </Text>
          <Text style={[styles.donutAmount, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {maskValue(formatBRL(item.value))}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { transactions } = useFinance();
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

  const categoryData = Object.keys(CATEGORIES)
    .filter((cat) => cat !== 'income')
    .map((cat) => {
      const info = getCategoryInfo(cat);
      const total = currentMonthTx
        .filter((t) => t.category === cat && t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
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
        <View>
          <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Relatórios
          </Text>
          <Text style={[styles.period, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {getMonthName(currentMonth)} • Resumo do mês
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* DRE Card */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            DRE - Demonstrativo de Resultado
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
              {
                color: totalIncome - totalExpense >= 0 ? colors.primary : colors.danger,
                fontFamily: 'Inter_700Bold'
              }
            ]}>
              {maskValue(formatBRL(totalIncome - totalExpense))}
            </Text>
          </View>
          {totalIncome > 0 && (
            <View style={[styles.savingsRate, { backgroundColor: colors.primaryGlow }]}>
              <Feather name="trending-up" size={14} color={colors.primary} />
              <Text style={[styles.savingsText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                Taxa de poupança: {(((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Cash Flow Chart */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Fluxo de Caixa - Últimos 6 meses
          </Text>
          <SimpleBarChart data={monthlyData} />
        </View>

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Despesas por Categoria
            </Text>
            <DonutChart data={categoryData} />
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
          {monthlyData.reverse().map((d, idx) => {
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
  section: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 16 },
  dreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  dreLabel: { fontSize: 15 },
  dreValue: { fontSize: 15 },
  dreDivider: { height: 1, marginVertical: 4 },
  savingsRate: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10 },
  savingsText: { fontSize: 13 },
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
  donut: { gap: 8 },
  donutItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  donutLeft: { flex: 1, height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', backgroundColor: 'rgba(128,128,128,0.1)' },
  donutBar: { height: 6, borderRadius: 3 },
  donutLabel: { fontSize: 13, width: 90 },
  donutValue: { fontSize: 13, width: 42 },
  donutAmount: { fontSize: 12, width: 80, textAlign: 'right' },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 8 },
  th: { fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'right' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 6, borderRadius: 6 },
  td: { fontSize: 12, flex: 1, textAlign: 'right' },
});
