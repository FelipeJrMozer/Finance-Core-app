import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import type { TransactionIntent } from '@/hooks/useTransactionIntent';
import { safeGet, safeSet } from '@/utils/storage';

interface Props {
  intent: TransactionIntent | null;
  onDismiss: () => void;
}

const CATEGORIES = [
  'Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação',
  'Lazer', 'Compras', 'Serviços', 'Renda', 'Transferência', 'Outro',
];

const SOURCE_INFO: Record<string, { label: string; icon: string; color: string }> = {
  notification: { label: 'Notificação do banco', icon: 'bell', color: '#0096C7' },
  sms: { label: 'SMS do banco', icon: 'smartphone', color: '#22C55E' },
  whatsapp: { label: 'WhatsApp', icon: 'message-circle', color: '#25D366' },
  manual: { label: 'Manual', icon: 'edit-3', color: '#8B5CF6' },
};

function parseAmountFromString(amountStr: string): string {
  if (!amountStr) return '';
  // Match R$ 1.234,56 or R$1234.56
  const match = amountStr.match(/[\d.,]+/);
  if (!match) return '';
  const raw = match[0].replace(/\./g, '').replace(',', '.');
  const num = parseFloat(raw);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

function guessCategory(text: string): string {
  const t = text.toLowerCase();
  if (/supermercado|mercado|ifood|rappi|restaurante|lanche|padaria|pizza|burger|mcdonalds/i.test(t)) return 'Alimentação';
  if (/uber|99|taxi|combustível|gasolina|pedágio|estacionamento|metrô|onibus/i.test(t)) return 'Transporte';
  if (/energia|luz|água|gás|aluguel|condomínio|internet|telefone/i.test(t)) return 'Moradia';
  if (/farmácia|hospital|médico|dentista|plano de saúde|drogaria/i.test(t)) return 'Saúde';
  if (/netflix|spotify|amazon prime|disney|youtube|cinema|teatro/i.test(t)) return 'Lazer';
  if (/escola|faculdade|curso|livro/i.test(t)) return 'Educação';
  if (/shopee|magalu|americanas|amazon|loja|shopping/i.test(t)) return 'Compras';
  if (/pix recebido|salário|pagamento recebido|transferência recebida|creditado/i.test(t)) return 'Renda';
  return 'Outro';
}

function guessType(text: string): 'expense' | 'income' {
  const t = text.toLowerCase();
  if (/recebeu|recebido|creditado|crédito|pix recebido|depósito|transferência recebida/i.test(t)) return 'income';
  return 'expense';
}

export function QuickTransactionModal({ intent, onDismiss }: Props) {
  const { theme, colors } = useTheme();
  const { accounts, creditCards, addTransaction } = useFinance();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Outro');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [targetType, setTargetType] = useState<'account' | 'card'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCardId, setSelectedCardId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!intent) return;

    // Pre-fill from the detected notification
    const parsedAmount = parseAmountFromString(intent.amount);
    setAmount(parsedAmount);

    const detectedType = guessType(intent.rawText);
    setType(detectedType);
    setCategory(guessCategory(intent.rawText));

    // Build description from raw text (take key parts)
    const descText = intent.rawText.slice(0, 60).replace(/\s+/g, ' ').trim();
    setDescription(descText);

    // Default to last used account, fallback to first
    (async () => {
      const lastId = await safeGet<string>('quickAdd:lastAccountId');
      const fallback = accounts[0]?.id || '';
      const useId = lastId && accounts.some((a) => a.id === lastId) ? lastId : fallback;
      setSelectedAccountId(useId);
    })();
    if (creditCards.length > 0) setSelectedCardId(creditCards[0].id);
  }, [intent]);

  if (!intent) return null;

  const sourceInfo = SOURCE_INFO[intent.source] ?? SOURCE_INFO.notification;

  const handleSave = async () => {
    const amountNum = parseFloat(amount.replace(',', '.'));
    if (!description.trim()) {
      Alert.alert('Atenção', 'Informe a descrição');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido');
      return;
    }
    const targetId = targetType === 'account' ? selectedAccountId : selectedCardId;
    if (!targetId) {
      Alert.alert('Atenção', 'Selecione uma conta ou cartão');
      return;
    }

    setSaving(true);
    try {
      addTransaction({
        type,
        amount: amountNum,
        description: description.trim(),
        category,
        date: new Date().toISOString().split('T')[0],
        accountId: targetType === 'account' ? targetId : undefined,
        creditCardId: targetType === 'card' ? targetId : undefined,
        notes: `Capturado automaticamente via ${sourceInfo.label}: ${intent.rawText.slice(0, 100)}`,
      });
      // Remember last account used for next quick-add (and Pix/SMS imports)
      if (targetType === 'account' && targetId) {
        await safeSet('quickAdd:lastAccountId', targetId);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onDismiss();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a transação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.sourceChip, { backgroundColor: `${sourceInfo.color}20` }]}>
              <Feather name={sourceInfo.icon as any} size={13} color={sourceInfo.color} />
              <Text style={[styles.sourceLabel, { color: sourceInfo.color, fontFamily: 'Inter_600SemiBold' }]}>
                {sourceInfo.label}
              </Text>
            </View>
            <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Registrar Transação
            </Text>
          </View>
          <Pressable onPress={onDismiss} style={styles.closeBtn}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Original notification text */}
          <View style={[styles.rawBox, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}25` }]}>
            <Text style={[styles.rawLabel, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
              Mensagem detectada
            </Text>
            <Text style={[styles.rawText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={3}>
              {intent.rawText}
            </Text>
          </View>

          {/* Type toggle */}
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>TIPO</Text>
          <View style={styles.row}>
            {(['expense', 'income'] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.typeBtn, {
                  backgroundColor: type === t
                    ? (t === 'income' ? `${colors.success}18` : `${colors.error}18`)
                    : theme.surface,
                  borderColor: type === t
                    ? (t === 'income' ? colors.success : colors.error)
                    : theme.border,
                }]}
                onPress={() => setType(t)}
              >
                <Feather
                  name={t === 'income' ? 'arrow-down-left' : 'arrow-up-right'}
                  size={14}
                  color={type === t ? (t === 'income' ? colors.success : colors.error) : theme.textSecondary}
                />
                <Text style={[styles.typeBtnText, {
                  color: type === t ? (t === 'income' ? colors.success : colors.error) : theme.textSecondary,
                  fontFamily: 'Inter_600SemiBold',
                }]}>
                  {t === 'income' ? 'Receita' : 'Despesa'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Amount */}
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>VALOR (R$)</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            placeholderTextColor={theme.textTertiary}
          />

          {/* Description */}
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>DESCRIÇÃO</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição da transação"
            placeholderTextColor={theme.textTertiary}
          />

          {/* Category */}
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>CATEGORIA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.catChip, {
                    backgroundColor: category === c ? colors.primary : theme.surface,
                    borderColor: category === c ? colors.primary : theme.border,
                  }]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.catText, {
                    color: category === c ? '#fff' : theme.textSecondary,
                    fontFamily: 'Inter_500Medium',
                  }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Target: account or card */}
          <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>LANÇAR EM</Text>
          <View style={styles.row}>
            {(['account', 'card'] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.typeBtn, {
                  backgroundColor: targetType === t ? `${colors.primary}18` : theme.surface,
                  borderColor: targetType === t ? colors.primary : theme.border,
                }]}
                onPress={() => setTargetType(t)}
              >
                <Feather name="credit-card" size={14} color={targetType === t ? colors.primary : theme.textSecondary} />
                <Text style={[styles.typeBtnText, {
                  color: targetType === t ? colors.primary : theme.textSecondary,
                  fontFamily: 'Inter_600SemiBold',
                }]}>{t === 'account' ? 'Conta' : 'Cartão'}</Text>
              </Pressable>
            ))}
          </View>

          {targetType === 'account' ? (
            accounts.map((a) => (
              <Pressable
                key={a.id}
                style={[styles.accountRow, {
                  backgroundColor: selectedAccountId === a.id ? `${colors.primary}12` : theme.surface,
                  borderColor: selectedAccountId === a.id ? colors.primary : theme.border,
                }]}
                onPress={() => setSelectedAccountId(a.id)}
              >
                <Feather name="credit-card" size={16} color={selectedAccountId === a.id ? colors.primary : theme.textSecondary} />
                <Text style={[styles.accountName, {
                  color: selectedAccountId === a.id ? colors.primary : theme.text,
                  fontFamily: 'Inter_500Medium',
                }]}>{a.name}</Text>
                {selectedAccountId === a.id && <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))
          ) : (
            creditCards.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.accountRow, {
                  backgroundColor: selectedCardId === c.id ? `${colors.primary}12` : theme.surface,
                  borderColor: selectedCardId === c.id ? colors.primary : theme.border,
                }]}
                onPress={() => setSelectedCardId(c.id)}
              >
                <Feather name="credit-card" size={16} color={selectedCardId === c.id ? colors.primary : theme.textSecondary} />
                <Text style={[styles.accountName, {
                  color: selectedCardId === c.id ? colors.primary : theme.text,
                  fontFamily: 'Inter_500Medium',
                }]}>{c.name}</Text>
                {selectedCardId === c.id && <Feather name="check" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))
          )}

          {/* Save button */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={[styles.saveBtnText, { fontFamily: 'Inter_700Bold' }]}>Registrar Transação</Text>
                </>
            }
          </Pressable>

          <Pressable onPress={onDismiss} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Ignorar esta notificação
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  sourceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, marginBottom: 6,
  },
  sourceLabel: { fontSize: 11 },
  title: { fontSize: 20 },
  closeBtn: { padding: 4 },
  body: { padding: 16, paddingBottom: 40 },
  rawBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 20 },
  rawLabel: { fontSize: 11, marginBottom: 4 },
  rawText: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 11, letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 8, borderWidth: 1 },
  typeBtnText: { fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontSize: 16, marginBottom: 4 },
  catScroll: { marginBottom: 4 },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 13 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  accountName: { fontSize: 15 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 12, marginTop: 20 },
  saveBtnText: { fontSize: 16, color: '#fff' },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 14 },
});
