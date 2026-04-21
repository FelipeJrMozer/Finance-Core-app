import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';
import {
  MEI_DAS_2025,
  MEI_DAS_DEFAULT_CATEGORIA,
  MEI_DAS_LIST,
  MEI_LIMITE_ANUAL,
  type MeiCategoria,
} from '@/constants/pj';

interface DASRecord {
  id: string;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pendente' | 'pago' | 'vencido';
}

const STORAGE_KEY = 'pf_pj_das';
const CATEGORIA_KEY = 'pf_pj_das_categoria';

export default function PJDasScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<DASRecord[]>([]);
  const [categoria, setCategoria] = useState<MeiCategoria>(MEI_DAS_DEFAULT_CATEGORIA);

  // Load saved categoria
  React.useEffect(() => {
    AsyncStorage.getItem(CATEGORIA_KEY).then((raw) => {
      if (raw && raw in MEI_DAS_2025) setCategoria(raw as MeiCategoria);
    });
  }, []);

  const dasInfo = MEI_DAS_2025[categoria];
  const dasAmount = dasInfo.amount;

  // Faturamento PJ do ano corrente — usado apenas para alertar sobre o limite anual
  const currentYear = new Date().getFullYear();
  const yearGrossIncome = transactions
    .filter((t) =>
      t.type === 'income' &&
      (t.notes?.includes('[PJ]') || t.description?.toLowerCase().includes('pj')) &&
      t.date.startsWith(String(currentYear))
    )
    .reduce((s, t) => s + t.amount, 0);

  const exceededAnnualLimit = yearGrossIncome > MEI_LIMITE_ANUAL;
  const limitPct = Math.min(100, (yearGrossIncome / MEI_LIMITE_ANUAL) * 100);

  // Generate records (fixed value, not percentual). Vencimento = dia 20 do MÊS SEGUINTE.
  const buildRecords = useCallback((): DASRecord[] => {
    const generated: DASRecord[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
      // Mês seguinte da competência — Date faz o rollover de ano automaticamente.
      const due = new Date(ref.getFullYear(), ref.getMonth() + 1, 20);
      const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
      const isVencido = due.getTime() < now.getTime();
      generated.push({
        id: ym,
        referenceMonth: ym,
        amount: dasAmount,
        dueDate,
        status: isVencido ? 'vencido' : 'pendente',
      });
    }
    return generated;
  }, [dasAmount]);

  const loadRecords = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        // Re-apply current dasAmount to any record not yet paid (categoria can change).
        const stored: DASRecord[] = JSON.parse(data);
        const refreshed = stored.map((r) => r.status === 'pago' ? r : { ...r, amount: dasAmount });
        setRecords(refreshed);
      } else {
        const generated = buildRecords();
        setRecords(generated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(generated));
      }
    } catch {}
  }, [dasAmount, buildRecords]);

  React.useEffect(() => { loadRecords(); }, [loadRecords]);

  const onChangeCategoria = async (id: MeiCategoria) => {
    Haptics.selectionAsync();
    setCategoria(id);
    await AsyncStorage.setItem(CATEGORIA_KEY, id);
  };

  const markPaid = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = records.map((r) =>
      r.id === id ? { ...r, status: 'pago' as const, paidDate: new Date().toISOString().slice(0, 10) } : r
    );
    setRecords(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const statusColor = (status: string) => {
    if (status === 'pago') return colors.success;
    if (status === 'vencido') return colors.danger;
    return colors.warning;
  };

  const statusLabel = (status: string) => {
    if (status === 'pago') return 'Pago';
    if (status === 'vencido') return 'Vencido';
    return 'Pendente';
  };

  const formatMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          DAS-MEI tem valor fixo mensal por categoria de atividade — não é percentual do faturamento.
          Vencimento todo dia 20 do mês seguinte.
        </Text>
      </View>

      {/* Seletor de categoria */}
      <View style={[styles.categoriaCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Categoria de atividade
        </Text>
        <View style={styles.categoriaList}>
          {MEI_DAS_LIST.map((opt) => {
            const selected = opt.id === categoria;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChangeCategoria(opt.id)}
                style={[styles.catRow, {
                  backgroundColor: selected ? `${colors.primary}15` : theme.surfaceElevated,
                  borderColor: selected ? colors.primary : theme.border,
                }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catLabel, {
                    color: theme.text,
                    fontFamily: selected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                  }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.catAmount, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {maskValue(formatBRL(opt.amount))} / mês
                  </Text>
                </View>
                {selected && <Feather name="check-circle" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Alerta de limite anual */}
      {exceededAnnualLimit && (
        <View style={[styles.alertBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40` }]}>
          <Feather name="alert-triangle" size={16} color={colors.danger} />
          <Text style={[styles.alertText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            Faturamento de {maskValue(formatBRL(yearGrossIncome))} ultrapassou o limite anual MEI ({formatBRL(MEI_LIMITE_ANUAL)}).
            Considere migrar para ME.
          </Text>
        </View>
      )}
      {!exceededAnnualLimit && yearGrossIncome > 0 && (
        <View style={[styles.limitInfo, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.limitInfoLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Faturamento PJ {currentYear}: {maskValue(formatBRL(yearGrossIncome))} ({limitPct.toFixed(1)}% do limite anual)
          </Text>
        </View>
      )}

      {records.map((r) => (
        <View key={r.id} style={[styles.dasCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dasHeader}>
            <Text style={[styles.dasMonth, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              {formatMonth(r.referenceMonth)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(r.status)}20` }]}>
              <Text style={[styles.statusText, { color: statusColor(r.status), fontFamily: 'Inter_600SemiBold' }]}>
                {statusLabel(r.status)}
              </Text>
            </View>
          </View>
          <View style={styles.dasDetails}>
            <View>
              <Text style={[styles.detailLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Valor</Text>
              <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(r.amount))}</Text>
            </View>
            <View>
              <Text style={[styles.detailLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Vencimento</Text>
              <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                {new Date(r.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </Text>
            </View>
            {r.paidDate && (
              <View>
                <Text style={[styles.detailLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Pago em</Text>
                <Text style={[styles.detailValue, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>
                  {new Date(r.paidDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </Text>
              </View>
            )}
          </View>
          {r.status !== 'pago' && (
            <Pressable
              onPress={() => markPaid(r.id)}
              style={[styles.payBtn, { backgroundColor: colors.success }]}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={[styles.payBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Marcar como pago</Text>
            </Pressable>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoCard: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { fontSize: 13, flex: 1, lineHeight: 18 },
  categoriaCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 14 },
  categoriaList: { gap: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  catLabel: { fontSize: 14 },
  catAmount: { fontSize: 12, marginTop: 2 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  alertText: { flex: 1, fontSize: 13, lineHeight: 18 },
  limitInfo: { padding: 12, borderRadius: 10, borderWidth: 1 },
  limitInfoLabel: { fontSize: 12 },
  dasCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  dasHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dasMonth: { fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12 },
  dasDetails: { flexDirection: 'row', gap: 24 },
  detailLabel: { fontSize: 11, marginBottom: 2 },
  detailValue: { fontSize: 15 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 12 },
  payBtnText: { fontSize: 15, color: '#fff' },
});
