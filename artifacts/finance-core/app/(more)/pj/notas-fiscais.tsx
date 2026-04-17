import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';

interface Invoice {
  id: string;
  number: string;
  clientName: string;
  amount: number;
  date: string;
  description?: string;
  status: 'pending' | 'issued' | 'cancelled';
}

const STORAGE_KEY = 'pf_pj_invoices';

function uid() { return Math.random().toString(36).slice(2, 11); }

const STATUS_LABEL: Record<Invoice['status'], string> = {
  pending: 'Pendente',
  issued: 'Emitida',
  cancelled: 'Cancelada',
};

export default function NotasFiscaisScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // form fields
  const [number, setNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Invoice['status']>('pending');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setInvoices(JSON.parse(raw)); } catch { setInvoices([]); }
      }
    });
  }, []);

  const persist = async (next: Invoice[]) => {
    setInvoices(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthIssued = useMemo(
    () => invoices.filter((i) => i.status === 'issued' && i.date.startsWith(currentMonth))
                  .reduce((s, i) => s + i.amount, 0),
    [invoices, currentMonth]
  );
  const pendingCount = useMemo(() => invoices.filter((i) => i.status === 'pending').length, [invoices]);

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => b.date.localeCompare(a.date)),
    [invoices]
  );

  const resetForm = () => {
    setNumber(''); setClientName(''); setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription(''); setStatus('pending');
  };

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!number.trim() || !clientName.trim() || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Atenção', 'Preencha número, cliente e valor.');
      return;
    }
    const next: Invoice = {
      id: uid(),
      number: number.trim(),
      clientName: clientName.trim(),
      amount: amountNum,
      date,
      description: description.trim() || undefined,
      status,
    };
    await persist([next, ...invoices]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    resetForm();
  };

  const handleChangeStatus = (inv: Invoice, next: Invoice['status']) => {
    Haptics.selectionAsync();
    persist(invoices.map((i) => i.id === inv.id ? { ...i, status: next } : i));
  };

  const handleDelete = (inv: Invoice) => {
    Alert.alert('Excluir nota', `Excluir NF nº ${inv.number}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => persist(invoices.filter((i) => i.id !== inv.id)) },
    ]);
  };

  const statusColor = (s: Invoice['status']) =>
    s === 'issued' ? colors.success : s === 'cancelled' ? colors.danger : colors.warning;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90, gap: 16 }}
      >
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}30` }]}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Emitido este mês
            </Text>
            <Text style={[styles.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(monthIssued)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Pendentes
            </Text>
            <Text style={[styles.summaryValue, { color: colors.warning, fontFamily: 'Inter_700Bold' }]}>
              {pendingCount}
            </Text>
          </View>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="file-text" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Nenhuma nota fiscal registrada
            </Text>
          </View>
        ) : (
          sorted.map((inv) => (
            <View key={inv.id} style={[styles.invCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.invHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.invNumber, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    NF nº {inv.number}
                  </Text>
                  <Text style={[styles.invClient, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {inv.clientName}
                  </Text>
                </View>
                <Text style={[styles.invAmount, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                  {formatBRL(inv.amount)}
                </Text>
              </View>
              {inv.description && (
                <Text style={[styles.invDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {inv.description}
                </Text>
              )}
              <View style={styles.invFooter}>
                <View style={styles.invDate}>
                  <Feather name="calendar" size={11} color={theme.textTertiary} />
                  <Text style={[styles.invDateText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {new Date(inv.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor(inv.status)}20` }]}>
                  <Text style={[styles.statusText, { color: statusColor(inv.status), fontFamily: 'Inter_600SemiBold' }]}>
                    {STATUS_LABEL[inv.status]}
                  </Text>
                </View>
              </View>
              <View style={[styles.actions, { borderTopColor: theme.border }]}>
                {inv.status !== 'issued' && (
                  <Pressable onPress={() => handleChangeStatus(inv, 'issued')} style={styles.actionBtn}>
                    <Feather name="check-circle" size={14} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>Emitir</Text>
                  </Pressable>
                )}
                {inv.status !== 'cancelled' && (
                  <Pressable onPress={() => handleChangeStatus(inv, 'cancelled')} style={styles.actionBtn}>
                    <Feather name="x-circle" size={14} color={colors.warning} />
                    <Text style={[styles.actionText, { color: colors.warning, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => handleDelete(inv)} style={styles.actionBtn}>
                  <Feather name="trash-2" size={14} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        testID="button-add-invoice"
        onPress={() => { Haptics.selectionAsync(); setShowAdd(true); }}
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
      >
        <Feather name="plus" size={24} color="#000" />
      </Pressable>

      {/* Add modal */}
      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + 8 }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => { setShowAdd(false); resetForm(); }}>
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Nova Nota Fiscal
            </Text>
            <Pressable onPress={handleSave}>
              <Text style={[styles.modalSave, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Salvar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Número</Text>
              <TextInput
                value={number}
                onChangeText={setNumber}
                placeholder="Ex: 0001"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cliente</Text>
              <TextInput
                value={clientName}
                onChangeText={setClientName}
                placeholder="Nome do cliente"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Valor</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Data</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Descrição</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Serviço prestado / produto vendido"
                placeholderTextColor={theme.textTertiary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, height: 80, textAlignVertical: 'top' }]}
                multiline
              />
            </View>
            <View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Status</Text>
              <View style={styles.statusRow}>
                {(['pending', 'issued', 'cancelled'] as Invoice['status'][]).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => { Haptics.selectionAsync(); setStatus(s); }}
                    style={[styles.statusOpt, {
                      backgroundColor: status === s ? statusColor(s) : theme.surface,
                      borderColor: status === s ? statusColor(s) : theme.border,
                    }]}
                  >
                    <Text style={[styles.statusOptText, {
                      color: status === s ? '#000' : theme.text,
                      fontFamily: status === s ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    }]}>
                      {STATUS_LABEL[s]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 18 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  invCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  invHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invNumber: { fontSize: 15 },
  invClient: { fontSize: 13, marginTop: 2 },
  invAmount: { fontSize: 16 },
  invDesc: { fontSize: 12 },
  invFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  invDateText: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, paddingTop: 10, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 12 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17 },
  modalSave: { fontSize: 15 },
  fieldLabel: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusOpt: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1 },
  statusOptText: { fontSize: 13 },
});
