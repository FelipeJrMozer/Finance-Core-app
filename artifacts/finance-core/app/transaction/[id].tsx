import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, InstallmentEntry } from '@/context/FinanceContext';
import { Button } from '@/components/ui/Button';
import { CategoryBadge, getCategoryInfo } from '@/components/CategoryBadge';
import { formatBRL, formatDate } from '@/utils/formatters';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors, maskValue } = useTheme();
  const { transactions, deleteTransaction, advanceInstallment, accounts, creditCards, getInstallments } = useFinance();
  const insets = useSafeAreaInsets();
  const [installments, setInstallments] = useState<InstallmentEntry[] | null>(null);
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  const transaction = transactions.find((t) => t.id === id);
  const isInstallment = (transaction?.installments || 1) > 1;
  const txId = transaction?.id;

  useEffect(() => {
    if (!isInstallment || !txId) {
      setInstallments(null);
      setLoadingInstallments(false);
      return;
    }
    let active = true;
    setInstallments(null); // clear stale list when switching transactions
    setLoadingInstallments(true);
    getInstallments(txId)
      .then((res) => { if (active) setInstallments(res); })
      .finally(() => { if (active) setLoadingInstallments(false); });
    return () => { active = false; };
  }, [isInstallment, txId, getInstallments]);

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

  // Check if this expense belongs to a credit card
  const linkedCard = !isTransfer && transaction.type === 'expense'
    ? creditCards.find((c) => c.accountId === transaction.accountId)
    : undefined;

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

  const sourceLabel = isTransfer ? 'Conta de origem' : linkedCard ? 'Cartão' : 'Conta';
  const sourceValue = linkedCard ? linkedCard.name : (account?.name || 'N/A');
  const sourceIcon = linkedCard ? 'credit-card' as const : 'layers' as const;

  const rows = [
    { label: 'Data', value: formatDate(transaction.transactionDate ?? transaction.date), icon: 'calendar' as const },
    { label: sourceLabel, value: sourceValue, icon: sourceIcon },
    ...(isTransfer && toAccount ? [{ label: 'Conta de destino', value: toAccount.name, icon: 'arrow-right-circle' as const }] : []),
    ...(!isTransfer ? [{ label: 'Categoria', value: info.label, icon: 'tag' as const }] : []),
    ...(isInstallment ? [{ label: 'Parcelas', value: `${transaction.currentInstallment || '?'}/${transaction.installments}x de ${maskValue(formatBRL(transaction.amount))}`, icon: 'layers' as const }] : []),
    { label: 'Status', value: transaction.isPaid ? 'Pago' : 'Pendente', icon: 'check-circle' as const },
    ...(!isTransfer && transaction.isFixed ? [{ label: 'Tipo', value: 'Despesa Fixa', icon: 'anchor' as const }] : []),
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
          <>
            <Text style={[styles.heroAmount, { fontFamily: 'Inter_700Bold', marginTop: 0 }]}>
              {maskValue(formatBRL(transaction.amount))}
            </Text>
            <View style={[styles.heroBadge, { backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 0 }]}>
              <Text style={[styles.heroBadgeText, { fontFamily: 'Inter_600SemiBold' }]}>Transferência</Text>
            </View>
            {/* Route card */}
            <View style={[styles.transferRouteCard, { backgroundColor: 'rgba(0,0,0,0.18)' }]}>
              <View style={styles.transferRouteCol}>
                <Text style={[styles.transferRouteLabel, { fontFamily: 'Inter_400Regular' }]}>De</Text>
                {account && <View style={[styles.transferRouteDot, { backgroundColor: account.color }]} />}
                <Text style={[styles.transferRouteName, { fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                  {account?.name || '—'}
                </Text>
              </View>
              <View style={styles.transferRouteArrow}>
                <Feather name="arrow-right" size={20} color="rgba(255,255,255,0.8)" />
              </View>
              <View style={[styles.transferRouteCol, { alignItems: 'flex-end' }]}>
                <Text style={[styles.transferRouteLabel, { fontFamily: 'Inter_400Regular' }]}>Para</Text>
                {toAccount && <View style={[styles.transferRouteDot, { backgroundColor: toAccount.color }]} />}
                <Text style={[styles.transferRouteName, { fontFamily: 'Inter_600SemiBold', textAlign: 'right' }]} numberOfLines={2}>
                  {toAccount?.name || '—'}
                </Text>
              </View>
            </View>
            {transaction.description && transaction.description !== 'Transferência' && (
              <Text style={[styles.heroDesc, { fontFamily: 'Inter_400Regular', fontSize: 14 }]}>
                {transaction.description}
              </Text>
            )}
          </>
        ) : (
          <>
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
          </>
        )}
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

      {/* Installments */}
      {isInstallment && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="layers" size={16} color={theme.textTertiary} />
              <Text style={{ color: theme.text, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>
                Parcelas ({transaction.installments}x)
              </Text>
            </View>
            {loadingInstallments && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
          {!loadingInstallments && installments && installments.length === 0 && (
            <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 13, paddingVertical: 6 }}>
              Sem detalhes adicionais de parcelas.
            </Text>
          )}
          {installments && installments.length > 0 && installments.map((inst, idx) => (
            <React.Fragment key={inst.id || idx}>
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <Feather
                    name={inst.isPaid ? 'check-circle' : 'circle'}
                    size={14}
                    color={inst.isPaid ? colors.success : theme.textTertiary}
                  />
                  <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {inst.installmentNumber}/{inst.totalInstallments} • {formatDate(inst.date)}
                  </Text>
                </View>
                <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                  {maskValue(formatBRL(inst.amount))}
                </Text>
              </View>
              {idx < installments.length - 1 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
            </React.Fragment>
          ))}
        </View>
      )}

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
  transferRouteCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, width: '100%', marginTop: 4 },
  transferRouteCol: { flex: 1, gap: 4 },
  transferRouteLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  transferRouteDot: { width: 8, height: 8, borderRadius: 4 },
  transferRouteName: { color: '#fff', fontSize: 15 },
  transferRouteArrow: { paddingHorizontal: 12 },
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
