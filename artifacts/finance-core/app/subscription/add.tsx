import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, TextInput, Alert, Switch
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, BillingCycle, FamilyMember } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

const BILLING_OPTIONS: { id: BillingCycle; label: string; note: string }[] = [
  { id: 'monthly', label: 'Mensal', note: '12x/ano' },
  { id: 'quarterly', label: 'Trimestral', note: '4x/ano' },
  { id: 'annual', label: 'Anual', note: '1x/ano' },
];

const BILLING_MONTHLY: Record<BillingCycle, number> = {
  monthly: 1, quarterly: 1 / 3, annual: 1 / 12,
};

const ICON_OPTIONS = [
  'play-circle', 'music', 'cloud', 'shopping-bag', 'star', 'smartphone',
  'youtube', 'grid', 'tv', 'book', 'camera', 'headphones',
  'wifi', 'zap', 'globe', 'heart', 'shield', 'mail',
] as const;

const COLOR_PALETTE = [
  '#E50914', '#1DB954', '#007AFF', '#FF9900', '#113CCF', '#555',
  '#FF0000', '#0078D4', '#0096C7', '#9C27B0', '#FF5722', '#009688',
];

const CATEGORY_OPTIONS = [
  { id: 'entertainment', label: 'Entretenimento' },
  { id: 'technology', label: 'Tecnologia' },
  { id: 'education', label: 'Educação' },
  { id: 'health', label: 'Saúde' },
  { id: 'productivity', label: 'Produtividade' },
  { id: 'news', label: 'Notícias/Mídia' },
  { id: 'gaming', label: 'Games' },
  { id: 'other', label: 'Outros' },
];

