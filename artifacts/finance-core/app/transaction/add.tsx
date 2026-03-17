import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';
import { getCurrentMonth } from '@/utils/formatters';

const ACCOUNT_COLORS = ['#8B5CF6', '#3B82F6', '#00C853', '#FF6B6B', '#FF9800', '#009688'];

export default function AddTransactionScreen() {
  const { theme, colors } = useTheme();
  const { addTransaction, accounts } = useFinance();
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [installments, setInstallments] = useState('1');
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      addTransaction({
        description: description.trim(),
        amount: amountNum,
        type,
        category: type === 'income' ? 'income' : category,
        accountId,
        date,
        installments: parseInt(installments) || 1,
        recurring,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const categories = Object.keys(CATEGORIES).filter((c) => c !== 'income' && c !== 'other');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Nova Transação
        </Text>

        {/* Type Toggle */}
        <View style={[styles.typeToggle, { backgroundColor: theme.surfaceElevated }]}>
          <Pressable
            testID="type-expense"
            onPress={() => { setType('expense'); Haptics.selectionAsync(); }}
            style={[
              styles.typeOption,
              type === 'expense' && { backgroundColor: colors.danger, borderRadius: 10 }
            ]}
          >
            <Feather name="arrow-down-circle" size={16} color={type === 'expense' ? '#fff' : theme.textSecondary} />
            <Text style={[styles.typeText, { color: type === 'expense' ? '#fff' : theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              Despesa
            </Text>
          </Pressable>
          <Pressable
            testID="type-income"
            onPress={() => { setType('income'); Haptics.selectionAsync(); }}
            style={[
              styles.typeOption,
              type === 'income' && { backgroundColor: colors.primary, borderRadius: 10 }
            ]}
          >
            <Feather name="arrow-up-circle" size={16} color={type === 'income' ? '#000' : theme.textSecondary} />
            <Text style={[styles.typeText, { color: type === 'income' ? '#000' : theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              Receita
            </Text>
          </Pressable>
        </View>

        <Input
          testID="desc-input"
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder="Ex: Supermercado"
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

        {/* Category Picker (only for expenses) */}
        {type === 'expense' && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Categoria
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryRow}>
                {categories.map((cat) => {
                  const info = getCategoryInfo(cat);
                  const selected = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      testID={`cat-${cat}`}
                      onPress={() => { setCategory(cat); Haptics.selectionAsync(); }}
                      style={[
                        styles.catChip,
                        {
                          backgroundColor: selected ? `${info.color}25` : theme.surfaceElevated,
                          borderColor: selected ? info.color : theme.border,
                        }
                      ]}
                    >
                      <Feather name={info.icon} size={14} color={selected ? info.color : theme.textTertiary} />
                      <Text style={[styles.catText, { color: selected ? info.color : theme.textSecondary, fontFamily: selected ? 'Inter_500Medium' : 'Inter_400Regular' }]}>
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
        {accounts.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Conta
            </Text>
            <View style={styles.categoryRow}>
              {accounts.filter((a) => !a.archived).map((acc) => (
                <Pressable
                  key={acc.id}
                  onPress={() => { setAccountId(acc.id); Haptics.selectionAsync(); }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: accountId === acc.id ? `${acc.color}20` : theme.surfaceElevated,
                      borderColor: accountId === acc.id ? acc.color : theme.border,
                    }
                  ]}
                >
                  <Text style={[styles.catText, { color: accountId === acc.id ? acc.color : theme.textSecondary }]}>
                    {acc.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Installments */}
        <Input
          label="Parcelas"
          value={installments}
          onChangeText={setInstallments}
          keyboardType="number-pad"
          placeholder="1"
          icon="layers"
        />

        {/* Recurring Toggle */}
        <Pressable
          testID="recurring-toggle"
          onPress={() => { setRecurring(!recurring); Haptics.selectionAsync(); }}
          style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <View style={styles.toggleLeft}>
            <Feather name="repeat" size={18} color={recurring ? colors.primary : theme.textTertiary} />
            <View>
              <Text style={[styles.toggleLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                Recorrente
              </Text>
              <Text style={[styles.toggleSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Repete todo mês
              </Text>
            </View>
          </View>
          <View style={[
            styles.switch,
            { backgroundColor: recurring ? colors.primary : theme.surfaceElevated, borderColor: recurring ? colors.primary : theme.border }
          ]}>
            <View style={[styles.switchThumb, { transform: [{ translateX: recurring ? 18 : 0 }] }]} />
          </View>
        </Pressable>

        <Button testID="save-btn" label="Salvar Transação" onPress={handleSave} loading={loading} fullWidth size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, marginBottom: 4 },
  typeToggle: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  typeText: { fontSize: 15 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13 },
  categoryRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  catText: { fontSize: 13 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15 },
  toggleSub: { fontSize: 12, marginTop: 2 },
  switch: { width: 44, height: 26, borderRadius: 13, borderWidth: 1, justifyContent: 'center', padding: 2 },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
});
