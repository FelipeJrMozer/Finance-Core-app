import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Account } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

export default function TransferScreen() {
  const { theme, colors } = useTheme();
  const { accounts, addTransfer } = useFinance();
  const insets = useSafeAreaInsets();

  const eligible = useMemo(() => accounts.filter((a) => !a.archived && a.type !== 'credit'), [accounts]);

  const [fromId, setFromId] = useState<string>(eligible[0]?.id || '');
  const [toId, setToId] = useState<string>(eligible[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Transferência entre contas');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [pickerSide, setPickerSide] = useState<null | 'from' | 'to'>(null);

  const fromAcc = eligible.find((a) => a.id === fromId);
  const toAcc = eligible.find((a) => a.id === toId);
  const amt = parseFloat(amount.replace(',', '.')) || 0;

  const handleSwap = () => {
    Haptics.selectionAsync();
    setFromId(toId);
    setToId(fromId);
  };

  const handlePick = (acc: Account) => {
    Haptics.selectionAsync();
    if (pickerSide === 'from') {
      if (acc.id === toId) setToId(fromId);
      setFromId(acc.id);
    } else if (pickerSide === 'to') {
      if (acc.id === fromId) setFromId(toId);
      setToId(acc.id);
    }
    setPickerSide(null);
  };

  const handleSubmit = () => {
    if (!fromAcc || !toAcc) return Alert.alert('Atenção', 'Selecione conta de origem e destino');
    if (fromId === toId) return Alert.alert('Atenção', 'As contas devem ser diferentes');
    if (!amt || amt <= 0) return Alert.alert('Atenção', 'Informe um valor válido');
    if (amt > fromAcc.balance) {
      return Alert.alert(
        'Saldo insuficiente',
        `A conta "${fromAcc.name}" tem ${formatBRL(fromAcc.balance)} disponível. Deseja prosseguir mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: doSubmit },
        ],
      );
    }
    doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      await addTransfer(fromId, toId, amt, description.trim() || 'Transferência', date);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível concluir a transferência');
    } finally {
      setSubmitting(false);
    }
  };

  if (eligible.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 60 }]}>
        <View style={styles.empty}>
          <Feather name="alert-circle" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Você precisa de pelo menos 2 contas
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Adicione outra conta bancária ou carteira para fazer uma transferência.
          </Text>
          <Pressable
            onPress={() => router.push('/account/add')}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={16} color="#000" />
            <Text style={[styles.primaryBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Adicionar Conta</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const renderAccountSelector = (label: string, acc: Account | undefined, side: 'from' | 'to') => (
    <Pressable
      onPress={() => { setPickerSide(side); Haptics.selectionAsync(); }}
      style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.selectorLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>
          {label}
        </Text>
        {acc ? (
          <View style={styles.selectorRow}>
            <View style={[styles.dot, { backgroundColor: acc.color || colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectorName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                {acc.name}
              </Text>
              <Text style={[styles.selectorBal, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                {formatBRL(acc.balance, true)} disponível
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.selectorPlaceholder, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Selecionar conta
          </Text>
        )}
      </View>
      <Feather name="chevron-down" size={18} color={theme.textTertiary} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.amountLabel, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>VALOR</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySign, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>R$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.amountInput, { color: theme.text, fontFamily: 'Inter_700Bold' }]}
              autoFocus
            />
          </View>
        </View>

        {/* From / To selectors */}
        <View style={{ gap: 10 }}>
          {renderAccountSelector('DE', fromAcc, 'from')}
          <View style={styles.swapWrap}>
            <View style={[styles.swapLine, { backgroundColor: theme.border }]} />
            <Pressable
              onPress={handleSwap}
              hitSlop={10}
              style={[styles.swapBtn, { backgroundColor: theme.surface, borderColor: colors.primary }]}
            >
              <Feather name="repeat" size={16} color={colors.primary} />
            </Pressable>
            <View style={[styles.swapLine, { backgroundColor: theme.border }]} />
          </View>
          {renderAccountSelector('PARA', toAcc, 'to')}
        </View>

        {/* Description */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Descrição
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descrição da transferência"
            placeholderTextColor={theme.textTertiary}
            style={[styles.textInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
          />
        </View>

        {/* Date */}
        <View style={{ gap: 6 }}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Data
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textTertiary}
            style={[styles.textInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: submitting ? 0.6 : pressed ? 0.85 : 1, marginTop: 6 },
          ]}
        >
          <Feather name="send" size={16} color="#000" />
          <Text style={[styles.primaryBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {submitting ? 'Transferindo…' : 'Confirmar transferência'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Account picker modal */}
      <Modal
        visible={pickerSide !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerSide(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerSide(null)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 16 }]}
            onPress={() => {}}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {pickerSide === 'from' ? 'De qual conta' : 'Para qual conta'}
            </Text>
            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {eligible.map((acc) => {
                const sel = pickerSide === 'from' ? acc.id === fromId : acc.id === toId;
                const otherSide = pickerSide === 'from' ? toId : fromId;
                const isOther = acc.id === otherSide;
                return (
                  <Pressable
                    key={acc.id}
                    onPress={() => handlePick(acc)}
                    style={[
                      styles.optionRow,
                      {
                        borderColor: sel ? acc.color || colors.primary : 'transparent',
                        backgroundColor: sel ? `${acc.color || colors.primary}15` : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: acc.color || colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <Text style={[styles.optionMeta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                        {acc.institution || 'Conta'} {isOther ? '• será trocada' : ''}
                      </Text>
                    </View>
                    <Text style={[styles.optionBal, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {formatBRL(acc.balance, true)}
                    </Text>
                    {sel && <Feather name="check-circle" size={18} color={acc.color || colors.primary} style={{ marginLeft: 6 }} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  amountCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  amountLabel: { fontSize: 11, letterSpacing: 0.8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  currencySign: { fontSize: 18 },
  amountInput: { flex: 1, fontSize: 32, padding: 0 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  selectorLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 6 },
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectorName: { fontSize: 15 },
  selectorBal: { fontSize: 12, marginTop: 2 },
  selectorPlaceholder: { fontSize: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  swapWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  swapLine: { flex: 1, height: 1 },
  swapBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  textInput: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 15 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  primaryBtnText: { fontSize: 15, color: '#000' },
  empty: { alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  sheetTitle: { fontSize: 18, marginBottom: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 6 },
  optionName: { fontSize: 14 },
  optionMeta: { fontSize: 12, marginTop: 2 },
  optionBal: { fontSize: 13 },
});
