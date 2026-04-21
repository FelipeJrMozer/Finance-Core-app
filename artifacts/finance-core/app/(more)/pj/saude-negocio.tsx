import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

function isPjTransaction(t: { notes?: string; category?: string; description?: string }) {
  return (
    t.notes?.includes('[PJ]') ||
    t.category?.toLowerCase().includes('pj') ||
    t.description?.toLowerCase().startsWith('das') ||
    t.description?.toLowerCase().includes('pró-labore') ||
    t.description?.toLowerCase().includes('pro-labore')
  );
}

function isDasPayment(t: { description?: string }) {
  const d = (t.description || '').toLowerCase();
  return d.startsWith('das') || d.includes('das/');
}

function isProLabore(t: { description?: string; category?: string }) {
  const d = (t.description || '').toLowerCase();
  return d.includes('pró-labore') || d.includes('pro-labore') || d.includes('retirada');
}

interface MetricResult {
  label: string;
  value: string;
  score: number;
  max: 20;
  hint?: string;
}

export default function SaudeNegocioScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { transactions, accounts } = useFinance();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const metrics = useMemo<MetricResult[]>(() => {
    const pjTx = transactions.filter(isPjTransaction);
    const monthTx = pjTx.filter((t) => t.date.startsWith(currentMonth));
    const receitas = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const despesas = monthTx.filter((t) => t.type === 'expense' && !isDasPayment(t) && !isProLabore(t)).reduce((s, t) => s + t.amount, 0);
    const dasTotal = monthTx.filter((t) => t.type === 'expense' && isDasPayment(t)).reduce((s, t) => s + t.amount, 0);
    const retiradas = monthTx.filter((t) => t.type === 'expense' && isProLabore(t)).reduce((s, t) => s + t.amount, 0);

    // 1. Margem de Lucro
    const margemPct = receitas > 0 ? ((receitas - despesas - dasTotal - retiradas) / receitas) * 100 : 0;
    const margemScore = margemPct >= 30 ? 20 : margemPct >= 15 ? 14 : margemPct >= 10 ? 8 : 0;

    // 2. Pró-labore vs Faturamento
    const proPct = receitas > 0 ? (retiradas / receitas) * 100 : 0;
    const proScore = proPct <= 40 ? 20 : proPct <= 60 ? 14 : proPct <= 80 ? 8 : 0;

    // 3. Reserva PJ (saldo das contas PJ / despesa média mensal últimos 3 meses)
    const last3Expenses: number[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const exp = pjTx.filter((t) => t.date.startsWith(ym) && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      last3Expenses.push(exp);
    }
    const avgMonthlyExp = last3Expenses.reduce((s, v) => s + v, 0) / 3;
    const pjAccountBalance = accounts
      .filter((a) => a.name.toLowerCase().includes('pj') || a.institution.toLowerCase().includes('pj'))
      .reduce((s, a) => s + a.balance, 0);
    const reservaMonths = avgMonthlyExp > 0 ? pjAccountBalance / avgMonthlyExp : 0;
    const reservaScore = reservaMonths >= 3 ? 20 : reservaMonths >= 2 ? 14 : reservaMonths >= 1 ? 8 : 0;

    // 4. DAS em dia
    const dasScore = dasTotal > 0 ? 20 : 0;

    // 5. Crescimento receita
    const last3Income = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inc = pjTx.filter((t) => t.date.startsWith(ym) && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      last3Income.push(inc);
    }
    const avgIncome3 = last3Income.reduce((s, v) => s + v, 0) / 3;
    const growth = avgIncome3 > 0 ? ((receitas - avgIncome3) / avgIncome3) * 100 : 0;
    const growthScore = growth >= 5 ? 20 : growth >= 0 ? 14 : 0;

    return [
      { label: 'Margem de lucro', value: `${margemPct.toFixed(1)}%`, score: margemScore, max: 20,
        hint: margemScore < 14 ? 'Reduza despesas ou aumente preços para melhorar margem.' : undefined },
      { label: 'Pró-labore vs faturamento', value: `${proPct.toFixed(1)}%`, score: proScore, max: 20,
        hint: proScore < 14 ? 'Equilibre suas retiradas com o faturamento (ideal ≤ 40%).' : undefined },
      { label: 'Reserva de emergência', value: `${reservaMonths.toFixed(1)} meses`, score: reservaScore, max: 20,
        hint: reservaScore < 14 ? 'Acumule pelo menos 3 meses de despesas em conta PJ.' : undefined },
      { label: 'DAS em dia', value: dasTotal > 0 ? `Pago (${maskValue(formatBRL(dasTotal))})` : 'Em aberto', score: dasScore, max: 20,
        hint: dasScore === 0 ? 'Pague o DAS deste mês para evitar multas.' : undefined },
      { label: 'Crescimento de receita', value: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`, score: growthScore, max: 20,
        hint: growthScore < 14 ? 'Foque em vendas/clientes para reverter a queda.' : undefined },
    ];
  }, [transactions, accounts, currentMonth, now]);

  const total = metrics.reduce((s, m) => s + m.score, 0);
  const totalColor = total >= 70 ? colors.success : total >= 40 ? colors.warning : colors.danger;
  const totalLabel = total >= 70 ? 'Saudável' : total >= 40 ? 'Atenção' : 'Crítico';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
    >
      {/* Score */}
      <View style={[styles.scoreCard, { backgroundColor: `${totalColor}10`, borderColor: `${totalColor}40` }]}>
        <Text style={[styles.scoreLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          Score de saúde do negócio
        </Text>
        <Text style={[styles.scoreValue, { color: totalColor, fontFamily: 'Inter_700Bold' }]}>
          {total}<Text style={[styles.scoreMax, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>/100</Text>
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: `${totalColor}20` }]}>
          <Feather
            name={total >= 70 ? 'check-circle' : total >= 40 ? 'alert-triangle' : 'x-circle'}
            size={13}
            color={totalColor}
          />
          <Text style={[styles.statusText, { color: totalColor, fontFamily: 'Inter_600SemiBold' }]}>
            {totalLabel}
          </Text>
        </View>
      </View>

      {/* Metrics */}
      <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
        Métricas
      </Text>
      {metrics.map((m, idx) => {
        const color = m.score >= 14 ? colors.success : m.score >= 8 ? colors.warning : colors.danger;
        const pct = (m.score / m.max) * 100;
        return (
          <View key={idx} style={[styles.metric, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.metricHeader}>
              <Text style={[styles.metricLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                {m.label}
              </Text>
              <Text style={[styles.metricScore, { color, fontFamily: 'Inter_700Bold' }]}>
                {m.score}/{m.max}
              </Text>
            </View>
            <Text style={[styles.metricValue, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {m.value}
            </Text>
            <View style={[styles.metricBar, { backgroundColor: theme.surfaceElevated }]}>
              <View style={[styles.metricFill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            {m.hint && (
              <Text style={[styles.metricHint, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                <Feather name="info" size={11} color={theme.textTertiary} />  {m.hint}
              </Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scoreCard: { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: 'center', gap: 6 },
  scoreLabel: { fontSize: 13 },
  scoreValue: { fontSize: 56 },
  scoreMax: { fontSize: 24 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 13 },
  sectionTitle: { fontSize: 16, marginTop: 8 },
  metric: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 14 },
  metricScore: { fontSize: 14 },
  metricValue: { fontSize: 13 },
  metricBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  metricFill: { height: 6, borderRadius: 3 },
  metricHint: { fontSize: 12, marginTop: 4 },
});
