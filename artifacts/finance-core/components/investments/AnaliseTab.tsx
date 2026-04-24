import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, Alert } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  fetchPortfolioReturns, fetchRiskAnalysis, fetchDrawdown, fetchSortino, fetchBeta,
  fetchBenchmarking, fetchSectorAnalysis, fetchSuggestedAllocations, fetchRebalance,
  fetchCorrelation, fetchXirr,
  type PortfolioReturns, type RiskAnalysis, type DrawdownAnalysis, type SortinoAnalysis,
  type BetaAnalysis, type BenchmarkingResult, type SectorAnalysis, type SuggestedAllocation,
  type RebalanceResult, type CorrelationMatrix, type XirrResult,
} from '@/services/portfolio';

interface Props { portfolioId?: string; }

interface MetricItem { label: string; value: string; tone?: 'success' | 'danger' | 'neutral'; hint?: string; }

function MetricRow({ items }: { items: MetricItem[] }) {
  const { theme, colors } = useTheme();
  const tone = (t?: MetricItem['tone']) =>
    t === 'success' ? colors.success : t === 'danger' ? colors.danger : theme.text;
  return (
    <View style={styles.metricGrid}>
      {items.map((m, i) => (
        <View key={`${m.label}-${i}`} style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: theme.textTertiary }]}>{m.label}</Text>
          <Text style={[styles.metricValue, { color: tone(m.tone) }]}>{m.value}</Text>
          {m.hint ? <Text style={[styles.metricHint, { color: theme.textTertiary }]}>{m.hint}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function pct(v: number | null | undefined, decimals = 2): string {
  if (v == null || !isFinite(v as number)) return '—';
  return `${(v as number).toFixed(decimals)}%`;
}

function num(v: number | null | undefined, decimals = 2): string {
  if (v == null || !isFinite(v as number)) return '—';
  return (v as number).toFixed(decimals);
}

export function AnaliseTab({ portfolioId }: Props) {
  const { theme, colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<PortfolioReturns | null>(null);
  const [xirr, setXirr] = useState<XirrResult | null>(null);
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [drawdown, setDrawdown] = useState<DrawdownAnalysis | null>(null);
  const [sortino, setSortino] = useState<SortinoAnalysis | null>(null);
  const [beta, setBeta] = useState<BetaAnalysis | null>(null);
  const [bench, setBench] = useState<BenchmarkingResult | null>(null);
  const [sector, setSector] = useState<SectorAnalysis | null>(null);
  const [suggested, setSuggested] = useState<SuggestedAllocation[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationMatrix | null>(null);
  const [showRebalance, setShowRebalance] = useState(false);
  const [rebalance, setRebalance] = useState<RebalanceResult | null>(null);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, x, ra, dd, so, be, bn, se, sg, co] = await Promise.all([
        fetchPortfolioReturns(undefined, undefined, portfolioId),
        fetchXirr(undefined, undefined, portfolioId),
        fetchRiskAnalysis(portfolioId),
        fetchDrawdown(portfolioId),
        fetchSortino(portfolioId),
        fetchBeta(portfolioId),
        fetchBenchmarking('1y', portfolioId),
        fetchSectorAnalysis(portfolioId),
        fetchSuggestedAllocations(),
        fetchCorrelation(portfolioId),
      ]);
      setReturns(r); setXirr(x); setRisk(ra); setDrawdown(dd); setSortino(so);
      setBeta(be); setBench(bn); setSector(se); setSuggested(sg); setCorrelation(co);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { load(); }, [load]);

  const handleRebalance = async () => {
    Haptics.selectionAsync();
    setRebalanceLoading(true);
    setShowRebalance(true);
    const result = await fetchRebalance(portfolioId);
    setRebalance(result);
    setRebalanceLoading(false);
  };

  const ddSeries = useMemo(() => {
    if (!drawdown?.series?.length) return [];
    const stride = Math.max(1, Math.floor(drawdown.series.length / 80));
    return drawdown.series
      .filter((_, i) => i % stride === 0)
      .map((p) => ({ value: Number((p.drawdown * 100).toFixed(2)), label: '' }));
  }, [drawdown]);

  const benchSeries = useMemo(() => {
    if (!bench?.series?.length) return null;
    const stride = Math.max(1, Math.floor(bench.series.length / 60));
    const items = bench.series.filter((_, i) => i % stride === 0);
    return {
      portfolio: items.map((p) => ({ value: Number((p.portfolio * 100).toFixed(2)) })),
      cdi: items.map((p) => ({ value: p.cdi != null ? Number((p.cdi * 100).toFixed(2)) : 0 })),
      ibov: items.map((p) => ({ value: p.ibov != null ? Number((p.ibov * 100).toFixed(2)) : 0 })),
    };
  }, [bench]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const insufficient = returns?.insufficientData;

  return (
    <View style={{ gap: 12 }}>
      {/* Retorno: TWR / MWR / XIRR */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="trending-up" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Retorno</Text>
        </View>
        {insufficient ? (
          <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13 }}>
            Histórico insuficiente. Necessários ~{returns?.requiredPoints ?? 60} dias de cotações; atuais: {returns?.availablePoints ?? 0}.
          </Text>
        ) : (
          <MetricRow items={[
            { label: 'TWR (acum.)',     value: pct(returns?.twr),            tone: (returns?.twr ?? 0) >= 0 ? 'success' : 'danger' },
            { label: 'TWR (anualiz.)',  value: pct(returns?.twrAnnualized),  tone: (returns?.twrAnnualized ?? 0) >= 0 ? 'success' : 'danger' },
            { label: 'MWR',             value: pct(returns?.mwr),            tone: (returns?.mwr ?? 0) >= 0 ? 'success' : 'danger' },
            { label: 'XIRR',            value: pct(xirr?.xirr),              tone: (xirr?.xirr ?? 0) >= 0 ? 'success' : 'danger', hint: xirr?.converged ? 'Convergiu' : xirr?.xirr != null ? 'Aproximado' : undefined },
          ]} />
        )}
      </Card>

      {/* Risco */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="shield" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Risco</Text>
        </View>
        <MetricRow items={[
          { label: 'Volatilidade anual', value: pct(risk?.volatilityAnnualized) },
          { label: 'Sharpe',             value: num(risk?.sharpe),  tone: (risk?.sharpe ?? 0) >= 1 ? 'success' : 'neutral' },
          { label: 'Sortino',            value: num(sortino?.sortino) },
          { label: `Beta vs ${beta?.benchmark || 'IBOV'}`, value: num(beta?.beta) },
          { label: 'Alpha',              value: pct(risk?.alpha) },
          { label: 'R²',                 value: num(risk?.rSquared) },
        ]} />
        {risk?.observations === 0 && (
          <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
            Dados insuficientes para calcular métricas de risco.
          </Text>
        )}
      </Card>

      {/* Drawdown */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="trending-down" size={16} color={colors.danger} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Drawdown</Text>
        </View>
        <MetricRow items={[
          { label: 'Máximo',          value: pct(drawdown?.maxDrawdown != null ? drawdown.maxDrawdown * 100 : null), tone: 'danger' },
          { label: 'Duração (dias)',  value: drawdown?.durationDays != null ? String(drawdown.durationDays) : '—' },
          { label: 'Recuperação',     value: drawdown?.recoveryDate || '—', hint: drawdown?.recoveryDate ? 'Recuperado' : 'Em curso' },
        ]} />
        {ddSeries.length > 1 ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <LineChart
              data={ddSeries}
              width={300}
              height={120}
              hideDataPoints
              areaChart
              startFillColor={colors.danger}
              endFillColor={colors.danger}
              startOpacity={0.3}
              endOpacity={0.05}
              color={colors.danger}
              thickness={2}
              noOfSections={4}
              rulesColor={theme.border}
              yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
              xAxisColor="transparent"
              yAxisColor="transparent"
              isAnimated
              animationDuration={500}
            />
          </View>
        ) : null}
      </Card>

      {/* Benchmarking */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="bar-chart-2" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Benchmarking · {bench?.period || '1y'}</Text>
        </View>
        <MetricRow items={[
          { label: 'Carteira', value: pct(bench?.portfolioReturn != null ? bench.portfolioReturn * 100 : null), tone: (bench?.portfolioReturn ?? 0) >= 0 ? 'success' : 'danger' },
          { label: 'CDI',      value: pct(bench?.cdiReturn      != null ? bench.cdiReturn * 100 : null) },
          { label: 'IBOV',     value: pct(bench?.ibovReturn     != null ? bench.ibovReturn * 100 : null) },
          { label: 'IPCA',     value: pct(bench?.ipcaReturn     != null ? bench.ipcaReturn * 100 : null) },
        ]} />
        {benchSeries && benchSeries.portfolio.length > 1 ? (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <LineChart
              data={benchSeries.portfolio}
              data2={benchSeries.cdi}
              data3={benchSeries.ibov}
              width={300}
              height={140}
              hideDataPoints
              color1={colors.primary}
              color2={colors.warning}
              color3={colors.info ?? '#888'}
              thickness={2}
              noOfSections={4}
              rulesColor={theme.border}
              yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
              xAxisColor="transparent"
              yAxisColor="transparent"
              isAnimated
              animationDuration={500}
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {[
                { label: 'Carteira', color: colors.primary },
                { label: 'CDI',      color: colors.warning },
                { label: 'IBOV',     color: colors.info ?? '#888' },
              ].map((l) => (
                <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
                  <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{l.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </Card>

      {/* Setores */}
      {sector && sector.sectors.length > 0 && (
        <Card>
          <View style={styles.cardHeader}>
            <Icon name="layers" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Concentração por setor</Text>
            {sector.concentrationLevel ? (
              <View style={[styles.badge, {
                backgroundColor:
                  sector.concentrationLevel === 'baixa'    ? `${colors.success}20` :
                  sector.concentrationLevel === 'moderada' ? `${colors.warning}20` :
                                                              `${colors.danger}20`,
              }]}>
                <Text style={{
                  color:
                    sector.concentrationLevel === 'baixa'    ? colors.success :
                    sector.concentrationLevel === 'moderada' ? colors.warning :
                                                                colors.danger,
                  fontSize: 10, fontFamily: 'Inter_600SemiBold',
                }}>
                  {sector.concentrationLevel.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ gap: 8 }}>
            {sector.sectors.map((s) => (
              <View key={s.sector}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>{s.sector}</Text>
                  <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                    {s.percent.toFixed(1)}% · {s.count} {s.count === 1 ? 'ativo' : 'ativos'}
                  </Text>
                </View>
                <View style={[styles.bar, { backgroundColor: theme.surfaceElevated }]}>
                  <View style={[styles.barFill, { width: `${Math.min(100, s.percent)}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            ))}
          </View>
          {sector.hhi != null && (
            <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
              HHI: {sector.hhi.toFixed(0)} (quanto menor, mais diversificado)
            </Text>
          )}
        </Card>
      )}

      {/* Alocações sugeridas */}
      {suggested.length > 0 && (
        <Card>
          <View style={styles.cardHeader}>
            <Icon name="target" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Alocação sugerida</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {suggested.map((p) => {
              const tint = p.profile === 'conservador' ? colors.info ?? '#3B82F6' :
                           p.profile === 'agressivo'   ? colors.danger :
                                                          colors.primary;
              return (
                <View key={p.profile} style={[styles.profileCard, { borderColor: tint, backgroundColor: `${tint}10` }]}>
                  <Text style={{ color: tint, fontFamily: 'Inter_700Bold', fontSize: 13, textTransform: 'capitalize' }}>{p.profile}</Text>
                  <View style={{ gap: 4, marginTop: 8 }}>
                    {p.allocations.slice(0, 6).map((a) => (
                      <View key={a.type} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1 }} numberOfLines={1}>{a.type}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{a.targetPercent.toFixed(0)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Card>
      )}

      {/* Correlação */}
      {correlation && correlation.tickers.length > 1 && (
        <Card padding={0}>
          <View style={[styles.cardHeader, { padding: 16, paddingBottom: 8 }]}>
            <Icon name="swap" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Correlação entre ativos</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={[styles.corrRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.corrCell, { width: 70 }]}><Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold' }} /></View>
                {correlation.tickers.map((t) => (
                  <View key={t} style={[styles.corrCell, { width: 60 }]}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{t}</Text>
                  </View>
                ))}
              </View>
              {correlation.matrix.map((row) => (
                <View key={row.ticker} style={[styles.corrRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.corrCell, { width: 70 }]}>
                    <Text style={{ color: theme.text, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{row.ticker}</Text>
                  </View>
                  {correlation.tickers.map((t) => {
                    const cell = row.values.find((v) => v.ticker === t);
                    const c = cell?.correlation ?? 0;
                    const intensity = Math.min(1, Math.abs(c));
                    const bg = c >= 0 ? `rgba(0, 200, 100, ${intensity * 0.5})` : `rgba(255, 70, 70, ${intensity * 0.5})`;
                    return (
                      <View key={`${row.ticker}-${t}`} style={[styles.corrCell, { width: 60, backgroundColor: bg }]}>
                        <Text style={{ color: theme.text, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{cell ? cell.correlation.toFixed(2) : '—'}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      )}

      {/* Rebalanceamento */}
      <Button label="Sugestão de rebalanceamento" onPress={handleRebalance} fullWidth testID="open-rebalance" />

      <Modal visible={showRebalance} transparent animationType="slide" onRequestClose={() => setShowRebalance(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Rebalanceamento</Text>
              <PressableScale onPress={() => setShowRebalance(false)} hitSlop={10} testID="close-rebalance">
                <Icon name="close" size={22} color={theme.textTertiary} />
              </PressableScale>
            </View>
            {rebalanceLoading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !rebalance || rebalance.suggestions.length === 0 ? (
              <EmptyState
                icon="check-circle"
                title="Carteira balanceada"
                description={rebalance?.message || 'Não há sugestões no momento.'}
              />
            ) : (
              <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 12 }}>Total da carteira</Text>
                  <Money value={rebalance.totalValue} size="sm" weight="700" />
                </View>
                {rebalance.suggestions.map((s, i) => {
                  const actionColor =
                    s.action === 'buy'  ? colors.success :
                    s.action === 'sell' ? colors.danger :
                                          theme.textSecondary;
                  return (
                    <View key={`${s.type}-${i}`} style={[styles.rebRow, { borderColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 14, fontFamily: 'Inter_700Bold' }}>{s.type}</Text>
                        <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                          Atual {s.currentPercent.toFixed(1)}% → alvo {s.targetPercent.toFixed(1)}%
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: actionColor, fontSize: 13, fontFamily: 'Inter_700Bold' }}>
                          {s.action === 'buy' ? 'COMPRAR' : s.action === 'sell' ? 'VENDER' : 'MANTER'}
                        </Text>
                        {s.action !== 'hold' && (
                          <Money value={Math.abs(s.delta)} size="sm" weight="700" color={actionColor} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metricCell: { width: '50%', paddingVertical: 8, paddingRight: 10 },
  metricLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  metricValue: { fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 2 },
  metricHint: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 1 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  profileCard: { width: 200, borderRadius: 12, padding: 12, borderWidth: 1 },
  corrRow: { flexDirection: 'row', borderBottomWidth: 1 },
  corrCell: { padding: 10, alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rebRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
});
