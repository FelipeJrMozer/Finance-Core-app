import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import {
  TransactionSplit, getSplits, saveSplits, distributeEqually, sumSplits, isSplitValid,
} from '@/services/transactionSplits';

interface Props {
  visible: boolean;
  onClose: () => void;
  transactionId: string;
  total: number;
}

interface RowState {
  category: string;
  amount: string; // mantemos string para input livre, parse no submit
}

const EMPTY_ROW: RowState = { category: '', amount: '' };

function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function TransactionSplitsModal({ visible, onClose, transactionId, total }: Props) {
  const { theme, colors } = useTheme();
  const qc = useQueryClient();
  const [rows, setRows] = useState<RowState[]>([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // Carrega splits existentes ao abrir
  useEffect(() => {
    if (!visible) return;
    let active = true;
    setError('');
    setLoading(true);
    (async () => {
      try {
        const existing = await getSplits(transactionId);
        if (!active) return;
        if (existing && existing.length > 0) {
          setRows(existing.map((s) => ({
            category: s.category || s.categoryId || '',
            amount: String(s.amount ?? ''),
          })));
        } else {
          setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
        }
      } catch {
        // sem splits ainda — começa em branco
        if (active) setRows([{ ...EMPTY_ROW }, { ...EMPTY_ROW }]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [visible, transactionId]);

  const numericValues = useMemo(() => rows.map((r) => toNumber(r.amount)), [rows]);
  const sum = useMemo(() => sumSplits(numericValues), [numericValues]);
  const valid = useMemo(() => isSplitValid(total, numericValues), [total, numericValues]);
  const diff = total - sum;

  const updateRow = (i: number, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (i: number) => {
    setRows((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));
  };

  const distribute = () => {
    Haptics.selectionAsync();
    const n = rows.length;
    const values = distributeEqually(total, n);
    setRows((prev) => prev.map((r, i) => ({ ...r, amount: values[i].toFixed(2) })));
  };

  const submit = async () => {
    setError('');
    if (!valid) {
      setError(`A soma das divisões precisa ser igual a ${formatBRL(total)}.`);
      return;
    }
    const cleaned = rows
      .map((r, i) => ({ category: r.category.trim(), amount: numericValues[i] }))
      .filter((r) => r.amount > 0);
    if (cleaned.length < 2) {
      setError('Adicione pelo menos duas divisões com valor maior que zero.');
      return;
    }
    if (cleaned.some((r) => !r.category)) {
      setError('Informe a categoria em cada divisão.');
      return;
    }
    setSaving(true);
    try {
      const payload: TransactionSplit[] = cleaned.map((r) => ({
        category: r.category,
        amount: r.amount,
        percent: total > 0 ? +(100 * r.amount / total).toFixed(2) : 0,
      }));
      await saveSplits(transactionId, payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['/api/transaction-splits', transactionId] });
      qc.invalidateQueries({ queryKey: ['/api/transactions'] });
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível salvar as divisões.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Dividir transação
            </Text>
            <Pressable onPress={onClose} hitSlop={10} testID="splits-close">
              <Feather name="x" size={22} color={theme.text} />
            </Pressable>
          </View>

          <View style={[styles.totalBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.totalLbl, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Valor total
            </Text>
            <Text style={[styles.totalVal, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {formatBRL(total)}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {rows.map((r, i) => (
                <View key={i} style={[styles.rowCard, { backgroundColor: theme.surface, borderColor: theme.border }]} testID={`split-row-${i}`}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      Categoria
                    </Text>
                    <TextInput
                      value={r.category}
                      onChangeText={(v) => updateRow(i, { category: v })}
                      placeholder="ex.: food"
                      placeholderTextColor={theme.textTertiary}
                      autoCapitalize="none"
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                      testID={`split-cat-${i}`}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                      Valor
                    </Text>
                    <TextInput
                      value={r.amount}
                      onChangeText={(v) => updateRow(i, { amount: v.replace(/[^0-9.,]/g, '') })}
                      placeholder="0,00"
                      placeholderTextColor={theme.textTertiary}
                      keyboardType="decimal-pad"
                      style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_500Medium', textAlign: 'right' }]}
                      testID={`split-amt-${i}`}
                    />
                  </View>
                  <Pressable
                    onPress={() => removeRow(i)}
                    disabled={rows.length <= 2}
                    style={[styles.delBtn, { opacity: rows.length <= 2 ? 0.3 : 1 }]}
                    testID={`split-del-${i}`}
                    hitSlop={6}
                  >
                    <Feather name="trash-2" size={16} color={colors.danger} />
                  </Pressable>
                </View>
              ))}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={addRow}
                  style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  testID="splits-add"
                >
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                    Adicionar linha
                  </Text>
                </Pressable>
                <Pressable
                  onPress={distribute}
                  style={[styles.secondaryBtn, { borderColor: theme.border }]}
                  testID="splits-distribute"
                >
                  <Feather name="divide" size={14} color={colors.primary} />
                  <Text style={[styles.secondaryBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                    Distribuir igualmente
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.statusBar, {
                backgroundColor: valid ? `${colors.primary}15` : `${colors.warning}15`,
                borderColor: valid ? `${colors.primary}40` : `${colors.warning}40`,
              }]}>
                <Feather name={valid ? 'check-circle' : 'alert-circle'} size={14} color={valid ? colors.primary : colors.warning} />
                <Text style={[styles.statusText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                  {valid
                    ? `Soma exata: ${formatBRL(sum)}`
                    : `Diferença: ${diff >= 0 ? 'falta ' : 'excede '}${formatBRL(Math.abs(diff))}`}
                </Text>
              </View>

              {error ? (
                <Text style={{ color: colors.danger, fontFamily: 'Inter_500Medium', marginTop: 8, fontSize: 13 }}>
                  {error}
                </Text>
              ) : null}
            </ScrollView>
          )}

          <Pressable
            onPress={submit}
            disabled={saving || loading || !valid}
            style={[styles.saveBtn, {
              backgroundColor: colors.primary,
              opacity: saving || loading || !valid ? 0.55 : 1,
            }]}
            testID="splits-save"
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Salvar divisões</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 28, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 18 },
  totalBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  totalLbl: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalVal: { fontSize: 18 },
  rowCard: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  input: { borderRadius: 8, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14 },
  delBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 13 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 8,
  },
  statusText: { fontSize: 13, flex: 1 },
  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 15 },
});
