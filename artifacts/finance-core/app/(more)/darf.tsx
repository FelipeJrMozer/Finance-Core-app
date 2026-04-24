import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import {
  getDarfHistory, markDarfPaid, type DarfCalculation, type DarfStatus,
} from '@/services/tax';

const FILTERS: Array<{ id: 'all' | DarfStatus; label: string }> = [
  { id: 'all',       label: 'Todos' },
  { id: 'pendente',  label: 'Pendentes' },
  { id: 'pago',      label: 'Pagos' },
  { id: 'atrasado',  label: 'Atrasados' },
];

export default function DarfScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const year = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<DarfCalculation[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]['id']>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await getDarfHistory({ year });
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setError('Não foi possível carregar o histórico de DARFs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((d) => d.status === filter);
  }, [items, filter]);

  const total = useMemo(() => filtered.reduce((s, d) => s + d.amount, 0), [filtered]);
  const totalPending = useMemo(
    () => items.filter((d) => d.status !== 'pago' && d.status !== 'cancelado').reduce((s, d) => s + d.amount, 0),
    [items],
  );

  const handleCopy = useCallback(async (txt: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(txt);
  }, []);

  const handleMarkPaid = useCallback(async (d: DarfCalculation) => {
    const today = new Date().toISOString().slice(0, 10);
    const optimistic = items.map((i) =>
      i.id === d.id ? { ...i, status: 'pago' as DarfStatus, paidDate: today } : i
    );
    setItems(optimistic);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await markDarfPaid(d.id, { paidDate: today, paidVia: 'app' });
      setItems((prev) => prev.map((i) => (i.id === d.id ? { ...i, ...updated } : i)));
    } catch {
      setItems(items);
      Alert.alert('Erro', 'Não foi possível marcar este DARF como pago.');
    }
  }, [items]);

  const handleShare = useCallback(async (d: DarfCalculation) => {
    const lines = [
      'DARF — Pilar Financeiro',
      `Competência: ${monthLabel(d.referenceMonth)}`,
      `Vencimento: ${formatDate(d.dueDate)}`,
      `Valor: R$ ${d.amount.toFixed(2).replace('.', ',')}`,
      d.revenueCode ? `Código de receita: ${d.revenueCode}` : null,
      d.barCode ? `Linha digitável: ${d.barCode}` : null,
    ].filter(Boolean).join('\n');
    try {
      const fileUri = `${FileSystem.cacheDirectory}darf-${d.id}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, lines, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain', dialogTitle: 'Compartilhar DARF' });
      } else {
        await Clipboard.setStringAsync(lines);
        Alert.alert('Copiado', 'Os dados do DARF foram copiados para a área de transferência.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o DARF.');
    }
  }, []);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'DARF' }} />
        <View style={[styles.center, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'DARF' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Resumo */}
        <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Pendente em {year}
            </Text>
            <Money value={totalPending} size="xl" weight="700" color={totalPending > 0 ? colors.warning : theme.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Total filtrado
            </Text>
            <Money value={total} size="md" weight="500" />
          </View>
        </View>

        {/* Filtros */}
        <View style={[styles.tabs, { backgroundColor: theme.surfaceElevated }]}>
          {FILTERS.map((f) => (
            <PressableScale
              key={f.id}
              onPress={() => setFilter(f.id)}
              haptic="light"
              style={[styles.tab, filter === f.id && { backgroundColor: colors.primary }]}
              testID={`filter-darf-${f.id}`}
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

        {filtered.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Sem DARFs nesta categoria"
            description="Quando houver tributação, os documentos aparecerão aqui."
          />
        ) : (
          filtered.map((d) => (
            <DarfCard
              key={d.id}
              d={d}
              expanded={expandedId === d.id}
              onToggle={() => setExpandedId(expandedId === d.id ? null : d.id)}
              onCopy={handleCopy}
              onMarkPaid={() => handleMarkPaid(d)}
              onShare={() => handleShare(d)}
            />
          ))
        )}

        {error && (
          <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
            {error}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

function DarfCard({
  d, expanded, onToggle, onCopy, onMarkPaid, onShare,
}: {
  d: DarfCalculation;
  expanded: boolean;
  onToggle: () => void;
  onCopy: (txt: string) => void;
  onMarkPaid: () => void;
  onShare: () => void;
}) {
  const { theme, colors } = useTheme();
  const sColor = statusBadgeColor(d.status, colors);
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <PressableElevate
        onPress={onToggle}
        haptic="light"
        style={styles.cardHeader}
        testID={`expand-darf-${d.id}`}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            {monthLabel(d.referenceMonth)}
          </Text>
          <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Vence {formatDate(d.dueDate)} {d.revenueCode ? `• Cód. ${d.revenueCode}` : ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Money value={d.amount} size="md" weight="700" />
          <View style={[styles.badge, { backgroundColor: `${sColor}22` }]}>
            <Text style={{ color: sColor, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
              {statusLabel(d.status)}
            </Text>
          </View>
        </View>
        <Icon
          name="chevron-down"
          size={18}
          color={theme.textTertiary}
          style={{ marginLeft: 8, transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </PressableElevate>

      {expanded && (
        <View style={[styles.expand, { borderTopColor: theme.border }]}>
          {d.barCode ? (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Linha digitável
              </Text>
              <View style={[styles.codeBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text
                  selectable
                  style={[styles.codeText, { color: theme.text, fontFamily: 'RobotoMono_500Medium' }]}
                >
                  {d.barCode}
                </Text>
                <PressableScale onPress={() => onCopy(d.barCode!)} haptic="light" style={styles.copyBtn} testID={`copy-barcode-${d.id}`}>
                  <Icon name="copy" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                    Copiar
                  </Text>
                </PressableScale>
              </View>
            </View>
          ) : (
            <Text style={[styles.muted, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Linha digitável ainda não disponível.
            </Text>
          )}

          {d.pixQrCode && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Pix Copia-e-Cola
              </Text>
              <View style={[styles.codeBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text
                  selectable
                  numberOfLines={2}
                  style={[styles.codeText, { color: theme.text, fontFamily: 'RobotoMono_400Regular', fontSize: 12 }]}
                >
                  {d.pixQrCode}
                </Text>
                <PressableScale onPress={() => onCopy(d.pixQrCode!)} haptic="light" style={styles.copyBtn} testID={`copy-pix-${d.id}`}>
                  <Icon name="copy" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                    Copiar
                  </Text>
                </PressableScale>
              </View>
            </View>
          )}

          <View style={styles.actionsRow}>
            {d.status !== 'pago' && (
              <PressableScale
                onPress={onMarkPaid}
                haptic="medium"
                style={[styles.actionBtn, { backgroundColor: colors.success }]}
                testID={`pay-darf-${d.id}`}
              >
                <Icon name="check-circle" size={16} color="#fff" />
                <Text style={styles.actionText}>Marcar como pago</Text>
              </PressableScale>
            )}
            <PressableScale
              onPress={onShare}
              haptic="light"
              style={[styles.actionBtn, styles.actionGhost, { borderColor: theme.border }]}
              testID={`share-darf-${d.id}`}
            >
              <Icon name="share" size={16} color={theme.text} />
              <Text style={[styles.actionText, { color: theme.text }]}>Compartilhar</Text>
            </PressableScale>
          </View>

          {d.paidDate && (
            <Text style={[styles.muted, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Pago em {formatDate(d.paidDate)}{d.paidVia ? ` via ${d.paidVia}` : ''}.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// --------- Helpers ---------

function formatDate(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}
function monthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split('-').map(Number);
  if (!y || !m) return yyyymm;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
function statusBadgeColor(status: DarfStatus, colors: any) {
  switch (status) {
    case 'pago':       return colors.success;
    case 'atrasado':   return colors.danger;
    case 'cancelado':  return colors.textTertiary;
    default:           return colors.warning;
  }
}
function statusLabel(status: DarfStatus) {
  switch (status) {
    case 'pago':      return 'Pago';
    case 'atrasado':  return 'Atrasado';
    case 'cancelado': return 'Cancelado';
    default:          return 'Pendente';
  }
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summary: {
    flexDirection: 'row', gap: 12,
    padding: 16, borderRadius: 12, borderWidth: 1,
  },
  label: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  tabs: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },

  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14,
  },
  cardTitle: { fontSize: 14, textTransform: 'capitalize' },
  cardSub: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },

  expand: { padding: 14, gap: 12, borderTopWidth: 1 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  codeBox: {
    padding: 10, borderRadius: 8, borderWidth: 1, gap: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  codeText: { fontSize: 13, flex: 1, marginRight: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  actionGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  actionText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  muted: { fontSize: 12 },
  errorText: { textAlign: 'center', marginTop: 8 },
});
