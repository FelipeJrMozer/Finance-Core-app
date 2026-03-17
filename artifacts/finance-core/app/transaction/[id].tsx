import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, getCategoryInfo } from '@/components/CategoryBadge';
import { formatBRL, formatDate } from '@/utils/formatters';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors, maskValue } = useTheme();
  const { transactions, deleteTransaction, advanceInstallment, accounts } = useFinance();
  const insets = useSafeAreaInsets();

  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Transação não encontrada</Text>
      </View>
    );
  }

  const info = getCategoryInfo(transaction.category);
  const account = accounts.find((a) => a.id === transaction.accountId);
  const toAccount = accounts.find((a) => a.id === transaction.toAccountId);
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const isInstallment = (transaction.installments || 1) > 1;

  const gradientColors = isTransfer
    ? [colors.info || '#2196F3', '#1565C0']
    : isIncome
      ? [colors.primary, colors.primaryDark]
      : [colors.danger, '#CC0000'];

  const handleDelete = () => {
    Alert.alert('Excluir', 'Deseja excluir esta transação?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: () => {
          deleteTransaction(transaction.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        }
      }
    ]);
  };

  const handleAdvance = () => {
    Alert.alert('Adiantar parcela', `Mover "${transaction.description}" para o mês atual?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Adiantar',
        onPress: () => {
          advanceInstallment(transaction.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  const rows = [
    { label: 'Data', value: formatDate(transaction.date), icon: 'calendar' as const },
    { label: isTransfer ? 'Conta de origem' : 'Conta', value: account?.name || 'N/A', icon: 'credit-card' as const },
    ...(isTransfer && toAccount ? [{ label: 'Conta de destino', value: toAccount.name, icon: 'arrow-right-circle' as const }] : []),
    ...(!isTransfer ? [{ label: 'Categoria', value: info.label, icon: 'tag' as const }] : []),
    ...(isInstallment ? [{ label: 'Parcelas', value: `${transaction.currentInstallment || '?'}/${transaction.installments}x de ${maskValue(formatBRL(transaction.amount))}`, icon: 'layers' as const }] : []),
    ...(transaction.recurring ? [{ label: 'Recorrência', value: 'Mensal', icon: 'repeat' as const }] : []),
    ...(transaction.notes ? [{ label: 'Observações', value: transaction.notes, icon: 'file-text' as const }] : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/transaction/add', params: { id: transaction.id } })}
              style={[styles.editBtn, { backgroundColor: theme.surfaceElevated }]}
            >
              <Feather name="edit-2" size={16} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {/* Hero */}
      <LinearGradient colors={gradientColors as [string, string]} style={styles.hero}>
        {isTransfer ? (
          <View style={styles.transferIconWrap}>
            <Feather name="repeat" size={36} color="rgba(0,0,0,0.7)" />
          </View>
        ) : (
          <CategoryBadge category={transaction.category} size="md" />
        )}
        <Text style={[styles.heroAmount, { fontFamily: 'Inter_700Bold' }]}>
          {isTransfer ? '' : isIncome ? '+' : '-'}{maskValue(formatBRL(transaction.amount))}
        </Text>
        <Text style={[styles.heroDesc, { fontFamily: 'Inter_500Medium' }]}>
          {transaction.description}
        </Text>
        <View style={[styles.heroBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Text style={[styles.heroBadgeText, { fontFamily: 'Inter_400Regular' }]}>
            {isTransfer ? 'Transferência' : isIncome ? 'Receita' : 'Despesa'}{!isTransfer ? ` • ${info.label}` : ''}
          </Text>
        </View>
      </LinearGradient>

      {/* Details */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {rows.map((row, idx) => (
          <React.Fragment key={row.label}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Feather name={row.icon} size={16} color={theme.textTertiary} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {row.label}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
            {idx < rows.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          label="Editar Transação"
          onPress={() => router.push({ pathname: '/transaction/add', params: { id: transaction.id } })}
          variant="secondary"
          fullWidth
        />
        {isInstallment && (
          <Button
            label="Adiantar para este mês"
            onPress={handleAdvance}
            variant="secondary"
            fullWidth
          />
        )}
        <Button
          testID="delete-transaction"
          label="Excluir Transação"
          onPress={handleDelete}
          variant="danger"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20 },
  editBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  transferIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroAmount: { color: '#000', fontSize: 42, marginTop: 8 },
  heroDesc: { color: 'rgba(0,0,0,0.8)', fontSize: 18 },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  heroBadgeText: { color: 'rgba(0,0,0,0.8)', fontSize: 13 },
  card: { borderRadius: 16, padding: 16, gap: 0, borderWidth: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 12 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 15 },
  detailValue: { fontSize: 15, textAlign: 'right', flex: 1 },
  divider: { height: 1 },
  actions: { gap: 10 },
});
