import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { getMonthlyComparison, MonthlyComparisonResponse, MonthlyComparisonRow } from '@/services/reports';
import { formatBRL } from '@/utils/formatters';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

const MONTH_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function MonthlyComparisonScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MonthlyComparisonResponse | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await getMonthlyComparison(12);
      setData(r);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const barData = data?.months
    ? data.months.slice(-6).flatMap((m) => {
        const [, mon] = m.split('-');
        const label = MONTH_SHORT[parseInt(mon) - 1];
        const row = data.rows?.find((r: MonthlyComparisonRow) => r.month === m);
        return [
          { value: row?.income ?? 0, frontColor: colors.primary, label, labelTextStyle: { color: theme.textTertiary, fontSize: 8, fontFamily: 'Inter_400Regular' } },
          { value: row?.expense ?? 0, frontColor: colors.danger },
        ];
      })
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Comparativo Mensal</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Receitas e despesas mês a mês
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !data ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <Feather name="bar-chart-2" size={40} color={theme.textTertiary} />
            <Text style={[{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 15 }]}>Sem dados</Text>
          </View>
        ) : (
          <>
            {barData.length > 0 && (
              <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Últimos 6 meses</Text>
                <View style={{ alignItems: 'center' }}>
                  <BarChart
                    data={barData}
                    width={CHART_W - 24}
                    height={160}
                    barBorderRadius={4}
                    noOfSections={4}
                    rulesColor={theme.border}
                    yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
                    xAxisColor={theme.border}
                    yAxisColor="transparent"
                    isAnimated
                    animationDuration={600}
                    maxValue={Math.max(...barData.map((d) => d.value), 100) * 1.15}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.primary }} />
                    <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>Receitas</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors.danger }} />
                    <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>Despesas</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={s.tableHeader}>
                {['Mês', 'Receita', 'Despesa', 'Saldo'].map((h, i) => (
                  <Text key={h} style={[s.th, { color: theme.textTertiary, fontFamily: 'Inter_500Medium', flex: i === 0 ? 1.4 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {[...(data.rows ?? [])].reverse().map((row: MonthlyComparisonRow, idx: number) => {
                const [y, m] = row.month.split('-');
                const label = `${MONTH_SHORT[parseInt(m) - 1]} ${y.slice(2)}`;
                const net = (row.income ?? 0) - (row.expense ?? 0);
                return (
                  <View key={row.month} style={[s.tableRow, idx % 2 === 0 && { backgroundColor: theme.surfaceElevated }]}>
                    <Text style={[s.td, { color: theme.text, fontFamily: 'Inter_500Medium', flex: 1.4, textAlign: 'left' }]}>{label}</Text>
                    <Text style={[s.td, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>{maskValue(formatBRL(row.income ?? 0, true))}</Text>
                    <Text style={[s.td, { color: colors.danger, fontFamily: 'Inter_400Regular' }]}>{maskValue(formatBRL(row.expense ?? 0, true))}</Text>
                    <Text style={[s.td, { color: net >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_500Medium' }]}>{maskValue(formatBRL(net, true))}</Text>
                  </View>
                );
              })}
            </View>

            {data.summary && (
              <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Média do Período</Text>
                {[
                  { label: 'Receita média/mês', value: data.summary.avgIncome ?? 0, color: colors.primary },
                  { label: 'Despesa média/mês', value: data.summary.avgExpense ?? 0, color: colors.danger },
                  { label: 'Saldo médio/mês', value: (data.summary.avgIncome ?? 0) - (data.summary.avgExpense ?? 0), color: (data.summary.avgIncome ?? 0) >= (data.summary.avgExpense ?? 0) ? colors.primary : colors.danger },
                  { label: 'Taxa de poupança média', value: data.summary.avgSavingsRate ?? 0, color: (data.summary.avgSavingsRate ?? 0) >= 20 ? colors.primary : colors.warning, isPercent: true },
                ].map((item) => (
                  <View key={item.label} style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.label}</Text>
                    <Text style={[s.summaryValue, { color: item.color, fontFamily: 'Inter_600SemiBold' }]}>
                      {item.isPercent ? `${(item.value as number).toFixed(1)}%` : maskValue(formatBRL(item.value as number))}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
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
  tableHeader: { flexDirection: 'row', paddingHorizontal: 4, paddingBottom: 8 },
  th: { fontSize: 11 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 7, borderRadius: 6 },
  td: { flex: 1, fontSize: 12, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14 },
});
