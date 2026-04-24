import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, formatPercent } from '@/utils/formatters';
import {
  listInvestmentTransactions,
  addInvestmentTransaction,
  removeInvestmentTransaction,
  type InvestmentTransaction,
  type InvestmentTxKind,
} from '@/services/investmentTransactions';

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Ações BR', fii: 'FIIs', reit: 'REITs', fixed: 'Renda Fixa', crypto: 'Cripto', etf: 'ETFs',
};
const TYPE_COLORS: Record<string, string> = {
  stocks: '#2196F3', fii: '#9C27B0', reit: '#FF9800', fixed: '#4CAF50', crypto: '#FF6B35', etf: '#00BCD4',
};
const KIND_LABELS: Record<InvestmentTxKind, string> = {
  buy: 'Compra',
  sell: 'Venda',
  dividend: 'Dividendo',
  jcp: 'JCP',
  fee: 'Taxa',
  split: 'Desdobramento',
};
const KIND_COLORS: Record<InvestmentTxKind, 'primary' | 'danger' | 'info' | 'warning'> = {
  buy: 'primary',
  sell: 'danger',
  dividend: 'info',
  jcp: 'info',
  fee: 'warning',
  split: 'warning',
};

interface FormState {
  kind: InvestmentTxKind;
  quantity: string;
  price: string;
  date: string;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const EMPTY_FORM: FormState = {
  kind: 'buy',
  quantity: '',
  price: '',
  date: todayStr(),
  notes: '',
};

function formatLocalDate(d?: string): string {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

export default function InvestmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme, colors, maskValue } = useTheme();
  const { investments, refresh } = useFinance();
  const insets = useSafeAreaInsets();

  const inv = investments.find((i) => i.id === id);

