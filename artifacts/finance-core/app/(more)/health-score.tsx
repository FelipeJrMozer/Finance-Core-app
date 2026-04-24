import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Text as SvgText } from 'react-native-svg';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { getCurrentMonth } from '@/utils/formatters';
import {
  labelForComponent,
  categoryLabelPT,
  pillarLabel,
  type HealthScore,
  type HealthScorePillars,
} from '@/services/healthScore';

function scoreColor(score: number): string {
  if (score >= 70) return '#10B981';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function scoreLabel(score: number): string {
  if (score >= 70) return 'Bom';
  if (score >= 40) return 'Regular';
  return 'Ruim';
}

function ScoreGauge({ score }: { score: number }) {
  const { theme } = useTheme();
  const size = 180;
  const strokeWidth = 16;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const endAngle = startAngle + 270 * (Math.max(0, Math.min(100, score)) / 100);
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  function arcPath(start: number, end: number, innerR: number) {
    const x1 = cx + innerR * Math.cos(toRad(start));
    const y1 = cy + innerR * Math.sin(toRad(start));
    const x2 = cx + innerR * Math.cos(toRad(end));
    const y2 = cy + innerR * Math.sin(toRad(end));
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${innerR} ${innerR} 0 ${large} 1 ${x2} ${y2}`;
  }

  const color = scoreColor(score);

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Path
          d={arcPath(135, 405, r)}
          fill="none"
          stroke={theme.border}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Path
          d={arcPath(135, endAngle, r)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <SvgText
          x={cx} y={cy - 6}
          textAnchor="middle"
          fill={theme.text}
          fontSize={38}
          fontWeight="700"
        >
          {Math.round(score)}
        </SvgText>
        <SvgText
          x={cx} y={cy + 18}
          textAnchor="middle"
          fill={color}
          fontSize={14}
          fontWeight="600"
        >
          {scoreLabel(score)}
        </SvgText>
      </Svg>
    </View>
  );
}

function ComponentBar({ name, label, score, max }: { name: string; label?: string; score: number; max: number }) {
  const { theme } = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((score / max) * 100))) : 0;
  const color = scoreColor(pct);
  return (
    <View style={pb.row}>
      <View style={[pb.iconBox, { backgroundColor: `${color}15` }]}>
        <Feather name="bar-chart-2" size={16} color={color} />
      </View>
      <View style={pb.content}>
        <View style={pb.top}>
          <Text style={[pb.label, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            {labelForComponent(name, label)}
          </Text>
          <Text style={[pb.pct, { color, fontFamily: 'Inter_700Bold' }]}>
            {score.toFixed(0)} / {max.toFixed(0)}
          </Text>
        </View>
        <View style={[pb.barBg, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[pb.barFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}
const pb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14 },
  pct: { fontSize: 13 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});

export default function HealthScoreScreen() {
  const { theme, colors } = useTheme();
  const {
    transactions, accounts, creditCards, investments, budgets,
    serverHealthScore, isLoadingHealthScore, refreshHealthScore,
  } = useFinance();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const usingFallback = !serverHealthScore || serverHealthScore.components.length === 0;
  const data = !usingFallback ? serverHealthScore : null;
  const loading = isLoadingHealthScore && !serverHealthScore;

  // Local fallback computation when backend has no data yet
  const localFallback = React.useMemo<HealthScore>(() => {
    const currentMonth = getCurrentMonth();
    const monthTx = transactions.filter((t) => (t.transactionDate ?? t.date).startsWith(currentMonth));
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const liquid = accounts
      .filter((a: any) => a.type !== 'credit' && !a.archived)
      .reduce((s, a) => s + a.balance, 0);

    const balanceScore = income > 0
      ? Math.max(0, Math.min(25, Math.round((1 - expense / income) * 25)))
      : 0;

    const savingsRate = income > 0
      ? Math.max(0, Math.min(25, Math.round(((income - expense) / income) * 25)))
      : 0;

    const totalLimit = creditCards.reduce((s, c) => s + c.limit, 0);
    const totalUsed = creditCards.reduce((s, c) => s + (c.used || 0), 0);
    const debtControl = totalLimit > 0
      ? Math.max(0, Math.min(25, Math.round((1 - totalUsed / totalLimit) * 25)))
      : 25;

    const budgetCompliance = budgets.length > 0
      ? Math.min(25, budgets.length * 5 + (liquid > 0 ? 5 : 0))
      : 0;

    const overall = balanceScore + savingsRate + debtControl + budgetCompliance;
    return {
      overallScore: overall,
      category: overall >= 80 ? 'excellent' : overall >= 60 ? 'good' : overall >= 40 ? 'fair' : 'poor',
      components: [
        { name: 'balance', score: balanceScore, max: 25 },
        { name: 'savingsRate', score: savingsRate, max: 25 },
        { name: 'budgetCompliance', score: budgetCompliance, max: 25 },
        { name: 'debtControl', score: debtControl, max: 25 },
      ],
      history: [],
    };
  }, [transactions, accounts, creditCards, budgets, investments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshHealthScore();
    setRefreshing(false);
  };

  const effective = data ?? localFallback;
  const score = Math.max(0, Math.min(100, Math.round(effective.overallScore)));

  const chartData = effective.history.length > 0
    ? effective.history.slice(-6).map((h) => ({
        value: Math.max(0, Math.min(100, Math.round(h.score))),
        label: h.month.slice(5) || '',
      }))
    : [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, padding: 16, gap: 16 }}
    >
      {/* Score Gauge */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Saúde Financeira
        </Text>
        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          : <ScoreGauge score={score} />
        }
        <Text style={[styles.scoreNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          {usingFallback
            ? 'Estimativa local — sincronize seus dados para ver o score completo do servidor.'
            : `Categoria: ${categoryLabelPT(effective.category)} • Avaliado em equilíbrio, poupança, orçamento e dívidas.`}
        </Text>
      </View>

      {/* Histórico */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Histórico (6 meses)
        </Text>
        {chartData.length > 1 ? (
          <LineChart
            data={chartData}
            width={260}
            height={120}
            color={scoreColor(score)}
            thickness={2}
            dataPointsColor={scoreColor(score)}
            hideDataPoints={false}
            curved
            startFillColor={`${scoreColor(score)}40`}
            endFillColor={`${scoreColor(score)}00`}
            areaChart
            xAxisColor={theme.border}
            yAxisColor={theme.border}
            yAxisTextStyle={{ color: theme.textTertiary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
            maxValue={100}
            noOfSections={4}
            rulesColor={theme.border}
            hideRules={false}
          />
        ) : (
          <Text style={[styles.scoreNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Histórico ainda não disponível. Será exibido aqui após algumas semanas de uso.
          </Text>
        )}
      </View>

      {/* Pilares (escala 0–100 cada) */}
      {effective.pillars && Object.values(effective.pillars).some((v) => v != null) && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Pilares
          </Text>
          {(Object.keys(effective.pillars) as (keyof HealthScorePillars)[]).map((k) => {
            const v = effective.pillars?.[k];
            if (v == null) return null;
            return (
              <ComponentBar
                key={`pillar-${k}`}
                name={`pillar-${k}`}
                label={pillarLabel(k)}
                score={v}
                max={100}
              />
            );
          })}
        </View>
      )}

      {/* Componentes */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Componentes da nota
        </Text>
        {effective.components.map((c) => (
          <ComponentBar
            key={c.name}
            name={c.name}
            label={c.label}
            score={c.score}
            max={c.max}
          />
        ))}
      </View>

      {/* Recomendações */}
      {effective.recommendations && effective.recommendations.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Recomendações
          </Text>
          {effective.recommendations.map((r, i) => (
            <View key={i} style={styles.recRow}>
              <View style={[styles.recIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Feather name="check-circle" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.recText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {r}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 16, borderWidth: 1 },
  cardTitle: { fontSize: 16, marginBottom: 4 },
  scoreNote: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  recIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  recText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
