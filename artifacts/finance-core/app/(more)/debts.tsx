import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api';
import { formatBRL } from '@/utils/formatters';

interface Debt {
  id: string;
  creditor: string;
  description?: string;
  totalAmount: number;
  remainingAmount: number;
  paidAmount: number;
  interestRate?: number;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  status: 'active' | 'paid' | 'overdue';
  installments?: number;
  paidInstallments?: number;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'debts']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function formatDate(d?: string): string {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

function statusColor(status: string, colors: Record<string, string>): string {
  if (status === 'paid') return colors.success;
  if (status === 'overdue') return colors.danger;
  return colors.primary;
}

function statusLabel(status: string): string {
  if (status === 'paid') return 'Paga';
  if (status === 'overdue') return 'Vencida';
  return 'Ativa';
}

export default function DebtsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    creditor: '', description: '', totalAmount: '', interestRate: '',
    nextPaymentDate: '', nextPaymentAmount: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/api/debts');
      setDebts(toArray<Debt>(data));
    } catch (e) {
      console.warn('[Debts] load error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const activeDebts = debts.filter((d) => d.status !== 'paid');
  const totalRemaining = activeDebts.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);
  const totalPaid = debts.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0);
  const totalOriginal = debts.reduce((s, d) => s + (Number(d.totalAmount) || 0), 0);

  const openPay = (debt: Debt) => {
    setSelectedDebt(debt);
    setPayAmount(debt.nextPaymentAmount ? String(debt.nextPaymentAmount) : '');
    setShowPayModal(true);
  };

  const registerPayment = async () => {
    if (!selectedDebt) return;
    const amount = parseFloat(payAmount.replace(',', '.'));
    if (!amount || isNaN(amount)) { Alert.alert('Valor inválido'); return; }
    setSaving(true);
    try {
      await apiPost(`/api/debt-payments`, { debtId: selectedDebt.id, amount });
      setShowPayModal(false);
      setPayAmount('');
      setSelectedDebt(null);
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível registrar o pagamento');
    } finally {
      setSaving(false);
    }
  };

  const addDebt = async () => {
    if (!form.creditor || !form.totalAmount) { Alert.alert('Preencha credor e valor total'); return; }
    setSaving(true);
    try {
      await apiPost('/api/debts', {
        creditor: form.creditor,
        description: form.description,
        totalAmount: parseFloat(form.totalAmount.replace(',', '.')),
        interestRate: form.interestRate ? parseFloat(form.interestRate.replace(',', '.')) : undefined,
        nextPaymentDate: form.nextPaymentDate || undefined,
        nextPaymentAmount: form.nextPaymentAmount ? parseFloat(form.nextPaymentAmount.replace(',', '.')) : undefined,
      });
      setShowAddModal(false);
      setForm({ creditor: '', description: '', totalAmount: '', interestRate: '', nextPaymentDate: '', nextPaymentAmount: '' });
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível criar a dívida');
    } finally {
      setSaving(false);
    }
  };

  const deleteDebt = (debt: Debt) => {
    Alert.alert('Excluir dívida', `Deseja excluir "${debt.creditor}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try { await apiDelete(`/api/debts/${debt.id}`); await load(); } catch {}
        },
      },
    ]);
  };

  const renderDebt = ({ item }: { item: Debt }) => {
    const remaining = Number(item.remainingAmount) || 0;
    const total = Number(item.totalAmount) || 0;
    const paid = Number(item.paidAmount) || 0;
    const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
    const sColor = statusColor(item.status, colors);

    return (
      <View style={[s.debtCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={s.debtHeader}>
          <View style={[s.debtIcon, { backgroundColor: `${sColor}20` }]}>
            <Feather name="credit-card" size={18} color={sColor} />
          </View>
          <View style={s.debtInfo}>
            <Text style={[s.debtCreditor, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{item.creditor}</Text>
            {item.description ? (
              <Text style={[s.debtDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.description}</Text>
            ) : null}
          </View>
          <View style={[s.statusBadge, { backgroundColor: `${sColor}20` }]}>
            <Text style={[s.statusText, { color: sColor, fontFamily: 'Inter_500Medium' }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={s.debtAmounts}>
          <View>
            <Text style={[s.amtLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Restante</Text>
            <Text style={[s.amtValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>{formatBRL(remaining)}</Text>
          </View>
          <View>
            <Text style={[s.amtLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Total</Text>
            <Text style={[s.amtValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{formatBRL(total)}</Text>
          </View>
          {item.interestRate ? (
            <View>
              <Text style={[s.amtLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Juros</Text>
              <Text style={[s.amtValue, { color: colors.warning, fontFamily: 'Inter_600SemiBold' }]}>{item.interestRate}% a.m.</Text>
            </View>
          ) : null}
        </View>

        <View style={[s.progressBg, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? colors.success : colors.primary }]} />
        </View>
        <Text style={[s.progressLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          {pct.toFixed(0)}% pago
          {item.nextPaymentDate ? ` • Próximo: ${formatDate(item.nextPaymentDate)}` : ''}
        </Text>

        <View style={s.debtActions}>
          {item.status !== 'paid' && (
            <Pressable onPress={() => openPay(item)} style={[s.actionBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
              <Feather name="dollar-sign" size={14} color={colors.primary} />
              <Text style={[s.actionBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Registrar Pagamento</Text>
            </Pressable>
          )}
          <Pressable onPress={() => deleteDebt(item)} style={[s.actionBtn, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
            <Feather name="trash-2" size={14} color={colors.danger} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={activeDebts}
          keyExtractor={(item) => item.id}
          renderItem={renderDebt}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={() => (
            <View>
              <View style={[s.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Dívidas ativas</Text>
                  <Text style={[s.summaryValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalRemaining)}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Já pago</Text>
                  <Text style={[s.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalPaid)}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total original</Text>
                  <Text style={[s.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalOriginal)}</Text>
                </View>
              </View>
              {activeDebts.length === 0 && (
                <View style={s.empty}>
                  <Feather name="check-circle" size={48} color={colors.success} />
                  <Text style={[s.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Sem dívidas ativas</Text>
                  <Text style={[s.emptyDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Parabéns! Você está livre de dívidas.</Text>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={() => (
            debts.filter((d) => d.status === 'paid').length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text style={[s.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>PAGAS</Text>
                {debts.filter((d) => d.status === 'paid').map((d) => renderDebt({ item: d }))}
              </View>
            ) : null
          )}
        />
      )}

      <Pressable
        onPress={() => setShowAddModal(true)}
        style={[s.fab, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      {/* Register Payment Modal */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: theme.surface }]}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Registrar Pagamento
            </Text>
            {selectedDebt && (
              <Text style={[s.modalSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {selectedDebt.creditor} • Restante: {formatBRL(Number(selectedDebt.remainingAmount) || 0)}
              </Text>
            )}
            <TextInput
              style={[s.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
              placeholder="Valor pago (ex: 500,00)"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              value={payAmount}
              onChangeText={setPayAmount}
            />
            <View style={s.modalBtns}>
              <Pressable onPress={() => setShowPayModal(false)} style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={registerPayment} style={[s.modalBtn, { backgroundColor: colors.primary }]} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Debt Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={s.modalScroll}>
            <View style={[s.modal, { backgroundColor: theme.surface }]}>
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Nova Dívida</Text>
              {(['creditor:Credor *', 'description:Descrição', 'totalAmount:Valor Total *', 'interestRate:Juros % ao mês', 'nextPaymentDate:Próx. pagamento (YYYY-MM-DD)', 'nextPaymentAmount:Valor da parcela'] as const).map((pair) => {
                const [field, label] = pair.split(':') as [keyof typeof form, string];
                return (
                  <View key={field} style={{ marginBottom: 12 }}>
                    <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                    <TextInput
                      style={[s.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                      placeholder={label}
                      placeholderTextColor={theme.textTertiary}
                      keyboardType={['totalAmount', 'interestRate', 'nextPaymentAmount'].includes(field) ? 'decimal-pad' : 'default'}
                      value={form[field]}
                      onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                    />
                  </View>
                );
              })}
              <View style={s.modalBtns}>
                <Pressable onPress={() => setShowAddModal(false)} style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={addDebt} style={[s.modalBtn, { backgroundColor: colors.primary }]} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Criar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  summary: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 15 },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 8 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  debtCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  debtHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  debtIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  debtInfo: { flex: 1 },
  debtCreditor: { fontSize: 15 },
  debtDesc: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11 },
  debtAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  amtLabel: { fontSize: 11, marginBottom: 2 },
  amtValue: { fontSize: 14 },
  progressBg: { height: 6, borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 11, marginBottom: 10 },
  debtActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  actionBtnText: { fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 17 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScroll: { justifyContent: 'flex-end', flexGrow: 1 },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 6 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginTop: 4 },
  fieldLabel: { fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 15 },
});
