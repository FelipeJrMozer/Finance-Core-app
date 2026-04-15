import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, Modal,
  TextInput, ActivityIndicator, Alert, ScrollView, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/services/api';
import { formatBRL } from '@/utils/formatters';

interface SinkingFund {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate?: string;
  color?: string;
  icon?: string;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'sinkingFunds', 'sinking_funds', 'funds']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function monthsRemaining(fund: SinkingFund): number | null {
  if (!fund.targetDate) return null;
  const today = new Date();
  const target = new Date(fund.targetDate);
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
  return Math.max(0, months);
}

function estimatedMonthsToGoal(fund: SinkingFund): number | null {
  const remaining = Number(fund.targetAmount) - Number(fund.currentAmount);
  if (remaining <= 0) return 0;
  if (!fund.monthlyContribution || Number(fund.monthlyContribution) <= 0) return null;
  return Math.ceil(remaining / Number(fund.monthlyContribution));
}

function formatDate(d?: string): string {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

export default function SinkingFundsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [funds, setFunds] = useState<SinkingFund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContribModal, setShowContribModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState<SinkingFund | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', targetAmount: '', monthlyContribution: '', targetDate: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await apiGet<unknown>('/api/sinking-funds');
      setFunds(toArray<SinkingFund>(data));
    } catch (e) {
      console.warn('[SinkingFunds] load error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const totalSaved = funds.reduce((s, f) => s + Number(f.currentAmount), 0);
  const totalTarget = funds.reduce((s, f) => s + Number(f.targetAmount), 0);
  const totalMonthly = funds.reduce((s, f) => s + Number(f.monthlyContribution || 0), 0);

  const openContrib = (fund: SinkingFund) => {
    setSelectedFund(fund);
    setContribAmount(String(fund.monthlyContribution || ''));
    setShowContribModal(true);
  };

  const registerContrib = async () => {
    if (!selectedFund) return;
    const amount = parseFloat(contribAmount.replace(',', '.'));
    if (!amount || isNaN(amount)) { Alert.alert('Valor inválido'); return; }
    setSaving(true);
    try {
      await apiPatch(`/api/sinking-funds/${selectedFund.id}`, {
        currentAmount: Number(selectedFund.currentAmount) + amount,
      });
      setShowContribModal(false);
      setContribAmount('');
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao registrar aporte');
    } finally {
      setSaving(false);
    }
  };

  const addFund = async () => {
    if (!form.name || !form.targetAmount) { Alert.alert('Preencha nome e valor alvo'); return; }
    setSaving(true);
    try {
      await apiPost('/api/sinking-funds', {
        name: form.name,
        description: form.description || undefined,
        targetAmount: parseFloat(form.targetAmount.replace(',', '.')),
        monthlyContribution: form.monthlyContribution ? parseFloat(form.monthlyContribution.replace(',', '.')) : 0,
        targetDate: form.targetDate || undefined,
      });
      setShowAddModal(false);
      setForm({ name: '', description: '', targetAmount: '', monthlyContribution: '', targetDate: '' });
      await load();
    } catch (e: unknown) {
      Alert.alert('Erro', e instanceof Error ? e.message : 'Erro ao criar reserva');
    } finally {
      setSaving(false);
    }
  };

  const deleteFund = (fund: SinkingFund) => {
    Alert.alert('Excluir reserva', `Deseja excluir "${fund.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try { await apiDelete(`/api/sinking-funds/${fund.id}`); await load(); } catch {}
        },
      },
    ]);
  };

  const COLORS = ['#0096C7', '#6C5CE7', '#00B894', '#FD9644', '#E84393', '#2ED573', '#F53B57', '#A29BFE'];

  const renderFund = ({ item, index }: { item: SinkingFund; index: number }) => {
    const current = Number(item.currentAmount);
    const target = Number(item.targetAmount);
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const accentColor = item.color || COLORS[index % COLORS.length];
    const estMonths = estimatedMonthsToGoal(item);
    const remainMonths = monthsRemaining(item);

    return (
      <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={s.cardHeader}>
          <View style={[s.cardIcon, { backgroundColor: `${accentColor}20` }]}>
            <Feather name="archive" size={18} color={accentColor} />
          </View>
          <View style={s.cardInfo}>
            <Text style={[s.cardName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{item.name}</Text>
            {item.description ? (
              <Text style={[s.cardDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{item.description}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => deleteFund(item)} style={{ padding: 6 }}>
            <Feather name="trash-2" size={15} color={theme.textTertiary} />
          </Pressable>
        </View>

        <View style={s.amountsRow}>
          <View>
            <Text style={[s.amtLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Acumulado</Text>
            <Text style={[s.amtValue, { color: accentColor, fontFamily: 'Inter_700Bold' }]}>{formatBRL(current)}</Text>
          </View>
          <View>
            <Text style={[s.amtLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Meta</Text>
            <Text style={[s.amtValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{formatBRL(target)}</Text>
          </View>
          <View>
            <Text style={[s.amtLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Mensal</Text>
            <Text style={[s.amtValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{formatBRL(Number(item.monthlyContribution || 0))}</Text>
          </View>
        </View>

        <View style={[s.progressBg, { backgroundColor: theme.surfaceElevated }]}>
          <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: pct >= 100 ? colors.success : accentColor }]} />
        </View>
        <View style={s.progressMeta}>
          <Text style={[s.progLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {pct.toFixed(0)}% concluído
          </Text>
          <Text style={[s.progLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            {item.targetDate ? `Meta: ${formatDate(item.targetDate)}` : estMonths !== null ? `~${estMonths} meses restantes` : ''}
          </Text>
        </View>

        {pct < 100 && (
          <Pressable onPress={() => openContrib(item)} style={[s.contribBtn, { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}30` }]}>
            <Feather name="plus-circle" size={14} color={accentColor} />
            <Text style={[s.contribBtnText, { color: accentColor, fontFamily: 'Inter_500Medium' }]}>Fazer Aporte</Text>
          </Pressable>
        )}
        {pct >= 100 && (
          <View style={[s.completedBadge, { backgroundColor: `${colors.success}20` }]}>
            <Feather name="check-circle" size={14} color={colors.success} />
            <Text style={[s.contribBtnText, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>Meta atingida!</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[s.container, { backgroundColor: theme.background }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={funds}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => renderFund({ item, index })}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          ListHeaderComponent={() => (
            <View>
              <View style={[s.summary, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total acumulado</Text>
                  <Text style={[s.summaryValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalSaved)}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Total das metas</Text>
                  <Text style={[s.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalTarget)}</Text>
                </View>
                <View style={[s.summaryDivider, { backgroundColor: theme.border }]} />
                <View style={s.summaryItem}>
                  <Text style={[s.summaryLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Aporte mensal</Text>
                  <Text style={[s.summaryValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatBRL(totalMonthly)}</Text>
                </View>
              </View>
              {funds.length === 0 && (
                <View style={s.empty}>
                  <Feather name="archive" size={48} color={colors.primary} />
                  <Text style={[s.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Nenhuma reserva programada</Text>
                  <Text style={[s.emptyDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    Reserve dinheiro para objetivos específicos como viagens, compras planejadas ou emergências.
                  </Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Pressable onPress={() => setShowAddModal(true)} style={[s.fab, { backgroundColor: colors.primary }]}>
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      {/* Contribution Modal */}
      <Modal visible={showContribModal} transparent animationType="slide" onRequestClose={() => setShowContribModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: theme.surface }]}>
            <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Fazer Aporte</Text>
            {selectedFund && (
              <Text style={[s.modalSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {selectedFund.name} • Acumulado: {formatBRL(Number(selectedFund.currentAmount))}
              </Text>
            )}
            <TextInput
              style={[s.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
              placeholder="Valor do aporte (ex: 500,00)"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              value={contribAmount}
              onChangeText={setContribAmount}
            />
            <View style={s.modalBtns}>
              <Pressable onPress={() => setShowContribModal(false)} style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}>
                <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={registerContrib} style={[s.modalBtn, { backgroundColor: colors.primary }]} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                  <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Aportar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Fund Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}>
            <View style={[s.modal, { backgroundColor: theme.surface }]}>
              <Text style={[s.modalTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Nova Reserva Programada</Text>
              {([
                { key: 'name', label: 'Nome *', kb: 'default' },
                { key: 'description', label: 'Descrição', kb: 'default' },
                { key: 'targetAmount', label: 'Valor alvo *', kb: 'decimal-pad' },
                { key: 'monthlyContribution', label: 'Aporte mensal', kb: 'decimal-pad' },
                { key: 'targetDate', label: 'Data alvo (YYYY-MM-DD)', kb: 'default' },
              ] as const).map(({ key, label, kb }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={[s.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
                  <TextInput
                    style={[s.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                    placeholder={label}
                    placeholderTextColor={theme.textTertiary}
                    keyboardType={kb as any}
                    value={form[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  />
                </View>
              ))}
              <View style={s.modalBtns}>
                <Pressable onPress={() => setShowAddModal(false)} style={[s.modalBtn, { backgroundColor: theme.surfaceElevated }]}>
                  <Text style={[s.modalBtnText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={addFund} style={[s.modalBtn, { backgroundColor: colors.primary }]} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={[s.modalBtnText, { color: '#fff', fontFamily: 'Inter_600SemiBold' }]}>Criar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  summary: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 14 },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15 },
  cardDesc: { fontSize: 12, marginTop: 2 },
  amountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  amtLabel: { fontSize: 11, marginBottom: 2 },
  amtValue: { fontSize: 14 },
  progressBg: { height: 8, borderRadius: 4, marginBottom: 6, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progLabel: { fontSize: 11 },
  contribBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  contribBtnText: { fontSize: 13 },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16 },
  emptyDesc: { fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 100, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, marginBottom: 8 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, marginTop: 4 },
  fieldLabel: { fontSize: 13 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 15 },
});
