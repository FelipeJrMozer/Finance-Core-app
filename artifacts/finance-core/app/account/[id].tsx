import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { TransactionItem } from '@/components/TransactionItem';
import { formatBRL } from '@/utils/formatters';

export default function AccountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors } = useTheme();
  const { accounts, transactions } = useFinance();
  const insets = useSafeAreaInsets();

  const account = accounts.find((a) => a.id === id);
  if (!account) return null;

  const accountTx = transactions.filter((t) => t.accountId === id).slice(0, 20);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      <LinearGradient colors={[`${account.color}`, `${account.color}99`]} style={styles.hero}>
        <Feather name="credit-card" size={32} color="#fff" />
        <Text style={[styles.heroName, { fontFamily: 'Inter_700Bold' }]}>{account.name}</Text>
        <Text style={[styles.heroInst, { fontFamily: 'Inter_400Regular' }]}>{account.institution}</Text>
        <Text style={[styles.heroBalance, { fontFamily: 'Inter_700Bold' }]}>{formatBRL(account.balance)}</Text>
      </LinearGradient>

      <View style={{ padding: 16, gap: 12 }}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Últimas transações
        </Text>
        {accountTx.map((t) => (
          <TransactionItem key={t.id} transaction={t} />
        ))}
        {accountTx.length === 0 && (
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
  hero: { padding: 32, alignItems: 'center', gap: 8 },
  heroName: { color: '#fff', fontSize: 22 },
  heroInst: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  heroBalance: { color: '#fff', fontSize: 36, marginTop: 8 },
  sectionTitle: { fontSize: 16 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15 },
});
