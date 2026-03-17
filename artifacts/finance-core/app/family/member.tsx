import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, TextInput, Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, FamilyRole } from '@/context/FinanceContext';

const ROLES: { id: FamilyRole; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'titular', label: 'Titular', icon: 'user' },
  { id: 'conjuge', label: 'Cônjuge', icon: 'heart' },
  { id: 'filho', label: 'Filho(a)', icon: 'smile' },
  { id: 'dependente', label: 'Dependente', icon: 'users' },
  { id: 'outro', label: 'Outro', icon: 'user-check' },
];

const COLOR_PALETTE = [
  '#0096C7', '#E91E8C', '#FF9800', '#00C853', '#9C27B0',
  '#2196F3', '#FF5722', '#009688', '#795548', '#607D8B',
];

export default function FamilyMemberScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, colors } = useTheme();
  const { familyMembers, addFamilyMember, updateFamilyMember, deleteFamilyMember } = useFinance();
  const insets = useSafeAreaInsets();

  const existing = id ? familyMembers.find((m) => m.id === id) : undefined;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name || '');
  const [role, setRole] = useState<FamilyRole>(existing?.role || 'filho');
  const [color, setColor] = useState(existing?.color || COLOR_PALETTE[0]);
  const [budget, setBudget] = useState(existing?.monthlyBudget ? String(existing.monthlyBudget) : '');
  const [email, setEmail] = useState(existing?.email || '');

  const initials = name.split(' ').slice(0, 2).map((n) => n[0] || '').join('').toUpperCase() || '?';

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do membro');
      return;
    }
    const budgetNum = budget ? parseFloat(budget.replace(',', '.')) : undefined;
    const data = {
      name: name.trim(),
      role,
      color,
      monthlyBudget: budgetNum && !isNaN(budgetNum) ? budgetNum : undefined,
      email: email.trim() || undefined,
    };
    if (isEdit) {
      updateFamilyMember(id!, data);
    } else {
      addFamilyMember(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Remover membro', `Remover "${name}" do grupo familiar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: () => {
          deleteFamilyMember(id!);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={[styles.avatarText, { fontFamily: 'Inter_700Bold' }]}>{initials}</Text>
          </View>
          <Text style={[styles.avatarHint, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {name.trim() || 'Nome do membro'}
          </Text>
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Nome *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome completo"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
          autoCapitalize="words"
        />

        {/* Role */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Parentesco</Text>
        <View style={styles.roleGrid}>
          {ROLES.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => { setRole(r.id); Haptics.selectionAsync(); }}
              style={[
                styles.roleChip,
                {
                  backgroundColor: role === r.id ? `${colors.primary}20` : theme.surface,
                  borderColor: role === r.id ? colors.primary : theme.border,
                }
              ]}
            >
              <Feather name={r.icon} size={16} color={role === r.id ? colors.primary : theme.textTertiary} />
              <Text style={[styles.roleChipText, { color: role === r.id ? colors.primary : theme.textSecondary, fontFamily: role === r.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Color */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cor de identificação</Text>
        <View style={styles.colorRow}>
          {COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => { setColor(c); Haptics.selectionAsync(); }}
              style={[styles.colorDot, { backgroundColor: c, borderWidth: color === c ? 3 : 0, borderColor: '#fff', shadowColor: c, shadowOpacity: color === c ? 0.5 : 0, shadowRadius: 6, elevation: color === c ? 4 : 0 }]}
            >
              {color === c && <Feather name="check" size={14} color="#fff" />}
            </Pressable>
          ))}
        </View>

        {/* Monthly budget */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Orçamento mensal (opcional)</Text>
        <View style={[styles.amountRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.currency, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>R$</Text>
          <TextInput
            value={budget}
            onChangeText={setBudget}
            placeholder="0,00"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { color: theme.text, fontFamily: 'Inter_400Regular' }]}
          />
        </View>

        {/* Email */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>E-mail (opcional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="email@exemplo.com"
          placeholderTextColor={theme.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
        />

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name={isEdit ? 'save' : 'user-plus'} size={18} color="#fff" />
          <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {isEdit ? 'Salvar alterações' : 'Adicionar membro'}
          </Text>
        </Pressable>

        {/* Delete */}
        {isEdit && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: `${colors.danger}40` }]}
          >
            <Feather name="trash-2" size={16} color={colors.danger} />
            <Text style={[styles.deleteBtnText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
              Remover membro
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  avatarSection: { alignItems: 'center', gap: 8, marginBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 28 },
  avatarHint: { fontSize: 15 },
  label: { fontSize: 13, marginTop: 4 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  roleChipText: { fontSize: 14 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  currency: { fontSize: 18, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 18, paddingVertical: 14 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
});
