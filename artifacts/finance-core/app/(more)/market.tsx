import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useBenchmarks } from '@/services/benchmarks';
import { getMarketComparison, MarketComparison } from '@/services/reports';
import { formatBRL } from '@/utils/formatters';

function pct(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export default function MarketScreen() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [market, setMarket] = useState<MarketComparison | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const { data: benchmarks, isLoading: loadingBench, refetch } = useBenchmarks();

  useEffect(() => {
    getMarketComparison()
      .then(setMarket)
      .catch(() => {})
      .finally(() => setLoadingMarket(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    try {
      const m = await getMarketComparison();
      setMarket(m);
    } catch {}
    setRefreshing(false);
  };

  const benchmarkRows = benchmarks ? [
    { label: 'CDI', value: benchmarks.cdi, color: '#10B981', icon: 'percent' },
    { label: 'Selic', value: benchmarks.selic, color: '#3B82F6', icon: 'percent' },
    { label: 'IPCA', value: benchmarks.ipca, color: '#F59E0B', icon: 'trending-up' },
    { label: 'IBOVESPA', value: benchmarks.ibov, color: '#7B39ED', icon: 'bar-chart-2' },
  ] : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Mercado</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Taxas e índices financeiros em tempo real
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="activity" size={15} color={theme.textSecondary} />
            <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Indicadores Econômicos</Text>
          </View>
          {loadingBench ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
          ) : (
            benchmarkRows.map((row) => {
              const val = row.value;
              return (
                <View key={row.label} style={s.benchRow}>
                  <View style={[s.benchIcon, { backgroundColor: `${row.color}20` }]}>
                    <Feather name={row.icon as any} size={16} color={row.color} />
                  </View>
                  <Text style={[s.benchLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{row.label}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.benchValue, { color: row.color, fontFamily: 'Inter_700Bold' }]}>
                      {pct(val != null ? val : undefined)}
                    </Text>
                    {val != null && (
                      <Text style={[s.benchPeriod, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>a.a.</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {market && (
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="bar-chart-2" size={15} color={theme.textSecondary} />
              <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Sua Carteira vs Mercado</Text>
            </View>
            {[
              { label: 'Rentabilidade da sua carteira', value: market.portfolioReturn, color: colors.primary },
              { label: 'CDI acumulado no período', value: market.cdi, color: '#10B981' },
              { label: 'IBOVESPA no período', value: market.ibov, color: '#7B39ED' },
              { label: 'IFIX no período', value: market.ifix, color: '#F59E0B' },
            ].filter((item) => item.value != null).map((item) => (
              <View key={item.label} style={s.compareRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.compareLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.label}</Text>
                  <View style={[s.compareBar, { backgroundColor: theme.surfaceElevated }]}>
                    <View style={[s.compareBarFill, {
                      backgroundColor: item.color,
                      width: `${Math.min(Math.abs((item.value ?? 0) / 30) * 100, 100)}%`,
                    }]} />
                  </View>
                </View>
                <Text style={[s.compareValue, { color: item.color, fontFamily: 'Inter_700Bold' }]}>
                  {pct(item.value ?? undefined)}
                </Text>
              </View>
            ))}
            {market.period && (
              <Text style={[s.period, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Período: {market.period}
              </Text>
            )}
          </View>
        )}

        {loadingMarket && !market && (
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border, alignItems: 'center', paddingVertical: 24 }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[{ color: theme.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 8 }]}>
              Carregando dados do mercado...
            </Text>
          </View>
        )}

        <View style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="info" size={14} color={theme.textTertiary} />
          <Text style={[s.infoText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Taxas indicativas. CDI e Selic são taxas anuais. Cotações sujeitas a variação.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  card: { borderRadius: 16, padding: 16, gap: 14, borderWidth: 1 },
  cardTitle: { fontSize: 15 },
  benchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benchIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  benchLabel: { flex: 1, fontSize: 14 },
  benchValue: { fontSize: 16 },
  benchPeriod: { fontSize: 10, marginTop: 1 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compareLabel: { fontSize: 12, marginBottom: 4 },
  compareBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  compareBarFill: { height: 6, borderRadius: 3 },
  compareValue: { fontSize: 14, minWidth: 60, textAlign: 'right' },
  period: { fontSize: 11, textAlign: 'right' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
