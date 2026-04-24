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
  listRecurring,
  createRecurring,
  updateRecurring,
  setRecurringActive,
  deleteRecurring,
  type Recurring,
  type RecurringFrequency,
  type RecurringType,
  type RecurringPayload,
} from '@/services/recurring';

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  monthly: 'Mensal',
  weekly: 'Semanal',
  yearly: 'Anual',
  daily: 'Diária',
};

const TYPE_LABELS: Record<RecurringType, string> = {
  income: 'Receita',
  expense: 'Despesa',
};

interface FormState {
  description: string;
  amount: string;
  type: RecurringType;
  frequency: RecurringFrequency;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
  notes: string;
  accountId: string;
}

const EMPTY_FORM: FormState = {
  description: '',
  amount: '',
  type: 'expense',
  frequency: 'monthly',
  dayOfMonth: '',
  startDate: '',
  endDate: '',
  notes: '',
  accountId: '',
};

export default function RecurringScreen() {
  const { theme, colors, maskValue } = useTheme();
  const insets = useSafeAreaInsets();
  const { accounts } = useFinance();
  const { selectedWalletId } = useWallet();

  const [items, setItems] = useState<Recurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('active');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.type !== 'credit' && !a.archived),
    [accounts]
  );

  const load = useCallback(async () => {
    try {
      const data = await listRecurring();
      setItems(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, selectedWalletId]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, accountId: cashAccounts[0]?.id || '' });
    setShowFormModal(true);
  };

  const openEdit = (item: Recurring) => {
    setEditing(item);
    setForm({
      description: item.description,
      amount: String(item.amount),
      type: item.type,
      frequency: item.frequency,
      dayOfMonth: item.dayOfMonth ? String(item.dayOfMonth) : '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      notes: item.notes || '',
      accountId: item.accountId || '',
    });
    setShowFormModal(true);
  };

  const submitForm = async () => {
    if (!form.description || !form.amount) {
      Alert.alert('Preencha descrição e valor');
      return;
    }
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (!isFinite(amount) || amount <= 0) {
      Alert.alert('Valor inválido');
      return;
    }
    setSaving(true);
    try {
      const payload: RecurringPayload = {
        description: form.description.trim(),
        amount,
        type: form.type,
        frequency: form.frequency,
        dayOfMonth: form.dayOfMonth ? parseInt(form.dayOfMonth, 10) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        notes: form.notes || undefined,
        accountId: form.accountId || undefined,
      };
      const result = editing
        ? await updateRecurring(editing.id, payload)
        : await createRecurring(payload, selectedWalletId || undefined);
      if (!result) {
        Alert.alert('Erro', 'Não foi possível salvar.');
        return;
      }
      setShowFormModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const togglePaused = async (item: Recurring) => {
    const ok = await setRecurringActive(item.id, !item.active);
    if (!ok) {
      Alert.alert('Erro', 'Não foi possível atualizar o status.');
      return;
    }
    await load();
  };

  const removeItem = (item: Recurring) => {
    Alert.alert('Excluir recorrência', `Excluir "${item.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const ok = await deleteRecurring(item.id);
          if (!ok) Alert.alert('Erro', 'Não foi possível excluir.');
          await load();
        },
      },
    ]);
  };

  const filteredItems = items
    .filter((it) => {
      if (filter === 'active') return it.active;
      if (filter === 'paused') return !it.active;
      return true;
    })
    .sort((a, b) => a.description.localeCompare(b.description));

  const monthlyExpenses = items
    .filter((it) => it.active && it.type === 'expense' && it.frequency === 'monthly')
    .reduce((s, it) => s + it.amount, 0);
  const monthlyIncome = items
    .filter((it) => it.active && it.type === 'income' && it.frequency === 'monthly')
    .reduce((s, it) => s + it.amount, 0);

  const renderItem = ({ item }: { item: Recurring }) => {
    const isIncome = item.type === 'income';
    const accentColor = isIncome ? colors.primary : colors.danger;
    return (
      <Pressable onLongPress={() => openEdit(item)} testID={`recurring-row-${item.id}`}>
        <View style={[s.card, {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: item.active ? 1 : 0.55,
        }]}>
          <View style={s.row}>
            <View style={[s.icon, { backgroundColor: `${accentColor}20` }]}>
              <Feather name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'} size={18} color={accentColor} />
            </View>
            <View style={s.info}>
              <Text style={[s.desc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                {item.description}
              </Text>
              <Text style={[s.meta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {FREQ_LABELS[item.frequency]}
                {item.dayOfMonth ? ` • Dia ${item.dayOfMonth}` : ''}
                {' • '}{TYPE_LABELS[item.type]}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={[s.amount, { color: accentColor, fontFamily: 'Inter_700Bold' }]}>
                {isIncome ? '+' : '-'}{maskValue(formatBRL(item.amount))}
              </Text>
              <Switch
                testID={`toggle-recurring-${item.id}`}
                value={item.active}
                onValueChange={() => togglePaused(item)}
                trackColor={{ true: colors.primary, false: theme.border }}
              />
            </View>
            <View style={{ marginLeft: 6, gap: 8 }}>
              <Pressable testID={`edit-recurring-${item.id}`} onPress={() => openEdit(item)} style={{ padding: 6 }}>
                <Feather name="edit-2" size={15} color={theme.textTertiary} />
              </Pressable>
              <Pressable testID={`delete-recurring-${item.id}`} onPress={() => removeItem(item)} style={{ padding: 6 }}>
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
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} testID="loading-recurring" />
      ) : (
        <FlatList
          testID="recurring-list"
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={() => (
            <View>
              <View style={[s.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.sumItem}>
                  <Text style={[s.sumLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Receitas/mês</Text>
                  <Text style={[s.sumValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                    {maskValue(formatBRL(monthlyIncome))}
                  </Text>
                </View>
                <View style={[s.sumDivider, { backgroundColor: theme.border }]} />
                <View style={s.sumItem}>
                  <Text style={[s.sumLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Despesas/mês</Text>
                  <Text style={[s.sumValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
                    {maskValue(formatBRL(monthlyExpenses))}
                  </Text>
                </View>
              </View>
              <View style={[s.filterRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {(['active', 'all', 'paused'] as const).map((f) => (
                  <Pressable
                    key={f}
                    testID={`filter-recurring-${f}`}
                    onPress={() => setFilter(f)}
                    style={[s.filterBtn, filter === f && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[s.filterText, { color: filter === f ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {f === 'active' ? 'Ativas' : f === 'paused' ? 'Pausadas' : 'Todas'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {filteredItems.length === 0 && (
                <View style={s.empty}>
                  <Feather name="repeat" size={48} color={theme.textTertiary} />
                  <Text style={[s.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    Nenhuma recorrência {filter === 'active' ? 'ativa' : filter === 'paused' ? 'pausada' : 'cadastrada'}
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Pressable testID="add-recurring" onPress={openAdd} style={[s.fab, { backgroundColor: colors.primary }]}>
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <Modal visible={showFormModal} transparent animationType="slide" onRequestClose={() => setShowFormModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={[s.modal, { backgroundColor: theme.surface }]}>
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                {editing ? 'Editar Recorrência' : 'Nova Recorrência'}
              </Text>

              {/* Type chips */}
              <View style={s.chipRow}>
                {(['expense', 'income'] as const).map((t) => (
                  <Pressable
                    key={t}
                    testID={`form-recurring-type-${t}`}
                    onPress={() => setForm((f) => ({ ...f, type: t }))}
                    style={[s.chip, {
                      backgroundColor: form.type === t ? colors.primary : theme.surfaceElevated,
                      borderColor: form.type === t ? colors.primary : theme.border,
                    }]}
                  >
                    <Text style={[s.chipText, { color: form.type === t ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {TYPE_LABELS[t]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Frequency chips */}
              <View style={[s.chipRow, { marginTop: 8 }]}>
                {(['monthly', 'weekly', 'yearly', 'daily'] as const).map((fq) => (
                  <Pressable
                    key={fq}
                    testID={`form-recurring-freq-${fq}`}
                    onPress={() => setForm((f) => ({ ...f, frequency: fq }))}
                    style={[s.chip, {
                      backgroundColor: form.frequency === fq ? colors.primary : theme.surfaceElevated,
                      borderColor: form.frequency === fq ? colors.primary : theme.border,
                    }]}
                  >
                    <Text style={[s.chipText, { color: form.frequency === fq ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {FREQ_LABELS[fq]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {([
                { key: 'description', label: 'Descrição *', kb: 'default' },
                { key: 'amount', label: 'Valor *', kb: 'decimal-pad' },
                { key: 'dayOfMonth', label: 'Dia do mês (1-31)', kb: 'number-pad' },
                { key: 'startDate', label: 'Início (YYYY-MM-DD)', kb: 'default' },
                { key: 'endDate', label: 'Fim (YYYY-MM-DD)', kb: 'default' },
                { key: 'notes', label: 'Observações', kb: 'default' },
              ] as const).map(({ key, label, kb }) => (
                <View key={key} style={{ marginTop: 10 }}>
                  <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                  <TextInput
                    testID={`form-recurring-${key}`}
                    style={[s.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                    placeholder={label}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType={kb as any}
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}

              <View style={s.modalBtns}>
                <Pressable
                  testID="cancel-recurring"
                  onPress={() => { setShowFormModal(false); setEditing(null); }}
                  style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}
                >
                  <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  testID="save-recurring"
                  onPress={submitForm}
                  style={[s.modalBtn, { backgroundColor: colors.primary }]}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                      {editing ? 'Salvar' : 'Criar'}
                    </Text>
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
  sumItem: { flex: 1, alignItems: 'center' },
  sumLabel: { fontSize: 11, marginBottom: 4, textAlign: 'center' },
  sumValue: { fontSize: 15 },
  sumDivider: { width: 1, height: 36, marginHorizontal: 8 },
  filterRow: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 4, marginBottom: 16 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  filterText: { fontSize: 13 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  info: { flex: 1 },
  desc: { fontSize: 14 },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 16 },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginTop: 4 },
  fieldLabel: { fontSize: 13, marginBottom: 2 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 15 },
});
