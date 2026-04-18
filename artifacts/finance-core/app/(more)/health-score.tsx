import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, RefreshControl, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Circle, Path, G, Text as SvgText } from 'react-native-svg';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';
import { apiGet } from '@/services/api';

const PILLARS = [
  { key: 'gastos', label: 'Controle de gastos', icon: 'trending-down' as const, color: '#10B981' },
  { key: 'reserva', label: 'Reserva de emergência', icon: 'shield' as const, color: '#0096C7' },
  { key: 'credito', label: 'Uso de crédito', icon: 'credit-card' as const, color: '#F59E0B' },
  { key: 'investimentos', label: 'Investimentos', icon: 'bar-chart-2' as const, color: '#9C27B0' },
  { key: 'planejamento', label: 'Planejamento', icon: 'calendar' as const, color: '#EF4444' },
];

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
  const circumference = 2 * Math.PI * r;
  // Draw 270° arc (from 135° to 405°)
  const arcFraction = 0.75;
  const startAngle = 135;
  const endAngle = startAngle + 270 * (score / 100);
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
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill={theme.text}
          fontSize={38}
          fontWeight="700"
        >
          {score}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 18}
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

function PillarBar({ label, icon, value, color }: { label: string; icon: keyof typeof Feather.glyphMap; value: number | null; color: string }) {
  const { theme } = useTheme();
  const hasData = value !== null;
  const displayValue = hasData ? Math.max(0, Math.min(100, value!)) : 0;
  return (
    <View style={pb.row}>
      <View style={[pb.iconBox, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View style={pb.content}>
        <View style={pb.top}>
          <Text style={[pb.label, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
          <Text style={[pb.pct, { color: hasData ? color : theme.textTertiary, fontFamily: hasData ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
            {hasData ? `${displayValue}%` : 'sem dados'}
          </Text>
        </View>
        <View style={[pb.barBg, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[pb.barFill, { width: `${displayValue}%`, backgroundColor: hasData ? color : theme.border }]} />
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
  pct: { fontSize: 14 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
});

export default function HealthScoreScreen() {
  const { theme, colors } = useTheme();
  const { transactions, accounts, creditCards, investments, budgets } = useFinance();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);

  const currentMonth = getCurrentMonth();
  const monthTx = transactions.filter((t) => (t.transactionDate ?? t.date).startsWith(currentMonth));
  const monthIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Compute pillars locally when API returns nothing useful.
  // `null` represents "sem dados suficientes" — não conta na média.
  const computedPillars = React.useMemo<Record<string, number | null>>(() => {
    // Sem renda registrada no mês: não dá para calcular taxa de poupança.
    const gastosScore = monthIncome > 0
      ? Math.max(0, Math.min(100, Math.round((1 - monthExpense / monthIncome) * 100)))
      : null;

    const liquidBalance = accounts
      .filter((a: any) => a.type !== 'credit' && !a.archived)
      .reduce((s, a) => s + a.balance, 0);
    // Sem despesas e sem reserva: indeterminado.
    const reservaScore = monthExpense > 0
      ? Math.max(0, Math.min(100, Math.round((liquidBalance / (monthExpense * 6)) * 100)))
      : (liquidBalance > 0 ? 100 : null);

    const totalCreditLimit = creditCards.reduce((s, c) => s + c.limit, 0);
    const totalCreditUsed = creditCards.reduce((s, c) => s + (c.used || 0), 0);
    const creditoScore = totalCreditLimit > 0
      ? Math.max(0, Math.min(100, Math.round((1 - totalCreditUsed / totalCreditLimit) * 100)))
      : null;

    const totalInvest = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const denom = liquidBalance + totalInvest;
    const investScore = denom > 0
      ? Math.max(0, Math.min(100, Math.round((totalInvest / denom) * 200)))
      : null;

    const budgetsDone = budgets.length;
    const planScore = Math.max(0, Math.min(100, budgetsDone * 20 + (monthIncome > 0 ? 20 : 0)));

    return {
      gastos: gastosScore,
      reserva: reservaScore,
      credito: creditoScore,
      investimentos: investScore,
      planejamento: planScore,
    };
  }, [accounts, creditCards, investments, budgets, monthIncome, monthExpense]);

  const overallScore = (() => {
    const valid = Object.values(computedPillars).filter((v): v is number => v !== null);
    if (valid.length === 0) return 0;
    return Math.max(0, Math.min(100, Math.round(valid.reduce((s, v) => s + v, 0) / valid.length)));
  })();

  const fetchHealth = useCallback(async () => {
    try {
      const data: any = await apiGet('/api/analytics/financial-score');
      if (!data || typeof data !== 'object') return;
      const pillarsMap: Record<string, number> = {};
      for (const comp of (Array.isArray(data.components) ? data.components : [])) {
        const pct = comp.maxScore > 0
          ? Math.max(0, Math.min(100, Math.round((comp.score / comp.maxScore) * 100)))
          : 0;
        if (comp.id === 'savings_rate')      pillarsMap.gastos = pct;
        if (comp.id === 'emergency_fund')    pillarsMap.reserva = pct;
        if (comp.id === 'debt_ratio')        pillarsMap.credito = pct;
        if (comp.id === 'income_stability')  pillarsMap.investimentos = pct;
        if (comp.id === 'expense_control')   pillarsMap.planejamento = pct;
      }
      setHealthData({
        score: Math.max(0, Math.min(100, Number(data.totalScore) || 0)),
        pillars: pillarsMap,
        recommendations: (Array.isArray(data.components) ? data.components : [])
          .map((c: any) => c.tip).filter(Boolean),
      });
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/api/analytics/score-history');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  const [history, setHistory] = useState<any[]>([]);

  const safeSetHistory = useCallback((h: any) => {
    setHistory(Array.isArray(h) ? h : []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchHealth(), fetchHistory().then(safeSetHistory)]).finally(() => setLoading(false));
  }, [fetchHealth, fetchHistory, safeSetHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(), fetchHistory().then(safeSetHistory)]);
    setRefreshing(false);
  };

  const score = Math.max(0, Math.min(100, healthData?.score ?? overallScore));
  const pillars: Record<string, number | null> = healthData?.pillars ?? computedPillars;
  const recommendations: string[] = healthData?.recommendations ?? [
    monthIncome > 0 && monthExpense > monthIncome && '💡 Suas despesas superam as receitas este mês. Revise os gastos variáveis.',
    (computedPillars.reserva ?? 100) < 50 && '🛡️ Aumente sua reserva de emergência para pelo menos 3 meses de despesas.',
    (computedPillars.credito ?? 100) < 70 && '💳 Reduza o uso do crédito para abaixo de 30% do limite disponível.',
    (computedPillars.investimentos ?? 100) < 30 && '📈 Comece a investir — separe pelo menos 10% da renda mensal.',
    budgets.length === 0 && '📊 Defina orçamentos por categoria para um planejamento mais eficaz.',
  ].filter(Boolean) as string[];

  const chartData = history.length > 0
    ? history.slice(-6).map((h: any) => ({ value: Math.max(0, Math.min(100, Number(h.score) || 0)), label: h.month ?? '' }))
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
          Pontuação Atual
        </Text>
        {loading
          ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          : <ScoreGauge score={score} />
        }
        <Text style={[styles.scoreNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Baseado em gastos, reserva, crédito, investimentos e planejamento
        </Text>
      </View>

      {/* Histórico */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Histórico (6 meses)
        </Text>
        {chartData.length > 0 ? (
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
            Histórico ainda não disponível. Ele será exibido aqui após algumas semanas de uso.
          </Text>
        )}
      </View>

      {/* Pilares */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Os 5 Pilares
        </Text>
        {PILLARS.map((p) => (
          <PillarBar
            key={p.key}
            label={p.label}
            icon={p.icon}
            value={pillars[p.key] ?? null}
            color={p.color}
          />
        ))}
      </View>

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Recomendações
          </Text>
          {recommendations.map((r, i) => (
            <View key={i} style={[styles.recRow, { borderLeftColor: colors.primary }]}>
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
  recRow: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  recText: { fontSize: 14, lineHeight: 20 },
});
