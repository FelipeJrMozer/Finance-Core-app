import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { getDre, DreReport, DreCategoryRow } from '@/services/reports';
import { formatBRL, formatMonthYear } from '@/utils/formatters';

export default function DreScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DreReport | null>(null);
  const [months, setMonths] = useState(6);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getDre(months);
      setReport(data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [months]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const total = report ? {
    income: report.rows?.reduce((s: number, r: DreCategoryRow) => r.type === 'income' ? s + r.totals.reduce((a: number, v: number) => a + v, 0) : s, 0) ?? 0,
    expense: report.rows?.reduce((s: number, r: DreCategoryRow) => r.type === 'expense' ? s + r.totals.reduce((a: number, v: number) => a + v, 0) : s, 0) ?? 0,
  } : { income: 0, expense: 0 };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>DRE — Demonstrativo</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Resultado por categoria nos últimos meses
        </Text>
        <View style={s.periodRow}>
          {[3, 6, 12].map((m) => (
            <Pressable
              key={m}
              onPress={() => setMonths(m)}
              style={[s.periodBtn, { backgroundColor: months === m ? colors.primary : theme.surface, borderColor: months === m ? colors.primary : theme.border }]}
            >
              <Text style={[s.periodText, { color: months === m ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                {m}m
              </Text>
            </Pressable>
          ))}
        </View>
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
        ) : !report ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <Feather name="file-text" size={40} color={theme.textTertiary} />
            <Text style={[{ color: theme.textSecondary, fontSize: 16, fontFamily: 'Inter_500Medium' }]}>
              Sem dados disponíveis
            </Text>
          </View>
        ) : (
          <>
            <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Resumo do Período</Text>
              {[
                { label: 'Total de Receitas', value: total.income, color: colors.primary },
                { label: 'Total de Despesas', value: total.expense, color: colors.danger },
              ].map((r) => (
                <View key={r.label} style={s.row}>
                  <Text style={[s.rowLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{r.label}</Text>
                  <Text style={[s.rowValue, { color: r.color, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(r.value))}</Text>
                </View>
              ))}
              <View style={[s.divider, { backgroundColor: theme.border }]} />
              <View style={s.row}>
                <Text style={[s.rowLabel, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Resultado</Text>
                <Text style={[s.rowValue, { color: total.income - total.expense >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                  {maskValue(formatBRL(total.income - total.expense))}
                </Text>
              </View>
            </View>

            {report.months?.map((month: string, idx: number) => {
              const expanded = expandedMonth === month;
              const monthIncome = report.rows
                ?.filter((r: DreCategoryRow) => r.type === 'income')
                .reduce((s: number, r: DreCategoryRow) => s + (r.totals[idx] ?? 0), 0) ?? 0;
              const monthExpense = report.rows
                ?.filter((r: DreCategoryRow) => r.type === 'expense')
                .reduce((s: number, r: DreCategoryRow) => s + (r.totals[idx] ?? 0), 0) ?? 0;
              const net = monthIncome - monthExpense;
              return (
                <Pressable
                  key={month}
                  onPress={() => setExpandedMonth(expanded ? null : month)}
                  style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={s.monthHeader}>
                    <Text style={[s.monthLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {formatMonthYear(month)}
                    </Text>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[s.monthNet, { color: net >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                        {net >= 0 ? '+' : ''}{maskValue(formatBRL(net))}
                      </Text>
                      <Text style={[s.monthSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        R: {maskValue(formatBRL(monthIncome, true))} · D: {maskValue(formatBRL(monthExpense, true))}
                      </Text>
                    </View>
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textTertiary} />
                  </View>
                  {expanded && (
                    <View style={{ gap: 8, marginTop: 4 }}>
                      {report.rows
                        ?.filter((r: DreCategoryRow) => (r.totals[idx] ?? 0) > 0)
                        .sort((a: DreCategoryRow, b: DreCategoryRow) => (b.totals[idx] ?? 0) - (a.totals[idx] ?? 0))
                        .map((r: DreCategoryRow) => (
                          <View key={r.category} style={s.catRow}>
                            <View style={[s.catDot, { backgroundColor: r.type === 'income' ? colors.primary : colors.danger }]} />
                            <Text style={[s.catLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                              {r.category}
                            </Text>
                            <Text style={[s.catValue, { color: r.type === 'income' ? colors.primary : colors.danger, fontFamily: 'Inter_500Medium' }]}>
                              {r.type === 'income' ? '+' : '-'}{maskValue(formatBRL(r.totals[idx] ?? 0, true))}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  periodText: { fontSize: 13 },
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardTitle: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  divider: { height: 1 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthLabel: { flex: 1, fontSize: 15 },
  monthNet: { fontSize: 15 },
  monthSub: { fontSize: 11 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { flex: 1, fontSize: 13 },
  catValue: { fontSize: 13 },
});
