import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Platform
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
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

  const fromAcc = eligible.find((a) => a.id === fromId);
  const toAcc = eligible.find((a) => a.id === toId);
  const amt = parseFloat(amount.replace(',', '.')) || 0;

  const handleSwap = () => {
    Haptics.selectionAsync();
    setFromId(toId);
    setToId(fromId);
  };

  const handleSubmit = async () => {
    if (!fromAcc || !toAcc) return Alert.alert('Atenção', 'Selecione conta de origem e destino');
    if (fromId === toId) return Alert.alert('Atenção', 'As contas devem ser diferentes');
    if (!amt || amt <= 0) return Alert.alert('Atenção', 'Informe um valor válido');
    if (amt > fromAcc.balance) {
      return Alert.alert(
        'Saldo insuficiente',
        `A conta "${fromAcc.name}" tem ${formatBRL(fromAcc.balance)} disponível. Deseja prosseguir mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => doSubmit() },
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

  const renderAccountPicker = (
    label: string,
    selectedId: string,
    onSelect: (id: string) => void,
    excludeId?: string,
  ) => (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <View style={{ gap: 8 }}>
        {eligible.filter((a) => a.id !== excludeId).map((acc) => {
          const sel = acc.id === selectedId;
          return (
            <Pressable
              key={acc.id}
              onPress={() => { Haptics.selectionAsync(); onSelect(acc.id); }}
              style={[
                styles.accCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: sel ? acc.color : theme.border,
                  borderWidth: sel ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.accDot, { backgroundColor: acc.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.accName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{acc.name}</Text>
                <Text style={[styles.accInst, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                  {acc.institution || 'Conta'}
                </Text>
              </View>
              <Text style={[styles.accBal, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                {formatBRL(acc.balance, true)}
              </Text>
              {sel && <Feather name="check-circle" size={18} color={acc.color} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (eligible.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 60 }]}>
        <Stack.Screen options={{ title: 'Transferir' }} />
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: 'Transferir entre contas' }} />

      {fromAcc && toAcc && (
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.flowRow}>
            <View style={styles.flowSide}>
              <Text style={[styles.flowLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>De</Text>
              <Text style={[styles.flowName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                {fromAcc.name}
              </Text>
            </View>
            <Pressable onPress={handleSwap} hitSlop={10} style={[styles.swapBtn, { backgroundColor: `${colors.primary}20` }]}>
              <Feather name="repeat" size={18} color={colors.primary} />
            </Pressable>
            <View style={[styles.flowSide, { alignItems: 'flex-end' }]}>
              <Text style={[styles.flowLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Para</Text>
              <Text style={[styles.flowName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                {toAcc.name}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.amountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Valor</Text>
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

      {renderAccountPicker('De qual conta', fromId, setFromId, toId)}
      {renderAccountPicker('Para qual conta', toId, setToId, fromId)}

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Descrição</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição da transferência"
          placeholderTextColor={theme.textTertiary}
          style={[styles.textInput, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Data</Text>
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
          { backgroundColor: colors.primary, opacity: submitting ? 0.6 : pressed ? 0.85 : 1 },
        ]}
      >
        <Feather name="send" size={16} color="#000" />
        <Text style={[styles.primaryBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
          {submitting ? 'Transferindo…' : 'Confirmar transferência'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  summaryCard: { padding: 14, borderRadius: 16, borderWidth: 1 },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flowSide: { flex: 1, gap: 2 },
  flowLabel: { fontSize: 11 },
  flowName: { fontSize: 14 },
  swapBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  amountCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  currencySign: { fontSize: 18 },
  amountInput: { flex: 1, fontSize: 32, padding: 0 },
  accCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14 },
  accDot: { width: 10, height: 10, borderRadius: 5 },
  accName: { fontSize: 14 },
  accInst: { fontSize: 12, marginTop: 2 },
  accBal: { fontSize: 13 },
  textInput: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, fontSize: 15 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 8 },
  primaryBtnText: { fontSize: 15, color: '#000' },
  empty: { alignItems: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, textAlign: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
