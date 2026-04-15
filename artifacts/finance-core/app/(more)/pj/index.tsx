import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';

const MEI_ANNUAL_LIMIT = 81000;
const DAS_VENCIMENTO_DIA = 20;

export default function PJDashboard() {
  const { theme, colors, isDark } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [regime] = useState<'MEI' | 'ME'>('MEI');

  const currentMonth = getCurrentMonth();
  const currentYear = new Date().getFullYear();

  const pjReceitas = useMemo(() =>
    transactions.filter((t) => t.type === 'income' && (t.notes?.includes('[PJ]') || t.category?.toLowerCase().includes('pj'))),
    [transactions]
  );

  const monthReceitas = pjReceitas.filter((t) => t.date.startsWith(currentMonth));
  const yearReceitas = pjReceitas.filter((t) => t.date.startsWith(String(currentYear)));
  const monthTotal = monthReceitas.reduce((s, t) => s + t.amount, 0);
  const yearTotal = yearReceitas.reduce((s, t) => s + t.amount, 0);
  const limitPct = Math.min(100, (yearTotal / MEI_ANNUAL_LIMIT) * 100);

  // DAS due date this month
  const today = new Date();
  const dasDate = new Date(today.getFullYear(), today.getMonth(), DAS_VENCIMENTO_DIA);
  const daysUntilDas = Math.ceil((dasDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const dasAmount = monthTotal * 0.06; // 6% MEI Comércio

  const actions = [
    { icon: 'plus-circle' as const, label: 'Receita', color: colors.success, route: '/(more)/pj/receitas' },
    { icon: 'minus-circle' as const, label: 'Despesa', color: colors.danger, route: '/(more)/pj/despesas' },
    { icon: 'users' as const, label: 'Clientes', color: colors.primary, route: '/(more)/pj/clientes' },
    { icon: 'dollar-sign' as const, label: 'Pró-labore', color: colors.warning, route: '/(more)/pj/retiradas' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#0A0F1E', '#131929'] : ['#EFF6FF', '#F7F9FC']}
        style={[styles.header, { paddingTop: 20 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              PJ / MEI
            </Text>
            <Text style={[styles.headerSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Gestão do seu negócio
            </Text>
          </View>
          <View style={[styles.regimeBadge, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={[styles.regimeText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{regime}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ padding: 16, gap: 16 }}>
        {/* Faturamento */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Feather name="briefcase" size={15} color={theme.textSecondary} />
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Faturamento do Mês
            </Text>
          </View>
          <Text style={[styles.bigValue, { color: theme.text, fontFamily: 'Inter_800ExtraBold' }]}>
            {formatBRL(monthTotal)}
          </Text>
          <Text style={[styles.limitLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Limite MEI anual: {formatBRL(MEI_ANNUAL_LIMIT)} • Usado: {formatBRL(yearTotal)} ({limitPct.toFixed(1)}%)
          </Text>
          <View style={[styles.barBg, { backgroundColor: theme.surfaceElevated }]}>
            <View style={[styles.barFill, {
              width: `${limitPct}%`,
              backgroundColor: limitPct > 80 ? colors.danger : limitPct > 60 ? colors.warning : colors.success,
            }]} />
          </View>
        </View>

        {/* DAS */}
        <View style={[styles.card, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}30` }]}>
          <View style={styles.cardHeader}>
            <Feather name="calendar" size={15} color={colors.warning} />
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              DAS Próximo
            </Text>
          </View>
          <Text style={[styles.dasInfo, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
            {daysUntilDas > 0
              ? `Vence em ${daysUntilDas} dias — ${formatBRL(dasAmount)}`
              : daysUntilDas === 0
                ? `Vence hoje — ${formatBRL(dasAmount)}`
                : `Venceu há ${Math.abs(daysUntilDas)} dias — ${formatBRL(dasAmount)}`
            }
          </Text>
          <Pressable
            onPress={() => { Haptics.selectionAsync(); router.push('/(more)/pj/das'); }}
            style={[styles.dasBtn, { backgroundColor: colors.warning }]}
          >
            <Text style={[styles.dasBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Ver DAS / Guias</Text>
          </Pressable>
        </View>

        {/* Ações Rápidas */}
        <View style={styles.actionsGrid}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => { Haptics.selectionAsync(); router.push(a.route as any); }}
              style={({ pressed }) => [
                styles.actionTile,
                { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${a.color}20` }]}>
                <Feather name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Últimas receitas */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { marginBottom: 8 }]}>
            <Feather name="arrow-up-circle" size={15} color={colors.success} />
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Últimas Receitas PJ
            </Text>
          </View>
          {pjReceitas.length === 0 ? (
            <Text style={[styles.empty, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Nenhuma receita PJ registrada
            </Text>
          ) : (
            pjReceitas.slice(0, 5).map((t) => (
              <View key={t.id} style={[styles.txRow, { borderBottomColor: theme.border }]}>
                <View>
                  <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{t.description}</Text>
                  <Text style={[styles.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>
                  {formatBRL(t.amount)}
                </Text>
              </View>
            ))
          )}
          <Pressable onPress={() => { Haptics.selectionAsync(); router.push('/(more)/pj/receitas'); }}>
            <Text style={[styles.viewAll, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Ver todas →</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24 },
  headerSub: { fontSize: 14, marginTop: 2 },
  regimeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  regimeText: { fontSize: 14 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15 },
  bigValue: { fontSize: 28 },
  limitLabel: { fontSize: 12 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  dasInfo: { fontSize: 15 },
  dasBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  dasBtnText: { fontSize: 15, color: '#fff' },
  actionsGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  actionTile: { width: '47%', borderRadius: 14, padding: 14, borderWidth: 1, gap: 10, alignItems: 'flex-start' },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  txDesc: { fontSize: 14 },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  viewAll: { fontSize: 14, textAlign: 'center', paddingTop: 8 },
});
