import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';

interface DASRecord {
  id: string;
  referenceMonth: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pendente' | 'pago' | 'vencido';
}

const STORAGE_KEY = 'pf_pj_das';
const MEI_RATE = 0.06;

export default function PJDasScreen() {
  const { theme, colors } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<DASRecord[]>([]);

  const loadRecords = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setRecords(JSON.parse(data));
      } else {
        // Auto-generate last 6 months
        const generated: DASRecord[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const ym = d.toISOString().slice(0, 7);
          const monthTx = transactions.filter((t) =>
            t.type === 'income' && t.date.startsWith(ym) &&
            (t.notes?.includes('[PJ]') || t.description?.toLowerCase().includes('pj'))
          );
          const monthIncome = monthTx.reduce((s, t) => s + t.amount, 0);
          const dueYear = d.getFullYear();
          const dueMonth = String(d.getMonth() + 2).padStart(2, '0');
          const dueDate = `${dueYear}-${dueMonth}-20`;
          const isVencido = new Date(dueDate) < new Date() && !generated.find((r) => r.referenceMonth === ym && r.status === 'pago');
          generated.push({
            id: ym,
            referenceMonth: ym,
            amount: Math.max(67, monthIncome * MEI_RATE),
            dueDate,
            status: isVencido ? 'vencido' : 'pendente',
          });
        }
        setRecords(generated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(generated));
      }
    } catch {}
  }, [transactions]);

  React.useEffect(() => { loadRecords(); }, [loadRecords]);

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
          DAS calculado com 6% do faturamento PJ (MEI Comércio). Vencimento todo dia 20 do mês seguinte.
        </Text>
      </View>

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
              <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(r.amount)}</Text>
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
