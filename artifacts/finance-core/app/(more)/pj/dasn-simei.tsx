import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';
import { MEI_LIMITE_ANUAL } from '@/constants/pj';

const PORTAL_EMPREENDEDOR = 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor';

const CHECKLIST_KEY = 'pf_dasn_checklist';

const CHECKLIST_ITEMS = [
  { id: 'cnpj', label: 'CNPJ ativo no Portal do Empreendedor' },
  { id: 'nfs', label: 'Notas fiscais emitidas (ou livro-caixa)' },
  { id: 'comp', label: 'Comprovantes de receitas' },
  { id: 'das', label: 'DAS pagos durante o ano' },
];

function isPjTransaction(t: { notes?: string; category?: string; description?: string }) {
  return (
    t.notes?.includes('[PJ]') ||
    t.category?.toLowerCase().includes('pj') ||
    t.description?.toLowerCase().startsWith('das') ||
    t.description?.toLowerCase().includes('pró-labore') ||
    t.description?.toLowerCase().includes('pro-labore')
  );
}

export default function DasnSimeiScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const currentYear = now.getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Load saved checklist
  React.useEffect(() => {
    AsyncStorage.getItem(`${CHECKLIST_KEY}_${year}`).then((raw) => {
      if (raw) {
        try { setChecked(JSON.parse(raw)); } catch { setChecked({}); }
      } else {
        setChecked({});
      }
    });
  }, [year]);

  const toggleCheck = async (id: string) => {
    Haptics.selectionAsync();
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await AsyncStorage.setItem(`${CHECKLIST_KEY}_${year}`, JSON.stringify(next));
  };

  const yearTotals = useMemo(() => {
    const pjTx = transactions.filter(isPjTransaction);
    const yearTx = pjTx.filter((t) => t.date.startsWith(String(year)));
    const receitas = yearTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const despesas = yearTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { receitas, despesas };
  }, [transactions, year]);

  const limitPct = Math.min(100, (yearTotals.receitas / MEI_LIMITE_ANUAL) * 100);
  const exceeded = yearTotals.receitas > MEI_LIMITE_ANUAL;

  // Deadline = May 31 of the YEAR AFTER the reference year
  const deadline = new Date(year + 1, 4, 31);
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const overdue = daysUntilDeadline < 0;

  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];
  const completedCount = CHECKLIST_ITEMS.filter((i) => checked[i.id]).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
    >
      {/* Year selector */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          Ano de referência
        </Text>
        <View style={styles.yearRow}>
          {yearOptions.map((y) => (
            <Pressable
              key={y}
              onPress={() => { Haptics.selectionAsync(); setYear(y); }}
              style={[styles.yearBtn, {
                backgroundColor: year === y ? colors.primary : theme.surfaceElevated,
                borderColor: year === y ? colors.primary : theme.border,
              }]}
            >
              <Text style={[styles.yearText, {
                color: year === y ? '#000' : theme.text,
                fontFamily: year === y ? 'Inter_600SemiBold' : 'Inter_400Regular',
              }]}>
                {y}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Faturamento vs limite */}
      <View style={[styles.card, {
        backgroundColor: exceeded ? `${colors.danger}10` : theme.surface,
        borderColor: exceeded ? `${colors.danger}40` : theme.border,
      }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Faturamento bruto
          </Text>
          <Text style={[styles.pctBadge, { color: exceeded ? colors.danger : colors.primary, fontFamily: 'Inter_700Bold' }]}>
            {limitPct.toFixed(1)}%
          </Text>
        </View>
        <Text style={[styles.bigValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          {maskValue(formatBRL(yearTotals.receitas))}
        </Text>
        <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Limite MEI: {formatBRL(MEI_LIMITE_ANUAL)}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[styles.progressFill, {
            width: `${limitPct}%`,
            backgroundColor: exceeded ? colors.danger : limitPct > 80 ? colors.warning : colors.success,
          }]} />
        </View>
        {exceeded && (
          <View style={[styles.alertBox, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30` }]}>
            <Feather name="alert-triangle" size={14} color={colors.danger} />
            <Text style={[styles.alertText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
              Você ultrapassou o limite do MEI. Considere migrar para ME.
            </Text>
          </View>
        )}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.miniRow}>
          <Text style={[styles.miniLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Despesas dedutíveis</Text>
          <Text style={[styles.miniValue, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            {maskValue(formatBRL(yearTotals.despesas))}
          </Text>
        </View>
      </View>

      {/* Prazo */}
      <View style={[styles.card, {
        backgroundColor: overdue ? `${colors.danger}10` : `${colors.success}10`,
        borderColor: overdue ? `${colors.danger}40` : `${colors.success}40`,
      }]}>
        <View style={styles.headerRow}>
          <Feather name="calendar" size={16} color={overdue ? colors.danger : colors.success} />
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Prazo de entrega
          </Text>
        </View>
        <Text style={[styles.bigValue, { color: overdue ? colors.danger : colors.success, fontFamily: 'Inter_700Bold' }]}>
          31 de maio de {year + 1}
        </Text>
        <Text style={[styles.cardSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          {overdue
            ? `Prazo vencido há ${Math.abs(daysUntilDeadline)} dias`
            : daysUntilDeadline === 0
              ? 'Vence hoje'
              : `Faltam ${daysUntilDeadline} dias`}
        </Text>
      </View>

      {/* Checklist */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Checklist DASN-SIMEI
          </Text>
          <Text style={[styles.miniLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {completedCount}/{CHECKLIST_ITEMS.length}
          </Text>
        </View>
        {CHECKLIST_ITEMS.map((item) => {
          const isOn = !!checked[item.id];
          return (
            <Pressable
              key={item.id}
              onPress={() => toggleCheck(item.id)}
              style={({ pressed }) => [styles.checkRow, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.checkbox, {
                backgroundColor: isOn ? colors.success : 'transparent',
                borderColor: isOn ? colors.success : theme.border,
              }]}>
                {isOn && <Feather name="check" size={12} color="#fff" />}
              </View>
              <Text style={[styles.checkLabel, {
                color: isOn ? theme.textTertiary : theme.text,
                fontFamily: 'Inter_400Regular',
                textDecorationLine: isOn ? 'line-through' : 'none',
              }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Portal link */}
      <Pressable
        onPress={() => { Haptics.selectionAsync(); Linking.openURL(PORTAL_EMPREENDEDOR); }}
        style={[styles.linkBtn, { backgroundColor: colors.primary }]}
        testID="button-open-portal"
      >
        <Feather name="external-link" size={16} color="#000" />
        <Text style={[styles.linkText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>
          Acessar Portal do Empreendedor
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 10 },
  cardTitle: { fontSize: 14 },
  cardSub: { fontSize: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  yearRow: { flexDirection: 'row', gap: 8 },
  yearBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1 },
  yearText: { fontSize: 14 },
  pctBadge: { fontSize: 16 },
  bigValue: { fontSize: 22 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8 },
  alertBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  alertText: { fontSize: 13, flex: 1 },
  divider: { height: 1 },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniLabel: { fontSize: 13 },
  miniValue: { fontSize: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 14, flex: 1 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  linkText: { fontSize: 15 },
});