export default function SubscriptionAddScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, colors, maskValue } = useTheme();
  const { subscriptions, familyMembers, addSubscription, updateSubscription, deleteSubscription } = useFinance();
  const insets = useSafeAreaInsets();

  const existing = id ? subscriptions.find((s) => s.id === id) : undefined;
  const isEdit = !!existing;

  const today = new Date();
  const nextMonth = today.getMonth() === 11
    ? `${today.getFullYear() + 1}-01-${String(today.getDate()).padStart(2, '0')}`
    : `${today.getFullYear()}-${String(today.getMonth() + 2).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [name, setName] = useState(existing?.name || '');
  const [amount, setAmount] = useState(existing?.amount ? String(existing.amount) : '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(existing?.billingCycle || 'monthly');
  const [nextDate, setNextDate] = useState(existing?.nextBillingDate || nextMonth);
  const [category, setCategory] = useState(existing?.category || 'entertainment');
  const [color, setColor] = useState(existing?.color || COLOR_PALETTE[0]);
  const [icon, setIcon] = useState(existing?.icon || 'play-circle');
  const [memberId, setMemberId] = useState<string | undefined>(existing?.memberId);
  const [sharedWith, setSharedWith] = useState<string[]>(existing?.sharedWith || []);
  const [notes, setNotes] = useState(existing?.notes || '');
  const [active, setActive] = useState(existing?.active !== undefined ? existing.active : true);

  const amountNum = parseFloat(amount.replace(',', '.')) || 0;
  const monthlyEquiv = amountNum * BILLING_MONTHLY[billingCycle];

  const toggleShared = (mId: string) => {
    if (mId === memberId) return;
    setSharedWith((prev) =>
      prev.includes(mId) ? prev.filter((x) => x !== mId) : [...prev, mId]
    );
    Haptics.selectionAsync();
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Atenção', 'Informe o nome da assinatura'); return; }
    if (amountNum <= 0) { Alert.alert('Atenção', 'Informe um valor válido'); return; }

    const data = {
      name: name.trim(),
      amount: amountNum,
      billingCycle,
      nextBillingDate: nextDate,
      category,
      color,
      icon,
      memberId,
      sharedWith: sharedWith.filter((x) => x !== memberId),
      active,
      notes: notes.trim() || undefined,
    };

    if (isEdit) {
      updateSubscription(id!, data);
    } else {
      addSubscription(data);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Excluir assinatura', `Excluir "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => { deleteSubscription(id!); router.back(); },
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
        {/* Preview chip */}
        <View style={styles.previewRow}>
          <View style={[styles.previewIcon, { backgroundColor: `${color}20` }]}>
            <Feather name={icon as any} size={28} color={color} />
          </View>
          <View>
            <Text style={[styles.previewName, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {name || 'Nova assinatura'}
            </Text>
            {amountNum > 0 && (
              <Text style={[styles.previewAmount, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                {maskValue(formatBRL(amountNum))} • {billingCycle === 'monthly' ? 'mensal' : billingCycle === 'quarterly' ? 'trimestral' : 'anual'}
                {billingCycle !== 'monthly' && ` = ${maskValue(formatBRL(monthlyEquiv))}/mês`}
              </Text>
            )}
          </View>
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Nome *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex: Netflix, Spotify, iCloud..."
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
        />

        {/* Amount */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Valor *</Text>
        <View style={[styles.amountRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.currency, { color: theme.textTertiary, fontFamily: 'Inter_500Medium' }]}>R$</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={theme.textTertiary}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { color: theme.text, fontFamily: 'Inter_700Bold' }]}
          />
        </View>

        {/* Billing cycle */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Ciclo de cobrança</Text>
        <View style={styles.billingRow}>
          {BILLING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => { setBillingCycle(opt.id); Haptics.selectionAsync(); }}
              style={[
                styles.billingChip,
                {
                  backgroundColor: billingCycle === opt.id ? `${colors.primary}20` : theme.surface,
                  borderColor: billingCycle === opt.id ? colors.primary : theme.border,
                  flex: 1,
                }
              ]}
            >
              <Text style={[styles.billingLabel, { color: billingCycle === opt.id ? colors.primary : theme.text, fontFamily: billingCycle === opt.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {opt.label}
              </Text>
              <Text style={[styles.billingNote, { color: billingCycle === opt.id ? colors.primary : theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                {opt.note}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Next billing date */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Próxima cobrança</Text>
        <View style={[styles.dateRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="calendar" size={16} color={theme.textTertiary} />
          <TextInput
            value={nextDate}
            onChangeText={setNextDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.textTertiary}
            keyboardType="numbers-and-punctuation"
            style={[styles.dateInput, { color: theme.text, fontFamily: 'Inter_400Regular' }]}
          />
        </View>

        {/* Icon */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Ícone</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.iconRow}>
            {ICON_OPTIONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => { setIcon(ic); Haptics.selectionAsync(); }}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: icon === ic ? `${color}20` : theme.surface,
                    borderColor: icon === ic ? color : theme.border,
                  }
                ]}
              >
                <Feather name={ic as any} size={20} color={icon === ic ? color : theme.textTertiary} />
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Color */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cor</Text>
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

        {/* Category */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.catRow}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: category === cat.id ? `${colors.primary}20` : theme.surface,
                    borderColor: category === cat.id ? colors.primary : theme.border,
                  }
                ]}
              >
                <Text style={[styles.catText, { color: category === cat.id ? colors.primary : theme.textSecondary, fontFamily: category === cat.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Member assignment */}
        {familyMembers.length > 0 && (
          <>
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Responsável pela assinatura</Text>
            <View style={styles.memberRow}>
              <Pressable
                onPress={() => { setMemberId(undefined); Haptics.selectionAsync(); }}
                style={[styles.memberChip, { backgroundColor: !memberId ? `${colors.primary}15` : theme.surface, borderColor: !memberId ? colors.primary : theme.border }]}
              >
                <Text style={[styles.memberChipText, { color: !memberId ? colors.primary : theme.textSecondary, fontFamily: !memberId ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  Nenhum
                </Text>
              </Pressable>
              {familyMembers.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => { setMemberId(m.id); Haptics.selectionAsync(); }}
                  style={[styles.memberChip, { backgroundColor: memberId === m.id ? `${m.color}20` : theme.surface, borderColor: memberId === m.id ? m.color : theme.border }]}
                >
                  <View style={[styles.memberDot, { backgroundColor: m.color }]} />
                  <Text style={[styles.memberChipText, { color: memberId === m.id ? m.color : theme.textSecondary, fontFamily: memberId === m.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                    {m.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Shared with */}
            <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Compartilhado com</Text>
            <View style={styles.memberRow}>
              {familyMembers.filter((m) => m.id !== memberId).map((m) => {
                const shared = sharedWith.includes(m.id);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => toggleShared(m.id)}
                    style={[styles.memberChip, { backgroundColor: shared ? `${m.color}20` : theme.surface, borderColor: shared ? m.color : theme.border }]}
                  >
                    {shared && <Feather name="check" size={12} color={m.color} />}
                    <View style={[styles.memberDot, { backgroundColor: m.color }]} />
                    <Text style={[styles.memberChipText, { color: shared ? m.color : theme.textSecondary, fontFamily: shared ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                      {m.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
              {familyMembers.filter((m) => m.id !== memberId).length === 0 && (
                <Text style={[{ color: theme.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 13 }]}>
                  Adicione mais membros para compartilhar
                </Text>
              )}
            </View>
          </>
        )}

        {/* Status */}
        <View style={[styles.statusRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Assinatura ativa</Text>
            <Text style={[styles.statusSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {active ? 'Cobrada normalmente' : 'Pausada / cancelada'}
            </Text>
          </View>
          <Switch
            value={active}
            onValueChange={(v) => { setActive(v); Haptics.selectionAsync(); }}
            trackColor={{ false: theme.border, true: `${colors.primary}80` }}
            thumbColor={active ? colors.primary : theme.textTertiary}
          />
        </View>

        {/* Notes */}
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Observações</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas adicionais (opcional)"
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={3}
          style={[styles.input, styles.notesInput, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
        />

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name={isEdit ? 'save' : 'plus'} size={18} color="#fff" />
          <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
            {isEdit ? 'Salvar alterações' : 'Adicionar assinatura'}
          </Text>
        </Pressable>

        {isEdit && (
          <Pressable
            onPress={handleDelete}
            style={[styles.deleteBtn, { borderColor: `${colors.danger}40` }]}
          >
            <Feather name="trash-2" size={16} color={colors.danger} />
            <Text style={[styles.deleteBtnText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
              Excluir assinatura
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 4 },
  previewIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 18 },
  previewAmount: { fontSize: 13, marginTop: 3 },
  label: { fontSize: 13, marginTop: 4 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 15 },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  currency: { fontSize: 22, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 36, paddingVertical: 12 },
  billingRow: { flexDirection: 'row', gap: 8 },
  billingChip: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, gap: 2 },
  billingLabel: { fontSize: 14 },
  billingNote: { fontSize: 11 },
  dateRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, gap: 10 },
  dateInput: { flex: 1, fontSize: 15, paddingVertical: 14 },
  iconRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  iconBtn: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  catChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  catText: { fontSize: 13 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  memberDot: { width: 8, height: 8, borderRadius: 4 },
  memberChipText: { fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  statusTitle: { fontSize: 15 },
  statusSub: { fontSize: 12, marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1 },
  deleteBtnText: { fontSize: 15 },
});
