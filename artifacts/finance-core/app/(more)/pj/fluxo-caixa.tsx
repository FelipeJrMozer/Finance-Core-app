import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

const MEI_ANNUAL_LIMIT = 81000;
const ME_ANNUAL_LIMIT = 360000;
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function isPjTransaction(t: { notes?: string; category?: string; description?: string }) {
  return (
    t.notes?.includes('[PJ]') ||
    t.category?.toLowerCase().includes('pj') ||
    t.description?.toLowerCase().startsWith('das') ||
    t.description?.toLowerCase().includes('pró-labore') ||
    t.description?.toLowerCase().includes('pro-labore')
  );
}

export default function FluxoCaixaScreen() {
  const { theme, colors } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const pjTx = useMemo(() => transactions.filter(isPjTransaction), [transactions]);

  const monthlyData = useMemo(() => {
    const data: { month: string; label: string; income: number; expense: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(currentYear, now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const txs = pjTx.filter((t) => t.date.startsWith(ym));
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      data.push({ month: ym, label: MONTHS[d.getMonth()], income, expense });
    }
    return data;
  }, [pjTx, currentYear, now]);

  const monthData = monthlyData.find((m) => m.month === currentMonth) || { income: 0, expense: 0 };
  const monthBalance = monthData.income - monthData.expense;

  const last3 = monthlyData.slice(-3);
  const avgIncome3 = last3.reduce((s, m) => s + m.income, 0) / 3;
  const projectedAnnual = avgIncome3 * 12;
  const willExceedMei = projectedAnnual > MEI_ANNUAL_LIMIT;
  const willExceedMe = projectedAnnual > ME_ANNUAL_LIMIT;

  const maxValue = Math.max(...monthlyData.flatMap((m) => [m.income, m.expense]), 1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
    >
      {/* Resumo do mês */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          Resumo do mês
        </Text>
        <View style={styles.resumeGrid}>
          <View style={[styles.resumeBox, { backgroundColor: `${colors.success}15` }]}>
            <Feather name="arrow-up" size={14} color={colors.success} />
            <Text style={[styles.resumeLabel, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>Entradas</Text>
            <Text style={[styles.resumeValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(monthData.income)}</Text>
          </View>
          <View style={[styles.resumeBox, { backgroundColor: `${colors.danger}15` }]}>
            <Feather name="arrow-down" size={14} color={colors.danger} />
            <Text style={[styles.resumeLabel, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>Saídas</Text>
            <Text style={[styles.resumeValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(monthData.expense)}</Text>
          </View>
        </View>
        <View style={[styles.balanceRow, { borderTopColor: theme.border }]}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Saldo</Text>
          <Text style={[styles.balanceValue, {
            color: monthBalance >= 0 ? colors.success : colors.danger, fontFamily: 'Inter_700Bold'
          }]}>{formatBRL(monthBalance)}</Text>
        </View>
      </View>

      {/* Gráfico 12 meses */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Últimos 12 meses
        </Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Entradas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Saídas</Text>
          </View>
        </View>
        <View style={styles.chart}>
          {monthlyData.map((m) => (
            <View key={m.month} style={styles.chartCol}>
              <View style={styles.barsRow}>
                <View style={[styles.bar, {
                  height: Math.max(2, (m.income / maxValue) * 80),
                  backgroundColor: colors.success,
                }]} />
                <View style={[styles.bar, {
                  height: Math.max(2, (m.expense / maxValue) * 80),
                  backgroundColor: colors.danger,
                }]} />
              </View>
              <Text style={[styles.chartLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Projeção */}
      <View style={[styles.card, {
        backgroundColor: willExceedMei ? `${colors.warning}10` : theme.surface,
        borderColor: willExceedMei ? `${colors.warning}40` : theme.border,
      }]}>
        <View style={styles.projHeader}>
          <Feather name="trending-up" size={16} color={willExceedMei ? colors.warning : colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Projeção anual
          </Text>
        </View>
        <Text style={[styles.projValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          {formatBRL(projectedAnnual)}
        </Text>
        <Text style={[styles.projSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Baseado na média dos últimos 3 meses ({formatBRL(avgIncome3)}/mês × 12)
        </Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.faixa}>
          <View style={styles.faixaRow}>
            <Text style={[styles.faixaLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>MEI (até R$ 81.000/ano)</Text>
            <Feather name={willExceedMei ? 'x-circle' : 'check-circle'} size={14} color={willExceedMei ? colors.danger : colors.success} />
          </View>
          <View style={styles.faixaRow}>
            <Text style={[styles.faixaLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>ME (R$ 81.001 a R$ 360.000/ano)</Text>
            <Feather name={willExceedMe ? 'x-circle' : 'check-circle'} size={14} color={willExceedMe ? colors.danger : colors.success} />
          </View>
        </View>
        {willExceedMei && !willExceedMe && (
          <Text style={[styles.alertText, { color: colors.warning, fontFamily: 'Inter_500Medium' }]}>
            Atenção: a projeção ultrapassa o limite MEI. Considere migrar para ME.
          </Text>
        )}
        {willExceedMe && (
          <Text style={[styles.alertText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            Faturamento projetado excede ME. Avalie EPP ou outro regime tributário.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 14 },
  resumeGrid: { flexDirection: 'row', gap: 10 },
  resumeBox: { flex: 1, padding: 12, borderRadius: 12, gap: 4 },
  resumeLabel: { fontSize: 11 },
  resumeValue: { fontSize: 18 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 12 },
  balanceLabel: { fontSize: 14 },
  balanceValue: { fontSize: 18 },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110, marginTop: 4 },
  chartCol: { alignItems: 'center', gap: 4, flex: 1 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 80 },
  bar: { width: 6, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  chartLabel: { fontSize: 9 },
  projHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projValue: { fontSize: 24 },
  projSub: { fontSize: 12 },
  divider: { height: 1 },
  faixa: { gap: 6 },
  faixaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faixaLabel: { fontSize: 13 },
  alertText: { fontSize: 13, marginTop: 4 },
});
