import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const COLORS = ['#8B5CF6', '#3B82F6', '#00C853', '#FF6B6B', '#FF9800', '#009688', '#E91E63', '#795548'];
const TYPES = ['checking', 'savings', 'investment', 'credit'] as const;
const TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança', investment: 'Investimentos', credit: 'Crédito'
};

export default function AddAccountScreen() {
  const { theme, colors: themeColors } = useTheme();
  const { addAccount } = useFinance();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [type, setType] = useState<typeof TYPES[number]>('checking');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !institution.trim()) {
      return;
    }
    setLoading(true);
    addAccount({
      name: name.trim(),
      institution: institution.trim(),
      balance: parseFloat(balance.replace(',', '.')) || 0,
      type,
      color,
      archived: false,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Nova Conta</Text>

        <Input label="Nome da conta" value={name} onChangeText={setName} placeholder="Ex: Conta Corrente" icon="credit-card" testID="name-input" />
        <Input label="Instituição" value={institution} onChangeText={setInstitution} placeholder="Ex: Nubank" icon="home" />
        <Input label="Saldo inicial (R$)" value={balance} onChangeText={setBalance} placeholder="0,00" keyboardType="decimal-pad" icon="dollar-sign" />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Tipo</Text>
          <View style={styles.row}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => { setType(t); Haptics.selectionAsync(); }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: type === t ? `${themeColors.primary}20` : theme.surfaceElevated,
                    borderColor: type === t ? themeColors.primary : theme.border,
                  }
                ]}
              >
                <Text style={[styles.chipText, { color: type === t ? themeColors.primary : theme.textSecondary, fontFamily: type === t ? 'Inter_500Medium' : 'Inter_400Regular' }]}>
                  {TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cor</Text>
          <View style={styles.row}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { setColor(c); Haptics.selectionAsync(); }}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff' }
                ]}
              >
                {color === c && <Feather name="check" size={14} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </View>

        <Button testID="save-account" label="Salvar Conta" onPress={handleSave} loading={loading} fullWidth size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
