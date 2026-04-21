import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';
import { MonthNavigator } from '@/components/MonthNavigator';
import { EmptyState } from '@/components/EmptyState';

export default function PJReceitasScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { transactions, addTransaction, categories } = useFinance();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const pjReceitas = useMemo(() =>
    transactions.filter((t) =>
      t.type === 'income' &&
      t.date.startsWith(selectedMonth) &&
      (t.notes?.includes('[PJ]') || t.category?.toLowerCase().includes('pj') || t.description?.toLowerCase().includes('pj'))
    ),
    [transactions, selectedMonth]
  );

  const total = pjReceitas.reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />

      <View style={[styles.totalCard, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
        <Text style={[styles.totalLabel, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>
          Total de Receitas PJ
        </Text>
        <Text style={[styles.totalValue, { color: colors.success, fontFamily: 'Inter_800ExtraBold' }]}>
          {maskValue(formatBRL(total))}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'income', notes: '[PJ]' } })}
        style={[styles.addBtn, { backgroundColor: colors.success }]}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Nova Receita PJ</Text>
      </Pressable>

      {pjReceitas.length === 0 ? (
        <EmptyState
          icon="arrow-up-circle"
          title="Nenhuma receita PJ"
          description={`Adicione receitas do seu negócio em ${selectedMonth}`}
        />
      ) : (
        pjReceitas.map((t) => (
          <View key={t.id} style={[styles.txCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.txIcon, { backgroundColor: `${colors.success}15` }]}>
              <Feather name="arrow-up-circle" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{t.description}</Text>
              <Text style={[styles.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                {t.isPaid ? ' • Recebido' : ' • Pendente'}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>
              {maskValue(formatBRL(t.amount))}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  totalCard: { borderRadius: 16, padding: 16, borderWidth: 1, alignItems: 'center', gap: 4 },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 28 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  addBtnText: { fontSize: 16, color: '#fff' },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 15 },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16 },
});
