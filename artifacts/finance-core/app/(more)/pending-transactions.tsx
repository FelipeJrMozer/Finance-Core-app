import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  ActivityIndicator, RefreshControl, Platform, TextInput, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';

interface PendingTransaction {
  id: string;
  source: 'whatsapp' | 'sms' | 'manual';
  rawText: string;
  fromNumber?: string;
  parsedAt: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  merchant?: string;
  category: string;
  bank?: string;
  status: 'pending' | 'approved' | 'rejected';
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

const SOURCE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  whatsapp: 'message-circle',
  sms: 'smartphone',
  manual: 'edit-3',
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  manual: 'Manual',
};

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  sms: '#007AFF',
  manual: '#8B5CF6',
};

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Compras', 'Serviços', 'Renda', 'Transferência', 'Outro',
];

export default function PendingTransactionsScreen() {
  const { theme, colors } = useTheme();
  const { accounts, creditCards, addTransaction } = useFinance();
  const insets = useSafeAreaInsets();

  const [pending, setPending] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approveModal, setApproveModal] = useState<PendingTransaction | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [targetType, setTargetType] = useState<'account' | 'card'>('account');
  const [approving, setApproving] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!API_URL) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/api/pending-transactions`);
      if (res.ok) {
        const data = await res.json();
        setPending(data.transactions ?? []);
      }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const onRefresh = () => { setRefreshing(true); fetchPending(); };

  const openApprove = (tx: PendingTransaction) => {
    setApproveModal(tx);
    setEditAmount(tx.amount.toFixed(2));
    setEditDesc(tx.description);
    setEditCategory(tx.category);
    setEditType(tx.type);
    setTargetType('account');
    setSelectedAccountId(accounts[0]?.id ?? '');
    setSelectedCardId(creditCards[0]?.id ?? '');
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    setApproving(true);
    try {
      const amount = parseFloat(editAmount.replace(',', '.'));
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Erro', 'Valor inválido');
        return;
      }

      const targetId = targetType === 'account' ? selectedAccountId : selectedCardId;
      if (!targetId) {
        Alert.alert('Erro', 'Selecione uma conta ou cartão');
        return;
      }

      addTransaction({
        type: editType,
        amount,
        description: editDesc,
        category: editCategory,
        date: new Date().toISOString().split('T')[0],
        accountId: targetType === 'account' ? targetId : undefined,
        creditCardId: targetType === 'card' ? targetId : undefined,
      });

      await fetch(`${API_URL}/api/pending-transactions/${approveModal.id}/approve`, { method: 'PUT' });

      setPending((prev) => prev.filter((t) => t.id !== approveModal.id));
      setApproveModal(null);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível aprovar o lançamento');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (tx: PendingTransaction) => {
    Alert.alert('Rejeitar', `Remover lançamento de R$ ${tx.amount.toFixed(2).replace('.', ',')}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rejeitar', style: 'destructive', onPress: async () => {
          await fetch(`${API_URL}/api/pending-transactions/${tx.id}`, { method: 'DELETE' });
          setPending((prev) => prev.filter((t) => t.id !== tx.id));
        }
      }
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {!API_URL && (
          <View style={[styles.infoBanner, { backgroundColor: `${colors.warning}20`, borderColor: `${colors.warning}40` }]}>
            <Feather name="wifi-off" size={16} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.warning, fontFamily: 'Inter_400Regular' }]}>
              Modo demo: configure EXPO_PUBLIC_API_URL para usar este recurso
            </Text>
          </View>
        )}

        {pending.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Feather name="check-circle" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Tudo em dia!
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Nenhuma transação aguardando aprovação.{'\n'}
              Mensagens recebidas pelo WhatsApp ou SMS aparecerão aqui.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.count, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {pending.length} lançamento{pending.length !== 1 ? 's' : ''} aguardando aprovação
            </Text>
            {pending.map((tx) => (
              <View key={tx.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.sourceBadge, { backgroundColor: `${SOURCE_COLORS[tx.source]}20` }]}>
                    <Feather name={SOURCE_ICONS[tx.source]} size={12} color={SOURCE_COLORS[tx.source]} />
                    <Text style={[styles.sourceLabel, { color: SOURCE_COLORS[tx.source], fontFamily: 'Inter_600SemiBold' }]}>
                      {SOURCE_LABELS[tx.source]}
                    </Text>
                  </View>
                  {tx.bank && (
                    <Text style={[styles.bankLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                      {tx.bank}
                    </Text>
                  )}
                  <Text style={[styles.dateLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    {formatDate(tx.parsedAt)}
                  </Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={[styles.amount, {
                    color: tx.type === 'income' ? colors.success : colors.error,
                    fontFamily: 'Inter_700Bold',
                  }]}>
                    {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2).replace('.', ',')}
                  </Text>
                  <View style={[styles.categoryBadge, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.categoryText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                      {tx.category}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.desc, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{tx.description}</Text>
                {tx.merchant && (
                  <Text style={[styles.merchant, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {tx.merchant}
                  </Text>
                )}

                <View style={[styles.rawBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.rawText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                    {tx.rawText}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.rejectBtn, { borderColor: colors.error }]}
                    onPress={() => handleReject(tx)}
                  >
                    <Feather name="x" size={16} color={colors.error} />
                    <Text style={[styles.rejectText, { color: colors.error, fontFamily: 'Inter_500Medium' }]}>Rejeitar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                    onPress={() => openApprove(tx)}
                  >
                    <Feather name="check" size={16} color="#fff" />
                    <Text style={[styles.approveText, { fontFamily: 'Inter_600SemiBold' }]}>Lançar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Approve Modal */}
      <Modal visible={!!approveModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setApproveModal(null)}>
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Confirmar Lançamento</Text>
            <Pressable onPress={() => setApproveModal(null)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>TIPO</Text>
            <View style={styles.typeRow}>
              {(['expense', 'income'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, {
                    backgroundColor: editType === t ? (t === 'income' ? `${colors.success}20` : `${colors.error}20`) : theme.surface,
                    borderColor: editType === t ? (t === 'income' ? colors.success : colors.error) : theme.border,
                  }]}
                  onPress={() => setEditType(t)}
                >
                  <Text style={[styles.typeBtnText, {
                    color: editType === t ? (t === 'income' ? colors.success : colors.error) : theme.textSecondary,
                    fontFamily: 'Inter_600SemiBold',
                  }]}>
                    {t === 'income' ? 'Receita' : 'Despesa'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>VALOR (R$)</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
            />

            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>DESCRIÇÃO</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Descrição"
              placeholderTextColor={theme.textTertiary}
            />

            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>CATEGORIA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c}
                    style={[styles.catChip, {
                      backgroundColor: editCategory === c ? colors.primary : theme.surface,
                      borderColor: editCategory === c ? colors.primary : theme.border,
                    }]}
                    onPress={() => setEditCategory(c)}
                  >
                    <Text style={[styles.catChipText, {
                      color: editCategory === c ? '#fff' : theme.textSecondary,
                      fontFamily: 'Inter_500Medium',
                    }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>LANÇAR EM</Text>
            <View style={styles.typeRow}>
              {(['account', 'card'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeBtn, {
                    backgroundColor: targetType === t ? `${colors.primary}20` : theme.surface,
                    borderColor: targetType === t ? colors.primary : theme.border,
                  }]}
                  onPress={() => setTargetType(t)}
                >
                  <Text style={[styles.typeBtnText, {
                    color: targetType === t ? colors.primary : theme.textSecondary,
                    fontFamily: 'Inter_600SemiBold',
                  }]}>
                    {t === 'account' ? 'Conta' : 'Cartão'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {targetType === 'account' ? (
              <>
                {accounts.map((a) => (
                  <Pressable
                    key={a.id}
                    style={[styles.accountItem, {
                      backgroundColor: selectedAccountId === a.id ? `${colors.primary}15` : theme.surface,
                      borderColor: selectedAccountId === a.id ? colors.primary : theme.border,
                    }]}
                    onPress={() => setSelectedAccountId(a.id)}
                  >
                    <Feather name="credit-card" size={16} color={selectedAccountId === a.id ? colors.primary : theme.textSecondary} />
                    <Text style={[styles.accountName, {
                      color: selectedAccountId === a.id ? colors.primary : theme.text,
                      fontFamily: 'Inter_500Medium',
                    }]}>{a.name}</Text>
                  </Pressable>
                ))}
                {accounts.length === 0 && (
                  <Text style={[styles.emptyDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    Nenhuma conta cadastrada
                  </Text>
                )}
              </>
            ) : (
              <>
                {creditCards.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[styles.accountItem, {
                      backgroundColor: selectedCardId === c.id ? `${colors.primary}15` : theme.surface,
                      borderColor: selectedCardId === c.id ? colors.primary : theme.border,
                    }]}
                    onPress={() => setSelectedCardId(c.id)}
                  >
                    <Feather name="credit-card" size={16} color={selectedCardId === c.id ? colors.primary : theme.textSecondary} />
                    <Text style={[styles.accountName, {
                      color: selectedCardId === c.id ? colors.primary : theme.text,
                      fontFamily: 'Inter_500Medium',
                    }]}>{c.name}</Text>
                  </Pressable>
                ))}
                {creditCards.length === 0 && (
                  <Text style={[styles.emptyDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    Nenhum cartão cadastrado
                  </Text>
                )}
              </>
            )}

            <Pressable
              style={[styles.confirmBtn, { backgroundColor: colors.primary, opacity: approving ? 0.6 : 1 }]}
              onPress={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={[styles.confirmText, { fontFamily: 'Inter_700Bold' }]}>Confirmar Lançamento</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  count: { fontSize: 13, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sourceLabel: { fontSize: 11 },
  bankLabel: { fontSize: 12 },
  dateLabel: { fontSize: 11, marginLeft: 'auto' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  amount: { fontSize: 22 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  categoryText: { fontSize: 12 },
  desc: { fontSize: 15, marginBottom: 2 },
  merchant: { fontSize: 13, marginBottom: 8 },
  rawBox: { padding: 8, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  rawText: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  rejectText: { fontSize: 14 },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  approveText: { fontSize: 14, color: '#fff' },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  modalBody: { flex: 1, padding: 16 },
  label: { fontSize: 11, letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 4 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  typeBtnText: { fontSize: 14 },
  categoryRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 13 },
  accountItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  accountName: { fontSize: 15 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 24 },
  confirmText: { fontSize: 16, color: '#fff' },
});
