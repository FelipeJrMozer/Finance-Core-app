import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Transaction } from '@/context/FinanceContext';
import { CategoryBadge } from '@/components/CategoryBadge';
import { formatBRL, formatDate } from '@/utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (t: Transaction) => void;
  onDelete?: (id: string) => void;
  testID?: string;
}

export function TransactionItem({ transaction, onPress, testID }: TransactionItemProps) {
  const { theme, colors } = useTheme();
  const isIncome = transaction.type === 'income';

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.(transaction);
      }}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        }
      ]}
    >
      <CategoryBadge category={transaction.category} />
      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {formatDate(transaction.date)}
          </Text>
          {transaction.recurring && (
            <View style={[styles.tag, { backgroundColor: colors.primaryGlow }]}>
              <Feather name="repeat" size={10} color={colors.primary} />
              <Text style={[styles.tagText, { color: colors.primary }]}>Recorrente</Text>
            </View>
          )}
          {transaction.installments && transaction.installments > 1 && (
            <View style={[styles.tag, { backgroundColor: `${colors.info}20` }]}>
              <Text style={[styles.tagText, { color: colors.info }]}>{transaction.installments}x</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[
        styles.amount,
        {
          color: isIncome ? colors.primary : colors.danger,
          fontFamily: 'Inter_700Bold',
        }
      ]}>
        {isIncome ? '+' : '-'}{formatBRL(transaction.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  content: { flex: 1, gap: 4 },
  description: { fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 12 },
  amount: { fontSize: 15 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  tagText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
});
