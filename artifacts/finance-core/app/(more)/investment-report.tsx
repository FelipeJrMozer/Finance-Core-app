import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';
import { apiGet } from '@/services/api';
import { useBenchmarks } from '@/services/benchmarks';
import { fetchPortfolioReturns, type PortfolioReturns } from '@/services/portfolio';

const { width } = Dimensions.get('window');
const CHART_W = width - 64;

type TabId = 'dividendos' | 'performance' | 'historico';

interface DividendApiItem {
  id?: string;
  investmentId?: string;
  ticker?: string;
  amount: number | string;
  paidAt?: string;
  date?: string;
  month?: string; // "YYYY-MM"
}

interface DividendByMonth { ym: string; amount: number; label: string }
interface DividendByTicker { ticker: string; name?: string; amount: number }

function lastSixMonths(): { ym: string; label: string }[] {
  const out: { ym: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ ym, label: d.toLocaleDateString('pt-BR', { month: 'short' }) });
  }
  return out;
}

function ymOf(item: DividendApiItem): string | null {
  if (item.month && /^\d{4}-\d{2}/.test(item.month)) return item.month.slice(0, 7);
  const raw = item.paidAt || item.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function EmptyState({ title, message, theme }: { title: string; message: string; theme: any }) {
  return (
    <View style={[styles.empty, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <Feather name="inbox" size={28} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{title}</Text>
      <Text style={[styles.emptyMsg, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{message}</Text>
    </View>
  );
}

export default function InvestmentReportScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { investments } = useFinance();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('dividendos');
  const { data: bench, isStale: benchStale, source: benchSource } = useBenchmarks();

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'dividendos', label: 'Dividendos', icon: 'dollar-sign' },
    { id: 'performance', label: 'Performance', icon: 'trending-up' },
    { id: 'historico', label: 'Histórico', icon: 'clock' },
  ];

  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.avgPrice, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  // ── Real dividends from backend ──
  const [dividendsLoading, setDividendsLoading] = useState(false);
  const [dividendsError, setDividendsError] = useState(false);
  const [dividendsItems, setDividendsItems] = useState<DividendApiItem[]>([]);

  const fetchDividends = useCallback(async () => {
    setDividendsLoading(true);
    setDividendsError(false);
    try {
      // Last 6 months window
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      // TODO: confirmar endpoint final no backend; usando query padrão.
      const res = await apiGet<unknown>(
        `/api/investments/dividends?from=${fmt(start)}&to=${fmt(end)}`
      );
      // Validar estritamente o payload — backend pode retornar formatos diferentes.
      let list: DividendApiItem[] = [];
      if (Array.isArray(res)) {
        list = res as DividendApiItem[];
      } else if (res && typeof res === 'object' && Array.isArray((res as any).items)) {
        list = (res as any).items as DividendApiItem[];
      }
      // Filtrar entradas inválidas (sem amount).
      list = list.filter((it) => it && (typeof it.amount === 'number' || typeof it.amount === 'string'));
      setDividendsItems(list);
    } catch {
      setDividendsError(true);
      setDividendsItems([]);
    } finally {
      setDividendsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDividends(); }, [fetchDividends]);

  // ── Portfolio TWR / MWR ──
  const [returns, setReturns] = useState<PortfolioReturns | null>(null);
  const [returnsLoading, setReturnsLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setReturnsLoading(true);
    fetchPortfolioReturns()
      .then((r) => { if (!cancelled) setReturns(r); })
      .finally(() => { if (!cancelled) setReturnsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const months = lastSixMonths();
  const dividendByMonth: DividendByMonth[] = months.map((m) => {
    const total = dividendsItems
      .filter((it) => ymOf(it) === m.ym)
      .reduce((s, it) => s + (Number(it.amount) || 0), 0);
    return { ym: m.ym, label: m.label, amount: total };
  });

  const totalDividends = dividendByMonth.reduce((s, d) => s + d.amount, 0);
  const hasDividends = totalDividends > 0;

  const dividendByTicker: DividendByTicker[] = (() => {
    if (!hasDividends) return [];
    const map = new Map<string, DividendByTicker>();
    for (const it of dividendsItems) {
      const inv = investments.find((i) => i.id === it.investmentId || i.ticker === it.ticker);
      const ticker = inv?.ticker || it.ticker || '?';
      const name = inv?.name;
      const amount = Number(it.amount) || 0;
      const cur = map.get(ticker);
      if (cur) {
        cur.amount += amount;
      } else {
        map.set(ticker, { ticker, name, amount });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  })();

  const dividendBars = dividendByMonth.map((d) => ({
    value: Math.round(d.amount),
    label: d.label,
    frontColor: colors.primary,
  }));

  const cdiAnnual = bench?.cdi ?? null;
  const ibovAnnual = bench?.ibov ?? null;

  const performanceData = [
    { label: 'Carteira', value: totalReturn, color: totalReturn >= 0 ? colors.success : colors.danger, available: true as const },
    { label: 'CDI', value: cdiAnnual ?? 0, color: '#F59E0B', available: cdiAnnual !== null },
    { label: 'IBOV', value: ibovAnnual ?? 0, color: '#9C27B0', available: ibovAnnual !== null },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {tabs.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => { Haptics.selectionAsync(); setTab(t.id); }}
            style={[styles.tab, tab === t.id && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Feather name={t.icon as any} size={14} color={tab === t.id ? colors.primary : theme.textTertiary} />
            <Text style={[styles.tabLabel, { color: tab === t.id ? colors.primary : theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Investido</Text>
              <Text style={[styles.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalInvested))}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Retorno total</Text>
              <Text style={[styles.summaryReturn, { color: totalReturn >= 0 ? colors.success : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {tab === 'dividendos' && (
          <>
            {dividendsLoading && (
              <Text style={{ color: theme.textTertiary, textAlign: 'center', fontFamily: 'Inter_400Regular' }}>
                Carregando dividendos…
              </Text>
            )}
            {!dividendsLoading && !hasDividends && (
              <EmptyState
                theme={theme}
                title={dividendsError ? 'Não foi possível carregar' : 'Sem dividendos registrados no período'}
                message={dividendsError
                  ? 'Tente novamente mais tarde ou registre os dividendos manualmente.'
                  : 'Quando você receber dividendos, eles aparecerão aqui automaticamente.'
                }
              />
            )}
            {!dividendsLoading && hasDividends && (
              <>
                <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Total recebido no semestre</Text>
                  <Text style={[styles.bigValue, { color: colors.success, fontFamily: 'Inter_800ExtraBold' }]}>{maskValue(formatBRL(totalDividends))}</Text>
                  <BarChart
                    data={dividendBars}
                    width={CHART_W}
                    height={150}
                    barWidth={30}
                    spacing={10}
                    frontColor={colors.primary}
                    xAxisColor={theme.border}
                    yAxisColor={theme.border}
                    yAxisTextStyle={{ color: theme.textTertiary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9 }}
                    noOfSections={4}
                    isAnimated
                  />
                </View>
                {dividendByTicker.map((row) => (
                  <View key={row.ticker} style={[styles.divRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View>
                      <Text style={[styles.ticker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{row.ticker}</Text>
                      {row.name && (
                        <Text style={[styles.invName, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{row.name}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.divAmount, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>
                        {maskValue(formatBRL(row.amount))}
                      </Text>
                      <Text style={[styles.divLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>recebido</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'performance' && (
          <>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Retorno da Carteira (TWR & MWR)
            </Text>
            {returnsLoading ? (
              <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Calculando…</Text>
            ) : !returns || returns.insufficientData ? (
              <View style={{ gap: 6 }}>
                <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {returns?.message || 'Dados insuficientes para calcular TWR/MWR.'}
                </Text>
                {returns && returns.requiredPoints > 0 && (
                  <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {returns.availablePoints}/{returns.requiredPoints} pontos diários disponíveis. Continue registrando movimentações.
                  </Text>
                )}
              </View>
            ) : (
              <>
                <View style={styles.perfRow}>
                  <Text style={[styles.perfLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', width: 70 }]}>TWR</Text>
                  <View style={[styles.perfBarBg, { backgroundColor: theme.surfaceElevated, flex: 1 }]}>
                    <View style={[styles.perfBarFill, {
                      width: `${Math.min(100, Math.abs((returns.twr ?? 0) * 100) * 4)}%`,
                      backgroundColor: (returns.twr ?? 0) >= 0 ? colors.success : colors.danger,
                    }]} />
                  </View>
                  <Text style={[styles.perfPct, { color: (returns.twr ?? 0) >= 0 ? colors.success : colors.danger, fontFamily: 'Inter_700Bold', width: 70, textAlign: 'right' }]}>
                    {returns.twr != null ? `${(returns.twr * 100).toFixed(2)}%` : '—'}
                  </Text>
                </View>
                <View style={styles.perfRow}>
                  <Text style={[styles.perfLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', width: 70 }]}>MWR</Text>
                  <View style={[styles.perfBarBg, { backgroundColor: theme.surfaceElevated, flex: 1 }]}>
                    <View style={[styles.perfBarFill, {
                      width: `${Math.min(100, Math.abs((returns.mwr ?? 0) * 100) * 4)}%`,
                      backgroundColor: (returns.mwr ?? 0) >= 0 ? colors.success : colors.danger,
                    }]} />
                  </View>
                  <Text style={[styles.perfPct, { color: (returns.mwr ?? 0) >= 0 ? colors.success : colors.danger, fontFamily: 'Inter_700Bold', width: 70, textAlign: 'right' }]}>
                    {returns.mwr != null ? `${(returns.mwr * 100).toFixed(2)}%` : '—'}
                  </Text>
                </View>
                {returns.twrAnnualized != null && (
                  <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    TWR anualizado: {(returns.twrAnnualized * 100).toFixed(2)}%
                  </Text>
                )}
                <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  TWR isola o desempenho da carteira; MWR considera o impacto das suas entradas e saídas.
                </Text>
              </>
            )}
          </View>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Comparativo de Rentabilidade</Text>
            {benchSource === 'none' && (
              <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Não foi possível carregar índices atuais (CDI/IBOV).
              </Text>
            )}
            {benchStale && (
              <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Não foi possível carregar índices atuais. Usando últimos valores conhecidos.
              </Text>
            )}
            {performanceData.map((p) => (
              <View key={p.label} style={styles.perfRow}>
                <Text style={[styles.perfLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', width: 70 }]}>{p.label}</Text>
                <View style={[styles.perfBarBg, { backgroundColor: theme.surfaceElevated, flex: 1 }]}>
                  <View style={[styles.perfBarFill, {
                    width: `${Math.min(100, Math.abs(p.value) * 4)}%`,
                    backgroundColor: p.color,
                    opacity: p.available ? 1 : 0.3,
                  }]} />
                </View>
                <Text style={[styles.perfPct, { color: p.color, fontFamily: 'Inter_700Bold', width: 60, textAlign: 'right' }]}>
                  {p.available ? `${p.value >= 0 ? '+' : ''}${p.value.toFixed(1)}%` : '—'}
                </Text>
              </View>
            ))}
            <Text style={[styles.perfNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              * CDI e IBOV usam referências anuais
            </Text>
          </View>
          </>
        )}

        {tab === 'historico' && (
          <EmptyState
            theme={theme}
            title="Histórico patrimonial indisponível"
            message="A evolução patrimonial será exibida quando o backend disponibilizar dados históricos diários da carteira."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabLabel: { fontSize: 13 },
  summaryCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, marginBottom: 2 },
  summaryValue: { fontSize: 18 },
  summaryReturn: { fontSize: 20 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
  cardTitle: { fontSize: 15 },
  bigValue: { fontSize: 24 },
  divRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1 },
  ticker: { fontSize: 15 },
  invName: { fontSize: 12, marginTop: 2 },
  divAmount: { fontSize: 15 },
  divLabel: { fontSize: 11, marginTop: 2 },
  perfRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  perfLabel: { fontSize: 13 },
  perfBarBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  perfBarFill: { height: 10, borderRadius: 5 },
  perfPct: { fontSize: 13 },
  perfNote: { fontSize: 11, marginTop: 4 },
  empty: { alignItems: 'center', gap: 10, padding: 24, borderRadius: 16, borderWidth: 1 },
  emptyTitle: { fontSize: 15, textAlign: 'center' },
  emptyMsg: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
