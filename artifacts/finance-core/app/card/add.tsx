import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const COLORS = [
  '#8B5CF6', '#3B82F6', '#0096C7', '#00C853',
  '#FF6B6B', '#FF9800', '#E91E63', '#009688', '#795548', '#607D8B',
];

export default function AddCardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, colors: themeColors } = useTheme();
  const { addCreditCard, updateCreditCard, creditCards } = useFinance();
  const insets = useSafeAreaInsets();

  const existing = id ? creditCards.find((c) => c.id === id) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [institution, setInstitution] = useState(existing?.institution || '');
  const [limit, setLimit] = useState(existing ? String(existing.limit) : '');
  const [dueDay, setDueDay] = useState(existing ? existing.dueDate.split('-')[2] : '10');
  const [closingDay, setClosingDay] = useState(existing ? existing.closingDate.split('-')[2] : '03');
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [loading, setLoading] = useState(false);

  const buildDate = (day: string) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(Math.min(Math.max(parseInt(day) || 1, 1), 28)).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSave = () => {
    if (!name.trim() || !institution.trim()) {
      Alert.alert('Atenção', 'Preencha nome e instituição');
      return;
    }
    const limitNum = parseFloat(limit.replace(',', '.'));
    if (!limit || isNaN(limitNum) || limitNum <= 0) {
      Alert.alert('Atenção', 'Informe um limite válido');
      return;
    }
    setLoading(true);
    const data = {
      name: name.trim(),
      institution: institution.trim(),
      limit: limitNum,
      used: existing?.used || 0,
      dueDate: buildDate(dueDay),
      closingDate: buildDate(closingDay),
      color,
    };
    if (isEdit && id) {
      updateCreditCard(id, data);
    } else {
      addCreditCard(data);
    }
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
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          {isEdit ? 'Editar Cartão' : 'Novo Cartão'}
        </Text>

        <Input
          label="Nome do cartão"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Nubank Ultravioleta"
          icon="credit-card"
        />

        <Input
          label="Instituição"
          value={institution}
          onChangeText={setInstitution}
          placeholder="Ex: Nubank"
          icon="home"
        />

        <Input
          label="Limite (R$)"
          value={limit}
          onChangeText={setLimit}
          placeholder="0,00"
          keyboardType="decimal-pad"
          icon="dollar-sign"
        />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Input
              label="Dia do vencimento"
              value={dueDay}
              onChangeText={setDueDay}
              placeholder="10"
              keyboardType="number-pad"
              icon="calendar"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Dia do fechamento"
              value={closingDay}
              onChangeText={setClosingDay}
              placeholder="03"
              keyboardType="number-pad"
              icon="lock"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Cor do cartão
          </Text>
          <View style={styles.colorRow}>
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

        <View style={[styles.preview, { backgroundColor: color, shadowColor: color }]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewInst, { fontFamily: 'Inter_400Regular' }]}>{institution || 'Instituição'}</Text>
              <Text style={[styles.previewName, { fontFamily: 'Inter_700Bold' }]}>{name || 'Nome do Cartão'}</Text>
            </View>
            <Feather name="credit-card" size={32} color="rgba(255,255,255,0.6)" />
          </View>
          <Text style={[styles.previewLimit, { fontFamily: 'Inter_400Regular' }]}>
            Limite • Vence dia {dueDay || '–'} • Fecha dia {closingDay || '–'}
          </Text>
        </View>

        <Button label={isEdit ? 'Salvar Alterações' : 'Adicionar Cartão'} onPress={handleSave} loading={loading} fullWidth size="lg" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, marginBottom: 4 },
  row2: { flexDirection: 'row', gap: 12 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  preview: {
    borderRadius: 20, padding: 20, gap: 16, marginTop: 4,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  previewTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  previewInst: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  previewName: { color: '#fff', fontSize: 18, marginTop: 2 },
  previewLimit: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
});
