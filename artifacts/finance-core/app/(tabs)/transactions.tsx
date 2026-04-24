import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, RefreshControl, Pressable,
  TextInput, Platform, ActivityIndicator, Alert, Share, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Transaction } from '@/context/FinanceContext';
import { useWallet } from '@/context/WalletContext';
import { TransactionItem } from '@/components/TransactionItem';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/ui/Button';
import { formatBRL } from '@/utils/formatters';

type FilterType = 'all' | 'income' | 'expense' | 'transfer';
type StatusFilter = 'all' | 'paid' | 'pending';

interface AdvancedFilters {
  categoryIds: string[];
  tags: string[];
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  minAmount: string;
  maxAmount: string;
  status: StatusFilter;
  isFixed: boolean;
  isSubscription: boolean;
  includeArchived: boolean;
}

const EMPTY_FILTERS: AdvancedFilters = {
  categoryIds: [],
  tags: [],
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  status: 'all',
  isFixed: false,
  isSubscription: false,
  includeArchived: false,
};

function countActiveFilters(f: AdvancedFilters): number {
  let n = 0;
  if (f.categoryIds.length) n++;
  if (f.tags.length) n++;
  if (f.dateFrom || f.dateTo) n++;
  if (f.minAmount || f.maxAmount) n++;
  if (f.status !== 'all') n++;
  if (f.isFixed) n++;
  if (f.isSubscription) n++;
  if (f.includeArchived) n++;
  return n;
}

