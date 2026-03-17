import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatBRL } from '@/utils/formatters';

const COLORS = ['#8B5CF6', '#3B82F6', '#0096C7', '#00C853', '#FF6B6B', '#FF9800', '#009688', '#E91E63', '#795548', '#607D8B'];
const TYPES = ['checking', 'savings', 'investment', 'credit'] as const;
const TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança', investment: 'Investimentos', credit: 'Crédito'
};
const TYPE_ICONS: Record<string, string> = {
  checking: 'briefcase', savings: 'heart', investment: 'trending-up', credit: 'credit-card'
};

export default function AddAccountScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, colors: themeColors } = useTheme();
  const { addAccount, updateAccount, deleteAccount, accounts } = useFinance();
  const insets = useSafeAreaInsets();

  const existing = id ? accounts.find((a) => a.id === id) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [institution, setInstitution] = useState(existing?.institution || '');
  const [balance, setBalance] = useState(existing ? String(existing.balance) : '');
  const [type, setType] = useState<typeof TYPES[number]>(existing?.type || 'checking');
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !institution.trim()) {
      Alert.alert('Atenção', 'Preencha nome e instituição');
      return;
    }
    setLoading(true);
    const data = {
      name: name.trim(),
      institution: institution.trim(),
      balance: parseFloat(balance.replace(',', '.')) || 0,
      type,
      color,
      archived: false,
    };
    if (isEdit && id) {
      updateAccount(id, data);
    } else {
      addAccount(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Excluir conta',
      `Tem certeza que deseja excluir "${name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteAccount(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          {isEdit ? 'Editar Conta' : 'Nova Conta'}
        </Text>

        <Input label="Nome da conta" value={name} onChangeText={setName} placeholder="Ex: Conta Corrente" icon="briefcase" testID="name-input" />
        <Input label="Instituição" value={institution} onChangeText={setInstitution} placeholder="Ex: Nubank" icon="home" />
        <Input
          label={isEdit ? "Saldo atual (R$)" : "Saldo inicial (R$)"}
          value={balance}
          onChangeText={setBalance}
          placeholder="0,00"
          keyboardType="decimal-pad"
          icon="dollar-sign"
        />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Tipo de conta</Text>
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
                <Feather name={TYPE_ICONS[t] as any} size={13} color={type === t ? themeColors.primary : theme.textTertiary} />
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

        <Button testID="save-account" label={isEdit ? 'Salvar Alterações' : 'Salvar Conta'} onPress={handleSave} loading={loading} fullWidth size="lg" />

        {isEdit && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteBtn, { backgroundColor: `${themeColors.danger}15`, borderColor: `${themeColors.danger}40` }]}
          >
            <Feather name="trash-2" size={16} color={themeColors.danger} />
            <Text style={[styles.deleteBtnText, { color: themeColors.danger, fontFamily: 'Inter_500Medium' }]}>
              Excluir conta
            </Text>
          </Pressable>
        )}
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
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 13 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
});
