import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { TransactionItem } from '@/components/TransactionItem';
import { formatBRL } from '@/utils/formatters';

function getCurrentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança', investment: 'Investimentos', credit: 'Crédito'
};

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors, maskValue } = useTheme();
  const { accounts, transactions, deleteTransaction } = useFinance();
  const insets = useSafeAreaInsets();

  const account = accounts.find((a) => a.id === id);
  if (!account) return null;

  const currentMonth = getCurrentMonth();
  const today = new Date().toISOString().split('T')[0];
  // Don't show future-dated transactions in the ledger (e.g. future installments
  // that haven't actually been paid yet).
  const allAccountTx = transactions
    .filter((t) => t.accountId === id && t.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recentTx = allAccountTx.slice(0, 30);
  const monthlyTx = allAccountTx.filter((t) => t.date.startsWith(currentMonth));
  const monthlyIncome = monthlyTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = monthlyTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <LinearGradient colors={[account.color, `${account.color}99`]} style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Feather name="credit-card" size={28} color="#fff" />
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/account/add', params: { id: account.id } })}
            style={styles.editBtn}
          >
            <Feather name="edit-2" size={16} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>
        <Text style={[styles.heroName, { fontFamily: 'Inter_700Bold' }]}>{account.name}</Text>
        <Text style={[styles.heroInst, { fontFamily: 'Inter_400Regular' }]}>
          {account.institution} • {ACCOUNT_TYPE_LABELS[account.type]}
        </Text>
        <Text style={[styles.heroBalance, { fontFamily: 'Inter_700Bold' }]}>
          {maskValue(formatBRL(account.balance))}
        </Text>
      </LinearGradient>

      <View style={[styles.statsRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Entradas do mês</Text>
          <Text style={[styles.statValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>
            {maskValue(formatBRL(monthlyIncome))}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Saídas do mês</Text>
          <Text style={[styles.statValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
            {maskValue(formatBRL(monthlyExpenses))}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Resultado</Text>
          <Text style={[
            styles.statValue,
            { color: monthlyIncome - monthlyExpenses >= 0 ? colors.success : colors.danger, fontFamily: 'Inter_700Bold' }
          ]}>
            {maskValue(formatBRL(monthlyIncome - monthlyExpenses))}
          </Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Últimas transações
        </Text>
        {recentTx.map((t) => (
          <TransactionItem
            key={t.id}
            transaction={t}
            onPress={(tx) => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
          />
        ))}
        {recentTx.length === 0 && (
          <View style={styles.empty}>
            <Feather name="inbox" size={32} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Nenhuma transação
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 24, paddingTop: 32, gap: 8 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: '#fff', fontSize: 22 },
  heroInst: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  heroBalance: { color: '#fff', fontSize: 36, marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1 },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 15 },
  sectionTitle: { fontSize: 16 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15 },
});
