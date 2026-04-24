import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { MonthNavigator } from '@/components/MonthNavigator';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { getCurrentMonth } from '@/utils/formatters';
import { listPjRevenues, type PjRevenue } from '@/services/pj';

export default function PJReceitasScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [items, setItems] = useState<PjRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listPjRevenues({ month: selectedMonth });
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setError('Não foi possível carregar as receitas PJ. Verifique sua conexão.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(() => items.reduce((s, t) => s + (Number(t.amount) || 0), 0), [items]);
  const received = useMemo(() => items.filter((t) => t.isPaid).reduce((s, t) => s + t.amount, 0), [items]);
  const pending  = total - received;

  return (
    <>
      <Stack.Screen options={{ title: 'Receitas PJ' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />

        <View style={[styles.totalCard, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
          <Text style={[styles.totalLabel, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>
            Total de receitas PJ
          </Text>
          <Money value={total} size="xxl" weight="700" color={colors.success} />
          <View style={styles.miniRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                Recebido
              </Text>
              <Money value={received} size="md" weight="500" color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                Pendente
              </Text>
              <Money value={pending} size="md" weight="500" color={colors.warning} />
            </View>
          </View>
        </View>

        <PressableScale
          onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'income', notes: '[PJ]' } })}
          haptic="medium"
          style={[styles.addBtn, { backgroundColor: colors.success }]}
          testID="add-pj-revenue"
        >
          <Icon name="plus" size={18} color="#fff" />
          <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Nova receita PJ</Text>
        </PressableScale>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="arrow-up-circle"
            title="Nenhuma receita neste mês"
            description={error ?? `Adicione receitas do seu negócio em ${selectedMonth}.`}
          />
        ) : (
          items.map((t) => (
            <PressableElevate
              key={t.id}
              haptic="light"
              style={[styles.txCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              testID={`pj-revenue-${t.id}`}
            >
              <View style={[styles.txIcon, { backgroundColor: `${colors.success}15` }]}>
                <Icon name="trending-up" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {t.description}
                </Text>
                <Text style={[styles.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {formatDate(t.date)} • {t.isPaid ? 'Recebido' : 'Pendente'}
                  {t.clientName ? ` • ${t.clientName}` : ''}
                </Text>
              </View>
              <Money value={t.amount} size="md" weight="700" color={colors.success} />
            </PressableElevate>
          ))
        )}
      </ScrollView>
    </>
  );
}

function formatDate(iso: string) {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR'); } catch { return iso; }
}

const styles = StyleSheet.create({
  totalCard: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 8 },
  totalLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  miniLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14 },
  addBtnText: { fontSize: 15, color: '#fff' },

  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14 },
  txDate: { fontSize: 12, marginTop: 2 },
});
