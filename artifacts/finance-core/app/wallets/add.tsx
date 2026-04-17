import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const COLORS = ['#0096C7', '#6C5CE7', '#00B894', '#FD9644', '#E84393', '#2ED573', '#F53B57', '#1E90FF', '#A29BFE', '#FDCB6E'];
const ICONS: { value: string; label: string }[] = [
  { value: 'briefcase', label: 'Trabalho' },
  { value: 'home', label: 'Casa' },
  { value: 'heart', label: 'Pessoal' },
  { value: 'dollar-sign', label: 'Finanças' },
  { value: 'gift', label: 'Presentes' },
  { value: 'shopping-bag', label: 'Compras' },
  { value: 'truck', label: 'Negócio' },
  { value: 'star', label: 'Especial' },
];

export default function WalletFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, colors } = useTheme();
  const { wallets, createWallet, updateWallet } = useWallet();
  const insets = useSafeAreaInsets();

  const existing = id ? wallets.find((w) => w.id === id) : null;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [icon, setIcon] = useState(existing?.icon || ICONS[0].value);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe um nome para a carteira');
      return;
    }
    if (!isEdit && wallets.length >= 5) {
      Alert.alert('Limite atingido', 'Você já possui 5 carteiras. Exclua uma antes de criar outra.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        icon,
      };
      if (isEdit && id) {
        await updateWallet(id, payload);
      } else {
        await createWallet(payload);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Alert.alert('Erro', String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
          {isEdit ? 'Editar carteira' : 'Nova carteira'}
        </Text>

        <Input
          label="Nome"
          value={name}
          onChangeText={setName}
          placeholder="Ex: Carteira Pessoal"
          icon="tag"
          maxLength={40}
        />

        <Input
          label="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Para que serve esta carteira?"
          icon="align-left"
          maxLength={120}
        />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cor</Text>
          <View style={styles.row}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { setColor(c); Haptics.selectionAsync(); }}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff' },
                ]}
              >
                {color === c && <Feather name="check" size={14} color="#fff" />}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Ícone</Text>
          <View style={styles.row}>
            {ICONS.map((it) => (
              <Pressable
                key={it.value}
                onPress={() => { setIcon(it.value); Haptics.selectionAsync(); }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: icon === it.value ? `${colors.primary}20` : theme.surfaceElevated,
                    borderColor: icon === it.value ? colors.primary : theme.border,
                  },
                ]}
              >
                <Feather name={it.value as keyof typeof Feather.glyphMap} size={13} color={icon === it.value ? colors.primary : theme.textTertiary} />
                <Text style={[styles.chipText, { color: icon === it.value ? colors.primary : theme.textSecondary, fontFamily: icon === it.value ? 'Inter_500Medium' : 'Inter_400Regular' }]}>
                  {it.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          label={isEdit ? 'Salvar alterações' : 'Criar carteira'}
          onPress={handleSave}
          loading={loading}
          fullWidth
          size="lg"
        />
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
});
