import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl, Switch,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api';
import { formatBRL } from '@/utils/formatters';

interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  category?: string;
  isRecurring?: boolean;
  recurrence?: string;
  paidAt?: string;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'bills']) {
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

function isOverdue(bill: Bill): boolean {
  if (bill.isPaid) return false;
  const today = new Date().toISOString().split('T')[0];
  return (bill.dueDate || '').split('T')[0] < today;
}

export default function BillsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'paid' | 'all'>('pending');

  const [form, setForm] = useState({
    description: '', amount: '', dueDate: '', category: '', isRecurring: false,
  });

  const load = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/api/bills');
      setBills(toArray<Bill>(data));
    } catch (e) {
      console.warn('[Bills] load error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const togglePaid = async (bill: Bill) => {
    try {
      await apiPatch(`/api/bills/${bill.id}`, { isPaid: !bill.isPaid });
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao atualizar');
    }
  };

  const deleteBill = (bill: Bill) => {
    Alert.alert('Excluir conta', `Deseja excluir "${bill.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try { await apiDelete(`/api/bills/${bill.id}`); await load(); } catch {}
        },
      },
    ]);
  };

  const addBill = async () => {
    if (!form.description || !form.amount || !form.dueDate) {
      Alert.alert('Preencha descrição, valor e vencimento');
      return;
    }
    setSaving(true);
    try {
      await apiPost('/api/bills', {
        description: form.description,
        amount: parseFloat(form.amount.replace(',', '.')),
        dueDate: form.dueDate,
        category: form.category || undefined,
        isRecurring: form.isRecurring,
      });
      setShowAddModal(false);
      setForm({ description: '', amount: '', dueDate: '', category: '', isRecurring: false });
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível criar a conta');
    } finally {
      setSaving(false);
    }
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
      <View style={[s.billCard, { backgroundColor: theme.surface, borderColor: item.isPaid ? theme.border : overdue ? `${colors.danger}40` : theme.border, opacity: item.isPaid ? 0.7 : 1 }]}>
        <View style={s.billRow}>
          <View style={[s.billIcon, { backgroundColor: `${accentColor}20` }]}>
            <Feather name={item.isPaid ? 'check-circle' : overdue ? 'alert-circle' : 'file-text'} size={18} color={accentColor} />
          </View>
          <View style={s.billInfo}>
            <Text style={[s.billDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold', textDecorationLine: item.isPaid ? 'line-through' : 'none' }]}>{item.description}</Text>
            <Text style={[s.billMeta, { color: overdue ? colors.danger : theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              {overdue ? 'Vencida — ' : ''}Venc. {formatDate(item.dueDate)}
              {item.category ? ` • ${item.category}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <Text style={[s.billAmount, { color: item.isPaid ? colors.success : overdue ? colors.danger : theme.text, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(Number(item.amount))}
            </Text>
            <Pressable
              onPress={() => togglePaid(item)}
              style={[s.payBtn, { backgroundColor: item.isPaid ? `${colors.success}15` : `${colors.primary}15` }]}
            >
              <Text style={[s.payBtnText, { color: item.isPaid ? colors.success : colors.primary, fontFamily: 'Inter_500Medium' }]}>
                {item.isPaid ? 'Paga' : 'Pagar'}
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={() => deleteBill(item)} style={{ padding: 6, marginLeft: 4 }}>
            <Feather name="trash-2" size={15} color={theme.textTertiary} />
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
                  <Text style={[s.summaryValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>{formatBRL(pendingTotal)}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Pago</Text>
                  <Text style={[s.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatBRL(paidTotal)}</Text>
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

      <Pressable onPress={() => setShowAddModal(true)} style={[s.fab, { backgroundColor: colors.primary }]}>
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}>
            <View style={[s.modal, { backgroundColor: theme.surface }]}>
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Nova Conta a Pagar</Text>
              {([
                { key: 'description', label: 'Descrição *', kb: 'default' },
                { key: 'amount', label: 'Valor *', kb: 'decimal-pad' },
                { key: 'dueDate', label: 'Vencimento (YYYY-MM-DD) *', kb: 'default' },
                { key: 'category', label: 'Categoria', kb: 'default' },
              ] as const).map(({ key, label, kb }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                  <TextInput
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
                <Switch value={form.isRecurring} onValueChange={(v) => setForm((f) => ({ ...f, isRecurring: v }))} trackColor={{ true: colors.primary }} />
              </View>
              <View style={s.modalBtns}>
                <Pressable onPress={() => setShowAddModal(false)} style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={addBill} style={[s.modalBtn, { backgroundColor: colors.primary }]} disabled={saving}>
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
});
