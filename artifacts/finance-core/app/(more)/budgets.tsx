import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { BudgetProgress } from '@/components/BudgetProgress';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';
import { getCurrentMonth, getMonthName } from '@/utils/formatters';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function BudgetsScreen() {
  const { theme, colors } = useTheme();
  const { budgets, addBudget, updateBudget, transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState('food');
  const [limit, setLimit] = useState('');

  const currentMonth = getCurrentMonth();
  const monthBudgets = budgets.filter((b) => b.month === currentMonth);
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));

  const getBudgetSpent = (cat: string) =>
    monthlyTx.filter((t) => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const availableCategories = Object.keys(CATEGORIES).filter(
    (cat) => cat !== 'income' && !monthBudgets.some((b) => b.category === cat)
  );

  const handleAdd = () => {
    const limitNum = parseFloat(limit.replace(',', '.'));
    if (!category || isNaN(limitNum) || limitNum <= 0) return;
    addBudget({ category, limit: limitNum, month: currentMonth });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setLimit('');
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Orçamentos</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {getMonthName(currentMonth)} • {monthBudgets.length} orçamentos
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAdd(!showAdd)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          testID="add-budget-btn"
        >
          <Feather name="plus" size={18} color="#000" />
        </Pressable>
      </View>

      {/* Add Budget Form */}
      {showAdd && availableCategories.length > 0 && (
        <View style={[styles.addForm, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.formTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Novo Orçamento
          </Text>
          <View style={styles.catGrid}>
            {availableCategories.map((cat) => {
              const info = getCategoryInfo(cat);
              return (
                <Pressable
                  key={cat}
                  onPress={() => { setCategory(cat); Haptics.selectionAsync(); }}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: category === cat ? `${info.color}20` : theme.surfaceElevated,
                      borderColor: category === cat ? info.color : theme.border,
                    }
                  ]}
                >
                  <Feather name={info.icon} size={14} color={category === cat ? info.color : theme.textTertiary} />
                  <Text style={[styles.catText, { color: category === cat ? info.color : theme.textSecondary, fontFamily: category === cat ? 'Inter_500Medium' : 'Inter_400Regular' }]}>
                    {info.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input label="Limite (R$)" value={limit} onChangeText={setLimit} placeholder="0,00" keyboardType="decimal-pad" icon="dollar-sign" />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="Cancelar" onPress={() => setShowAdd(false)} variant="secondary" style={{ flex: 1 }} />
            <Button label="Adicionar" onPress={handleAdd} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* Budget List */}
      {monthBudgets.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bar-chart-2" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Sem orçamentos
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Adicione orçamentos por categoria para controlar gastos
          </Text>
        </View>
      ) : (
        <View style={[styles.budgetsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {monthBudgets.map((b, idx) => (
            <React.Fragment key={b.id}>
              <BudgetProgress category={b.category} limit={b.limit} spent={getBudgetSpent(b.category)} />
              {idx < monthBudgets.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            </React.Fragment>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22 },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addForm: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  formTitle: { fontSize: 16 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  catText: { fontSize: 13 },
  budgetsCard: { borderRadius: 16, padding: 16, gap: 16, borderWidth: 1 },
  divider: { height: 1 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
