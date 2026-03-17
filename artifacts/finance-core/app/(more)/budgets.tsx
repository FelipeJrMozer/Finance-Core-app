import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { BudgetProgress } from '@/components/BudgetProgress';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';
import { getCurrentMonth } from '@/utils/formatters';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_FULL[parseInt(m) - 1]} ${y}`;
}

export default function BudgetsScreen() {
  const { theme, colors } = useTheme();
  const { budgets, addBudget, transactions, refresh } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState('food');
  const [limit, setLimit] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const currentMonth = getCurrentMonth();
  const isCurrentMonth = selectedMonth === currentMonth;

  const monthBudgets = budgets.filter((b) => b.month === selectedMonth);
  const monthlyTx = transactions.filter((t) => t.date.startsWith(selectedMonth));

  const getBudgetSpent = (cat: string) =>
    monthlyTx.filter((t) => t.category === cat && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const totalLimit = monthBudgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = monthBudgets.reduce((s, b) => s + getBudgetSpent(b.category), 0);
  const totalPct = totalLimit > 0 ? totalSpent / totalLimit : 0;

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

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Orçamentos</Text>
        {isCurrentMonth && (
          <Pressable
            onPress={() => { setShowAdd(!showAdd); Haptics.selectionAsync(); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            testID="add-budget-btn"
          >
            <Feather name="plus" size={18} color="#000" />
          </Pressable>
        )}
      </View>

      {/* Month Navigation */}
      <View style={[styles.monthNav, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable
          onPress={() => { setSelectedMonth(addMonths(selectedMonth, -1)); setShowAdd(false); Haptics.selectionAsync(); }}
          style={styles.monthBtn}
          hitSlop={8}
        >
          <Feather name="chevron-left" size={20} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => { setSelectedMonth(currentMonth); Haptics.selectionAsync(); }}
          style={styles.monthLabelBtn}
        >
          <Text style={[styles.monthLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            {getMonthLabel(selectedMonth)}
          </Text>
          {isCurrentMonth && (
            <View style={[styles.currentBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.currentBadgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Atual</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            if (selectedMonth < currentMonth) {
              setSelectedMonth(addMonths(selectedMonth, 1));
              setShowAdd(false);
              Haptics.selectionAsync();
            }
          }}
          hitSlop={8}
          style={styles.monthBtn}
        >
          <Feather name="chevron-right" size={20} color={selectedMonth < currentMonth ? theme.textSecondary : theme.border} />
        </Pressable>
      </View>

      {/* Summary bar */}
      {monthBudgets.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Gasto total
              </Text>
              <Text style={[styles.summaryValue, { color: totalPct > 1 ? colors.danger : theme.text, fontFamily: 'Inter_700Bold' }]}>
                {totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                <Text style={[styles.summaryOf, { color: theme.textTertiary }]}>
                  {' '}/ {totalLimit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Text>
              </Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
              <View style={[
                styles.progressFill,
                { width: `${Math.min(totalPct * 100, 100)}%`, backgroundColor: totalPct > 0.9 ? colors.danger : totalPct > 0.7 ? colors.warning : colors.primary }
              ]} />
            </View>
          </View>
          <View style={[styles.pctBadge, { backgroundColor: totalPct > 0.9 ? `${colors.danger}15` : `${colors.primary}15` }]}>
            <Text style={[styles.pctText, { color: totalPct > 0.9 ? colors.danger : colors.primary, fontFamily: 'Inter_700Bold' }]}>
              {(totalPct * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {/* Add Budget Form — only for current month */}
      {showAdd && isCurrentMonth && availableCategories.length > 0 && (
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
            {isCurrentMonth
              ? 'Adicione orçamentos por categoria para controlar gastos'
              : `Nenhum orçamento em ${getMonthLabel(selectedMonth)}`}
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
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  monthNav: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingVertical: 4 },
  monthBtn: { padding: 10 },
  monthLabelBtn: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  monthLabel: { fontSize: 16 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { fontSize: 11 },
  summaryBar: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 15 },
  summaryOf: { fontSize: 13 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  pctText: { fontSize: 16 },
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
