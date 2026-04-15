import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';
import { MonthNavigator } from '@/components/MonthNavigator';
import { EmptyState } from '@/components/EmptyState';

const PJ_CATEGORIES = ['Contador', 'Escritório', 'Marketing', 'Equipamentos', 'Serviços', 'Outros'];

export default function PJDespesasScreen() {
  const { theme, colors } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const pjDespesas = useMemo(() =>
    transactions.filter((t) =>
      t.type === 'expense' &&
      t.date.startsWith(selectedMonth) &&
      (t.notes?.includes('[PJ]') || t.description?.toLowerCase().includes('pj'))
    ),
    [transactions, selectedMonth]
  );

  const total = pjDespesas.reduce((s, t) => s + t.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      <MonthNavigator value={selectedMonth} onChange={setSelectedMonth} />

      <View style={[styles.totalCard, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
        <Text style={[styles.totalLabel, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
          Total de Despesas PJ
        </Text>
        <Text style={[styles.totalValue, { color: colors.danger, fontFamily: 'Inter_800ExtraBold' }]}>
          {formatBRL(total)}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/transaction/add', params: { type: 'expense', notes: '[PJ]' } })}
        style={[styles.addBtn, { backgroundColor: colors.danger }]}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Nova Despesa PJ</Text>
      </Pressable>

      {/* Breakdown by PJ category */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Por Categoria
        </Text>
        {PJ_CATEGORIES.map((cat) => {
          const catTotal = pjDespesas
            .filter((t) => t.description?.toLowerCase().includes(cat.toLowerCase()) || t.category?.toLowerCase() === cat.toLowerCase())
            .reduce((s, t) => s + t.amount, 0);
          if (catTotal === 0) return null;
          return (
            <View key={cat} style={[styles.catRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.catLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{cat}</Text>
              <Text style={[styles.catAmount, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>{formatBRL(catTotal)}</Text>
            </View>
          );
        })}
        {total === 0 && <Text style={[styles.empty, { color: theme.textTertiary }]}>Sem despesas neste mês</Text>}
      </View>

      {pjDespesas.length === 0 ? (
        <EmptyState icon="minus-circle" title="Nenhuma despesa PJ" description={`Nenhuma despesa operacional em ${selectedMonth}`} />
      ) : (
        pjDespesas.map((t) => (
          <View key={t.id} style={[styles.txCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.txIcon, { backgroundColor: `${colors.danger}15` }]}>
              <Feather name="minus-circle" size={18} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{t.description}</Text>
              <Text style={[styles.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(t.amount)}
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
  section: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  sectionTitle: { fontSize: 15, marginBottom: 4 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  catLabel: { fontSize: 14 },
  catAmount: { fontSize: 14 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 15 },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 16 },
});
