import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, TextInput, FlatList,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  listAvailableTickers, compareTickers,
  type AvailableTicker, type StockMetrics,
} from '@/services/stockComparator';

interface MetricRow {
  key: keyof StockMetrics;
  label: string;
  format: (v: number | null | undefined) => string;
  betterHigher: boolean | null;
}

const METRICS: MetricRow[] = [
  { key: 'price',         label: 'Preço (R$)',     format: (v) => v != null ? v.toFixed(2).replace('.', ',') : '—', betterHigher: null },
  { key: 'pl',            label: 'P/L',            format: (v) => v != null ? v.toFixed(2) : '—',                  betterHigher: false },
  { key: 'pvp',           label: 'P/VP',           format: (v) => v != null ? v.toFixed(2) : '—',                  betterHigher: false },
  { key: 'roe',           label: 'ROE (%)',        format: (v) => v != null ? `${v.toFixed(1)}%` : '—',            betterHigher: true },
  { key: 'roic',          label: 'ROIC (%)',       format: (v) => v != null ? `${v.toFixed(1)}%` : '—',            betterHigher: true },
  { key: 'dividendYield', label: 'DY (%)',         format: (v) => v != null ? `${v.toFixed(2)}%` : '—',            betterHigher: true },
  { key: 'netMargin',     label: 'Margem Líquida', format: (v) => v != null ? `${v.toFixed(1)}%` : '—',            betterHigher: true },
  { key: 'cagr5y',        label: 'CAGR 5a (%)',    format: (v) => v != null ? `${v.toFixed(1)}%` : '—',            betterHigher: true },
  { key: 'beta',          label: 'Beta',           format: (v) => v != null ? v.toFixed(2) : '—',                  betterHigher: false },
];

const MAX_TICKERS = 5;

