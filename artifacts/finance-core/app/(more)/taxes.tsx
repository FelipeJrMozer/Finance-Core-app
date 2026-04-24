import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon, type IconName } from '@/utils/icons';
import {
  getAnnualTax, getMonthlyTaxes, getDarfHistory, getTaxCalendar,
  getAccumulatedLosses, calculateDarf,
  type AnnualTaxSummary, type MonthlyTaxSummary, type DarfCalculation,
  type TaxCalendarEntry, type AccumulatedLoss,
} from '@/services/tax';

const ASSET_TABS: Array<{ id: 'acoes' | 'fiis' | 'etfs' | 'cripto'; label: string }> = [
  { id: 'acoes',  label: 'Ações' },
  { id: 'fiis',   label: 'FIIs' },
  { id: 'etfs',   label: 'ETFs' },
  { id: 'cripto', label: 'Cripto' },
];

const STATUS_COLOR = (theme: 'success' | 'warning' | 'danger') => theme;

export default function TaxesScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [annual, setAnnual] = useState<AnnualTaxSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyTaxSummary | null>(null);
  const [history, setHistory] = useState<DarfCalculation[]>([]);
  const [calendar, setCalendar] = useState<TaxCalendarEntry[]>([]);
  const [assetTab, setAssetTab] = useState<typeof ASSET_TABS[number]['id']>('acoes');
  const [losses, setLosses] = useState<Record<string, AccumulatedLoss | null>>({});
  const [calculatingDarf, setCalculatingDarf] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, m, h, c] = await Promise.allSettled([
        getAnnualTax(year),
        getMonthlyTaxes(year, month),
        getDarfHistory({ year, limit: 5 }),
        getTaxCalendar(year),
      ]);
      setAnnual(a.status === 'fulfilled' ? a.value : null);
      setMonthly(m.status === 'fulfilled' ? m.value : null);
      setHistory(h.status === 'fulfilled' && Array.isArray(h.value) ? h.value : []);
      setCalendar(c.status === 'fulfilled' && Array.isArray(c.value) ? c.value : []);
      if (a.status === 'rejected' && m.status === 'rejected') {
        setError('Não foi possível carregar os dados fiscais.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // Carrega prejuízos do tipo selecionado (operação comum).
  useEffect(() => {
    let cancelled = false;
    const key = assetTab;
    if (losses[key] !== undefined) return;
    getAccumulatedLosses(year, month, assetTab, 'comum')
      .then((l) => { if (!cancelled) setLosses((prev) => ({ ...prev, [key]: l })); })
      .catch(() => { if (!cancelled) setLosses((prev) => ({ ...prev, [key]: null })); });
    return () => { cancelled = true; };
  }, [assetTab, year, month, losses]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLosses({});
    load();
  }, [load]);

  const handleCalculateDarf = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCalculatingDarf(true);
    try {
      await calculateDarf({ year, month });
      const h = await getDarfHistory({ year, limit: 5 });
      setHistory(Array.isArray(h) ? h : []);
    } catch {
      setError('Falha ao calcular o DARF do mês.');
    } finally {
      setCalculatingDarf(false);
    }
  }, [year, month]);

  const irpfStatusText = useMemo(() => {
    switch (annual?.mustFileIrpf) {
      case 'yes':   return { text: 'SIM', desc: 'Você precisa entregar o IRPF.', color: colors.warning, bg: `${colors.warning}18` };
      case 'no':    return { text: 'NÃO', desc: 'Pelos dados atuais, você não é obrigado.', color: colors.success, bg: `${colors.success}18` };
      case 'maybe': return { text: 'TALVEZ', desc: 'Está perto dos limites de obrigatoriedade.', color: colors.info, bg: `${colors.info}18` };
      default:      return { text: '—', desc: 'Adicione rendimentos para calcular.', color: theme.textTertiary, bg: theme.surfaceElevated };
    }
  }, [annual, colors, theme]);

  const calendarThisMonth = useMemo(
    () => calendar.filter((e) => e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)),
    [calendar, year, month],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Imposto de Renda' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Hero — obrigatoriedade IRPF */}
        <View style={[styles.hero, { backgroundColor: irpfStatusText.bg, borderColor: theme.border }]}>
          <Text style={[styles.heroLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Você precisa entregar IRPF {year}?
          </Text>
          <Text style={[styles.heroValue, { color: irpfStatusText.color, fontFamily: 'Inter_700Bold' }]}>
            {irpfStatusText.text}
          </Text>
          <Text style={[styles.heroDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {irpfStatusText.desc}
          </Text>
          {annual?.reasons && annual.reasons.length > 0 && (
            <View style={{ marginTop: 6, gap: 4 }}>
              {annual.reasons.map((r, i) => (
                <Text key={i} style={[styles.reason, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  • {r}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* DARF do mês (resumo) */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                DARF deste mês
              </Text>
              <Money
                value={monthly?.taxDue ?? 0}
                size="xxl"
                weight="700"
                color={(monthly?.taxDue ?? 0) > 0 ? colors.warning : theme.text}
              />
              <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {monthly?.nextDueDate
                  ? `Vence em ${formatDate(monthly.nextDueDate)}`
                  : 'Sem vencimento agendado'}
              </Text>
            </View>
            <PressableScale
              onPress={() => router.push('/(more)/darf')}
              haptic="light"
              style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.btnText, { fontFamily: 'Inter_600SemiBold' }]}>Pagar</Text>
            </PressableScale>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={[styles.gridLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                Tributável
              </Text>
              <Money value={monthly?.taxableIncome ?? 0} size="md" weight="500" />
            </View>
            <View style={styles.gridCell}>
              <Text style={[styles.gridLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                Isento
              </Text>
              <Money value={monthly?.exemptIncome ?? 0} size="md" weight="500" />
            </View>
            <View style={styles.gridCell}>
              <Text style={[styles.gridLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                Prejuízo
              </Text>
              <Money value={monthly?.totalLosses ?? 0} size="md" weight="500" color={colors.danger} />
            </View>
          </View>

          <PressableScale
            onPress={handleCalculateDarf}
            haptic="medium"
            disabled={calculatingDarf}
            style={[styles.btnSecondary, { borderColor: colors.primary }]}
            testID="calc-darf"
          >
            {calculatingDarf
              ? <ActivityIndicator color={colors.primary} />
              : <Text style={[styles.btnSecText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  Calcular agora
                </Text>}
          </PressableScale>
        </View>

        {/* Atalhos */}
        <View style={styles.shortcutsRow}>
          <Shortcut icon="export"   label="Exportar IRPF"  onPress={() => router.push('/(more)/irpf-export')} />
          <Shortcut icon="calendar" label="Calendário"     onPress={() => router.push('/(more)/tax-calendar')} />
          <Shortcut icon="income"   label="Rendimentos"    onPress={() => router.push('/(more)/tax-incomes')} />
          <Shortcut icon="deduction" label="Deduções"      onPress={() => router.push('/(more)/tax-deductions')} />
        </View>

        {/* Histórico DARFs */}
        <SectionHeader
          title="Histórico de DARFs"
          icon="file-text"
          action={{ label: 'Ver tudo', onPress: () => router.push('/(more)/darf') }}
        />
        {history.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Sem DARFs gerados"
            description="Quando houver tributação, os DARFs aparecerão aqui."
          />
        ) : (
          history.map((d) => <DarfRow key={d.id} d={d} onPress={() => router.push('/(more)/darf')} />)
        )}

        {/* Calendário fiscal — mês atual */}
        <SectionHeader
          title="Obrigações deste mês"
          icon="calendar"
          action={{ label: 'Ano todo', onPress: () => router.push('/(more)/tax-calendar') }}
        />
        {calendarThisMonth.length === 0 ? (
          <Text style={[styles.muted, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Nada agendado para este mês.
          </Text>
        ) : (
          calendarThisMonth.map((e, i) => (
            <View key={`${e.date}-${i}`} style={[styles.calRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.calDot, { backgroundColor: colors.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.calTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {e.title}
                </Text>
                {e.description && (
                  <Text style={[styles.calDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {e.description}
                  </Text>
                )}
              </View>
              <Text style={[styles.calDate, { color: theme.textSecondary, fontFamily: 'RobotoMono_500Medium' }]}>
                {formatDate(e.date)}
              </Text>
            </View>
          ))
        )}

        {/* Prejuízos por tipo de operação */}
        <SectionHeader title="Prejuízo acumulado por tipo" icon="trending-down" />
        <View style={[styles.tabsRow, { backgroundColor: theme.surfaceElevated }]}>
          {ASSET_TABS.map((t) => (
            <PressableScale
              key={t.id}
              onPress={() => setAssetTab(t.id)}
              haptic="light"
              style={[
                styles.tab,
                assetTab === t.id && { backgroundColor: colors.primary },
              ]}
              testID={`select-asset-${t.id}`}
            >
              <Text style={{
                color: assetTab === t.id ? '#fff' : theme.textSecondary,
                fontFamily: 'Inter_600SemiBold',
                fontSize: 13,
              }}>
                {t.label}
              </Text>
            </PressableScale>
          ))}
        </View>

        <View style={[styles.lossCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Prejuízo a compensar — operação comum
          </Text>
          {losses[assetTab] === undefined ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
          ) : (
            <Money
              value={losses[assetTab]?.amount ?? 0}
              size="xl" weight="700"
              color={(losses[assetTab]?.amount ?? 0) < 0 ? colors.danger : theme.text}
            />
          )}
        </View>

        {error && (
          <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            {error}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

// --------- Helpers ---------

function formatDate(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

function statusBadgeColor(status: DarfCalculation['status'], colors: any) {
  switch (status) {
    case 'pago':       return colors.success;
    case 'atrasado':   return colors.danger;
    case 'cancelado':  return colors.textTertiary;
    default:           return colors.warning;
  }
}

function statusLabel(status: DarfCalculation['status']) {
  switch (status) {
    case 'pago':      return 'Pago';
    case 'atrasado':  return 'Atrasado';
    case 'cancelado': return 'Cancelado';
    default:          return 'Pendente';
  }
}

function Shortcut({
  icon, label, onPress,
}: { icon: IconName; label: string; onPress: () => void }) {
  const { theme, colors } = useTheme();
  return (
    <PressableElevate
      onPress={onPress}
      haptic="light"
      style={[styles.shortcut, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <Icon name={icon} size={20} color={colors.primary} />
      <Text style={[styles.shortcutLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
    </PressableElevate>
  );
}

function DarfRow({ d, onPress }: { d: DarfCalculation; onPress: () => void }) {
  const { theme, colors } = useTheme();
  return (
    <PressableElevate
      onPress={onPress}
      haptic="light"
      style={[styles.darfRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      testID={`open-darf-${d.id}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.darfMonth, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          {monthLabel(d.referenceMonth)}
        </Text>
        <Text style={[styles.darfDue, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Vence {formatDate(d.dueDate)} {d.revenueCode ? `• Cód. ${d.revenueCode}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Money value={d.amount} size="md" weight="700" />
        <View style={[styles.badge, { backgroundColor: `${statusBadgeColor(d.status, colors)}22` }]}>
          <Text style={{ color: statusBadgeColor(d.status, colors), fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
            {statusLabel(d.status)}
          </Text>
        </View>
      </View>
    </PressableElevate>
  );
}

function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  heroLabel: { fontSize: 13 },
  heroValue: { fontSize: 36, letterSpacing: -1 },
  heroDesc: { fontSize: 13 },
  reason: { fontSize: 12 },

  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  cardLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSub: { fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  divider: { height: 1, marginTop: 4, marginBottom: 4 },
  gridRow: { flexDirection: 'row', gap: 12 },
  gridCell: { flex: 1, gap: 4 },
  gridLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },

  btnPrimary: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontSize: 14 },
  btnSecondary: { borderWidth: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnSecText: { fontSize: 14 },

  shortcutsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  shortcut: {
    flexBasis: '48%', flexGrow: 1,
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  shortcutLabel: { fontSize: 14, flex: 1 },

  darfRow: {
    padding: 14, borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  darfMonth: { fontSize: 14, textTransform: 'capitalize' },
  darfDue: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  calRow: {
    padding: 12, borderRadius: 10, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  calDot: { width: 8, height: 8, borderRadius: 4 },
  calTitle: { fontSize: 14 },
  calDesc: { fontSize: 12, marginTop: 2 },
  calDate: { fontSize: 13 },

  tabsRow: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  lossCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 6 },

  muted: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  errorText: { textAlign: 'center', marginTop: 8 },
});