function parseAmountInput(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getNow() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_FULL[parseInt(m) - 1]} ${y}`;
}

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
  const {
    transactions, accounts, categories, tags, isLoading, refresh, searchTransactionsRemote,
    loadMoreTransactions, hasMoreTransactions, isLoadingMore,
  } = useFinance();
  const { selectedWalletId } = useWallet();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(getNow());

  // Advanced filters (BottomSheet)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);

  // Persist by wallet
  const filtersKey = selectedWalletId ? `tx-filters:${selectedWalletId}` : null;
  useEffect(() => {
    if (!filtersKey) return;
    let cancelled = false;
    AsyncStorage.getItem(filtersKey)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as Partial<AdvancedFilters>;
          const merged: AdvancedFilters = { ...EMPTY_FILTERS, ...parsed };
          setFilters(merged);
        } catch { /* ignore */ }
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [filtersKey]);

  const persistFilters = useCallback((next: AdvancedFilters) => {
    if (!filtersKey) return;
    AsyncStorage.setItem(filtersKey, JSON.stringify(next)).catch(() => { /* ignore */ });
  }, [filtersKey]);

  const openFilters = useCallback(() => {
    setDraftFilters(filters);
    setFiltersOpen(true);
    Haptics.selectionAsync();
  }, [filters]);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    persistFilters(draftFilters);
    setFiltersOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [draftFilters, persistFilters]);

  const clearFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Server-side search with debounce
  const [remoteResults, setRemoteResults] = useState<{ q: string; data: Transaction[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = search.trim();
    // Always abort any in-flight request and clear stale results immediately.
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
      searchAbortRef.current = null;
    }
    if (q.length < 2) {
      setRemoteResults(null);
      setSearching(false);
      return;
    }
    // Drop any previous remote results that don't match the new query.
    setRemoteResults((prev) => (prev && prev.q === q ? prev : null));
    const handle = setTimeout(() => {
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      setSearching(true);
      searchTransactionsRemote(q, ctrl.signal)
        .then((res) => {
          if (ctrl.signal.aborted) return;
          setRemoteResults({ q, data: res });
        })
        .catch(() => { /* aborted */ })
        .finally(() => { if (!ctrl.signal.aborted) setSearching(false); });
    }, 400);
    return () => clearTimeout(handle);
  }, [search, searchTransactionsRemote]);

  const currentMonthStr = getNow();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const isSearching = search.trim().length >= 2;

  const filtered = useMemo(() => {
    // When user is searching, show server results merged with local (deduped),
    // ignoring month/account/type filters so global matches are always visible.
    if (isSearching) {
      const q = search.trim();
      const qLower = q.toLowerCase();
      const localMatches = transactions.filter((t) => t.description.toLowerCase().includes(qLower));
      const merged = new Map<string, Transaction>();
      for (const t of localMatches) merged.set(t.id, t);
      // Only merge remote results that match the CURRENT query, never stale ones.
      if (remoteResults && remoteResults.q === q) {
        for (const t of remoteResults.data) if (!merged.has(t.id)) merged.set(t.id, t);
      }
      return Array.from(merged.values()).sort((a, b) => (b.transactionDate ?? b.date).localeCompare(a.transactionDate ?? a.date));
    }
    const minN = parseAmountInput(filters.minAmount);
    const maxN = parseAmountInput(filters.maxAmount);
    return transactions.filter((t) => {
      const effectiveDate = t.transactionDate ?? t.date;
      // When user provides explicit dateFrom/dateTo, ignore the month chip.
      if (filters.dateFrom || filters.dateTo) {
        if (filters.dateFrom && effectiveDate < filters.dateFrom) return false;
        if (filters.dateTo && effectiveDate > filters.dateTo) return false;
      } else {
        if (!effectiveDate.startsWith(selectedMonth)) return false;
      }
      if (filter !== 'all' && t.type !== filter) return false;
      if (accountFilter !== 'all' && t.accountId !== accountFilter) return false;
      // Advanced filters
      if (filters.categoryIds.length && !filters.categoryIds.includes(t.categoryId || '')) return false;
      if (filters.tags.length && !(t.tags || []).some((tg) => filters.tags.includes(tg))) return false;
      if (minN !== null && t.amount < minN) return false;
      if (maxN !== null && t.amount > maxN) return false;
      if (filters.status === 'paid' && t.isPaid === false) return false;
      if (filters.status === 'pending' && t.isPaid !== false) return false;
      if (filters.isFixed && !t.isFixed) return false;
      if (filters.isSubscription && !t.isSubscription) return false;
      if (!filters.includeArchived && t.isArchived) return false;
      return true;
    }).sort((a, b) => (b.transactionDate ?? b.date).localeCompare(a.transactionDate ?? a.date));
  }, [transactions, filter, accountFilter, search, selectedMonth, isSearching, remoteResults, filters]);

  const sections = useMemo(() => {
    const byDate: Record<string, Transaction[]> = {};
    filtered.forEach((t) => {
      const d = (t.transactionDate ?? t.date).substring(0, 10);
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
    return { income, expense };
  }, [filtered]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleExportCSV = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const header = 'Data,Tipo,Descrição,Categoria,Valor,Conta,Status';
    const rows = filtered.map((t) => {
      const accountName = accounts.find((a) => a.id === t.accountId)?.name || '';
      const status = t.isPaid === false ? 'Pendente' : 'Pago';
      return [
        t.transactionDate ?? t.date,
        t.type === 'income' ? 'Receita' : t.type === 'expense' ? 'Despesa' : 'Transferência',
        `"${t.description.replace(/"/g, '""')}"`,
        t.category || '',
        t.amount.toFixed(2).replace('.', ','),
        `"${accountName}"`,
        status,
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    Share.share({
      message: csv,
      title: `Transações ${getMonthLabel(selectedMonth)}.csv`,
    }).catch(() => {});
  }, [filtered, accounts, selectedMonth]);

  const activeAccount = accountFilter !== 'all' ? accounts.find((a) => a.id === accountFilter) : null;

  const renderHeader = () => (
    <View style={{ gap: 10, paddingBottom: 8 }}>
      {/* Month Navigation */}
      <View style={[styles.monthNav, { backgroundColor: theme.surface, borderColor: theme.border, opacity: isSearching ? 0.45 : 1 }]} pointerEvents={isSearching ? 'none' : 'auto'}>
        <Pressable
          onPress={() => { setSelectedMonth(addMonths(selectedMonth, -1)); Haptics.selectionAsync(); }}
          style={styles.monthBtn}
          hitSlop={8}
          disabled={isSearching}
        >
          <Feather name="chevron-left" size={20} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          onPress={() => { setSelectedMonth(currentMonthStr); Haptics.selectionAsync(); }}
          style={styles.monthLabelBtn}
          disabled={isSearching}
        >
          <Text style={[styles.monthLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            {getMonthLabel(selectedMonth)}
          </Text>
          {selectedMonth === currentMonthStr && (
            <View style={[styles.currentBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.currentBadgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Atual
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            if (selectedMonth < currentMonthStr) {
              setSelectedMonth(addMonths(selectedMonth, 1));
              Haptics.selectionAsync();
            }
          }}
          style={styles.monthBtn}
          hitSlop={8}
          disabled={isSearching || !(selectedMonth < currentMonthStr)}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={selectedMonth < currentMonthStr ? theme.textSecondary : theme.border}
          />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <Feather name="search" size={16} color={theme.textTertiary} />
        <TextInput
          testID="search-input"
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar em todos os meses..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.searchInput, { color: theme.text, fontFamily: 'Inter_400Regular' }]}
        />
        {searching && <ActivityIndicator size="small" color={theme.textTertiary} />}
        {search.length > 0 && !searching && (
          <Pressable onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={theme.textTertiary} />
          </Pressable>
        )}
      </View>
      {isSearching && (
        <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: -4, fontFamily: 'Inter_400Regular' }}>
          Buscando em todas as transações (filtros desativados)
        </Text>
      )}

      {/* Type Filters */}
      <View style={[styles.filterRow, { opacity: isSearching ? 0.45 : 1 }]} pointerEvents={isSearching ? 'none' : 'auto'}>
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
            disabled={isSearching}
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
        disabled={isSearching}
        style={[styles.accountFilterBtn, { backgroundColor: theme.surfaceElevated, borderColor: activeAccount ? activeAccount.color : theme.border, opacity: isSearching ? 0.45 : 1 }]}
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
              +{summary.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Despesas</Text>
            <Text style={[styles.summaryValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
              -{summary.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Saldo</Text>
            <Text style={[styles.summaryValue, { color: (summary.income - summary.expense) >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
              {(summary.income - summary.expense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[{ width: 1, height: 24, backgroundColor: 'transparent' }]} />
          <View style={styles.headerActions}>
          <Pressable
            testID="open-filters-btn"
            onPress={openFilters}
            style={[styles.iconBtn, { backgroundColor: theme.surfaceElevated, borderColor: activeFilterCount > 0 ? colors.primary : theme.border }]}
          >
            <Feather name="filter" size={16} color={activeFilterCount > 0 ? colors.primary : theme.textSecondary} />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.filterBadgeText, { fontFamily: 'Inter_700Bold' }]}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
          {filtered.length > 0 && (
            <Pressable
              testID="export-csv-btn"
              onPress={handleExportCSV}
              style={[styles.iconBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            >
              <Feather name="download" size={17} color={theme.textSecondary} />
            </Pressable>
          )}
          <Pressable
            testID="add-transaction-btn"
            onPress={() => { Haptics.selectionAsync(); router.push('/transaction/add'); }}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={20} color="#000" />
          </Pressable>
          </View>
        </View>
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
              {section.dayTotal >= 0 ? '+' : ''}{section.dayTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </Text>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        onEndReached={() => {
          if (!isSearching && hasMoreTransactions && !isLoadingMore) {
            loadMoreTransactions();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          isLoadingMore ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }} testID="loading-more-transactions">
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.emptyText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular', marginTop: 6 }]}>
                Carregando mais…
              </Text>
            </View>
          ) : !hasMoreTransactions && filtered.length > 10 && !isSearching ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={[styles.emptyText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Fim do histórico
              </Text>
            </View>
          ) : null
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Nenhuma transação
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {search ? 'Tente buscar com outros termos' : `Nenhuma transação em ${getMonthLabel(selectedMonth)}`}
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

      <FiltersBottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={draftFilters}
        setDraft={setDraftFilters}
        categories={categories}
        tags={tags}
        previewCount={(() => {
          const minN = parseAmountInput(draftFilters.minAmount);
          const maxN = parseAmountInput(draftFilters.maxAmount);
          return transactions.filter((t) => {
            const effectiveDate = t.transactionDate ?? t.date;
            if (draftFilters.dateFrom && effectiveDate < draftFilters.dateFrom) return false;
            if (draftFilters.dateTo && effectiveDate > draftFilters.dateTo) return false;
            if (!draftFilters.dateFrom && !draftFilters.dateTo && !effectiveDate.startsWith(selectedMonth)) return false;
            if (filter !== 'all' && t.type !== filter) return false;
            if (accountFilter !== 'all' && t.accountId !== accountFilter) return false;
            if (draftFilters.categoryIds.length && !draftFilters.categoryIds.includes(t.categoryId || '')) return false;
            if (draftFilters.tags.length && !(t.tags || []).some((tg) => draftFilters.tags.includes(tg))) return false;
            if (minN !== null && t.amount < minN) return false;
            if (maxN !== null && t.amount > maxN) return false;
            if (draftFilters.status === 'paid' && t.isPaid === false) return false;
            if (draftFilters.status === 'pending' && t.isPaid !== false) return false;
            if (draftFilters.isFixed && !t.isFixed) return false;
            if (draftFilters.isSubscription && !t.isSubscription) return false;
            if (!draftFilters.includeArchived && t.isArchived) return false;
            return true;
          }).length;
        })()}
        onClear={clearFilters}
        onApply={applyFilters}
      />
    </View>
  );
}

interface FiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  draft: AdvancedFilters;
  setDraft: React.Dispatch<React.SetStateAction<AdvancedFilters>>;
  categories: { id: string; name: string; type: 'income' | 'expense'; color: string | null }[];
  tags: { id: string; name: string; color: string }[];
  previewCount: number;
  onClear: () => void;
  onApply: () => void;
}

function FiltersBottomSheet({
  visible, onClose, draft, setDraft, categories, tags, previewCount, onClear, onApply,
}: FiltersSheetProps) {
  const { theme, colors } = useTheme();

  const toggleCategory = (id: string) => {
    setDraft((d) => ({
      ...d,
      categoryIds: d.categoryIds.includes(id)
        ? d.categoryIds.filter((x) => x !== id)
        : [...d.categoryIds, id],
    }));
  };
  const toggleTag = (id: string) => {
    setDraft((d) => ({
      ...d,
      tags: d.tags.includes(id) ? d.tags.filter((x) => x !== id) : [...d.tags, id],
    }));
  };

  const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ gap: 8 }}>
      <Text style={[fs.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
        {label}
      </Text>
      {children}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filtros"
      maxHeightRatio={0.9}
      testID="filters-sheet"
      footer={
        <>
          <Button
            label="Limpar"
            variant="secondary"
            onPress={onClear}
            testID="filters-clear-btn"
            style={{ flex: 1 }}
          />
          <Button
            label={previewCount > 0 ? `Aplicar (${previewCount})` : 'Aplicar'}
            variant="primary"
            onPress={onApply}
            testID="filters-apply-btn"
            style={{ flex: 1 }}
          />
        </>
      }
    >
      <Section label="CATEGORIAS">
        {categories.length === 0 ? (
          <Text style={[fs.empty, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Nenhuma categoria disponível
          </Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categories.map((c) => {
              const active = draft.categoryIds.includes(c.id);
              const tint = c.color || colors.primary;
              return (
                <Pressable
                  key={c.id}
                  testID={`filter-cat-${c.id}`}
                  onPress={() => toggleCategory(c.id)}
                  style={[
                    fs.chip,
                    {
                      backgroundColor: active ? `${tint}25` : theme.surfaceElevated,
                      borderColor: active ? tint : theme.border,
                    },
                  ]}
                >
                  <View style={[fs.chipDot, { backgroundColor: tint }]} />
                  <Text style={[fs.chipText, { color: active ? tint : theme.text, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Section>

      <Section label="TAGS">
        {tags.length === 0 ? (
          <Text style={[fs.empty, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Nenhuma tag cadastrada
          </Text>
        ) : (
          <View style={fs.wrap}>
            {tags.map((t) => {
              const active = draft.tags.includes(t.id);
              const tint = t.color || colors.primary;
              return (
                <Pressable
                  key={t.id}
                  testID={`filter-tag-${t.id}`}
                  onPress={() => toggleTag(t.id)}
                  style={[fs.chip, {
                    backgroundColor: active ? `${tint}25` : theme.surfaceElevated,
                    borderColor: active ? tint : theme.border,
                  }]}
                >
                  <View style={[fs.chipDot, { backgroundColor: tint }]} />
                  <Text style={[fs.chipText, { color: active ? tint : theme.text, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </Section>

      <Section label="PERÍODO">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[fs.inputLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>De</Text>
            <TextInput
              testID="filter-date-from"
              value={draft.dateFrom}
              onChangeText={(v) => setDraft((d) => ({ ...d, dateFrom: v }))}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              style={[fs.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[fs.inputLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Até</Text>
            <TextInput
              testID="filter-date-to"
              value={draft.dateTo}
              onChangeText={(v) => setDraft((d) => ({ ...d, dateTo: v }))}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="none"
              style={[fs.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
            />
          </View>
        </View>
      </Section>

      <Section label="VALOR (R$)">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[fs.inputLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Mínimo</Text>
            <TextInput
              testID="filter-amount-min"
              value={draft.minAmount}
              onChangeText={(v) => setDraft((d) => ({ ...d, minAmount: v }))}
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[fs.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[fs.inputLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Máximo</Text>
            <TextInput
              testID="filter-amount-max"
              value={draft.maxAmount}
              onChangeText={(v) => setDraft((d) => ({ ...d, maxAmount: v }))}
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[fs.input, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
            />
          </View>
        </View>
      </Section>

      <Section label="STATUS">
        <View style={fs.wrap}>
          {(['all', 'paid', 'pending'] as const).map((s) => {
            const active = draft.status === s;
            const label = s === 'all' ? 'Todos' : s === 'paid' ? 'Pago' : 'Pendente';
            return (
              <Pressable
                key={s}
                testID={`filter-status-${s}`}
                onPress={() => setDraft((d) => ({ ...d, status: s }))}
                style={[fs.chip, {
                  backgroundColor: active ? colors.primary : theme.surfaceElevated,
                  borderColor: active ? colors.primary : theme.border,
                  paddingHorizontal: 14,
                }]}
              >
                <Text style={[fs.chipText, { color: active ? '#000' : theme.text, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section label="OPÇÕES">
        {([
          { key: 'isFixed' as const, label: 'Apenas recorrentes' },
          { key: 'isSubscription' as const, label: 'Apenas assinaturas' },
          { key: 'includeArchived' as const, label: 'Incluir arquivadas' },
        ]).map((opt) => {
          const active = draft[opt.key];
          return (
            <Pressable
              key={opt.key}
              testID={`filter-toggle-${opt.key}`}
              onPress={() => setDraft((d) => ({ ...d, [opt.key]: !d[opt.key] }))}
              style={[fs.toggleRow, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            >
              <Text style={[fs.toggleText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                {opt.label}
              </Text>
              <View style={[
                fs.checkbox,
                { borderColor: active ? colors.primary : theme.border, backgroundColor: active ? colors.primary : 'transparent' },
              ]}>
                {active && <Feather name="check" size={14} color="#000" />}
              </View>
            </Pressable>
          );
        })}
      </Section>
    </BottomSheet>
  );
}

const fs = StyleSheet.create({
  sectionLabel: { fontSize: 11, letterSpacing: 1 },
  empty: { fontSize: 13, paddingVertical: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13 },
  inputLabel: { fontSize: 11 },
  input: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  toggleText: { fontSize: 14 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
});

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerSection: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenTitle: { fontSize: 26 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  filterBadge: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { fontSize: 10, color: '#000' },
  monthNav: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingVertical: 4 },
  monthBtn: { padding: 10 },
  monthLabelBtn: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  monthLabel: { fontSize: 16 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  currentBadgeText: { fontSize: 11 },
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
  summaryValue: { fontSize: 12 },
  summaryDivider: { width: 1, marginVertical: 2 },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, marginTop: 8 },
  dateHeaderText: { fontSize: 13 },
  dateHeaderBalance: { fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8 },
});
