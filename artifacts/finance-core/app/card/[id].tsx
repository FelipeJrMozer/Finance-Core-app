import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, Alert,
  KeyboardAvoidingView, Platform, TextInput, FlatList, Switch
} from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, formatDate } from '@/utils/formatters';
import { getCategoryInfo, CATEGORIES } from '@/components/CategoryBadge';

type Tab = 'invoice' | 'installments' | 'details';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getMonthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
}

function addMonths(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Returns billing period {start, end} for the given display month and closing day */
function getBillingPeriod(closingDay: number, displayMonth: string): { start: string; end: string } {
  const [y, m] = displayMonth.split('-').map(Number);
  const endDate = new Date(y, m - 1, closingDay);
  const startDate = new Date(y, m - 2, closingDay + 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(startDate), end: fmt(endDate) };
}

/** Returns the display month for the current open invoice */
function getCurrentInvoiceMonth(closingDay: number, now: Date): string {
  const d = now.getDate();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (d > closingDay) {
    const next = new Date(y, m, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function formatBillingDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]}`;
}

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors, maskValue } = useTheme();
  const { creditCards, accounts, transactions, addCardExpense, payCardInvoice, deleteCreditCard, deleteTransaction, advanceInstallment, getCardTransactions } = useFinance();
  const insets = useSafeAreaInsets();

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [tab, setTab] = useState<Tab>('invoice');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('food');
  const [expInstallments, setExpInstallments] = useState(1);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expRecurring, setExpRecurring] = useState(false);
  const [expNotes, setExpNotes] = useState('');
  const [selectedPayAccount, setSelectedPayAccount] = useState(accounts[0]?.id || '');
  const [payAmount, setPayAmount] = useState('');

  const card = creditCards.find((c) => c.id === id);
  if (!card) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <Text style={{ color: theme.textSecondary }}>Cartão não encontrado</Text>
    </View>
  );

  const invoiceTxs = useMemo(() =>
    getCardTransactions(id, selectedMonth),
    [id, selectedMonth, transactions]
  );

  const invoiceTotal = invoiceTxs.reduce((s, t) => s + t.amount, 0);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    invoiceTxs.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [invoiceTxs]);

  const maxCatAmount = categoryBreakdown[0]?.[1] || 1;

  const installmentTxs = useMemo(() =>
    getCardTransactions(id).filter((t) => (t.installments || 1) > 1),
    [id, transactions]
  );

  const usedPct = Math.min(card.used / card.limit, 1);
  const available = card.limit - card.used;

  const dueDateDay = card.dueDate.split('-')[2];
  const closingDateDay = card.closingDate.split('-')[2];

  const expAmountNum = parseFloat(expAmount.replace(',', '.')) || 0;
  const expInstallmentValue = expInstallments > 1 ? expAmountNum / expInstallments : expAmountNum;

  const handleSaveExpense = () => {
    if (!expDesc.trim()) {
      Alert.alert('Atenção', 'Adicione uma descrição');
      return;
    }
    if (isNaN(expAmountNum) || expAmountNum <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido');
      return;
    }
    addCardExpense(id, {
      description: expDesc.trim(),
      amount: expAmountNum,
      type: 'expense',
      category: expCategory,
      accountId: accounts[0]?.id || '',
      date: expDate || new Date().toISOString().split('T')[0],
      installments: expInstallments,
      currentInstallment: 1,
      recurring: expRecurring,
      notes: expNotes.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowExpenseModal(false);
    setExpDesc('');
    setExpAmount('');
    setExpInstallments(1);
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpRecurring(false);
    setExpNotes('');
  };

  const handlePayInvoice = () => {
    const amt = parseFloat(payAmount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido');
      return;
    }
    if (!selectedPayAccount) {
      Alert.alert('Atenção', 'Selecione uma conta para débito');
      return;
    }
    payCardInvoice(id, amt, selectedPayAccount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPayModal(false);
  };

  const handleDeleteCard = () => {
    Alert.alert(
      'Excluir cartão',
      `Tem certeza que deseja excluir "${card.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteCreditCard(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  };

  const handleAdvance = (txId: string, desc: string) => {
    Alert.alert(
      'Adiantar parcela',
      `Mover "${desc}" para o mês atual?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Adiantar',
          onPress: () => {
            advanceInstallment(txId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const categories = Object.keys(CATEGORIES).filter((c) => c !== 'income' && c !== 'other');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerRight: tab === 'invoice' ? () => (
            <Pressable
              onPress={() => setShowExpenseModal(true)}
              style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={18} color="#000" />
            </Pressable>
          ) : undefined,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[card.color, `${card.color}BB`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={[styles.heroInst, { fontFamily: 'Inter_400Regular' }]}>{card.institution}</Text>
              <Text style={[styles.heroName, { fontFamily: 'Inter_700Bold' }]}>{card.name}</Text>
            </View>
            <Pressable
              onPress={() => router.push({ pathname: '/card/add', params: { id: card.id } })}
              style={styles.editBtn}
            >
              <Feather name="edit-2" size={16} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>

          <View style={styles.heroAmounts}>
            <View>
              <Text style={[styles.heroLabel, { fontFamily: 'Inter_400Regular' }]}>Utilizado</Text>
              <Text style={[styles.heroUsed, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(card.used))}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.heroLabel, { fontFamily: 'Inter_400Regular' }]}>Disponível</Text>
              <Text style={[styles.heroAvailable, { fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(available))}</Text>
            </View>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${usedPct * 100}%`, backgroundColor: usedPct > 0.8 ? '#FF6B6B' : 'rgba(255,255,255,0.9)' }]} />
          </View>

          <View style={styles.heroDates}>
            <Text style={[styles.heroDateText, { fontFamily: 'Inter_400Regular' }]}>
              Fecha dia {closingDateDay}
            </Text>
            <Text style={[styles.heroDateText, { fontFamily: 'Inter_500Medium' }]}>
              Vence dia {dueDateDay}
            </Text>
            <Text style={[styles.heroDateText, { fontFamily: 'Inter_400Regular' }]}>
              Limite {maskValue(formatBRL(card.limit))}
            </Text>
          </View>
        </LinearGradient>

        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {([['invoice', 'Fatura'], ['installments', 'Parcelas'], ['details', 'Detalhes']] as [Tab, string][]).map(([t, label]) => (
            <Pressable
              key={t}
              onPress={() => { setTab(t); Haptics.selectionAsync(); }}
              style={[styles.tabItem, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[
                styles.tabText,
                { color: tab === t ? colors.primary : theme.textSecondary },
                { fontFamily: tab === t ? 'Inter_600SemiBold' : 'Inter_400Regular' }
              ]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'invoice' && (
          <View style={{ padding: 16, gap: 16 }}>
            <View style={styles.monthNav}>
              <Pressable onPress={() => setSelectedMonth(addMonths(selectedMonth, -1))} style={styles.monthBtn}>
                <Feather name="chevron-left" size={20} color={theme.textSecondary} />
              </Pressable>
              <View style={styles.monthNavCenter}>
                <Text style={[styles.monthLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  {getMonthLabel(selectedMonth)}
                </Text>
                <View style={[
                  styles.invoiceStatusBadge,
                  { backgroundColor: selectedMonth === currentMonthStr ? `${colors.primary}20` : `${theme.textTertiary}18` }
                ]}>
                  <View style={[styles.invoiceStatusDot, { backgroundColor: selectedMonth === currentMonthStr ? colors.primary : theme.textTertiary }]} />
                  <Text style={[styles.invoiceStatusText, { color: selectedMonth === currentMonthStr ? colors.primary : theme.textTertiary, fontFamily: 'Inter_600SemiBold' }]}>
                    {selectedMonth === currentMonthStr ? 'Aberta' : 'Fechada'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => { if (selectedMonth < currentMonthStr) setSelectedMonth(addMonths(selectedMonth, 1)); }}
                style={styles.monthBtn}
              >
                <Feather name="chevron-right" size={20} color={selectedMonth < currentMonthStr ? theme.textSecondary : theme.border} />
              </Pressable>
            </View>

            <View style={[styles.invoiceSummary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.invoiceRow}>
                <Text style={[styles.invoiceLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total da fatura</Text>
                <Text style={[styles.invoiceTotal, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                  {maskValue(formatBRL(invoiceTotal))}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              {/* Billing period */}
              <View style={styles.invoiceRow}>
                <View style={styles.invoiceInfo}>
                  <Feather name="calendar" size={14} color={theme.textTertiary} />
                  <Text style={[styles.invoiceInfoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {(() => {
                      const { start, end } = getBillingPeriod(card.closingDay, selectedMonth);
                      return `${formatBillingDate(start)} → ${formatBillingDate(end)}`;
                    })()}
                  </Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              {/* Due date */}
              <View style={styles.invoiceRow}>
                <View style={styles.invoiceInfo}>
                  <Feather name="clock" size={14} color={theme.textTertiary} />
                  <Text style={[styles.invoiceInfoText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {selectedMonth === currentMonthStr ? `Vence dia ${dueDateDay}` : `Venceu dia ${dueDateDay}/${selectedMonth.split('-')[1]}`}
                  </Text>
                </View>
                {invoiceTxs.length === 0 && (
                  <View style={[styles.statusBadge, { backgroundColor: `${theme.textTertiary}15` }]}>
                    <Text style={[styles.statusText, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
                      Sem lançamentos
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {categoryBreakdown.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.chartTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Gastos por categoria
                </Text>
                <View style={{ gap: 10, marginTop: 8 }}>
                  {categoryBreakdown.map(([cat, amt]) => {
                    const info = getCategoryInfo(cat);
                    const pct = amt / maxCatAmount;
                    return (
                      <View key={cat} style={styles.catRow}>
                        <View style={styles.catLeft}>
                          <View style={[styles.catIcon, { backgroundColor: `${info.color}20` }]}>
                            <Feather name={info.icon as any} size={12} color={info.color} />
                          </View>
                          <Text style={[styles.catName, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                            {info.label}
                          </Text>
                        </View>
                        <View style={styles.catBarWrap}>
                          <View style={[styles.catBarBg, { backgroundColor: theme.surfaceElevated }]}>
                            <View style={[styles.catBarFill, { width: `${pct * 100}%`, backgroundColor: info.color }]} />
                          </View>
                        </View>
                        <Text style={[styles.catAmt, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                          {maskValue(formatBRL(amt))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {invoiceTxs.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Nenhuma transação neste mês
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Lançamentos ({invoiceTxs.length})
                </Text>
                {invoiceTxs.map((tx) => {
                  const info = getCategoryInfo(tx.category);
                  const isInstallment = (tx.installments || 1) > 1;

                  const handleTxAction = () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const opts: Array<{ text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }> = [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Editar',
                        onPress: () => router.push({ pathname: '/transaction/add', params: { id: tx.id } }),
                      },
                    ];
                    if (isInstallment) {
                      opts.push({
                        text: 'Adiantar para este mês',
                        onPress: () => {
                          Alert.alert('Adiantar parcela', `Mover "${tx.description}" para o mês atual?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Adiantar', onPress: () => { advanceInstallment(tx.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
                          ]);
                        },
                      });
                    }
                    opts.push({
                      text: 'Excluir',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert('Excluir lançamento', `Excluir "${tx.description}" da fatura?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Excluir', style: 'destructive', onPress: () => { deleteTransaction(tx.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
                        ]);
                      },
                    });
                    Alert.alert(tx.description, 'Escolha uma ação', opts);
                  };

                  return (
                    <Pressable
                      key={tx.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        router.push({ pathname: '/transaction/[id]', params: { id: tx.id } });
                      }}
                      onLongPress={handleTxAction}
                      delayLongPress={450}
                      style={({ pressed }) => [
                        styles.txItem,
                        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
                      ]}
                    >
                      <View style={[styles.txIcon, { backgroundColor: `${info.color}20` }]}>
                        <Feather name={info.icon as any} size={16} color={info.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                          {tx.description}
                        </Text>
                        <Text style={[styles.txMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                          {formatDate(tx.date)}
                          {isInstallment ? ` • ${tx.currentInstallment || 1}/${tx.installments}x` : ''}
                          {tx.recurring ? ' • Recorrente' : ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.txAmt, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                          -{maskValue(formatBRL(tx.amount))}
                        </Text>
                        <Pressable
                          onPress={(e) => { e.stopPropagation?.(); handleTxAction(); }}
                          hitSlop={8}
                          style={[styles.txMoreBtn, { backgroundColor: theme.surfaceElevated }]}
                        >
                          <Feather name="more-horizontal" size={14} color={theme.textTertiary} />
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {tab === 'installments' && (
          <View style={{ padding: 16, gap: 12 }}>
            <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Compras parceladas
            </Text>
            {installmentTxs.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="layers" size={40} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Nenhuma parcela ativa
                </Text>
              </View>
            ) : (
              installmentTxs.map((tx) => {
                const info = getCategoryInfo(tx.category);
                const remaining = (tx.installments || 1) - (tx.currentInstallment || 1) + 1;
                const totalPending = tx.amount * remaining;
                const isCurrentMonth = tx.date.startsWith(currentMonthStr);
                return (
                  <View key={tx.id} style={[styles.installCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={styles.installHeader}>
                      <View style={[styles.txIcon, { backgroundColor: `${info.color}20` }]}>
                        <Feather name={info.icon as any} size={16} color={info.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.txDesc, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                          {tx.description}
                        </Text>
                        <Text style={[styles.txMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                          {tx.currentInstallment || 1}/{tx.installments}x • {maskValue(formatBRL(tx.amount))}/mês
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmt, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                          {maskValue(formatBRL(totalPending))}
                        </Text>
                        <Text style={[styles.txMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                          {remaining}x restantes
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.installProgress, { backgroundColor: theme.surfaceElevated }]}>
                      <View style={[
                        styles.installFill,
                        {
                          width: `${((tx.currentInstallment || 1) / (tx.installments || 1)) * 100}%`,
                          backgroundColor: card.color,
                        }
                      ]} />
                    </View>

                    {!isCurrentMonth && (
                      <Pressable
                        onPress={() => handleAdvance(tx.id, tx.description)}
                        style={[styles.advanceBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
                      >
                        <Feather name="fast-forward" size={14} color={colors.primary} />
                        <Text style={[styles.advanceBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                          Adiantar para este mês
                        </Text>
                      </Pressable>
                    )}
                    {isCurrentMonth && (
                      <View style={[styles.advanceBtn, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
                        <Feather name="check-circle" size={14} color={colors.success} />
                        <Text style={[styles.advanceBtnText, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>
                          Na fatura atual
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {tab === 'details' && (
          <View style={{ padding: 16, gap: 12 }}>
            <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {[
                ['Limite total', formatBRL(card.limit), 'dollar-sign', colors.primary],
                ['Utilizado', formatBRL(card.used), 'trending-up', colors.danger],
                ['Disponível', formatBRL(available), 'check-circle', colors.success],
                ['Vencimento', `Dia ${dueDateDay} de cada mês`, 'calendar', colors.warning],
                ['Fechamento da fatura', `Dia ${closingDateDay} de cada mês`, 'lock', theme.textTertiary],
                ['Instituição', card.institution, 'home', theme.textTertiary],
              ].map(([label, value, icon, iconColor]) => (
                <View key={String(label)} style={[styles.detailRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.detailLeft}>
                    <Feather name={icon as any} size={16} color={String(iconColor)} />
                    <Text style={[styles.detailLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {label}
                    </Text>
                  </View>
                  <Text style={[styles.detailValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => router.push({ pathname: '/card/add', params: { id: card.id } })}
              style={[styles.actionBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
            >
              <Feather name="edit-2" size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Editar cartão
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDeleteCard}
              style={[styles.actionBtn, { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}40` }]}
            >
              <Feather name="trash-2" size={18} color={colors.danger} />
              <Text style={[styles.actionBtnText, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                Excluir cartão
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {tab === 'invoice' && invoiceTotal > 0 && (
        <View style={[styles.fab, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={() => { setPayAmount(invoiceTotal.toFixed(2)); setShowPayModal(true); }}
            style={[styles.fabBtn, { backgroundColor: colors.success, flex: 1 }]}
          >
            <Feather name="check-circle" size={18} color="#000" />
            <Text style={[styles.fabText, { color: '#000', fontFamily: 'Inter_600SemiBold' }]}>Pagar fatura</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={showExpenseModal} animationType="slide" presentationStyle="formSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={{ flex: 1, backgroundColor: theme.background }}
            contentContainerStyle={[styles.modal, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                Adicionar despesa
              </Text>
              <Pressable
                onPress={() => setShowExpenseModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceElevated }]}
              >
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            {/* Card chip */}
            <View style={[styles.expCardChip, { backgroundColor: `${card.color}18`, borderColor: `${card.color}40` }]}>
              <Feather name="credit-card" size={14} color={card.color} />
              <Text style={[styles.expCardChipText, { color: card.color, fontFamily: 'Inter_600SemiBold' }]}>
                {card.name}
              </Text>
            </View>

            {/* Amount hero */}
            <View style={[styles.amountHero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.amountCurrency, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>R$</Text>
              <TextInput
                value={expAmount}
                onChangeText={setExpAmount}
                placeholder="0,00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.amountInput, { color: theme.text, fontFamily: 'Inter_700Bold' }]}
                autoFocus={false}
              />
            </View>
            {expInstallments > 1 && expAmountNum > 0 && (
              <Text style={[styles.installmentPreview, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                {expInstallments}x de {formatBRL(expInstallmentValue)} por mês
              </Text>
            )}

            {/* Description */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Descrição *</Text>
            <TextInput
              value={expDesc}
              onChangeText={setExpDesc}
              placeholder="Ex: Supermercado, Netflix, Gasolina..."
              placeholderTextColor={theme.textTertiary}
              style={[styles.textInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />

            {/* Date */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Data da compra</Text>
            <View style={[styles.dateRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="calendar" size={16} color={theme.textTertiary} />
              <TextInput
                value={expDate}
                onChangeText={setExpDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={theme.textTertiary}
                style={[styles.dateInput, { color: theme.text, fontFamily: 'Inter_400Regular' }]}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Installments */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Parcelas</Text>
            <View style={styles.installmentsGrid}>
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => { setExpInstallments(n); Haptics.selectionAsync(); }}
                  style={[
                    styles.installmentChip,
                    {
                      backgroundColor: expInstallments === n ? colors.primary : theme.surface,
                      borderColor: expInstallments === n ? colors.primary : theme.border,
                    }
                  ]}
                >
                  <Text style={[
                    styles.installmentChipText,
                    { color: expInstallments === n ? '#fff' : theme.textSecondary, fontFamily: expInstallments === n ? 'Inter_600SemiBold' : 'Inter_400Regular' }
                  ]}>
                    {n === 1 ? 'À vista' : `${n}x`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Recurring */}
            <View style={[styles.recurringRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.recurringTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Despesa recorrente</Text>
                <Text style={[styles.recurringDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Lançar automaticamente todos os meses
                </Text>
              </View>
              <Switch
                value={expRecurring}
                onValueChange={(v) => { setExpRecurring(v); Haptics.selectionAsync(); }}
                trackColor={{ false: theme.border, true: `${colors.primary}80` }}
                thumbColor={expRecurring ? colors.primary : theme.textTertiary}
              />
            </View>

            {/* Category */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const info = getCategoryInfo(cat);
                const active = expCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => { setExpCategory(cat); Haptics.selectionAsync(); }}
                    style={[
                      styles.categoryCell,
                      {
                        backgroundColor: active ? `${info.color}20` : theme.surface,
                        borderColor: active ? info.color : theme.border,
                      }
                    ]}
                  >
                    <View style={[styles.categoryIcon, { backgroundColor: active ? `${info.color}25` : theme.surfaceElevated }]}>
                      <Feather name={info.icon as any} size={16} color={active ? info.color : theme.textTertiary} />
                    </View>
                    <Text style={[styles.categoryCellText, { color: active ? info.color : theme.textSecondary, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]} numberOfLines={1}>
                      {info.label}
                    </Text>
                    {active && (
                      <View style={[styles.categoryCheck, { backgroundColor: info.color }]}>
                        <Feather name="check" size={10} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Notes */}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Observações</Text>
            <TextInput
              value={expNotes}
              onChangeText={setExpNotes}
              placeholder="Informações adicionais (opcional)"
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={3}
              style={[styles.textInput, styles.notesInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            />

            {/* Summary strip */}
            {expAmountNum > 0 && (
              <View style={[styles.expSummary, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                <View style={styles.expSummaryRow}>
                  <Text style={[styles.expSummaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Valor total</Text>
                  <Text style={[styles.expSummaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(expAmountNum)}</Text>
                </View>
                {expInstallments > 1 && (
                  <View style={styles.expSummaryRow}>
                    <Text style={[styles.expSummaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Entrada na fatura</Text>
                    <Text style={[styles.expSummaryValue, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                      {expInstallments}x de {formatBRL(expInstallmentValue)}
                    </Text>
                  </View>
                )}
                {expRecurring && (
                  <View style={styles.expSummaryRow}>
                    <Text style={[styles.expSummaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Recorrência</Text>
                    <Text style={[styles.expSummaryValue, { color: colors.warning, fontFamily: 'Inter_600SemiBold' }]}>Mensal</Text>
                  </View>
                )}
              </View>
            )}

            <Pressable
              onPress={handleSaveExpense}
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: expAmountNum > 0 && expDesc.trim() ? 1 : 0.5 }]}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Adicionar despesa</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showPayModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modal, { backgroundColor: theme.background, flex: 1, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Pagar fatura
            </Text>
            <Pressable onPress={() => setShowPayModal(false)}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.invoiceSummary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.invoiceLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Total da fatura de {getMonthLabel(selectedMonth)}
            </Text>
            <Text style={[styles.invoiceTotal, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(invoiceTotal)}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium', marginTop: 8 }]}>
            Valor a pagar (R$)
          </Text>
          <TextInput
            value={payAmount}
            onChangeText={setPayAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={theme.textTertiary}
            style={[styles.textInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Débitar da conta
          </Text>
          <View style={{ gap: 8 }}>
            {accounts.filter((a) => !a.archived).map((acc) => (
              <Pressable
                key={acc.id}
                onPress={() => { setSelectedPayAccount(acc.id); Haptics.selectionAsync(); }}
                style={[
                  styles.accountChip,
                  {
                    backgroundColor: selectedPayAccount === acc.id ? `${acc.color}20` : theme.surface,
                    borderColor: selectedPayAccount === acc.id ? acc.color : theme.border,
                  }
                ]}
              >
                <Feather name="credit-card" size={16} color={selectedPayAccount === acc.id ? acc.color : theme.textTertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accName, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{acc.name}</Text>
                  <Text style={[styles.accBalance, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    Saldo: {formatBRL(acc.balance)}
                  </Text>
                </View>
                {selectedPayAccount === acc.id && (
                  <Feather name="check-circle" size={18} color={acc.color} />
                )}
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={handlePayInvoice}
            style={[styles.saveBtn, { backgroundColor: colors.success, marginTop: 16 }]}
          >
            <Feather name="check-circle" size={18} color="#000" />
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Confirmar pagamento</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 24, paddingTop: 32, gap: 16 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroInst: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroName: { color: '#fff', fontSize: 20, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroAmounts: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  heroLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  heroUsed: { color: '#fff', fontSize: 28, marginTop: 2 },
  heroAvailable: { color: 'rgba(255,255,255,0.85)', fontSize: 20, marginTop: 2 },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  heroDates: { flexDirection: 'row', justifyContent: 'space-between' },
  heroDateText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderTopWidth: 0 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { fontSize: 14 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNavCenter: { flex: 1, alignItems: 'center', gap: 6 },
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 18 },
  invoiceStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  invoiceStatusDot: { width: 6, height: 6, borderRadius: 3 },
  invoiceStatusText: { fontSize: 12 },
  invoiceSummary: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 16, gap: 12 },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  invoiceLabel: { fontSize: 13 },
  invoiceTotal: { fontSize: 28 },
  invoiceInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  invoiceInfoText: { fontSize: 13 },
  divider: { height: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12 },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  chartTitle: { fontSize: 15 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 100 },
  catIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 11, flex: 1 },
  catBarWrap: { flex: 1 },
  catBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: 8, borderRadius: 4 },
  catAmt: { fontSize: 12, width: 72, textAlign: 'right' },
  sectionLabel: { fontSize: 16 },
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 14 },
  txMeta: { fontSize: 11, marginTop: 2 },
  txAmt: { fontSize: 14 },
  txMoreBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 15 },
  installCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  installHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  installProgress: { height: 6, borderRadius: 3, overflow: 'hidden' },
  installFill: { height: 6, borderRadius: 3 },
  advanceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  advanceBtnText: { fontSize: 13 },
  detailCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1 },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, borderWidth: 1 },
  actionBtnText: { fontSize: 15 },
  fab: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'transparent' },
  fabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  fabText: { fontSize: 15 },
  modal: { padding: 24, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20 },
  fieldLabel: { fontSize: 13 },
  textInput: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16, fontFamily: 'Inter_400Regular' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  expCardChip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  expCardChipText: { fontSize: 13 },
  amountHero: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 4 },
  amountCurrency: { fontSize: 22, marginRight: 4, paddingTop: 6 },
  amountInput: { flex: 1, fontSize: 44, paddingVertical: 12 },
  installmentPreview: { textAlign: 'center', fontSize: 14, marginTop: -4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, gap: 10 },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  installmentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  installmentChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, minWidth: 60, alignItems: 'center' },
  installmentChipText: { fontSize: 13 },
  recurringRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  recurringTitle: { fontSize: 15 },
  recurringDesc: { fontSize: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCell: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, position: 'relative' },
  categoryIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  categoryCellText: { fontSize: 13, flex: 1 },
  categoryCheck: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  expSummary: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  expSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  expSummaryLabel: { fontSize: 13 },
  expSummaryValue: { fontSize: 14 },
  accountChip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  accName: { fontSize: 14 },
  accBalance: { fontSize: 12, marginTop: 2 },
  headerAddBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
});
