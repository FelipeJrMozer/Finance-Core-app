import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  KeyboardAvoidingView, Platform, TextInput
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, ApiCategory, CreditCard } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCategoryInfo } from '@/components/CategoryBadge';

function getApiCatIcon(cat: ApiCategory): { icon: string; color: string; label: string } {
  const iconMap: Record<string, string> = {
    ShoppingCart: 'shopping-cart', DollarSign: 'dollar-sign', Home: 'home', Car: 'truck',
    Zap: 'zap', Wifi: 'wifi', Heart: 'heart', BookOpen: 'book-open', Smile: 'smile',
    Shirt: 'tag', TrendingUp: 'trending-up', Globe: 'globe', Gift: 'gift',
    Coffee: 'coffee', Music: 'music', Plane: 'anchor', Star: 'star', Target: 'target',
    Tag: 'tag', Briefcase: 'briefcase', PiggyBank: 'database',
  };
  return {
    icon: iconMap[cat.icon] || 'tag',
    color: cat.color || '#0096C7',
    label: cat.name,
  };
}

export default function AddTransactionScreen() {
  const { theme, colors } = useTheme();
  const { addTransaction, updateTransaction, addTransfer, transactions, accounts, creditCards, categories } = useFinance();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isEdit = !!id;
  const existing = isEdit ? transactions.find((t) => t.id === id) : undefined;

  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeCards = creditCards;

  // Detect if existing transaction belongs to a credit card
  const existingCard = useMemo(() => {
    if (!existing || existing.type !== 'expense') return undefined;
    return activeCards.find((c) => c.accountId === existing.accountId);
  }, [existing, activeCards]);

  const [type, setType] = useState<'income' | 'expense' | 'transfer'>(
    existing?.type === 'transfer' ? 'transfer' : existing?.type === 'income' ? 'income' : 'expense'
  );

  // Source mode: account or card (only relevant for expense/income)
  const [sourceMode, setSourceMode] = useState<'account' | 'card'>(existingCard ? 'card' : 'account');
  const [selectedCardId, setSelectedCardId] = useState<string>(existingCard?.id || '');

  const [description, setDescription] = useState(existing?.description || '');
  const [amount, setAmount] = useState(existing ? existing.amount.toFixed(2) : '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(existing?.categoryId || '');
  const [accountId, setAccountId] = useState(
    existingCard ? '' : (existing?.accountId || activeAccounts[0]?.id || '')
  );
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId || '');
  const [date, setDate] = useState(existing?.date || new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState(existing?.installments?.toString() || '1');
  const [recurring, setRecurring] = useState(existing?.recurring || false);
  const [isFixed, setIsFixed] = useState(existing?.isFixed || false);
  const [isPaid, setIsPaid] = useState(existing ? (existing.isPaid ?? true) : true);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [loading, setLoading] = useState(false);

  const apiCatsFiltered = useMemo(() => {
    return categories.filter((c) => !c.archived && (type === 'income' ? c.type === 'income' : c.type === 'expense'));
  }, [categories, type]);

  useEffect(() => {
    if (!selectedCategoryId && apiCatsFiltered.length > 0) {
      setSelectedCategoryId(apiCatsFiltered[0].id);
    }
  }, [apiCatsFiltered]);

  useEffect(() => {
    if (toAccountId === '' && activeAccounts.length >= 2) {
      setToAccountId(activeAccounts.find((a) => a.id !== accountId)?.id || '');
    }
  }, [accountId]);

  // When switching source mode, reset selection
  const handleSetSourceMode = (mode: 'account' | 'card') => {
    setSourceMode(mode);
    if (mode === 'account') {
      setSelectedCardId('');
      if (!accountId) setAccountId(activeAccounts[0]?.id || '');
    } else {
      setAccountId('');
      if (!selectedCardId) setSelectedCardId(activeCards[0]?.id || '');
    }
    Haptics.selectionAsync();
  };

  const resolvedAccountId = (): string => {
    if (sourceMode === 'card') {
      const card = activeCards.find((c) => c.id === selectedCardId);
      return card?.accountId || '';
    }
    return accountId;
  };

  const handleSave = async () => {
    if (!description.trim()) { Alert.alert('Atenção', 'Adicione uma descrição'); return; }
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(amountNum) || amountNum <= 0) { Alert.alert('Atenção', 'Informe um valor válido'); return; }

    setLoading(true);
    try {
      if (type === 'transfer') {
        if (!toAccountId || toAccountId === accountId) {
          Alert.alert('Atenção', 'Selecione contas diferentes'); return;
        }
        if (isEdit) {
          await updateTransaction(id!, {
            description: description.trim(), amount: amountNum,
            accountId, toAccountId, date, notes: notes.trim() || undefined,
          });
        } else {
          await addTransfer(accountId, toAccountId, amountNum, description.trim(), date);
        }
      } else {
        const effAccountId = resolvedAccountId();
        if (!effAccountId) { Alert.alert('Atenção', 'Selecione uma conta ou cartão'); return; }
        const selectedCat = categories.find((c) => c.id === selectedCategoryId);
        const txData = {
          description: description.trim(),
          amount: amountNum,
          type: type as 'income' | 'expense',
          category: selectedCat
            ? (selectedCat.type === 'income' ? 'income' : selectedCat.name.toLowerCase())
            : (type === 'income' ? 'income' : 'other'),
          categoryId: selectedCategoryId || undefined,
          accountId: effAccountId,
          date,
          installments: parseInt(installments) || 1,
          recurring,
          isFixed,
          isPaid,
          notes: notes.trim() || undefined,
        };
        if (isEdit) {
          await updateTransaction(id!, txData);
        } else {
          await addTransaction(txData);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  const Tab = ({ value, label, icon, activeColor }: {
    value: 'expense' | 'income' | 'transfer'; label: string; icon: string; activeColor: string;
  }) => (
    <Pressable
      testID={`type-${value}`}
      onPress={() => {
        setType(value);
        setSelectedCategoryId('');
        if (value === 'transfer') setSourceMode('account');
        Haptics.selectionAsync();
      }}
      style={[styles.typeOption, type === value && { backgroundColor: activeColor, borderRadius: 10 }]}
    >
      <Feather name={icon as any} size={15} color={type === value ? '#000' : theme.textSecondary} />
      <Text style={[styles.typeText, { color: type === value ? '#000' : theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
        {label}
      </Text>
    </Pressable>
  );

  const CardChip = ({ card }: { card: CreditCard }) => {
    const selected = selectedCardId === card.id;
    return (
      <Pressable
        onPress={() => { setSelectedCardId(card.id); Haptics.selectionAsync(); }}
        style={[styles.chip, {
          backgroundColor: selected ? `${card.color}20` : theme.surfaceElevated,
          borderColor: selected ? card.color : theme.border,
        }]}
      >
        <Feather name="credit-card" size={13} color={selected ? card.color : theme.textTertiary} />
        <Text style={[styles.chipText, { color: selected ? card.color : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          {card.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ title: isEdit ? 'Editar Transação' : 'Nova Transação' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type selector */}
        <View style={[styles.typeToggle, { backgroundColor: theme.surfaceElevated }]}>
          <Tab value="expense" label="Despesa" icon="arrow-down-circle" activeColor={colors.danger} />
          <Tab value="income" label="Receita" icon="arrow-up-circle" activeColor={colors.primary} />
          <Tab value="transfer" label="Transferência" icon="repeat" activeColor={colors.info || '#2196F3'} />
        </View>

        <Input testID="desc-input" label="Descrição" value={description} onChangeText={setDescription}
          placeholder={type === 'transfer' ? 'Ex: Reserva de emergência' : 'Ex: Supermercado'} icon="edit-2" />

        <Input testID="amount-input" label="Valor (R$)" value={amount} onChangeText={setAmount}
          placeholder="0,00" keyboardType="decimal-pad" icon="dollar-sign" />

        <Input label="Data" value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" icon="calendar" />

        {/* Transfer: account pickers */}
        {type === 'transfer' && (
          <>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Conta de origem</Text>
              <View style={styles.chipRow}>
                {activeAccounts.map((acc) => (
                  <Pressable key={acc.id} onPress={() => { setAccountId(acc.id); Haptics.selectionAsync(); }}
                    style={[styles.chip, {
                      backgroundColor: accountId === acc.id ? `${acc.color}20` : theme.surfaceElevated,
                      borderColor: accountId === acc.id ? acc.color : theme.border,
                    }]}>
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
                  <Pressable key={acc.id} onPress={() => { setToAccountId(acc.id); Haptics.selectionAsync(); }}
                    style={[styles.chip, {
                      backgroundColor: toAccountId === acc.id ? `${acc.color}20` : theme.surfaceElevated,
                      borderColor: toAccountId === acc.id ? acc.color : theme.border,
                      opacity: acc.id === accountId ? 0.35 : 1,
                    }]}>
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

        {/* Non-transfer: category + source (account or card) */}
        {type !== 'transfer' && (
          <>
            {apiCatsFiltered.length > 0 && (
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {apiCatsFiltered.map((cat) => {
                      const info = getApiCatIcon(cat);
                      const selected = selectedCategoryId === cat.id;
                      return (
                        <Pressable key={cat.id} testID={`cat-${cat.id}`}
                          onPress={() => { setSelectedCategoryId(cat.id); Haptics.selectionAsync(); }}
                          style={[styles.chip, {
                            backgroundColor: selected ? `${info.color}25` : theme.surfaceElevated,
                            borderColor: selected ? info.color : theme.border,
                          }]}>
                          <Feather name={info.icon as any} size={13} color={selected ? info.color : theme.textTertiary} />
                          <Text style={[styles.chipText, {
                            color: selected ? info.color : theme.textSecondary,
                            fontFamily: selected ? 'Inter_500Medium' : 'Inter_400Regular',
                          }]}>
                            {info.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Source section: Conta vs Cartão */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                {type === 'income' ? 'Conta de destino' : 'Origem do pagamento'}
              </Text>

              {/* Only show card tab for expenses */}
              {type === 'expense' && activeCards.length > 0 && (
                <View style={[styles.sourceModeRow, { backgroundColor: theme.surfaceElevated }]}>
                  <Pressable
                    onPress={() => handleSetSourceMode('account')}
                    style={[
                      styles.sourceModeTab,
                      sourceMode === 'account' && { backgroundColor: theme.surface, borderRadius: 8 },
                    ]}
                  >
                    <Feather name="layers" size={14} color={sourceMode === 'account' ? colors.primary : theme.textTertiary} />
                    <Text style={[styles.sourceModeText, {
                      color: sourceMode === 'account' ? colors.primary : theme.textTertiary,
                      fontFamily: sourceMode === 'account' ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    }]}>
                      Conta
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleSetSourceMode('card')}
                    style={[
                      styles.sourceModeTab,
                      sourceMode === 'card' && { backgroundColor: theme.surface, borderRadius: 8 },
                    ]}
                  >
                    <Feather name="credit-card" size={14} color={sourceMode === 'card' ? colors.primary : theme.textTertiary} />
                    <Text style={[styles.sourceModeText, {
                      color: sourceMode === 'card' ? colors.primary : theme.textTertiary,
                      fontFamily: sourceMode === 'card' ? 'Inter_600SemiBold' : 'Inter_400Regular',
                    }]}>
                      Cartão
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Account chips */}
              {sourceMode === 'account' && activeAccounts.length > 0 && (
                <View style={styles.chipRow}>
                  {activeAccounts.map((acc) => (
                    <Pressable key={acc.id} onPress={() => { setAccountId(acc.id); Haptics.selectionAsync(); }}
                      style={[styles.chip, {
                        backgroundColor: accountId === acc.id ? `${acc.color}20` : theme.surfaceElevated,
                        borderColor: accountId === acc.id ? acc.color : theme.border,
                      }]}>
                      <View style={[styles.chipDot, { backgroundColor: acc.color }]} />
                      <Text style={[styles.chipText, {
                        color: accountId === acc.id ? acc.color : theme.textSecondary,
                        fontFamily: 'Inter_500Medium',
                      }]}>
                        {acc.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Card chips */}
              {sourceMode === 'card' && activeCards.length > 0 && (
                <View style={styles.chipRow}>
                  {activeCards.map((card) => (
                    <CardChip key={card.id} card={card} />
                  ))}
                </View>
              )}
            </View>

            {type === 'expense' && (
              <Input label="Parcelas" value={installments} onChangeText={setInstallments}
                keyboardType="number-pad" placeholder="1" icon="layers" />
            )}

            {/* Pago / Pendente */}
            <Pressable
              onPress={() => { setIsPaid(!isPaid); Haptics.selectionAsync(); }}
              style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.toggleLeft}>
                <Feather name="check-circle" size={18} color={isPaid ? colors.primary : theme.textTertiary} />
                <View>
                  <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                    {isPaid ? 'Pago' : 'Pendente'}
                  </Text>
                  <Text style={[styles.toggleSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Marcar como pago</Text>
                </View>
              </View>
              <View style={[styles.switch, { backgroundColor: isPaid ? colors.primary : theme.surfaceElevated, borderColor: isPaid ? colors.primary : theme.border }]}>
                <View style={[styles.switchThumb, { transform: [{ translateX: isPaid ? 18 : 0 }] }]} />
              </View>
            </Pressable>

            {/* Despesa fixa */}
            {type === 'expense' && (
              <Pressable
                onPress={() => { setIsFixed(!isFixed); Haptics.selectionAsync(); }}
                style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.toggleLeft}>
                  <Feather name="anchor" size={18} color={isFixed ? colors.primary : theme.textTertiary} />
                  <View>
                    <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>Despesa Fixa</Text>
                    <Text style={[styles.toggleSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Valor fixo todo mês</Text>
                  </View>
                </View>
                <View style={[styles.switch, { backgroundColor: isFixed ? colors.primary : theme.surfaceElevated, borderColor: isFixed ? colors.primary : theme.border }]}>
                  <View style={[styles.switchThumb, { transform: [{ translateX: isFixed ? 18 : 0 }] }]} />
                </View>
              </Pressable>
            )}

            <Pressable testID="recurring-toggle"
              onPress={() => { setRecurring(!recurring); Haptics.selectionAsync(); }}
              style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Observações (opcional)</Text>
          <TextInput
            value={notes} onChangeText={setNotes}
            placeholder="Ex: referência, número do pedido..."
            placeholderTextColor={theme.textTertiary}
            multiline numberOfLines={3}
            style={[styles.notesInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
          />
        </View>

        <Button testID="save-btn"
          label={isEdit ? 'Salvar Alterações' : type === 'transfer' ? 'Confirmar Transferência' : 'Salvar Transação'}
          onPress={handleSave} loading={loading} fullWidth size="lg" />
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
  sourceModeRow: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  sourceModeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  sourceModeText: { fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15 },
  toggleSub: { fontSize: 12, marginTop: 2 },
  switch: { width: 44, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center', padding: 2 },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  transferArrow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  arrowLine: { flex: 1, height: 1 },
  arrowCircle: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
