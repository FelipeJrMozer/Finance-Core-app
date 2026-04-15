import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';

export default function PendingTransactionsScreen() {
  const { theme, colors } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();

  const pending = useMemo(() =>
    transactions
      .filter((t) => t.isPaid === false)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [transactions]
  );

  const totalPending = pending.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      {pending.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
          <Feather name="clock" size={16} color={colors.warning} />
          <View>
            <Text style={[styles.summaryLabel, { color: colors.warning, fontFamily: 'Inter_500Medium' }]}>
              {pending.length} lançamento{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''}
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(totalPending)} a pagar
            </Text>
          </View>
        </View>
      )}

      {pending.length === 0 ? (
        <EmptyState
          icon="check-circle"
          title="Nenhum lançamento pendente"
          description="Todos os seus lançamentos estão marcados como pagos"
        />
      ) : (
        pending.map((t) => {
          const typeColor = t.type === 'income' ? colors.success : t.type === 'expense' ? colors.danger : colors.transfer;
          const typeIcon = t.type === 'income' ? 'arrow-up-circle' : t.type === 'expense' ? 'arrow-down-circle' : 'arrow-right-circle';
          return (
            <Pressable
              key={t.id}
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: '/transaction/[id]', params: { id: t.id } }); }}
              style={({ pressed }) => [
                styles.txCard,
                { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <View style={[styles.txIcon, { backgroundColor: `${typeColor}15` }]}>
                <Feather name={typeIcon as any} size={18} color={typeColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{t.description}</Text>
                <Text style={[styles.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')} • Pendente
                </Text>
              </View>
              <Text style={[styles.txAmount, { color: typeColor, fontFamily: 'Inter_700Bold' }]}>
                {t.type === 'income' ? '+' : '–'}{formatBRL(t.amount)}
              </Text>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 18, marginTop: 2 },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 15 },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16 },
});
