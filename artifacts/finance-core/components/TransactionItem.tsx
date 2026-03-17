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

  const fromAccount = accounts.find((a) => a.id === transaction.accountId);
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
  const infoColor = colors.info || '#2196F3';

  if (isTransfer) {
    return (
      <Pressable
        testID={testID}
        onPress={() => { Haptics.selectionAsync(); onPress?.(transaction); }}
        onLongPress={handleLongPress}
        delayLongPress={450}
        style={({ pressed }) => [
          styles.transferContainer,
          { backgroundColor: theme.surface, opacity: pressed ? 0.8 : 1 }
        ]}
      >
        {/* Header: description + amount */}
        <View style={styles.transferTop}>
          <View style={[styles.transferBadge, { backgroundColor: `${infoColor}18` }]}>
            <Feather name="repeat" size={13} color={infoColor} />
            <Text style={[styles.transferLabel, { color: infoColor, fontFamily: 'Inter_600SemiBold' }]}>
              Transferência
            </Text>
          </View>
          <Text style={[styles.transferAmount, { color: infoColor, fontFamily: 'Inter_700Bold' }]}>
            {maskValue(formatBRL(transaction.amount))}
          </Text>
        </View>

        {/* Description */}
        {transaction.description && transaction.description !== 'Transferência' && (
          <Text style={[styles.transferDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            {transaction.description}
          </Text>
        )}

        {/* Route: Origin → Destination */}
        <View style={styles.transferRoute}>
          <View style={styles.transferAccountBox}>
            {fromAccount && <View style={[styles.transferDot, { backgroundColor: fromAccount.color }]} />}
            <Text style={[styles.transferAccountName, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
              {fromAccount?.name || 'Conta de origem'}
            </Text>
          </View>
          <View style={[styles.arrowBox, { backgroundColor: `${infoColor}15` }]}>
            <Feather name="arrow-right" size={12} color={infoColor} />
          </View>
          <View style={styles.transferAccountBox}>
            {toAccount && <View style={[styles.transferDot, { backgroundColor: toAccount.color }]} />}
            <Text style={[styles.transferAccountName, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
              {toAccount?.name || 'Conta de destino'}
            </Text>
          </View>
          <Text style={[styles.transferDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {formatDate(transaction.date)}
          </Text>
        </View>
      </Pressable>
    );
  }

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
          {isInstallment && (
            <View style={[styles.tag, { backgroundColor: `${colors.warning || '#FF9800'}20` }]}>
              <Text style={[styles.tagText, { color: colors.warning || '#FF9800' }]}>
                {transaction.currentInstallment}/{transaction.installments}x
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[styles.amount, { color: amountColor, fontFamily: 'Inter_700Bold' }]}>
        {amountPrefix}{maskValue(formatBRL(transaction.amount))}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 16, gap: 12, borderRadius: 12, marginVertical: 2,
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

  transferContainer: {
    borderRadius: 12, marginVertical: 2, paddingHorizontal: 14, paddingVertical: 12, gap: 6,
  },
  transferTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  transferBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  transferLabel: { fontSize: 12 },
  transferAmount: { fontSize: 16 },
  transferDesc: { fontSize: 13 },
  transferRoute: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  transferAccountBox: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  transferDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  transferAccountName: { fontSize: 13, flexShrink: 1 },
  arrowBox: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  transferDate: { fontSize: 11, flexShrink: 0 },
});
