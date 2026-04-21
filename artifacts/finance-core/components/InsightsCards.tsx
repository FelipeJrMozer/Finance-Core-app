import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import {
  getAnomalies, getMonthlyRecap, getEmergencyFund, severityOf,
  AnomalyItem, MonthlyRecap, EmergencyFundStatus,
} from '@/services/insights';

const CAT_LABELS: Record<string, string> = {
  food: 'Alimentação', transport: 'Transporte', housing: 'Moradia',
  health: 'Saúde', entertainment: 'Lazer', education: 'Educação',
  clothing: 'Compras', investment: 'Investimentos', other: 'Outros',
};

function categoryLabel(c?: string) {
  if (!c) return '—';
  return CAT_LABELS[c] || c;
}

function AnomalyBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
  const { colors } = useTheme();
  const map = {
    high: { bg: `${colors.danger}25`, fg: colors.danger, label: 'ALTO' },
    medium: { bg: `${colors.warning}25`, fg: colors.warning, label: 'MÉDIO' },
    low: { bg: `${colors.info}25`, fg: colors.info, label: 'BAIXO' },
  } as const;
  const s = map[severity];
  return (
    <View style={[badge.wrap, { backgroundColor: s.bg }]}>
      <Text style={[badge.text, { color: s.fg, fontFamily: 'Inter_700Bold' }]}>{s.label}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  text: { fontSize: 10, letterSpacing: 0.5 },
});

function AnomaliesCard() {
  const { theme, colors, maskValue } = useTheme();
  const { data, isLoading, error } = useQuery<AnomalyItem[]>({
    queryKey: ['/api/insights/anomalies'],
    queryFn: () => getAnomalies(3),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (error) return null;
  const items = (data || []).slice(0, 3);
  if (!isLoading && items.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="anomalies-card">
      <View style={styles.header}>
        <Feather name="alert-triangle" size={16} color={colors.warning} />
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Anomalias detectadas
        </Text>
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      {items.map((a, idx) => {
        const sev = severityOf(a.increasePct);
        return (
          <View key={a.id || idx} style={[styles.row, { borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                {categoryLabel(a.category)} {a.description ? `· ${a.description}` : ''}
              </Text>
              <Text style={[styles.rowSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {a.amount != null ? maskValue(formatBRL(a.amount, true)) : '—'}
                {a.increasePct != null ? ` · +${Math.round(a.increasePct)}% vs média` : ''}
              </Text>
            </View>
            <AnomalyBadge severity={sev} />
          </View>
        );
      })}
    </View>
  );
}

function MonthlyRecapCard() {
  const { theme, colors, maskValue } = useTheme();
  const { data, isLoading, error } = useQuery<MonthlyRecap | null>({
    queryKey: ['/api/insights/monthly-recap'],
    queryFn: () => getMonthlyRecap(),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  if (error || !data) return null;

  const positive = data.net >= 0;
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="recap-card">
      <View style={styles.header}>
        <Feather name="bar-chart" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Recap do mês
        </Text>
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      <View style={styles.recapRow}>
        <View style={styles.recapMetric}>
          <Text style={[styles.metricLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Receitas</Text>
          <Text style={[styles.metricVal, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {maskValue(formatBRL(data.totalIncome, true))}
          </Text>
        </View>
        <View style={styles.recapMetric}>
          <Text style={[styles.metricLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Despesas</Text>
          <Text style={[styles.metricVal, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
            {maskValue(formatBRL(data.totalExpenses, true))}
          </Text>
        </View>
        <View style={styles.recapMetric}>
          <Text style={[styles.metricLbl, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Resultado</Text>
          <Text style={[styles.metricVal, { color: positive ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
            {maskValue(formatBRL(data.net, true))}
          </Text>
        </View>
      </View>
      {data.topCategory && (
        <Text style={[styles.recapHint, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Maior categoria:{' '}
          <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold' }}>
            {categoryLabel(data.topCategory.name)} · {maskValue(formatBRL(data.topCategory.amount, true))}
          </Text>
        </Text>
      )}
    </View>
  );
}

function EmergencyFundCard() {
  const { theme, colors, maskValue } = useTheme();
  const { data, isLoading, error } = useQuery<EmergencyFundStatus | null>({
    queryKey: ['/api/insights/emergency-fund'],
    queryFn: getEmergencyFund,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  if (error || !data) return null;

  const months = Number(data.monthsCovered || 0);
  const target = Number(data.recommendedMonths || 6);
  const progress = data.progress != null ? data.progress : Math.min(1, months / target);
  const ok = months >= target;
  const color = ok ? colors.primary : months >= target / 2 ? colors.warning : colors.danger;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID="emergency-card">
      <View style={styles.header}>
        <Feather name="shield" size={16} color={color} />
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Reserva de emergência
        </Text>
        {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      <View style={styles.efRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.efBig, { color, fontFamily: 'Inter_700Bold' }]}>
            {months.toFixed(1)} meses
          </Text>
          <Text style={[styles.efSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            de despesas cobertas (meta: {target})
          </Text>
        </View>
        <Text style={[styles.efAmount, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          {maskValue(formatBRL(data.current, true))}
        </Text>
      </View>
      <View style={[styles.bar, { backgroundColor: `${color}25` }]}>
        <View style={[styles.barFill, { width: `${Math.max(2, Math.min(100, progress * 100))}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function InsightsCards() {
  const { theme, colors } = useTheme();
  return (
    <View style={{ gap: 12 }} testID="insights-cards">
      <View style={styles.headerRow}>
        <Text style={[styles.bigTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Insights inteligentes
        </Text>
        <Pressable onPress={() => router.push('/(more)/health-score')} hitSlop={8}>
          <Text style={[styles.seeMore, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Ver tudo</Text>
        </Pressable>
      </View>
      <AnomaliesCard />
      <MonthlyRecapCard />
      <EmergencyFundCard />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigTitle: { fontSize: 16 },
  seeMore: { fontSize: 13 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 14, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  rowLabel: { fontSize: 14 },
  rowSub: { fontSize: 12, marginTop: 2 },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  recapMetric: { flex: 1, alignItems: 'flex-start' },
  metricLbl: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  metricVal: { fontSize: 15, marginTop: 3 },
  recapHint: { fontSize: 12, marginTop: 2 },
  efRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  efBig: { fontSize: 22 },
  efSub: { fontSize: 12, marginTop: 1 },
  efAmount: { fontSize: 15 },
  bar: { height: 8, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
});
