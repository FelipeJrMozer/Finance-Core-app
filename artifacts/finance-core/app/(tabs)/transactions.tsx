import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, RefreshControl, Pressable,
  TextInput, Platform, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Transaction } from '@/context/FinanceContext';
import { TransactionItem } from '@/components/TransactionItem';

type FilterType = 'all' | 'income' | 'expense' | 'transfer';

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatDateHeader(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  return `${parseInt(d)} de ${MONTH_NAMES[parseInt(m) - 1]} de ${y}`;
}

export default function TransactionsScreen() {
  const { theme, colors } = useTheme();
  const { transactions, accounts, isLoading } = useFinance();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (accountFilter !== 'all' && t.accountId !== accountFilter) return false;
      if (search.trim()) {
        return t.description.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter, accountFilter, search]);

  const sections = useMemo(() => {
    const byDate: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const d = t.date;
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    });
    return Object.keys(byDate)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        title: date,
        data: byDate[date],
        dayTotal: byDate[date].reduce((s, t) => {
          if (t.type === 'income') return s + t.amount;
          if (t.type === 'expense') return s - t.amount;
          return s;
        }, 0),
      }));
  }, [filtered]);

  const summary = useMemo(() => {
    const income = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const transfers = filtered.filter((t) => t.type === 'transfer').length;
    return { income, expense, transfers };
  }, [filtered]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const activeAccount = accountFilter !== 'all' ? accounts.find((a) => a.id === accountFilter) : null;

  const renderHeader = () => (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.textTertiary} />
        <TextInput
          testID="search-input"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar transação..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.searchInput, { color: theme.text, fontFamily: 'Inter_400Regular' }]}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={theme.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Type Filters */}
      <View style={styles.filterRow}>
        {([
          { value: 'all', label: 'Todas' },
          { value: 'income', label: 'Receitas' },
          { value: 'expense', label: 'Despesas' },
          { value: 'transfer', label: 'Transferências' },
        ] as const).map((f) => (
          <Pressable
            key={f.value}
            testID={`filter-${f.value}`}
            onPress={() => { setFilter(f.value); Haptics.selectionAsync(); }}
            style={[
              styles.filterChip,
              { backgroundColor: filter === f.value ? colors.primary : theme.surfaceElevated, borderColor: filter === f.value ? colors.primary : theme.border }
            ]}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f.value ? '#000' : theme.textSecondary, fontFamily: filter === f.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }
            ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Account Filter */}
      <Pressable
        onPress={() => { setShowAccounts(!showAccounts); Haptics.selectionAsync(); }}
        style={[styles.accountFilterBtn, { backgroundColor: theme.surfaceElevated, borderColor: activeAccount ? activeAccount.color : theme.border }]}
      >
        {activeAccount && <View style={[styles.accountDot, { backgroundColor: activeAccount.color }]} />}
        <Feather name="credit-card" size={13} color={activeAccount ? activeAccount.color : theme.textTertiary} />
        <Text style={[styles.filterText, { color: activeAccount ? activeAccount.color : theme.textSecondary, fontFamily: 'Inter_500Medium', flex: 1 }]}>
          {activeAccount ? activeAccount.name : 'Todas as contas'}
        </Text>
        <Feather name={showAccounts ? 'chevron-up' : 'chevron-down'} size={14} color={theme.textTertiary} />
      </Pressable>

      {showAccounts && (
        <View style={styles.accountList}>
          <Pressable
            onPress={() => { setAccountFilter('all'); setShowAccounts(false); Haptics.selectionAsync(); }}
            style={[styles.accountOption, { backgroundColor: accountFilter === 'all' ? `${colors.primary}15` : 'transparent' }]}
          >
            <View style={[styles.accountDot, { backgroundColor: theme.textTertiary }]} />
            <Text style={[styles.filterText, { color: accountFilter === 'all' ? colors.primary : theme.text, fontFamily: accountFilter === 'all' ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
              Todas as contas
            </Text>
            {accountFilter === 'all' && <Feather name="check" size={14} color={colors.primary} />}
          </Pressable>
          {accounts.filter((a) => !a.archived).map((acc) => (
            <Pressable
              key={acc.id}
              onPress={() => { setAccountFilter(acc.id); setShowAccounts(false); Haptics.selectionAsync(); }}
              style={[styles.accountOption, { backgroundColor: accountFilter === acc.id ? `${acc.color}15` : 'transparent' }]}
            >
              <View style={[styles.accountDot, { backgroundColor: acc.color }]} />
              <Text style={[styles.filterText, { color: accountFilter === acc.id ? acc.color : theme.text, fontFamily: accountFilter === acc.id ? 'Inter_600SemiBold' : 'Inter_400Regular', flex: 1 }]}>
                {acc.name}
              </Text>
              {accountFilter === acc.id && <Feather name="check" size={14} color={acc.color} />}
            </Pressable>
          ))}
        </View>
      )}

      {/* Summary row */}
      {filtered.length > 0 && (
        <View style={[styles.summaryRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Receitas</Text>
            <Text style={[styles.summaryValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
              +R$ {summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Despesas</Text>
            <Text style={[styles.summaryValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
              -R$ {summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Saldo</Text>
            <Text style={[styles.summaryValue, { color: (summary.income - summary.expense) >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
              R$ {(summary.income - summary.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.headerSection, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Transações</Text>
        <Pressable
          testID="add-transaction-btn"
          onPress={() => { Haptics.selectionAsync(); router.push('/transaction/add'); }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color="#000" />
        </Pressable>
      </View>

      <SectionList
        testID="transactions-list"
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={(t) => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
            testID={`tx-item-${item.id}`}
          />
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.dateHeader, { backgroundColor: theme.background }]}>
            <Text style={[styles.dateHeaderText, { color: theme.textSecondary, fontFamily: 'Inter_600SemiBold' }]}>
              {formatDateHeader(section.title)}
            </Text>
            <Text style={[styles.dateHeaderBalance, {
              color: section.dayTotal >= 0 ? colors.primary : colors.danger,
              fontFamily: 'Inter_600SemiBold',
            }]}>
              {section.dayTotal >= 0 ? '+' : ''}R$ {Math.abs(section.dayTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Nenhuma transação
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {search ? 'Tente buscar com outros termos' : 'Adicione sua primeira transação'}
            </Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <Pressable
        testID="fab-add"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/transaction/add'); }}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 80, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }
        ]}
      >
        <Feather name="plus" size={24} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerSection: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 26 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  accountFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  accountDot: { width: 8, height: 8, borderRadius: 4 },
  accountList: { borderRadius: 12, overflow: 'hidden', gap: 2 },
  accountOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  summaryRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 12 },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 13 },
  summaryDivider: { width: 1, marginVertical: 2 },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, marginTop: 8 },
  dateHeaderText: { fontSize: 13 },
  dateHeaderBalance: { fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
