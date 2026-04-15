import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';

interface Retirada {
  id: string;
  month: string;
  amount: number;
  inss: number;
  notes?: string;
  date: string;
}

const STORAGE_KEY = 'pf_pj_retiradas';
const SALARIO_MINIMO = 1412;
const INSS_RATE = 0.11;

export default function PJRetiradasScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [retiradas, setRetiradas] = useState<Retirada[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const inssBase = SALARIO_MINIMO;
  const inssAmount = inssBase * INSS_RATE;

  const load = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setRetiradas(JSON.parse(data));
    } catch {}
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!amount || parseFloat(amount) <= 0) { Alert.alert('Atenção', 'Informe o valor da retirada'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const today = new Date().toISOString().slice(0, 10);
    const newRetirada: Retirada = {
      id: Date.now().toString(),
      month: today.slice(0, 7),
      amount: parseFloat(amount),
      inss: inssAmount,
      notes: notes.trim() || undefined,
      date: today,
    };
    const updated = [newRetirada, ...retiradas];
    setRetiradas(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setAmount(''); setNotes(''); setShowForm(false);
  };

  const totalYear = retiradas
    .filter((r) => r.date.startsWith(String(new Date().getFullYear())))
    .reduce((s, r) => s + r.amount, 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>INSS sobre pró-labore</Text>
          <Text style={[styles.infoValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatBRL(inssAmount)}/mês</Text>
        </View>
        <Text style={[styles.infoSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          11% sobre 1 salário mínimo (R$ {SALARIO_MINIMO.toLocaleString('pt-BR')})
        </Text>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total retirado no ano</Text>
          <Text style={[styles.infoValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalYear)}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => { Haptics.selectionAsync(); setShowForm(!showForm); }}
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
      >
        <Feather name={showForm ? 'x' : 'plus'} size={18} color="#fff" />
        <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
          {showForm ? 'Cancelar' : 'Registrar Retirada'}
        </Text>
      </Pressable>

      {showForm && (
        <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ gap: 4 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Valor da retirada</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              style={[styles.fieldInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_500Medium' }]}
            />
          </View>
          <View style={{ gap: 4 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Observações</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Opcional..."
              placeholderTextColor={theme.textTertiary}
              style={[styles.fieldInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_400Regular' }]}
            />
          </View>
          <View style={[styles.inssRow, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
            <Feather name="alert-circle" size={14} color={colors.warning} />
            <Text style={[styles.inssText, { color: colors.warning, fontFamily: 'Inter_400Regular' }]}>
              INSS: {formatBRL(inssAmount)} será recolhido no DAS
            </Text>
          </View>
          <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Salvar</Text>
          </Pressable>
        </View>
      )}

      {retiradas.length === 0 ? (
        <EmptyState icon="dollar-sign" title="Nenhuma retirada" description="Registre suas retiradas mensais (pró-labore)" />
      ) : (
        retiradas.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View>
              <Text style={[styles.cardDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </Text>
              {r.notes && <Text style={[styles.cardNotes, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{r.notes}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cardAmount, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatBRL(r.amount)}</Text>
              <Text style={[styles.cardInss, { color: colors.warning, fontFamily: 'Inter_400Regular' }]}>INSS: {formatBRL(r.inss)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  infoCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 16 },
  infoSub: { fontSize: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  addBtnText: { fontSize: 16, color: '#fff' },
  form: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  fieldLabel: { fontSize: 13 },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  inssRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, padding: 10 },
  inssText: { fontSize: 13, flex: 1 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, padding: 14, borderWidth: 1 },
  cardDate: { fontSize: 13 },
  cardNotes: { fontSize: 12, marginTop: 2 },
  cardAmount: { fontSize: 17 },
  cardInss: { fontSize: 12, marginTop: 2 },
});
