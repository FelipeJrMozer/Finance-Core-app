import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl, TextInput, Modal,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BarChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  fetchFundamentalAnalysis, fetchStockScorecard,
  type FundamentalAnalysis, type StockScorecard,
} from '@/services/stockAnalysis';
import { fetchDividends, type Dividend } from '@/services/dividends';
import { addToWatchlist, listWatchlist, removeFromWatchlist, type WatchlistItem } from '@/services/watchlist';
import { createPriceAlert } from '@/services/priceAlerts';

interface FundamentalRow {
  key: keyof FundamentalAnalysis;
  label: string;
  format: (v: any) => string;
}

const FUND_ROWS: FundamentalRow[] = [
  { key: 'pl',            label: 'P/L',            format: (v) => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'pvp',           label: 'P/VP',           format: (v) => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'roe',           label: 'ROE',            format: (v) => v != null ? `${Number(v).toFixed(1)}%` : '—' },
  { key: 'roic',          label: 'ROIC',           format: (v) => v != null ? `${Number(v).toFixed(1)}%` : '—' },
  { key: 'dividendYield', label: 'Dividend Yield', format: (v) => v != null ? `${Number(v).toFixed(2)}%` : '—' },
  { key: 'netMargin',     label: 'Margem Líquida', format: (v) => v != null ? `${Number(v).toFixed(1)}%` : '—' },
  { key: 'cagr5y',        label: 'CAGR 5a',        format: (v) => v != null ? `${Number(v).toFixed(1)}%` : '—' },
  { key: 'beta',          label: 'Beta',           format: (v) => v != null ? Number(v).toFixed(2) : '—' },
  { key: 'payout',        label: 'Payout',         format: (v) => v != null ? `${Number(v).toFixed(1)}%` : '—' },
  { key: 'debtToEquity',  label: 'Dívida/PL',      format: (v) => v != null ? Number(v).toFixed(2) : '—' },
];

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const angle = pct * 180;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <View style={{ width: 200, height: 110, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 200, height: 100, borderTopLeftRadius: 100, borderTopRightRadius: 100,
          backgroundColor: theme.surfaceElevated, position: 'absolute', top: 0,
        }} />
        <View style={{
          width: 200, height: 100, position: 'absolute', top: 0,
          overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end',
        }}>
          <View style={{
            width: 200, height: 100, borderTopLeftRadius: 100, borderTopRightRadius: 100,
            backgroundColor: color, transform: [{ rotate: `${-180 + angle}deg` }],
            transformOrigin: '50% 100%' as any,
          }} />
        </View>
        <View style={{
          width: 152, height: 76, borderTopLeftRadius: 76, borderTopRightRadius: 76,
          backgroundColor: theme.surface, position: 'absolute', top: 24,
        }} />
        <View style={{ position: 'absolute', top: 36, alignItems: 'center' }}>
          <Text style={{ color, fontSize: 32, fontFamily: 'Inter_700Bold' }}>{Math.round(score)}</Text>
          <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>/ 100</Text>
        </View>
      </View>
    </View>
  );
}

function ratingColor(score: number, primary: string, success: string, warning: string, danger: string): string {
  if (score >= 80) return success;
  if (score >= 60) return primary;
  if (score >= 40) return warning;
  return danger;
}

