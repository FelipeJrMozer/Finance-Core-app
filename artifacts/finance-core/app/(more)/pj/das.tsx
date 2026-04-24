import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { listPjDas, markPjDasPaid, type PjDas, type DasStatus } from '@/services/pj';

const FILTERS: Array<{ id: 'all' | DasStatus; label: string }> = [
  { id: 'all',      label: 'Todos' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'atrasado', label: 'Atrasados' },
  { id: 'pago',     label: 'Pagos' },
];

export default function PJDasScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  const [items, setItems] = useState<PjDas[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await listPjDas({ year });
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setError('Não foi possível carregar os DAS. Verifique sua conexão.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((d) => d.status === filter)),
    [items, filter],
  );
  const totalPending = useMemo(
    () => items.filter((d) => d.status !== 'pago').reduce((s, d) => s + d.amount, 0),
    [items],
  );

  const handleMarkPaid = useCallback(async (d: PjDas) => {
    const today = new Date().toISOString().slice(0, 10);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const optimistic = items.map((i) =>
      i.id === d.id ? { ...i, status: 'pago' as DasStatus, paidDate: today } : i
    );
    setItems(optimistic);
    try {
      const updated = await markPjDasPaid(d.id, { paidDate: today, paidVia: 'app' });
      setItems((prev) => prev.map((i) => (i.id === d.id ? { ...i, ...updated } : i)));
    } catch {
      setItems(items);
      Alert.alert('Erro', 'Falha ao marcar o DAS como pago.');
    }
  }, [items]);

  const handleCopyBarcode = useCallback(async (code: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(code);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'DAS / Guias' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            DAS pendente em {year}
          </Text>
          <Money value={totalPending} size="xl" weight="700" color={totalPending > 0 ? colors.warning : theme.text} />
          <Text style={[styles.muted, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {items.length} guia(s) no ano
          </Text>
        </View>

        <View style={[styles.tabs, { backgroundColor: theme.surfaceElevated }]}>
          {FILTERS.map((f) => (
            <PressableScale
              key={f.id}
              onPress={() => setFilter(f.id)}
              haptic="light"
              style={[styles.tab, filter === f.id && { backgroundColor: colors.primary }]}
              testID={`filter-das-${f.id}`}
            >
              <Text style={{
                color: filter === f.id ? '#fff' : theme.textSecondary,
                fontFamily: 'Inter_600SemiBold', fontSize: 12,
              }}>
                {f.label}
              </Text>
            </PressableScale>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Sem DAS nesta categoria"
            description={error ?? 'Quando o backend gerar guias DAS, elas aparecerão aqui.'}
          />
        ) : (
          filtered.map((d) => (
            <View key={d.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {monthLabel(d.referenceMonth)}
                  </Text>
                  <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    Vence {formatDate(d.dueDate)}{d.category ? ` • ${d.category}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Money value={d.amount} size="md" weight="700" />
                  <View style={[styles.badge, { backgroundColor: `${statusColor(d.status, colors)}22` }]}>
                    <Text style={{ color: statusColor(d.status, colors), fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
                      {statusLabel(d.status)}
                    </Text>
                  </View>
                </View>
              </View>

              {d.barCode && (
                <View style={[styles.codeBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <Text
                    selectable
                    numberOfLines={2}
                    style={[styles.codeText, { color: theme.text, fontFamily: 'RobotoMono_400Regular' }]}
                  >
                    {d.barCode}
                  </Text>
                  <PressableScale onPress={() => handleCopyBarcode(d.barCode!)} haptic="light" style={styles.copyBtn} testID={`copy-das-${d.id}`}>
                    <Icon name="copy" size={14} color={colors.primary} />
                  </PressableScale>
                </View>
              )}

              {d.status !== 'pago' && (
                <PressableScale
                  onPress={() => handleMarkPaid(d)}
                  haptic="medium"
                  style={[styles.payBtn, { backgroundColor: colors.success }]}
                  testID={`pay-das-${d.id}`}
                >
                  <Icon name="check-circle" size={16} color="#fff" />
                  <Text style={styles.payText}>Marcar como pago</Text>
                </PressableScale>
              )}
              {d.paidDate && (
                <Text style={[styles.muted, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  Pago em {formatDate(d.paidDate)}{d.paidVia ? ` via ${d.paidVia}` : ''}.
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}

function statusColor(s: DasStatus, colors: any) {
  if (s === 'pago') return colors.success;
  if (s === 'atrasado') return colors.danger;
  return colors.warning;
}
function statusLabel(s: DasStatus) {
  if (s === 'pago') return 'Pago';
  if (s === 'atrasado') return 'Atrasado';
  return 'Pendente';
}
function formatDate(iso: string) {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR'); } catch { return iso; }
}
function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  summary: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 4 },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  muted: { fontSize: 12 },

  tabs: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },

  card: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 14, textTransform: 'capitalize' },
  cardSub: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 8, borderWidth: 1,
  },
  codeText: { flex: 1, fontSize: 12 },
  copyBtn: { padding: 4 },

  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  payText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
