import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Transaction } from '@/context/FinanceContext';
import { CategoryBadge } from '@/components/CategoryBadge';
import { formatBRL, formatDate } from '@/utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: (t: Transaction) => void;
  onDelete?: (id: string) => void;
  hideActions?: boolean;
  testID?: string;
}

export function TransactionItem({ transaction, onPress, hideActions, testID }: TransactionItemProps) {
  const { theme, colors, maskValue } = useTheme();
  const { deleteTransaction, advanceInstallment, accounts } = useFinance();
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isInstallment = (transaction.installments || 1) > 1;

  const toAccount = isTransfer ? accounts.find((a) => a.id === transaction.toAccountId) : undefined;

  const handleLongPress = () => {
    if (hideActions) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const options: Array<{ text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }> = [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Editar',
        onPress: () => router.push({ pathname: '/transaction/add', params: { id: transaction.id } }),
      },
    ];

    if (isInstallment) {
      options.push({
        text: 'Adiantar para este mês',
        onPress: () => {
          Alert.alert('Adiantar parcela', `Mover "${transaction.description}" para o mês atual?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Adiantar',
              onPress: () => {
                advanceInstallment(transaction.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
            },
          ]);
        },
      });
    }

    options.push({
      text: 'Excluir',
      style: 'destructive',
      onPress: () => {
        Alert.alert('Excluir transação', `Deseja excluir "${transaction.description}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir', style: 'destructive',
            onPress: () => {
              deleteTransaction(transaction.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          },
        ]);
      },
    });

    Alert.alert(transaction.description, 'Escolha uma ação', options);
  };

  const amountColor = isTransfer ? (colors.info || '#2196F3') : isIncome ? colors.primary : colors.danger;
  const amountPrefix = isTransfer ? '' : isIncome ? '+' : '-';

  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.(transaction);
      }}
      onLongPress={handleLongPress}
      delayLongPress={450}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        }
      ]}
    >
      {isTransfer ? (
        <View style={[styles.transferIcon, { backgroundColor: `${colors.info || '#2196F3'}20` }]}>
          <Feather name="repeat" size={18} color={colors.info || '#2196F3'} />
        </View>
      ) : (
        <CategoryBadge category={transaction.category} />
      )}

      <View style={styles.content}>
        <Text style={[styles.description, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {formatDate(transaction.date)}
          </Text>
          {isTransfer && toAccount && (
            <View style={[styles.tag, { backgroundColor: `${colors.info || '#2196F3'}15` }]}>
              <Feather name="arrow-right" size={9} color={colors.info || '#2196F3'} />
              <Text style={[styles.tagText, { color: colors.info || '#2196F3' }]}>{toAccount.name}</Text>
            </View>
          )}
          {transaction.recurring && (
            <View style={[styles.tag, { backgroundColor: colors.primaryGlow }]}>
              <Feather name="repeat" size={10} color={colors.primary} />
              <Text style={[styles.tagText, { color: colors.primary }]}>Recorrente</Text>
            </View>
          )}
          {isInstallment && (
            <View style={[styles.tag, { backgroundColor: `${colors.warning || '#FF9800'}20` }]}>
              <Text style={[styles.tagText, { color: colors.warning || '#FF9800' }]}>
                {transaction.currentInstallment}/{transaction.installments}x
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor, fontFamily: 'Inter_700Bold' }]}>
          {amountPrefix}{maskValue(formatBRL(transaction.amount))}
        </Text>
        {!hideActions && (
          <Text style={[styles.holdHint, { color: theme.textTertiary }]}>segure</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 16, gap: 12, borderRadius: 12, marginVertical: 2,
  },
  transferIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 4 },
  description: { fontSize: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 15 },
  holdHint: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  tagText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
});
