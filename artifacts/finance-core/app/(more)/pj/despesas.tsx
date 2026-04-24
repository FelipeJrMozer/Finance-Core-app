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
import { listPjExpenses, type PjExpense } from '@/services/pj';

const PJ_CATEGORIES = ['Contador', 'Escritório', 'Marketing', 'Equipamentos', 'Serviços', 'Outros'];

export default function PJDespesasScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [items, setItems] = useState<PjExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listPjExpenses({ month: selectedMonth });
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setError('Não foi possível carregar as despesas PJ. Verifique sua conexão.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  const total = useMemo(() => items.reduce((s, t) => s + (Number(t.amount) || 0), 0), [items]);
  const deductible = useMemo(
    () => items.filter((t) => t.deductible).reduce((s, t) => s + t.amount, 0),
    [items],
  );
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of items) {
      const k = (t.category && PJ_CATEGORIES.includes(t.category)) ? t.category : 'Outros';
      map[k] = (map[k] ?? 0) + (Number(t.amount) || 0);
    }
    return map;
  }, [items]);

  return (
    <>
      <Stack.Screen options={{ title: 'Despesas PJ' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />

        <View style={[styles.totalCard, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
          <Text style={[styles.totalLabel, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            Total de despesas PJ
          </Text>
          <Money value={total} size="xxl" weight="700" color={colors.danger} />
          <Text style={[styles.miniLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Dedutíveis: <Money value={deductible} size="sm" weight="500" color={theme.text} />
          </Text>
        </View>

        <PressableScale
          onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'expense', notes: '[PJ]' } })}
          haptic="medium"
          style={[styles.addBtn, { backgroundColor: colors.danger }]}
          testID="add-pj-expense"
        >
          <Icon name="plus" size={18} color="#fff" />
          <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Nova despesa PJ</Text>
        </PressableScale>

        {/* Breakdown por categoria */}
        {Object.values(byCategory).some((v) => v > 0) && (
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Por categoria
            </Text>
            {PJ_CATEGORIES.map((cat) => {
              const v = byCategory[cat] ?? 0;
              if (v === 0) return null;
              return (
                <View key={cat} style={[styles.catRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.catLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{cat}</Text>
                  <Money value={v} size="sm" weight="500" color={colors.danger} />
                </View>
              );
            })}
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="trending-down"
            title="Nenhuma despesa neste mês"
            description={error ?? `Sem despesas operacionais em ${selectedMonth}.`}
          />
        ) : (
          items.map((t) => (
            <PressableElevate
              key={t.id}
              haptic="light"
              style={[styles.txCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              testID={`pj-expense-${t.id}`}
            >
              <View style={[styles.txIcon, { backgroundColor: `${colors.danger}15` }]}>
                <Icon name="trending-down" size={18} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {t.description}
                </Text>
                <Text style={[styles.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {formatDate(t.date)}{t.deductible ? ' • Dedutível' : ''}{t.category ? ` • ${t.category}` : ''}
                </Text>
              </View>
              <Money value={t.amount} size="md" weight="700" color={colors.danger} />
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
  totalCard: { borderRadius: 12, padding: 16, borderWidth: 1, gap: 6 },
  totalLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  miniLabel: { fontSize: 12 },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14 },
  addBtnText: { fontSize: 15, color: '#fff' },

  section: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 4 },
  sectionTitle: { fontSize: 14, marginBottom: 4 },
  catRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catLabel: { fontSize: 13 },

  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14 },
  txDate: { fontSize: 12, marginTop: 2 },
});
