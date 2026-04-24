import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { useWallet } from '@/context/WalletContext';
import { formatBRL } from '@/utils/formatters';
import {
  listBills,
  createBill,
  updateBill,
  payBill,
  deleteBill as deleteBillApi,
  type Bill,
} from '@/services/bills';

function formatDate(d?: string): string {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

function isOverdue(bill: Bill): boolean {
  if (bill.isPaid) return false;
  const today = new Date().toISOString().split('T')[0];
  return (bill.dueDate || '').split('T')[0] < today;
}

interface FormState {
  description: string;
  amount: string;
  dueDate: string;
  category: string;
  isRecurring: boolean;
  notes: string;
}

const EMPTY_FORM: FormState = {
  description: '', amount: '', dueDate: '', category: '', isRecurring: false, notes: '',
};

export default function BillsScreen() {
  const { theme, colors, maskValue } = useTheme();
  const insets = useSafeAreaInsets();
  const { accounts } = useFinance();
  const { selectedWalletId } = useWallet();

  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payTarget, setPayTarget] = useState<Bill | null>(null);
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [paying, setPaying] = useState(false);

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'credit' && !a.archived),
    [accounts]
  );

  const load = useCallback(async () => {
    try {
      const data = await listBills();
      setBills(data);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, selectedWalletId]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openAdd = () => {
    setEditingBill(null);
    setForm(EMPTY_FORM);
    setShowFormModal(true);
  };

  const openEdit = (bill: Bill) => {
    setEditingBill(bill);
    setForm({
      description: bill.description,
      amount: String(bill.amount),
      dueDate: bill.dueDate,
      category: bill.category || '',
      isRecurring: !!bill.isRecurring,
      notes: bill.notes || '',
    });
    setShowFormModal(true);
  };

  const submitForm = async () => {
    if (!form.description || !form.amount || !form.dueDate) {
      Alert.alert('Preencha descrição, valor e vencimento');
      return;
    }
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (!isFinite(amount) || amount <= 0) {
      Alert.alert('Valor inválido');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        amount,
        dueDate: form.dueDate,
        category: form.category || undefined,
        isRecurring: form.isRecurring,
        notes: form.notes || undefined,
      };
      const result = editingBill
        ? await updateBill(editingBill.id, payload)
        : await createBill(payload, selectedWalletId || undefined);
      if (!result) {
        Alert.alert('Erro', 'Não foi possível salvar a conta.');
        return;
      }
      setShowFormModal(false);
      setForm(EMPTY_FORM);
      setEditingBill(null);
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const openPay = (bill: Bill) => {
    if (cashAccounts.length === 0) {
      Alert.alert('Sem contas', 'Cadastre uma conta para registrar o pagamento.');
      return;
    }
    setPayTarget(bill);
    setPayAccountId(cashAccounts[0]?.id || '');
    setShowPayModal(true);
  };

  const confirmPay = async () => {
    if (!payTarget || !payAccountId) return;
    setPaying(true);
    try {
      const ok = await payBill(payTarget.id, { accountId: payAccountId });
      if (!ok) {
        Alert.alert('Erro', 'Não foi possível pagar a conta.');
        return;
      }
      setShowPayModal(false);
      setPayTarget(null);
      await load();
    } finally {
      setPaying(false);
    }
  };

  const removeBill = (bill: Bill) => {
    Alert.alert('Excluir conta', `Deseja excluir "${bill.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          const ok = await deleteBillApi(bill.id);
          if (!ok) Alert.alert('Erro', 'Não foi possível excluir.');
          await load();
        },
      },
    ]);
  };

  const filteredBills = bills.filter((b) => {
    if (filter === 'pending') return !b.isPaid;
    if (filter === 'paid') return b.isPaid;
    return true;
  }).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const pendingTotal = bills.filter((b) => !b.isPaid).reduce((s, b) => s + Number(b.amount), 0);
  const paidTotal = bills.filter((b) => b.isPaid).reduce((s, b) => s + Number(b.amount), 0);
  const overdueCount = bills.filter(isOverdue).length;

  const renderBill = ({ item }: { item: Bill }) => {
    const overdue = isOverdue(item);
    const accentColor = item.isPaid ? colors.success : overdue ? colors.danger : colors.primary;

    return (
      <Pressable onLongPress={() => openEdit(item)} testID={`bill-row-${item.id}`}>
        <View style={[s.billCard, {
          backgroundColor: theme.surface,
          borderColor: item.isPaid ? theme.border : overdue ? `${colors.danger}40` : theme.border,
          opacity: item.isPaid ? 0.7 : 1,
        }]}>
          <View style={s.billRow}>
            <View style={[s.billIcon, { backgroundColor: `${accentColor}20` }]}>
              <Feather name={item.isPaid ? 'check-circle' : overdue ? 'alert-circle' : 'file-text'} size={18} color={accentColor} />
            </View>
            <View style={s.billInfo}>
              <Text style={[s.billDesc, {
                color: theme.text,
                fontFamily: 'Inter_600SemiBold',
                textDecorationLine: item.isPaid ? 'line-through' : 'none',
              }]}>
                {item.description}
              </Text>
              <Text style={[s.billMeta, { color: overdue ? colors.danger : theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {overdue ? 'Vencida — ' : ''}Venc. {formatDate(item.dueDate)}
                {item.category ? ` • ${item.category}` : ''}
                {item.isRecurring ? ' • Recorrente' : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text style={[s.billAmount, { color: item.isPaid ? colors.success : overdue ? colors.danger : theme.text, fontFamily: 'Inter_700Bold' }]}>
                {maskValue(formatBRL(Number(item.amount)))}
              </Text>
              {!item.isPaid && (
                <Pressable
                  testID={`pay-bill-${item.id}`}
                  onPress={() => openPay(item)}
                  style={[s.payBtn, { backgroundColor: `${colors.primary}15` }]}
                >
                  <Text style={[s.payBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                    Pagar
                  </Text>
                </Pressable>
              )}
              {item.isPaid && (
                <Text style={[s.paidLabel, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>
                  Paga {item.paidAt ? `em ${formatDate(item.paidAt)}` : ''}
                </Text>
              )}
            </View>
            <View style={{ marginLeft: 4, gap: 8 }}>
              <Pressable testID={`edit-bill-${item.id}`} onPress={() => openEdit(item)} style={{ padding: 6 }}>
                <Feather name="edit-2" size={15} color={theme.textTertiary} />
              </Pressable>
              <Pressable testID={`delete-bill-${item.id}`} onPress={() => removeBill(item)} style={{ padding: 6 }}>
                <Feather name="trash-2" size={15} color={theme.textTertiary} />
              </Pressable>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} testID="loading-bills" />
      ) : (
        <FlatList
          testID="bills-list"
          data={filteredBills}
          keyExtractor={(item) => item.id}
          renderItem={renderBill}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={() => (
            <View>
              <View style={[s.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>A pagar</Text>
                  <Text style={[s.summaryValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(pendingTotal))}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Pago</Text>
                  <Text style={[s.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(paidTotal))}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Vencidas</Text>
                  <Text style={[s.summaryValue, { color: overdueCount > 0 ? colors.danger : theme.text, fontFamily: 'Inter_700Bold' }]}>{overdueCount}</Text>
                </View>
              </View>

              <View style={[s.filterRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {(['pending', 'all', 'paid'] as const).map((f) => (
                  <Pressable
                    key={f}
                    testID={`filter-bills-${f}`}
                    onPress={() => setFilter(f)}
                    style={[s.filterBtn, filter === f && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[s.filterText, { color: filter === f ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {f === 'pending' ? 'Pendentes' : f === 'paid' ? 'Pagas' : 'Todas'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {filteredBills.length === 0 && (
                <View style={s.empty}>
                  <Feather name="check-circle" size={48} color={colors.success} />
                  <Text style={[s.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {filter === 'pending' ? 'Nenhuma conta pendente' : filter === 'paid' ? 'Nenhuma conta paga' : 'Nenhuma conta cadastrada'}
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Pressable testID="add-bill" onPress={openAdd} style={[s.fab, { backgroundColor: colors.primary }]}>
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      {/* Add / Edit Modal */}
      <Modal visible={showFormModal} transparent animationType="slide" onRequestClose={() => setShowFormModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={[s.modal, { backgroundColor: theme.surface }]}>
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                {editingBill ? 'Editar Conta' : 'Nova Conta a Pagar'}
              </Text>
              {([
                { key: 'description', label: 'Descrição *', kb: 'default' },
                { key: 'amount', label: 'Valor *', kb: 'decimal-pad' },
                { key: 'dueDate', label: 'Vencimento (YYYY-MM-DD) *', kb: 'default' },
                { key: 'category', label: 'Categoria', kb: 'default' },
                { key: 'notes', label: 'Observações', kb: 'default' },
              ] as const).map(({ key, label, kb }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                  <TextInput
                    testID={`form-bill-${key}`}
                    style={[s.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                    placeholder={label}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType={kb as any}
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}
              <View style={[s.switchRow, { borderColor: theme.border }]}>
                <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Recorrente</Text>
                <Switch
                  testID="form-bill-recurring"
                  value={form.isRecurring}
                  onValueChange={(v) => setForm((f) => ({ ...f, isRecurring: v }))}
                  trackColor={{ true: colors.primary, false: theme.border }}
                />
              </View>
              <View style={s.modalBtns}>
                <Pressable
                  testID="cancel-bill"
                  onPress={() => { setShowFormModal(false); setEditingBill(null); }}
                  style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}
                >
                  <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  testID="save-bill"
                  onPress={submitForm}
                  style={[s.modalBtn, { backgroundColor: colors.primary }]}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                      {editingBill ? 'Salvar' : 'Criar'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Pay Modal */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: theme.surface }]}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Pagar conta
            </Text>
            {payTarget && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                  {payTarget.description}
                </Text>
                <Text style={[s.modalBtnText, { color: theme.text, fontFamily: 'Inter_700Bold', marginTop: 4 }]}>
                  {maskValue(formatBRL(payTarget.amount))} • Venc. {formatDate(payTarget.dueDate)}
                </Text>
              </View>
            )}
            <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', marginBottom: 8 }]}>
              Conta de origem
            </Text>
            <ScrollView style={{ maxHeight: 220, marginBottom: 12 }}>
              {cashAccounts.map((acc) => {
                const selected = payAccountId === acc.id;
                return (
                  <Pressable
                    key={acc.id}
                    testID={`pay-source-${acc.id}`}
                    onPress={() => setPayAccountId(acc.id)}
                    style={[s.accountRow, {
                      backgroundColor: selected ? `${colors.primary}15` : theme.surfaceElevated,
                      borderColor: selected ? colors.primary : theme.border,
                    }]}
                  >
                    <View style={[s.accountDot, { backgroundColor: acc.color || colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modalBtnText, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {acc.name}
                      </Text>
                      <Text style={[s.fieldLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {maskValue(formatBRL(acc.balance))}
                      </Text>
                    </View>
                    {selected && <Feather name="check" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={s.modalBtns}>
              <Pressable
                testID="cancel-pay-bill"
                onPress={() => setShowPayModal(false)}
                style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}
              >
                <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                testID="confirm-pay-bill"
                onPress={confirmPay}
                style={[s.modalBtn, { backgroundColor: colors.primary }]}
                disabled={paying || !payAccountId}
              >
                {paying ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                    Confirmar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  summary: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 15 },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 8 },
  filterRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 4, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterText: { fontSize: 13 },
  billCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  billRow: { flexDirection: 'row', alignItems: 'center' },
  billIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  billInfo: { flex: 1 },
  billDesc: { fontSize: 14 },
  billMeta: { fontSize: 12, marginTop: 2 },
  billAmount: { fontSize: 15 },
  payBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  payBtnText: { fontSize: 12 },
  paidLabel: { fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 16 },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginTop: 4 },
  fieldLabel: { fontSize: 13, marginBottom: 2 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 15 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  accountDot: { width: 10, height: 10, borderRadius: 5 },
});
