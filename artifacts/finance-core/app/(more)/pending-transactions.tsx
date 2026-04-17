import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { apiFetch } from '@/services/api';

interface PendingTx {
  id: string;
  source: 'whatsapp' | 'sms' | 'manual';
  rawText: string;
  parsedAt: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  merchant?: string;
  category: string;
  bank?: string;
  status: 'pending' | 'approved' | 'rejected';
}

const SOURCE_META: Record<PendingTx['source'], { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: 'message-circle', color: '#25D366' },
  sms: { label: 'SMS', icon: 'message-square', color: '#3B82F6' },
  manual: { label: 'Notificação', icon: 'bell', color: '#F59E0B' },
};

export default function PendingTransactionsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<PendingTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/pending-transactions');
      if (res.ok) {
        const data = await res.json();
        const list: PendingTx[] = (data.transactions || []).filter((t: PendingTx) => t.status === 'pending');
        setItems(list);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/pending-transactions/${id}/approve`, { method: 'PUT' });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setItems((prev) => prev.filter((t) => t.id !== id));
      } else {
        Alert.alert('Erro', 'Não foi possível aprovar este lançamento');
      }
    } catch {
      Alert.alert('Erro', 'Falha de conexão');
    } finally {
      setBusyId(null);
    }
  };

  const reject = (id: string) => {
    Alert.alert('Rejeitar lançamento', 'Tem certeza? A captura será descartada.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar', style: 'destructive', onPress: async () => {
          setBusyId(id);
          try {
            const res = await apiFetch(`/api/pending-transactions/${id}`, { method: 'DELETE' });
            if (res.ok) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setItems((prev) => prev.filter((t) => t.id !== id));
            }
          } catch { /* noop */ }
          finally { setBusyId(null); }
        }
      },
    ]);
  };

  const totalPending = items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={[styles.infoCard, { backgroundColor: `${colors.info || '#3B82F6'}10`, borderColor: `${colors.info || '#3B82F6'}30` }]}>
        <Feather name="info" size={14} color={colors.info || '#3B82F6'} />
        <Text style={[styles.infoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Lançamentos capturados via WhatsApp, SMS e notificações aguardando sua confirmação.
        </Text>
      </View>

      {items.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
          <Feather name="clock" size={16} color={colors.warning} />
          <View>
            <Text style={[styles.summaryLabel, { color: colors.warning, fontFamily: 'Inter_500Medium' }]}>
              {items.length} captura{items.length > 1 ? 's' : ''} pendente{items.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(totalPending)} a confirmar
            </Text>
          </View>
        </View>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="Nenhuma captura pendente"
          description="Capturas via WhatsApp, SMS e notificações aparecem aqui aguardando aprovação"
        />
      ) : (
        items.map((t) => {
          const meta = SOURCE_META[t.source];
          const typeColor = t.type === 'income' ? colors.success : colors.danger;
          return (
            <View
              key={t.id}
              style={[styles.txCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.txHeader}>
                <View style={[styles.sourceTag, { backgroundColor: `${meta.color}15` }]}>
                  <Feather name={meta.icon} size={12} color={meta.color} />
                  <Text style={[styles.sourceText, { color: meta.color, fontFamily: 'Inter_600SemiBold' }]}>{meta.label}</Text>
                </View>
                <Text style={[styles.txAmount, { color: typeColor, fontFamily: 'Inter_700Bold' }]}>
                  {t.type === 'income' ? '+' : '–'}{formatBRL(t.amount)}
                </Text>
              </View>
              <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{t.description}</Text>
              {t.merchant && (
                <Text style={[styles.txMerchant, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {t.merchant} {t.bank ? `• ${t.bank}` : ''}
                </Text>
              )}
              <Text style={[styles.txRaw, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                "{t.rawText}"
              </Text>
              <View style={styles.actionsRow}>
                <Pressable
                  disabled={busyId === t.id}
                  onPress={() => reject(t.id)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}30`, opacity: pressed ? 0.7 : 1 }
                  ]}
                >
                  <Feather name="x" size={14} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>Rejeitar</Text>
                </Pressable>
                <Pressable
                  disabled={busyId === t.id}
                  onPress={() => approve(t.id)}
                  style={({ pressed }) => [
                    styles.actionBtn,
                    { backgroundColor: colors.primary, opacity: pressed || busyId === t.id ? 0.7 : 1 }
                  ]}
                >
                  {busyId === t.id ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <>
                      <Feather name="check" size={14} color="#000" />
                      <Text style={[styles.actionText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Aprovar</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 16 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 18, marginTop: 2 },
  txCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 8 },
  txHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sourceText: { fontSize: 11, letterSpacing: 0.3 },
  txDesc: { fontSize: 15 },
  txMerchant: { fontSize: 12 },
  txRaw: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  txAmount: { fontSize: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  actionText: { fontSize: 13 },
});