export default function StockComparatorScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<string[]>([]);
  const [available, setAvailable] = useState<AvailableTicker[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<StockMetrics[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAvailableTickers().then(setAvailable);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return available.slice(0, 80);
    const q = search.trim().toUpperCase();
    return available.filter((t) =>
      t.ticker.includes(q) || (t.name && t.name.toUpperCase().includes(q))
    ).slice(0, 80);
  }, [available, search]);

  const togglePick = (ticker: string) => {
    const t = ticker.toUpperCase();
    Haptics.selectionAsync();
    setPicked((prev) => {
      if (prev.includes(t)) return prev.filter((x) => x !== t);
      if (prev.length >= MAX_TICKERS) {
        Alert.alert('Limite', `Compare até ${MAX_TICKERS} ativos por vez.`);
        return prev;
      }
      return [...prev, t];
    });
  };

  const handleCompare = async () => {
    if (picked.length < 2) {
      Alert.alert('Atenção', 'Selecione ao menos 2 ativos para comparar.');
      return;
    }
    setComparing(true);
    setError(null);
    try {
      const result = await compareTickers(picked);
      if (result.message) {
        setError(result.message);
        setResults(null);
      } else {
        setResults(result.metrics);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setError(e?.message || 'Falha na comparação.');
      setResults(null);
    } finally {
      setComparing(false);
    }
  };

  const bestWorstByRow = useMemo(() => {
    if (!results || results.length < 2) return new Map<string, { best: number; worst: number }>();
    const map = new Map<string, { best: number; worst: number }>();
    for (const m of METRICS) {
      if (m.betterHigher == null) continue;
      const values = results
        .map((r, idx) => ({ idx, v: r[m.key] as number | null | undefined }))
        .filter((x) => x.v != null && isFinite(x.v as number)) as { idx: number; v: number }[];
      if (values.length < 2) continue;
      values.sort((a, b) => m.betterHigher ? b.v - a.v : a.v - b.v);
      map.set(String(m.key), { best: values[0].idx, worst: values[values.length - 1].idx });
    }
    return map;
  }, [results]);

  return (
    <>
      <Stack.Screen options={{ title: 'Comparador de ativos' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
      >
        <Card>
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
            Selecione até {MAX_TICKERS} ativos
          </Text>

          {picked.length === 0 ? (
            <PressableScale
              onPress={() => setShowPicker(true)}
              style={[styles.emptyPick, { borderColor: theme.border }]}
              testID="open-picker-empty"
            >
              <Icon name="plus" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Adicionar ativos</Text>
            </PressableScale>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              {picked.map((t) => (
                <PressableScale
                  key={t}
                  onPress={() => togglePick(t)}
                  style={[styles.tickerChip, { backgroundColor: `${colors.primary}15`, borderColor: colors.primary }]}
                  testID={`pick-chip-${t}`}
                >
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 13 }}>{t}</Text>
                  <Icon name="close" size={12} color={colors.primary} />
                </PressableScale>
              ))}
              {picked.length < MAX_TICKERS && (
                <PressableScale
                  onPress={() => setShowPicker(true)}
                  style={[styles.tickerChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderStyle: 'dashed' }]}
                  testID="open-picker-add"
                >
                  <Icon name="plus" size={12} color={theme.textSecondary} />
                  <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 13 }}>Adicionar</Text>
                </PressableScale>
              )}
            </ScrollView>
          )}

          <Button
            label={comparing ? 'Comparando...' : 'Comparar'}
            onPress={handleCompare}
            loading={comparing}
            disabled={picked.length < 2}
            fullWidth
            testID="run-comparison"
          />
        </Card>

        {error && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="alert" size={18} color={colors.danger} />
              <Text style={{ color: theme.text, flex: 1, fontFamily: 'Inter_500Medium' }}>{error}</Text>
            </View>
          </Card>
        )}

        {results && results.length > 0 && (
          <Card padding={0}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={[styles.row, styles.headerRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.metricCell, { borderRightColor: theme.border }]}>
                    <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 12 }}>INDICADOR</Text>
                  </View>
                  {results.map((r) => (
                    <PressableScale
                      key={r.ticker}
                      onPress={() => router.push({ pathname: '/(more)/stock-detail/[ticker]', params: { ticker: r.ticker } })}
                      style={[styles.tickerCell, { borderRightColor: theme.border }]}
                      testID={`compare-open-${r.ticker}`}
                    >
                      <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 13 }}>{r.ticker}</Text>
                      {r.sector ? (
                        <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                          {r.sector}
                        </Text>
                      ) : null}
                    </PressableScale>
                  ))}
                </View>

                {METRICS.map((m, mIdx) => {
                  const bw = bestWorstByRow.get(String(m.key));
                  return (
                    <View key={String(m.key)} style={[styles.row, { borderBottomColor: theme.border, backgroundColor: mIdx % 2 ? 'transparent' : theme.surfaceElevated + '60' }]}>
                      <View style={[styles.metricCell, { borderRightColor: theme.border }]}>
                        <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{m.label}</Text>
                      </View>
                      {results.map((r, rIdx) => {
                        const v = r[m.key] as number | null | undefined;
                        const isBest = bw?.best === rIdx;
                        const isWorst = bw?.worst === rIdx;
                        return (
                          <View key={r.ticker + String(m.key)} style={[styles.valueCell, {
                            borderRightColor: theme.border,
                            backgroundColor: isBest ? `${colors.success}20` : isWorst ? `${colors.danger}15` : 'transparent',
                          }]}>
                            <Text style={{
                              color: isBest ? colors.success : isWorst ? colors.danger : theme.text,
                              fontFamily: isBest || isWorst ? 'Inter_700Bold' : 'Inter_500Medium',
                              fontSize: 13,
                            }}>
                              {m.format(v ?? null)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Card>
        )}

        {!results && !error && picked.length === 0 && (
          <EmptyState
            icon="bar-chart"
            title="Nada selecionado"
            description="Adicione 2 ou mais ativos para comparar fundamentos lado a lado."
          />
        )}

        <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Selecionar ativos</Text>
                <PressableScale onPress={() => setShowPicker(false)} hitSlop={10} testID="close-comparator-picker">
                  <Icon name="close" size={22} color={theme.textTertiary} />
                </PressableScale>
              </View>

              <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Icon name="search" size={16} color={theme.textTertiary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar ticker"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                  style={{ flex: 1, color: theme.text, fontFamily: 'Inter_400Regular', fontSize: 15 }}
                  testID="input-comparator-search"
                />
              </View>

              <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 8, fontFamily: 'Inter_400Regular' }}>
                {picked.length}/{MAX_TICKERS} selecionados
              </Text>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.ticker}
                style={{ maxHeight: 380, marginTop: 8 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border }} />}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular' }}>
                      {available.length === 0 ? 'Carregando...' : 'Nenhum ticker encontrado'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isPicked = picked.includes(item.ticker);
                  return (
                    <PressableScale
                      onPress={() => togglePick(item.ticker)}
                      style={styles.pickRow}
                      testID={`comparator-pick-${item.ticker}`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>{item.ticker}</Text>
                        {item.name ? (
                          <Text style={{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                            {item.name}
                          </Text>
                        ) : null}
                      </View>
                      <Icon
                        name={isPicked ? 'check-circle' : 'plus'}
                        size={20}
                        color={isPicked ? colors.success : colors.primary}
                      />
                    </PressableScale>
                  );
                }}
              />

              <Button label="Concluir" onPress={() => setShowPicker(false)} fullWidth style={{ marginTop: 12 }} testID="comparator-done" />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  emptyPick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 18, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginVertical: 12 },
  tickerChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  row: { flexDirection: 'row', borderBottomWidth: 1 },
  headerRow: { },
  metricCell: { width: 130, padding: 10, justifyContent: 'center', borderRightWidth: 1 },
  tickerCell: { width: 110, padding: 10, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, gap: 2 },
  valueCell: { width: 110, padding: 10, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  pickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