export default function StockDetailScreen() {
  const params = useLocalSearchParams<{ ticker: string }>();
  const ticker = String(params?.ticker || '').toUpperCase();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scorecard, setScorecard] = useState<StockScorecard | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalAnalysis | null>(null);
  const [divs, setDivs] = useState<Dividend[]>([]);
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertValue, setAlertValue] = useState('');
  const [alertCondition, setAlertCondition] = useState<'above' | 'below'>('above');
  const [savingAlert, setSavingAlert] = useState(false);

  const load = useCallback(async () => {
    if (!ticker) return;
    try {
      const [s, f, d, w] = await Promise.all([
        fetchStockScorecard(ticker),
        fetchFundamentalAnalysis(ticker),
        fetchDividends(),
        listWatchlist(),
      ]);
      setScorecard(s);
      setFundamentals(f);
      setDivs(d.filter((x) => (x.ticker || '').toUpperCase() === ticker));
      setWatchlistItem(w.find((x) => x.ticker === ticker) || null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const dividendsByYear = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const d of divs) {
      const y = d.paymentDate?.slice(0, 4);
      if (!y) continue;
      acc[y] = (acc[y] || 0) + d.amount;
    }
    const years = Object.keys(acc).sort().slice(-5);
    return years.map((y) => ({ value: acc[y], label: y, frontColor: colors.primary }));
  }, [divs, colors.primary]);

  const handleToggleWatchlist = async () => {
    Haptics.selectionAsync();
    if (watchlistItem) {
      const ok = await removeFromWatchlist(watchlistItem.id);
      if (ok) setWatchlistItem(null);
    } else {
      try {
        const created = await addToWatchlist({ ticker });
        if (created) {
          setWatchlistItem(created);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e: any) {
        Alert.alert('Erro', e?.message || 'Falha ao adicionar à watchlist.');
      }
    }
  };

  const handleSaveAlert = async () => {
    const v = Number(alertValue.replace(',', '.'));
    if (!isFinite(v) || v <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    setSavingAlert(true);
    try {
      const created = await createPriceAlert({ ticker, condition: alertCondition, targetValue: v });
      if (created) {
        setShowAlert(false);
        setAlertValue('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Pronto', 'Alerta criado com sucesso.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao criar alerta.');
    } finally {
      setSavingAlert(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const score = scorecard?.score ?? 0;
  const sc = ratingColor(score, colors.primary, colors.success, colors.warning, colors.danger);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: ticker }} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  if (!ticker) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ativo' }} />
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <EmptyState icon="alert-circle" title="Ticker inválido" description="Volte e selecione um ativo." />
        </View>
      </>
    );
  }

  const noData = !fundamentals?.price && !scorecard?.score && fundamentals?.message;

  return (
    <>
      <Stack.Screen options={{ title: ticker }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Hero */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <View style={[styles.heroAvatar, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 14 }}>{ticker.slice(0, 4)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 22, fontFamily: 'Inter_700Bold' }}>{ticker}</Text>
              {fundamentals?.name ? (
                <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }} numberOfLines={2}>
                  {fundamentals.name}
                </Text>
              ) : null}
              {fundamentals?.sector ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Icon name="layers" size={11} color={theme.textTertiary} />
                  <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                    {fundamentals.sector}{fundamentals.segment ? ` · ${fundamentals.segment}` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {fundamentals?.price != null ? (
                <Money value={fundamentals.price} size="lg" weight="700" />
              ) : (
                <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular' }}>—</Text>
              )}
              {fundamentals?.changePercent != null && (
                <Text style={{
                  color: fundamentals.changePercent >= 0 ? colors.success : colors.danger,
                  fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2,
                }}>
                  {fundamentals.changePercent >= 0 ? '+' : ''}{fundamentals.changePercent.toFixed(2)}%
                </Text>
              )}
            </View>
          </View>
        </Card>

        {noData && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="alert" size={18} color={colors.warning} />
              <Text style={{ color: theme.text, flex: 1, fontFamily: 'Inter_500Medium' }}>
                Dados indisponíveis para este ativo no momento.
              </Text>
            </View>
          </Card>
        )}

        {/* Scorecard */}
        {scorecard && (scorecard.score > 0 || scorecard.categories.length > 0) && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Icon name="award" size={16} color={colors.primary} />
              <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>Score Pilar</Text>
              {scorecard.rating ? (
                <View style={[styles.badge, { backgroundColor: `${sc}20` }]}>
                  <Text style={{ color: sc, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{scorecard.rating}</Text>
                </View>
              ) : null}
            </View>
            <ScoreGauge score={scorecard.score} color={sc} />
            {scorecard.recommendation ? (
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 19, fontFamily: 'Inter_400Regular' }}>
                {scorecard.recommendation}
              </Text>
            ) : null}
            {scorecard.categories.length > 0 && (
              <View style={{ gap: 8, marginTop: 8 }}>
                {scorecard.categories.map((c) => (
                  <View key={c.name}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>{c.name}</Text>
                      <Text style={{ color: theme.text, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>{c.score.toFixed(0)}/100</Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: theme.surfaceElevated }]}>
                      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, c.score))}%`, backgroundColor: ratingColor(c.score, colors.primary, colors.success, colors.warning, colors.danger) }]} />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Fundamentos */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Icon name="bar-chart-2" size={16} color={colors.primary} />
            <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>Fundamentos</Text>
          </View>
          <View style={styles.fundGrid}>
            {FUND_ROWS.map((row) => (
              <View key={String(row.key)} style={[styles.fundCell, { borderColor: theme.border }]}>
                <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_500Medium' }}>{row.label}</Text>
                <Text style={{ color: theme.text, fontSize: 16, marginTop: 2, fontFamily: 'Inter_700Bold' }}>
                  {row.format(fundamentals?.[row.key])}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Histórico de dividendos */}
        {dividendsByYear.length > 0 && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="dividends" size={16} color={colors.primary} />
              <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>Dividendos por ano</Text>
            </View>
            <BarChart
              data={dividendsByYear}
              width={300}
              height={140}
              barWidth={36}
              barBorderRadius={5}
              noOfSections={4}
              rulesColor={theme.border}
              yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
              xAxisColor={theme.border}
              yAxisColor="transparent"
              xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_500Medium' }}
              isAnimated
              animationDuration={500}
            />
          </Card>
        )}

        {/* Ações */}
        <View style={{ gap: 8 }}>
          <Button
            label="+ Adicionar à carteira"
            variant="primary"
            onPress={() => {
              Haptics.selectionAsync();
              router.push({
                pathname: '/investment/add',
                params: {
                  ticker,
                  name: fundamentals?.name || ticker,
                  price: fundamentals?.price ? fundamentals.price.toFixed(2).replace('.', ',') : '',
                },
              });
            }}
            fullWidth
            testID="add-to-portfolio"
          />
          <Button
            label={watchlistItem ? '★ Remover da watchlist' : '★ Adicionar à watchlist'}
            variant="secondary"
            onPress={handleToggleWatchlist}
            fullWidth
            testID="toggle-watchlist"
          />
          <Button
            label="🔔 Criar alerta de preço"
            variant="secondary"
            onPress={() => {
              Haptics.selectionAsync();
              setAlertValue(fundamentals?.price ? fundamentals.price.toFixed(2).replace('.', ',') : '');
              setShowAlert(true);
            }}
            fullWidth
            testID="open-create-alert"
          />
        </View>

        <Modal visible={showAlert} transparent animationType="slide" onRequestClose={() => setShowAlert(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                  Criar alerta · {ticker}
                </Text>
                <PressableScale onPress={() => setShowAlert(false)} hitSlop={10} testID="close-alert-modal">
                  <Icon name="close" size={22} color={theme.textTertiary} />
                </PressableScale>
              </View>

              <Text style={styles.fieldLabel}>CONDIÇÃO</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['above', 'below'] as const).map((c) => (
                  <PressableScale
                    key={c}
                    onPress={() => { setAlertCondition(c); Haptics.selectionAsync(); }}
                    style={[styles.condChip, {
                      flex: 1,
                      backgroundColor: alertCondition === c ? `${colors.primary}15` : theme.surfaceElevated,
                      borderColor: alertCondition === c ? colors.primary : theme.border,
                    }]}
                    testID={`alert-cond-${c}`}
                  >
                    <Text style={{ color: alertCondition === c ? colors.primary : theme.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                      {c === 'above' ? 'Acima de' : 'Abaixo de'}
                    </Text>
                  </PressableScale>
                ))}
              </View>

              <Text style={styles.fieldLabel}>VALOR ALVO (R$)</Text>
              <TextInput
                value={alertValue}
                onChangeText={setAlertValue}
                placeholder="0,00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                testID="input-alert-value-detail"
              />

              <Button label="Criar alerta" onPress={handleSaveAlert} loading={savingAlert} fullWidth style={{ marginTop: 16 }} testID="save-alert-detail" />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  heroAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 'auto' },
  fundGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fundCell: { width: '50%', padding: 12, borderTopWidth: 0.5 },
  progressBg: { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold', color: '#888', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  condChip: { padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
});
