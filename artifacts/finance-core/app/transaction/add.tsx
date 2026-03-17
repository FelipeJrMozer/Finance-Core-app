import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';

export default function AddTransactionScreen() {
  const { theme, colors } = useTheme();
  const { addTransaction, updateTransaction, addTransfer, transactions, accounts } = useFinance();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEdit = !!id;
  const existing = isEdit ? transactions.find((t) => t.id === id) : undefined;

  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(
    existing?.type === 'transfer' ? 'transfer' : existing?.type === 'income' ? 'income' : 'expense'
  );
  const [description, setDescription] = useState(existing?.description || '');
  const [amount, setAmount] = useState(existing ? existing.amount.toFixed(2) : '');
  const [category, setCategory] = useState(existing?.category || 'food');
  const [accountId, setAccountId] = useState(existing?.accountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId || '');
  const [date, setDate] = useState(existing?.date || new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState(existing?.installments?.toString() || '1');
  const [recurring, setRecurring] = useState(existing?.recurring || false);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [loading, setLoading] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.archived);

  useEffect(() => {
    if (toAccountId === '' && activeAccounts.length >= 2) {
      setToAccountId(activeAccounts.find((a) => a.id !== accountId)?.id || '');
    }
  }, [accountId]);

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Atenção', 'Adicione uma descrição');
      return;
    }
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido');
      return;
    }

    if (type === 'transfer') {
      if (!toAccountId || toAccountId === accountId) {
        Alert.alert('Atenção', 'Selecione contas de origem e destino diferentes');
        return;
      }
      if (isEdit) {
        updateTransaction(id!, {
          description: description.trim(),
          amount: amountNum,
          accountId,
          toAccountId,
          date,
          notes: notes.trim() || undefined,
        });
      } else {
        addTransfer(accountId, toAccountId, amountNum, description.trim(), date);
      }
    } else {
      const txData = {
        description: description.trim(),
        amount: amountNum,
        type: type as 'income' | 'expense',
        category: type === 'income' ? 'income' : category,
        accountId,
        date,
        installments: parseInt(installments) || 1,
        recurring,
        notes: notes.trim() || undefined,
      };

      if (isEdit) {
        updateTransaction(id!, txData);
      } else {
        addTransaction(txData);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const categories = Object.keys(CATEGORIES).filter((c) => c !== 'income' && c !== 'other' && c !== 'transfer');

  const Tab = ({ value, label, icon, activeColor }: {
    value: 'expense' | 'income' | 'transfer';
    label: string;
    icon: string;
    activeColor: string;
  }) => (
    <Pressable
      testID={`type-${value}`}
      onPress={() => { setType(value); Haptics.selectionAsync(); }}
      style={[styles.typeOption, type === value && { backgroundColor: activeColor, borderRadius: 10 }]}
    >
      <Feather name={icon as any} size={15} color={type === value ? '#000' : theme.textSecondary} />
      <Text style={[styles.typeText, { color: type === value ? '#000' : theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ title: isEdit ? 'Editar Transação' : 'Nova Transação' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: theme.surfaceElevated }]}>
          <Tab value="expense" label="Despesa" icon="arrow-down-circle" activeColor={colors.danger} />
          <Tab value="income" label="Receita" icon="arrow-up-circle" activeColor={colors.primary} />
          <Tab value="transfer" label="Transferência" icon="repeat" activeColor={colors.info || '#2196F3'} />
        </View>

        <Input
          testID="desc-input"
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder={type === 'transfer' ? 'Ex: Reserva de emergência' : 'Ex: Supermercado'}
          icon="edit-2"
        />

        <Input
          testID="amount-input"
          label="Valor (R$)"
          value={amount}
          onChangeText={setAmount}
          placeholder="0,00"
          keyboardType="decimal-pad"
          icon="dollar-sign"
        />

        <Input
          label="Data"
          value={date}
          onChangeText={setDate}
          placeholder="AAAA-MM-DD"
          icon="calendar"
        />

        {/* Transfer: from/to accounts */}
        {type === 'transfer' && (
          <>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Conta de origem</Text>
              <View style={styles.chipRow}>
                {activeAccounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    onPress={() => { setAccountId(acc.id); Haptics.selectionAsync(); }}
                    style={[
                      styles.chip,
                      { backgroundColor: accountId === acc.id ? `${acc.color}20` : theme.surfaceElevated, borderColor: accountId === acc.id ? acc.color : theme.border }
                    ]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: acc.color }]} />
                    <Text style={[styles.chipText, { color: accountId === acc.id ? acc.color : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.transferArrow}>
              <View style={[styles.arrowLine, { backgroundColor: theme.border }]} />
              <View style={[styles.arrowCircle, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Feather name="arrow-down" size={16} color={colors.info || '#2196F3'} />
              </View>
              <View style={[styles.arrowLine, { backgroundColor: theme.border }]} />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Conta de destino</Text>
              <View style={styles.chipRow}>
                {activeAccounts.map((acc) => (
                  <Pressable
                    key={acc.id}
                    onPress={() => { setToAccountId(acc.id); Haptics.selectionAsync(); }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: toAccountId === acc.id ? `${acc.color}20` : theme.surfaceElevated,
                        borderColor: toAccountId === acc.id ? acc.color : theme.border,
                        opacity: acc.id === accountId ? 0.35 : 1,
                      }
                    ]}
                  >
                    <View style={[styles.chipDot, { backgroundColor: acc.color }]} />
                    <Text style={[styles.chipText, { color: toAccountId === acc.id ? acc.color : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {acc.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Non-transfer fields */}
        {type !== 'transfer' && (
          <>
            {/* Category (expenses only) */}
            {type === 'expense' && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {categories.map((cat) => {
                      const info = getCategoryInfo(cat);
                      const selected = category === cat;
                      return (
                        <Pressable
                          key={cat}
                          testID={`cat-${cat}`}
                          onPress={() => { setCategory(cat); Haptics.selectionAsync(); }}
                          style={[
                            styles.chip,
                            { backgroundColor: selected ? `${info.color}25` : theme.surfaceElevated, borderColor: selected ? info.color : theme.border }
                          ]}
                        >
                          <Feather name={info.icon} size={13} color={selected ? info.color : theme.textTertiary} />
                          <Text style={[styles.chipText, { color: selected ? info.color : theme.textSecondary, fontFamily: selected ? 'Inter_500Medium' : 'Inter_400Regular' }]}>
                            {info.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Account Picker */}
            {activeAccounts.length > 0 && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Conta</Text>
                <View style={styles.chipRow}>
                  {activeAccounts.map((acc) => (
                    <Pressable
                      key={acc.id}
                      onPress={() => { setAccountId(acc.id); Haptics.selectionAsync(); }}
                      style={[
                        styles.chip,
                        { backgroundColor: accountId === acc.id ? `${acc.color}20` : theme.surfaceElevated, borderColor: accountId === acc.id ? acc.color : theme.border }
                      ]}
                    >
                      <View style={[styles.chipDot, { backgroundColor: acc.color }]} />
                      <Text style={[styles.chipText, { color: accountId === acc.id ? acc.color : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                        {acc.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Installments (expenses only) */}
            {type === 'expense' && (
              <Input
                label="Parcelas"
                value={installments}
                onChangeText={setInstallments}
                keyboardType="number-pad"
                placeholder="1"
                icon="layers"
              />
            )}

            {/* Recurring Toggle */}
            <Pressable
              testID="recurring-toggle"
              onPress={() => { setRecurring(!recurring); Haptics.selectionAsync(); }}
              style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.toggleLeft}>
                <Feather name="repeat" size={18} color={recurring ? colors.primary : theme.textTertiary} />
                <View>
                  <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Recorrente</Text>
                  <Text style={[styles.toggleSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Repete todo mês</Text>
                </View>
              </View>
              <View style={[styles.switch, { backgroundColor: recurring ? colors.primary : theme.surfaceElevated, borderColor: recurring ? colors.primary : theme.border }]}>
                <View style={[styles.switchThumb, { transform: [{ translateX: recurring ? 18 : 0 }] }]} />
              </View>
            </Pressable>
          </>
        )}

        {/* Notes */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Observações (opcional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Ex: referência, número do pedido..."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={3}
            style={[styles.notesInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
          />
        </View>

        <Button
          testID="save-btn"
          label={isEdit ? 'Salvar Alterações' : type === 'transfer' ? 'Confirmar Transferência' : 'Salvar Transação'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  typeToggle: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  typeText: { fontSize: 13 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15 },
  toggleSub: { fontSize: 12, marginTop: 2 },
  switch: { width: 44, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center', padding: 2 },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', minHeight: 80, textAlignVertical: 'top' },
  transferArrow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  arrowLine: { flex: 1, height: 1 },
  arrowCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
