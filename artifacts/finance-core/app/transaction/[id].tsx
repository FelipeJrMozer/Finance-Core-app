import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
  const { transactions, deleteTransaction, accounts } = useFinance();
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
  const isIncome = transaction.type === 'income';

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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
    >
      {/* Amount Hero */}
      <LinearGradient
        colors={isIncome ? [colors.primary, colors.primaryDark] : [colors.danger, '#CC0000']}
        style={styles.hero}
      >
        <CategoryBadge category={transaction.category} size="md" />
        <Text style={[styles.heroAmount, { fontFamily: 'Inter_700Bold' }]}>
          {isIncome ? '+' : '-'}{maskValue(formatBRL(transaction.amount))}
        </Text>
        <Text style={[styles.heroDesc, { fontFamily: 'Inter_500Medium' }]}>
          {transaction.description}
        </Text>
        <View style={[styles.heroBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Text style={[styles.heroBadgeText, { fontFamily: 'Inter_400Regular' }]}>
            {isIncome ? 'Receita' : 'Despesa'} • {info.label}
          </Text>
        </View>
      </LinearGradient>

      {/* Details */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {[
          { label: 'Data', value: formatDate(transaction.date), icon: 'calendar' as const },
          { label: 'Conta', value: account?.name || 'N/A', icon: 'credit-card' as const },
          { label: 'Categoria', value: info.label, icon: 'tag' as const },
          ...(transaction.installments && transaction.installments > 1 ? [
            { label: 'Parcelas', value: `${transaction.installments}x de ${maskValue(formatBRL(transaction.amount / transaction.installments))}`, icon: 'layers' as const }
          ] : []),
          ...(transaction.recurring ? [
            { label: 'Recorrência', value: 'Mensal', icon: 'repeat' as const }
          ] : []),
        ].map((row, idx, arr) => (
          <React.Fragment key={row.label}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Feather name={row.icon} size={16} color={theme.textTertiary} />
                <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  {row.label}
                </Text>
              </View>
              <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                {row.value}
              </Text>
            </View>
            {idx < arr.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          </React.Fragment>
        ))}
      </View>

      {/* Actions */}
      <Button
        testID="delete-transaction"
        label="Excluir Transação"
        onPress={handleDelete}
        variant="danger"
        fullWidth
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  heroAmount: { color: '#000', fontSize: 42, marginTop: 8 },
  heroDesc: { color: 'rgba(0,0,0,0.8)', fontSize: 18 },
  heroBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 4 },
  heroBadgeText: { color: 'rgba(0,0,0,0.8)', fontSize: 13 },
  card: { borderRadius: 16, padding: 16, gap: 0, borderWidth: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 15 },
  detailValue: { fontSize: 15 },
  divider: { height: 1 },
});