  const [history, setHistory] = useState<InvestmentTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listInvestmentTransactions(id);
      setHistory(data);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHistory(), refresh()]);
  };

  if (!inv) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <Text style={{ color: theme.textSecondary }}>Investimento não encontrado</Text>
    </View>
  );

  const invested = inv.quantity * inv.avgPrice;
  const current = inv.quantity * inv.currentPrice;
  const profit = current - invested;
  const pctReturn = invested > 0 ? ((current - invested) / invested) * 100 : 0;
  const typeColor = TYPE_COLORS[inv.type] || colors.primary;

  const submit = async () => {
    const qty = parseFloat(form.quantity.replace(',', '.'));
    const price = parseFloat(form.price.replace(',', '.'));
    if (!isFinite(qty) || qty <= 0 || !isFinite(price) || price < 0) {
      Alert.alert('Quantidade e preço devem ser válidos');
      return;
    }
    if (!form.date) {
      Alert.alert('Informe a data');
      return;
    }
    setSaving(true);
    try {
      const result = await addInvestmentTransaction({
        investmentId: id!,
        kind: form.kind,
        quantity: qty,
        price,
        date: form.date,
        notes: form.notes || undefined,
      });
      if (!result) {
        Alert.alert('Erro', 'Não foi possível registrar a operação.');
        return;
      }
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      await Promise.all([loadHistory(), refresh()]);
    } finally {
      setSaving(false);
    }
  };

  const removeTx = (tx: InvestmentTransaction) => {
    Alert.alert('Excluir operação', `Excluir ${KIND_LABELS[tx.kind]} de ${formatLocalDate(tx.date)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          const ok = await removeInvestmentTransaction(tx.id);
          if (!ok) {
            Alert.alert('Erro', 'Não foi possível excluir.');
            return;
          }
          await Promise.all([loadHistory(), refresh()]);
        },
      },
    ]);
  };

  const colorByKind = (k: InvestmentTxKind): string => {
    const role = KIND_COLORS[k];
    if (role === 'primary') return colors.primary;
    if (role === 'danger') return colors.danger;
    if (role === 'info') return colors.info;
    return colors.warning;
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <LinearGradient
        colors={profit >= 0 ? [colors.primary, colors.primaryDark] : [colors.danger, '#CC0000']}
        style={styles.hero}
      >
        <View style={[styles.typeTag, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Text style={[styles.typeText, { fontFamily: 'Inter_600SemiBold' }]}>{TYPE_LABELS[inv.type] || inv.type}</Text>
        </View>
        <Text style={[styles.ticker, { fontFamily: 'Inter_700Bold' }]}>{inv.ticker}</Text>
        <Text style={[styles.name, { fontFamily: 'Inter_400Regular' }]}>{inv.name}</Text>
        <Text style={[styles.currentValue, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(current))}</Text>
        <View style={[styles.returnBadge, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
          <Feather name={pctReturn >= 0 ? 'trending-up' : 'trending-down'} size={14} color="#000" />
          <Text style={[styles.returnText, { fontFamily: 'Inter_600SemiBold' }]}>{formatPercent(pctReturn)}</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsGrid}>
        {[
          { label: 'Investido', value: formatBRL(invested), icon: 'dollar-sign' as const, color: colors.info, masked: true },
          { label: 'Lucro/Perda', value: formatBRL(profit), icon: 'activity' as const, color: profit >= 0 ? colors.primary : colors.danger, masked: true },
          { label: 'Quantidade', value: `${inv.quantity}`, icon: 'layers' as const, color: typeColor, masked: false },
          { label: 'Preço Médio', value: formatBRL(inv.avgPrice), icon: 'bar-chart-2' as const, color: colors.info, masked: true },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name={stat.icon} size={18} color={stat.color} />
            <Text style={[styles.statValue, { color: stat.color, fontFamily: 'Inter_700Bold' }]}>
              {stat.masked ? maskValue(stat.value) : stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Operations history */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Histórico de Operações
          </Text>
          <Pressable
            testID="add-investment-tx"
            onPress={() => { setForm({ ...EMPTY_FORM, date: todayStr() }); setShowAddModal(true); }}
            style={[styles.addBtn, { backgroundColor: `${colors.primary}20` }]}
          >
            <Feather name="plus" size={14} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              Operação
            </Text>
          </Pressable>
        </View>
        {loadingHistory ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} testID="loading-investment-tx" />
        ) : history.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="activity" size={36} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Sem operações registradas. Adicione compras, vendas ou dividendos para acompanhar o preço médio.
            </Text>
          </View>
        ) : (
          history.map((tx) => {
            const kindColor = colorByKind(tx.kind);
            return (
              <Pressable
                key={tx.id}
                testID={`investment-tx-${tx.id}`}
                onLongPress={() => removeTx(tx)}
                delayLongPress={400}
                style={[styles.txRow, { borderColor: theme.border }]}
              >
                <View style={[styles.txIcon, { backgroundColor: `${kindColor}20` }]}>
                  <Feather
                    name={tx.kind === 'sell' ? 'arrow-up-right' : tx.kind === 'buy' ? 'arrow-down-left' : 'gift'}
                    size={14}
                    color={kindColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                    {KIND_LABELS[tx.kind]} • {tx.quantity}
                  </Text>
                  <Text style={[styles.txMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {formatLocalDate(tx.date)} • {maskValue(formatBRL(tx.price))}/un
                  </Text>
                </View>
                <Text style={[styles.txTotal, { color: kindColor, fontFamily: 'Inter_700Bold' }]}>
                  {maskValue(formatBRL(tx.total))}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                Nova Operação — {inv.ticker}
              </Text>

              <View style={styles.chipRow}>
                {(Object.keys(KIND_LABELS) as InvestmentTxKind[]).map((k) => (
                  <Pressable
                    key={k}
                    testID={`form-investment-kind-${k}`}
                    onPress={() => setForm((f) => ({ ...f, kind: k }))}
                    style={[styles.chip, {
                      backgroundColor: form.kind === k ? colorByKind(k) : theme.surfaceElevated,
                      borderColor: form.kind === k ? colorByKind(k) : theme.border,
                    }]}
                  >
                    <Text style={[styles.chipText, { color: form.kind === k ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      {KIND_LABELS[k]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {([
                { key: 'quantity', label: 'Quantidade *', kb: 'decimal-pad' },
                { key: 'price', label: 'Preço unitário *', kb: 'decimal-pad' },
                { key: 'date', label: 'Data (YYYY-MM-DD) *', kb: 'default' },
                { key: 'notes', label: 'Observações', kb: 'default' },
              ] as const).map(({ key, label, kb }) => (
                <View key={key} style={{ marginTop: 10 }}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                  <TextInput
                    testID={`form-investment-${key}`}
                    style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                    placeholder={label}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType={kb as any}
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}

              <View style={styles.modalBtns}>
                <Pressable
                  testID="cancel-investment-tx"
                  onPress={() => setShowAddModal(false)}
                  style={[styles.modalBtn, { backgroundColor: theme.surfaceElevated }]}
                >
                  <Text style={[styles.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  testID="save-investment-tx"
                  onPress={submit}
                  style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={[styles.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>
                      Registrar
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, padding: 20 },
  hero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  typeTag: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  typeText: { color: '#000', fontSize: 13 },
  ticker: { color: '#000', fontSize: 36, marginTop: 4 },
  name: { color: 'rgba(0,0,0,0.7)', fontSize: 16 },
  currentValue: { color: '#000', fontSize: 30, marginTop: 4 },
  returnBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  returnText: { color: '#000', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 16, marginTop: 4 },
  statLabel: { fontSize: 12 },
  section: { borderRadius: 16, padding: 16, gap: 10, borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyText: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  txIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  txTitle: { fontSize: 13 },
  txMeta: { fontSize: 11, marginTop: 1 },
  txTotal: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginTop: 4 },
  fieldLabel: { fontSize: 13, marginBottom: 2 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 15 },
});
