import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  fetchUpcomingDividends, fetchDividendDashboard, listDividends, createDividend, deleteDividend,
  type UpcomingDividend, type DividendDashboard, type Dividend,
} from '@/services/dividends';

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s as string;
  return d.toLocaleDateString('pt-BR');
}

export function DividendosTab({ portfolioId }: { portfolioId?: string }) {
  const { theme, colors } = useTheme();
  const { investments } = useFinance();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DividendDashboard | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingDividend[]>([]);
  const [history, setHistory] = useState<Dividend[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [investmentId, setInvestmentId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [type, setType] = useState('dividend');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, u, h] = await Promise.all([
        fetchDividendDashboard(portfolioId),
        fetchUpcomingDividends(90, portfolioId),
        listDividends(undefined, undefined, portfolioId),
      ]);
      setDashboard(d); setUpcoming(u); setHistory(h);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { load(); }, [load]);

  const monthsChart = useMemo(() => {
    if (!dashboard?.byMonth?.length) return [];
    return dashboard.byMonth.slice(-12).map((m) => {
      const parts = m.month.split('-');
      const monthIdx = parts.length >= 2 ? Math.max(0, Math.min(11, Number(parts[1]) - 1)) : 0;
      return { value: m.total, label: MONTH_LABELS[monthIdx], frontColor: colors.primary };
    });
  }, [dashboard, colors.primary]);

  const investmentOptions = useMemo(
    () => investments.map((i) => ({ id: i.id, label: `${i.ticker} · ${i.name}`, ticker: i.ticker })),
    [investments]
  );

  const openAdd = () => {
    Haptics.selectionAsync();
    setInvestmentId(investments[0]?.id || '');
    setAmount('');
    setType('dividend');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setShowAdd(true);
  };

  const handleSave = async () => {
    const v = Number(amount.replace(',', '.'));
    if (!investmentId) { Alert.alert('Atenção', 'Selecione um ativo.'); return; }
    if (!isFinite(v) || v <= 0) { Alert.alert('Atenção', 'Informe um valor válido.'); return; }
    if (!paymentDate) { Alert.alert('Atenção', 'Informe a data de pagamento.'); return; }
    setSaving(true);
    try {
      const inv = investments.find((i) => i.id === investmentId);
      const created = await createDividend({
        investmentId, amount: v, paymentDate, type, ticker: inv?.ticker,
      });
      setHistory((prev) => [created, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (d: Dividend) => {
    Alert.alert('Excluir', 'Deseja excluir este provento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await deleteDividend(d.id);
            setHistory((prev) => prev.filter((i) => i.id !== d.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            load();
          } catch (e: any) {
            Alert.alert('Erro', e?.message || 'Falha ao excluir.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const noData = !dashboard || (
    dashboard.total12m === 0 && upcoming.length === 0 && history.length === 0
  );

  return (
    <View style={{ gap: 12 }}>
      {/* Hero dashboard */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="dividends" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Resumo de proventos</Text>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiLabel, { color: theme.textTertiary }]}>Últimos 12 meses</Text>
            <Money value={dashboard?.total12m ?? 0} size="md" weight="700" />
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiLabel, { color: theme.textTertiary }]}>Yield anual</Text>
            <Text style={[styles.kpiValue, { color: theme.text }]}>
              {dashboard?.yieldYearly != null ? `${dashboard.yieldYearly.toFixed(2)}%` : '—'}
            </Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiLabel, { color: theme.textTertiary }]}>Yield on cost</Text>
            <Text style={[styles.kpiValue, { color: theme.text }]}>
              {dashboard?.yieldOnCost != null ? `${dashboard.yieldOnCost.toFixed(2)}%` : '—'}
            </Text>
          </View>
        </View>
        {dashboard?.monthlyAverage12m != null && dashboard.monthlyAverage12m > 0 && (
          <View style={[styles.subKpi, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>Média mensal</Text>
            <Money value={dashboard.monthlyAverage12m} size="sm" weight="700" />
          </View>
        )}
      </Card>

      {/* Bar chart by month */}
      {monthsChart.length > 0 && (
        <Card>
          <View style={styles.cardHeader}>
            <Icon name="bar-chart" size={16} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recebido por mês</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <BarChart
              data={monthsChart}
              width={300}
              height={140}
              barWidth={20}
              barBorderRadius={4}
              spacing={6}
              noOfSections={4}
              rulesColor={theme.border}
              yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
              xAxisColor={theme.border}
              yAxisColor="transparent"
              xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_500Medium' }}
              isAnimated
              animationDuration={500}
            />
          </View>
        </Card>
      )}

      {/* Upcoming dividends */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="calendar" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Próximos 90 dias</Text>
          <View style={[styles.smallBadge, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={{ color: colors.primary, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>{upcoming.length}</Text>
          </View>
        </View>
        {upcoming.length === 0 ? (
          <Text style={{ color: theme.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            Nenhum provento agendado para os próximos 90 dias.
          </Text>
        ) : (
          <View style={{ gap: 8 }}>
            {upcoming.slice(0, 8).map((u, idx) => (
              <View key={`${u.ticker}-${u.paymentDate}-${idx}`} style={[styles.upcomingRow, { borderColor: theme.border }]}>
                <View style={[styles.tickerBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 11 }}>{u.ticker.slice(0, 4)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 13 }}>{u.ticker}</Text>
                  <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                    {u.type} · pagto {formatDate(u.paymentDate)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Money value={u.estimatedAmount} size="sm" weight="700" />
                  <Text style={{ color: theme.textTertiary, fontSize: 10, fontFamily: 'Inter_400Regular' }}>
                    R$ {u.amountPerShare.toFixed(4).replace('.', ',')}/cota
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* History */}
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="file-text" size={16} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Histórico</Text>
          <PressableScale onPress={openAdd} hitSlop={10} testID="add-dividend">
            <Icon name="plus" size={20} color={colors.primary} />
          </PressableScale>
        </View>
        {history.length === 0 ? (
          <Text style={{ color: theme.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
            Nenhum provento registrado ainda.
          </Text>
        ) : (
          <View style={{ gap: 6 }}>
            {history.slice(0, 12).map((h) => (
              <PressableElevate key={h.id} onPress={() => handleDelete(h)} testID={`open-dividend-${h.id}`}>
                <View style={[styles.histRow, { borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
                      {h.ticker || 'Provento'} · {h.type}
                    </Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                      {formatDate(h.paymentDate)}
                    </Text>
                  </View>
                  <Money value={h.amount} size="sm" weight="700" />
                </View>
              </PressableElevate>
            ))}
          </View>
        )}
      </Card>

      {noData && (
        <EmptyState
          icon="calendar"
          title="Sem proventos ainda"
          description="Adicione manualmente proventos recebidos para acompanhar a renda passiva."
          action={{ label: 'Registrar provento', onPress: openAdd }}
        />
      )}

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Registrar provento</Text>
              <PressableScale onPress={() => setShowAdd(false)} hitSlop={10} testID="close-dividend-form">
                <Icon name="close" size={22} color={theme.textTertiary} />
              </PressableScale>
            </View>

            <Text style={styles.fieldLabel}>ATIVO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginVertical: 4 }}>
              {investmentOptions.length === 0 ? (
                <Text style={{ color: theme.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular', padding: 8 }}>
                  Cadastre investimentos primeiro.
                </Text>
              ) : (
                investmentOptions.map((opt) => (
                  <PressableScale
                    key={opt.id}
                    onPress={() => { setInvestmentId(opt.id); Haptics.selectionAsync(); }}
                    style={[styles.invChip, {
                      backgroundColor: investmentId === opt.id ? `${colors.primary}20` : theme.surfaceElevated,
                      borderColor: investmentId === opt.id ? colors.primary : theme.border,
                    }]}
                    testID={`pick-investment-${opt.ticker}`}
                  >
                    <Text style={{ color: investmentId === opt.id ? colors.primary : theme.text, fontFamily: 'Inter_700Bold', fontSize: 12 }}>
                      {opt.ticker}
                    </Text>
                  </PressableScale>
                ))
              )}
            </ScrollView>

            <Text style={styles.fieldLabel}>TIPO</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['dividend', 'jcp', 'rendimento'] as const).map((t) => (
                <PressableScale
                  key={t}
                  onPress={() => { setType(t); Haptics.selectionAsync(); }}
                  style={[styles.typeChip, {
                    flex: 1,
                    backgroundColor: type === t ? `${colors.primary}15` : theme.surfaceElevated,
                    borderColor: type === t ? colors.primary : theme.border,
                  }]}
                  testID={`pick-type-${t}`}
                >
                  <Text style={{ color: type === t ? colors.primary : theme.textSecondary, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                    {t === 'dividend' ? 'Dividendo' : t === 'jcp' ? 'JCP' : 'Rendimento'}
                  </Text>
                </PressableScale>
              ))}
            </View>

            <Text style={styles.fieldLabel}>VALOR (R$)</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
              testID="input-dividend-amount"
            />

            <Text style={styles.fieldLabel}>DATA DE PAGAMENTO (AAAA-MM-DD)</Text>
            <TextInput
              value={paymentDate}
              onChangeText={setPaymentDate}
              placeholder="2025-12-31"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
              testID="input-dividend-date"
            />

            <Button label="Registrar" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 16 }} testID="save-dividend" />
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
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCell: { flex: 1 },
  kpiLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  subKpi: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  smallBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  tickerBadge: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  histRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold', color: '#888', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  invChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  typeChip: { padding: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
});
