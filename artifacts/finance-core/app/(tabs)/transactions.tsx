import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable,
  TextInput, Platform, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Transaction } from '@/context/FinanceContext';
import { TransactionItem } from '@/components/TransactionItem';
import { TransactionSkeleton } from '@/components/ui/SkeletonLoader';

type FilterType = 'all' | 'income' | 'expense';

const CATEGORIES = ['all', 'food', 'transport', 'housing', 'health', 'entertainment', 'education', 'clothing', 'investment', 'income', 'other'];
const CATEGORY_LABELS: Record<string, string> = {
  all: 'Todas', food: 'Alimentação', transport: 'Transporte', housing: 'Moradia',
  health: 'Saúde', entertainment: 'Lazer', education: 'Educação', clothing: 'Compras',
  investment: 'Investimento', income: 'Renda', other: 'Outros',
};

export default function TransactionsScreen() {
  const { theme, colors } = useTheme();
  const { transactions, isLoading } = useFinance();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [category, setCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (category !== 'all' && t.category !== category) return false;
      if (search.trim()) {
        return t.description.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter, category, search]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const renderHeader = () => (
    <View style={{ gap: 12, paddingBottom: 8 }}>
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
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <Pressable
            key={f}
            testID={`filter-${f}`}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f ? colors.primary : theme.surfaceElevated,
                borderColor: filter === f ? colors.primary : theme.border,
              }
            ]}
          >
            <Text style={[
              styles.filterText,
              {
                color: filter === f ? '#000' : theme.textSecondary,
                fontFamily: filter === f ? 'Inter_600SemiBold' : 'Inter_400Regular'
              }
            ]}>
              {f === 'all' ? 'Todas' : f === 'income' ? 'Receitas' : 'Despesas'}
            </Text>
          </Pressable>
        ))}
      </View>
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
        <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          Transações
        </Text>
        <Pressable
          testID="add-transaction-btn"
          onPress={() => { Haptics.selectionAsync(); router.push('/transaction/add'); }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color="#000" />
        </Pressable>
      </View>

      <FlatList
        testID="transactions-list"
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={(t) => router.push({ pathname: '/transaction/[id]', params: { id: t.id } })}
            testID={`tx-item-${item.id}`}
          />
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
        scrollEnabled={filtered.length > 0}
      />

      <Pressable
        testID="fab-add"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/transaction/add'); }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + 80,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          }
        ]}
      >
        <Feather name="plus" size={24} color="#000" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: { fontSize: 26 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  filterText: { fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00C853', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
});
