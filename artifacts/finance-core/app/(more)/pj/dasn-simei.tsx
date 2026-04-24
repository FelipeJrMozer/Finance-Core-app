import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { MEI_LIMITE_ANUAL } from '@/constants/pj';
import {
  getDasnSimeiSummary, listPjRevenues,
  type DasnSimeiSummary, type PjRevenue,
} from '@/services/pj';

const PORTAL_EMPREENDEDOR = 'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/';
const CHECKLIST_KEY = 'pf_dasn_checklist';

const CHECKLIST_ITEMS = [
  { id: 'cnpj', label: 'CNPJ ativo no Portal do Empreendedor' },
  { id: 'nfs',  label: 'Notas fiscais emitidas (ou livro-caixa)' },
  { id: 'comp', label: 'Comprovantes de receitas' },
  { id: 'das',  label: 'DAS pagos durante o ano' },
];

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function DasnSimeiScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];
  const [year, setYear] = useState(currentYear - 1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DasnSimeiSummary | null>(null);
  const [revenues, setRevenues] = useState<PjRevenue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Carrega checklist por ano
  useEffect(() => {
    AsyncStorage.getItem(`${CHECKLIST_KEY}_${year}`).then((raw) => {
      try { setChecked(raw ? JSON.parse(raw) : {}); } catch { setChecked({}); }
    });
  }, [year]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // Tenta resumo dedicado; se falhar (404), agrega de revenues do ano.
      const [summaryRes, revRes] = await Promise.allSettled([
        getDasnSimeiSummary(year),
        listPjRevenues({ year }),
      ]);
      setSummary(summaryRes.status === 'fulfilled' ? summaryRes.value : null);
      setRevenues(revRes.status === 'fulfilled' && Array.isArray(revRes.value) ? revRes.value : []);
      if (summaryRes.status === 'rejected' && revRes.status === 'rejected') {
        setError('Não foi possível carregar dados do MEI.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // 12 meses — preferir summary.monthlyRevenue, fallback para agregado de revenues.
  const monthly = useMemo<number[]>(() => {
    const arr = Array(12).fill(0);
    if (summary?.monthlyRevenue?.length) {
      for (const m of summary.monthlyRevenue) {
        const idx = Number(m.month.split('-')[1] ?? 0) - 1;
        if (idx >= 0 && idx < 12) arr[idx] = m.amount;
      }
    } else {
      for (const r of revenues) {
        const idx = Number(r.date.split('-')[1] ?? 0) - 1;
        if (idx >= 0 && idx < 12) arr[idx] += (Number(r.amount) || 0);
      }
    }
    return arr;
  }, [summary, revenues]);

  const yearTotal = useMemo(
    () => summary?.totalRevenue ?? monthly.reduce((s, v) => s + v, 0),
    [summary, monthly],
  );
  const annualLimit = summary?.annualLimit ?? MEI_LIMITE_ANUAL;
  const limitPct = Math.min(100, (yearTotal / annualLimit) * 100);
  const exceeded = yearTotal > annualLimit;
  const limitColor = exceeded ? colors.danger : limitPct > 80 ? colors.warning : colors.success;
  const maxMonthly = Math.max(1, ...monthly);

  const deadline = summary?.dueDate ? new Date(`${summary.dueDate}T12:00:00`) : new Date(year + 1, 4, 31);
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const overdue = daysUntilDeadline < 0;

  const completedCount = CHECKLIST_ITEMS.filter((i) => checked[i.id]).length;

  const toggleCheck = useCallback(async (id: string) => {
    Haptics.selectionAsync();
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await AsyncStorage.setItem(`${CHECKLIST_KEY}_${year}`, JSON.stringify(next));
  }, [checked, year]);

  const handleOpenPortal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(PORTAL_EMPREENDEDOR).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o Portal do Empreendedor.');
    });
  }, []);

  const handleOpenSpreadsheet = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (summary?.spreadsheetUrl) {
      Linking.openURL(summary.spreadsheetUrl).catch(() => {
        Alert.alert('Erro', 'Não foi possível abrir a planilha.');
      });
    } else {
      Alert.alert(
        'Planilha em geração',
        'A planilha consolidada de receitas será gerada pelo backend a partir das suas receitas PJ. ' +
        'Volte em instantes ou contate o suporte.',
      );
    }
  }, [summary]);

  return (
    <>
      <Stack.Screen options={{ title: 'DASN-SIMEI' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Ano */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Ano de referência
          </Text>
          <View style={styles.yearRow}>
            {yearOptions.map((y) => (
              <PressableScale
                key={y}
                onPress={() => setYear(y)}
                haptic="light"
                style={[
                  styles.yearBtn,
                  {
                    backgroundColor: year === y ? colors.primary : theme.surfaceElevated,
                    borderColor: year === y ? colors.primary : theme.border,
                  },
                ]}
                testID={`select-dasn-year-${y}`}
              >
                <Text style={{
                  color: year === y ? '#fff' : theme.text,
                  fontFamily: 'Inter_600SemiBold', fontSize: 14,
                }}>
                  {y}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        ) : (
          <>
            {/* Faturamento vs limite */}
            <View style={[styles.card, {
              backgroundColor: exceeded ? `${colors.danger}10` : theme.card,
              borderColor: exceeded ? `${colors.danger}40` : theme.border,
            }]}>
              <View style={styles.headerRow}>
                <Text style={[styles.cardLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Faturamento bruto {year}
                </Text>
                <Text style={{ color: limitColor, fontFamily: 'RobotoMono_700Bold', fontSize: 16 }}>
                  {limitPct.toFixed(1)}%
                </Text>
              </View>
              <Money value={yearTotal} size="xxl" weight="700" color={exceeded ? colors.danger : theme.text} />
              <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Limite MEI: R$ {annualLimit.toLocaleString('pt-BR')}
              </Text>
              <View style={[styles.bar, { backgroundColor: theme.surfaceElevated }]}>
                <View style={[styles.barFill, { width: `${limitPct}%`, backgroundColor: limitColor }]} />
              </View>
              {exceeded && (
                <View style={[styles.alertBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
                  <Icon name="alert" size={14} color={colors.danger} />
                  <Text style={[styles.alertText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                    Você ultrapassou o limite do MEI. Considere migrar para ME.
                  </Text>
                </View>
              )}
            </View>

            {/* Bar chart 12 meses */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Receita mensal — {year}
              </Text>
              <View style={styles.barChart}>
                {monthly.map((v, i) => {
                  const h = (v / maxMonthly) * 100;
                  return (
                    <View key={i} style={styles.barCol} testID={`bar-month-${i + 1}`}>
                      <View style={styles.barTrack}>
                        <View style={[
                          styles.bar12,
                          { height: `${Math.max(2, h)}%`, backgroundColor: v > 0 ? colors.primary : theme.surfaceElevated },
                        ]} />
                      </View>
                      <Text style={[styles.barLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                        {MONTH_LABELS[i]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Prazo */}
            <View style={[styles.card, {
              backgroundColor: overdue ? `${colors.danger}10` : `${colors.success}10`,
              borderColor: overdue ? `${colors.danger}40` : `${colors.success}40`,
            }]}>
              <View style={styles.headerRow}>
                <Icon name="calendar" size={16} color={overdue ? colors.danger : colors.success} />
                <Text style={[styles.cardLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Prazo de entrega
                </Text>
              </View>
              <Text style={[styles.bigDate, { color: overdue ? colors.danger : colors.success, fontFamily: 'Inter_700Bold' }]}>
                {deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {overdue
                  ? `Prazo vencido há ${Math.abs(daysUntilDeadline)} dia(s)`
                  : daysUntilDeadline === 0
                    ? 'Vence hoje'
                    : `Faltam ${daysUntilDeadline} dia(s)`}
              </Text>
            </View>

            {/* Botões de ação */}
            <PressableScale
              onPress={handleOpenSpreadsheet}
              haptic="medium"
              style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
              testID="open-dasn-spreadsheet"
            >
              <Icon name="download" size={16} color="#fff" />
              <Text style={styles.btnText}>Gerar planilha DASN</Text>
            </PressableScale>

            <PressableScale
              onPress={handleOpenPortal}
              haptic="light"
              style={[styles.btnSecondary, { borderColor: colors.primary }]}
              testID="open-mei-portal"
            >
              <Icon name="external" size={16} color={colors.primary} />
              <Text style={[styles.btnSecText, { color: colors.primary }]}>
                Abrir Portal DASN-SIMEI
              </Text>
            </PressableScale>

            {/* Checklist */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.headerRow}>
                <Text style={[styles.cardLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Checklist DASN-SIMEI
                </Text>
                <Text style={[styles.cardSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {completedCount}/{CHECKLIST_ITEMS.length}
                </Text>
              </View>
              {CHECKLIST_ITEMS.map((item) => {
                const isOn = !!checked[item.id];
                return (
                  <PressableElevate
                    key={item.id}
                    onPress={() => toggleCheck(item.id)}
                    haptic="light"
                    style={styles.checkRow}
                    testID={`check-dasn-${item.id}`}
                  >
                    <View style={[styles.checkbox, {
                      backgroundColor: isOn ? colors.success : 'transparent',
                      borderColor: isOn ? colors.success : theme.border,
                    }]}>
                      {isOn && <Icon name="check" size={12} color="#fff" />}
                    </View>
                    <Text style={[styles.checkLabel, {
                      color: isOn ? theme.textTertiary : theme.text,
                      fontFamily: 'Inter_400Regular',
                      textDecorationLine: isOn ? 'line-through' : 'none',
                    }]}>
                      {item.label}
                    </Text>
                  </PressableElevate>
                );
              })}
            </View>

            {error && (
              <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                {error}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 8 },
  cardLabel: { fontSize: 13 },
  cardSub: { fontSize: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },

  yearRow: { flexDirection: 'row', gap: 8 },
  yearBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1 },

  bar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 8 },

  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 6,
  },
  alertText: { fontSize: 13, flex: 1 },

  barChart: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 4, height: 130, paddingTop: 8,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: '100%', height: 100, justifyContent: 'flex-end', alignItems: 'center' },
  bar12: { width: '70%', borderRadius: 4 },
  barLabel: { fontSize: 10 },

  bigDate: { fontSize: 18, textTransform: 'capitalize' },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12,
  },
  btnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
  },
  btnSecText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderRadius: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 14, flex: 1 },

  errorText: { textAlign: 'center', marginTop: 8 },
});
