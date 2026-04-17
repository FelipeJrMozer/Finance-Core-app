import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, getBillingPeriod, getCurrentInvoiceMonth, isInvoicePayment } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function shortMonth(m: number) {
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m];
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} de ${y}`;
}

function formatPeriodShort(start: string, end: string) {
  const [, sm, sd] = start.split('-').map(Number);
  const [, em, ed] = end.split('-').map(Number);
  return `${String(sd).padStart(2, '0')} de ${shortMonth(sm - 1)}. - ${String(ed).padStart(2, '0')} de ${shortMonth(em - 1)}.`;
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function CardsScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { creditCards, transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Default to the current open invoice month using the FIRST card's closing day
  // (or fall back to the system's current month).
  const defaultMonth = useMemo(() => {
    const now = new Date();
    if (creditCards[0]) return getCurrentInvoiceMonth(creditCards[0].closingDay, now);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [creditCards]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // Per-card invoice for the selected month
  const cardData = useMemo(() => {
    return creditCards.map((card) => {
      const { start, end } = getBillingPeriod(card.closingDay, selectedMonth);
      const periodTx = transactions.filter((t) =>
        t.accountId === card.accountId &&
        t.type === 'expense' &&
        !isInvoicePayment(t) &&
        t.date >= start && t.date <= end
      );
      const invoice = periodTx.reduce((s, t) => s + t.amount, 0);
      // Detect payment: invoice payment transactions in the post-closing window
      // (between this invoice's close and next invoice close).
      const { end: nextEnd } = getBillingPeriod(card.closingDay, shiftMonth(selectedMonth, 1));
      const paymentTx = transactions.filter((t) =>
        t.accountId === card.accountId &&
        t.type === 'expense' &&
        isInvoicePayment(t) &&
        t.date > end && t.date <= nextEnd
      );
      const totalPaid = paymentTx.reduce((s, t) => s + t.amount, 0);
      const isPaid = invoice > 0 && totalPaid >= invoice * 0.99;
      const available = Math.max(0, card.limit - invoice);
      const usagePct = card.limit > 0 ? Math.min(invoice / card.limit, 1) : 0;
      return { card, invoice, available, usagePct, isPaid, periodStart: start, periodEnd: end };
    });
  }, [creditCards, transactions, selectedMonth]);

  const totalInvoice = cardData.reduce((s, d) => s + d.invoice, 0);
  const totalAvailable = cardData.reduce((s, d) => s + d.available, 0);
  const monthLabel = formatMonthLabel(selectedMonth);
  const monthShort = MONTH_LABELS[Number(selectedMonth.split('-')[1]) - 1];

  const goPrev = () => { Haptics.selectionAsync(); setSelectedMonth(shiftMonth(selectedMonth, -1)); };
  const goNext = () => { Haptics.selectionAsync(); setSelectedMonth(shiftMonth(selectedMonth, 1)); };
  const goToday = () => { Haptics.selectionAsync(); setSelectedMonth(defaultMonth); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Month selector */}
      <View style={[styles.monthBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable onPress={goPrev} style={styles.monthArrow} hitSlop={8}>
          <Feather name="chevron-left" size={20} color={theme.text} />
        </Pressable>
        <Pressable onPress={goToday} style={[styles.monthPill, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
          <Feather name="calendar" size={14} color={colors.primary} />
          <Text style={[styles.monthPillText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
            {monthLabel}
          </Text>
        </Pressable>
        <Pressable onPress={goNext} style={styles.monthArrow} hitSlop={8}>
          <Feather name="chevron-right" size={20} color={theme.text} />
        </Pressable>
      </View>

      {/* Top summary cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
          <View style={styles.summaryIconBox}>
            <Feather name="credit-card" size={14} color={colors.success} />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Limite disponível</Text>
          <Text style={[styles.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalAvailable))}</Text>
          <Text style={[styles.summarySub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{creditCards.length} cartões ativos</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <View style={styles.summaryIconBox}>
            <Feather name="dollar-sign" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total — {monthShort}</Text>
          <Text style={[styles.summaryValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalInvoice))}</Text>
          <Text style={[styles.summarySub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{creditCards.length} cartões</Text>
        </View>
      </View>

      {/* Card list header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
          Meus Cartões
        </Text>
        <Pressable
          onPress={() => router.push('/card/add')}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#000" />
        </Pressable>
      </View>

      {creditCards.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="credit-card" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Nenhum cartão cadastrado
          </Text>
          <Pressable
            onPress={() => router.push('/card/add')}
            style={[styles.emptyBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
          >
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[styles.emptyBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
              Adicionar cartão
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          {cardData.map(({ card, invoice, available, usagePct, isPaid, periodStart, periodEnd }) => {
            const isHighUsage = usagePct > 0.8;
            const invoiceColor = invoice === 0 ? theme.textSecondary : (isHighUsage ? colors.danger : colors.warning);
            return (
              <Pressable
                key={card.id}
                onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id, month: selectedMonth } })}
                style={[styles.cardCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <LinearGradient colors={[`${card.color}25`, `${card.color}08`]} style={styles.cardHeader}>
                  <View style={[styles.brandBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                    <Text style={[styles.brandText, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>{card.brand?.toUpperCase() || 'CARD'}</Text>
                  </View>
                  <Text style={[styles.cardName, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{card.name}</Text>
                  {card.lastFourDigits && (
                    <Text style={[styles.cardDigits, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      •••• {card.lastFourDigits}
                    </Text>
                  )}
                </LinearGradient>

                <View style={styles.cardBody}>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Limite Total</Text>
                    <Text style={[styles.rowValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(card.limit))}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Fatura {monthShort}</Text>
                    <Text style={[styles.rowValue, { color: invoiceColor, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(invoice))}</Text>
                  </View>
                  <Text style={[styles.periodHint, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {formatPeriodShort(periodStart, periodEnd)}
                  </Text>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Disponível</Text>
                    <Text style={[styles.rowValue, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(available))}</Text>
                  </View>

                  <View style={styles.usageRow}>
                    <Text style={[styles.usageLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Uso do limite</Text>
                    <Text style={[styles.usagePct, { color: isHighUsage ? colors.danger : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {Math.round(usagePct * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.usageBar, { backgroundColor: theme.surfaceElevated }]}>
                    <View style={[styles.usageFill, { backgroundColor: isHighUsage ? colors.danger : (invoice === 0 ? colors.success : card.color), width: `${usagePct * 100}%` }]} />
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="calendar" size={11} color={theme.textTertiary} />
                      <Text style={[styles.metaText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Fecha dia {card.closingDay}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Feather name="clock" size={11} color={theme.textTertiary} />
                      <Text style={[styles.metaText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Vence dia {card.dueDay}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBtn, {
                    backgroundColor: isPaid || invoice === 0 ? `${colors.success}20` : `${colors.danger}15`,
                    borderColor: isPaid || invoice === 0 ? `${colors.success}40` : `${colors.danger}40`,
                  }]}>
                    <Feather
                      name={isPaid || invoice === 0 ? 'check-circle' : 'alert-circle'}
                      size={13}
                      color={isPaid || invoice === 0 ? colors.success : colors.danger}
                    />
                    <Text style={[styles.statusText, {
                      color: isPaid || invoice === 0 ? colors.success : colors.danger,
                      fontFamily: 'Inter_600SemiBold'
                    }]}>
                      {invoice === 0 ? 'Sem lançamentos' : isPaid ? 'Fatura paga' : 'Em aberto'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  monthArrow: { padding: 6, borderRadius: 8 },
  monthPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  monthPillText: { fontSize: 13 },

  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, gap: 4 },
  summaryIconBox: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 18 },
  summarySub: { fontSize: 10, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  list: { gap: 12 },
  cardCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  cardHeader: { padding: 14, gap: 4 },
  brandBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  brandText: { fontSize: 10, letterSpacing: 1 },
  cardName: { fontSize: 16, marginTop: 4 },
  cardDigits: { fontSize: 12, letterSpacing: 1 },

  cardBody: { padding: 14, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 14 },
  periodHint: { fontSize: 11, textAlign: 'center', marginTop: -2 },

  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  usageLabel: { fontSize: 11 },
  usagePct: { fontSize: 11 },
  usageBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: 6, borderRadius: 3 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11 },

  statusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 6 },
  statusText: { fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 15 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  emptyBtnText: { fontSize: 14 },
});
