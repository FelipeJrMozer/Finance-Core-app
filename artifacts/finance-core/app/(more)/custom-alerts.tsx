import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import { EmptyState } from '@/components/EmptyState';
import { configureTaxAlert, type TaxAlertType } from '@/services/tax';

const TAX_SEEDED_KEY = 'pf_tax_alerts_seeded';

const TAX_ALERTS_TO_SEED: Array<{ alertType: TaxAlertType; threshold?: number; description: string }> = [
  { alertType: 'mei-revenue-80',  threshold: 80, description: 'Faturamento MEI atingiu 80% do limite' },
  { alertType: 'das-due-day-20',  description: 'DAS-MEI vence dia 20 do mês' },
  { alertType: 'irpf-deadline',   description: 'Prazo final de entrega do IRPF se aproximando' },
];

type AlertType = 'category_spend' | 'account_balance' | 'card_invoice' | 'goal_pct' | 'bill_due';

interface CustomAlert {
  id: string;
  type: AlertType;
  description: string;
  threshold: number;
  active: boolean;
  createdAt: string;
}

const ALERT_TYPES: { id: AlertType; label: string; icon: keyof typeof Feather.glyphMap; color: string; placeholder: string }[] = [
  { id: 'category_spend', label: 'Gasto em categoria acima de', icon: 'tag', color: '#EF4444', placeholder: 'Valor limite (R$)' },
  { id: 'account_balance', label: 'Saldo da conta abaixo de', icon: 'dollar-sign', color: '#F59E0B', placeholder: 'Saldo mínimo (R$)' },
  { id: 'card_invoice', label: 'Fatura do cartão acima de', icon: 'credit-card', color: '#9C27B0', placeholder: 'Valor máximo (R$)' },
  { id: 'goal_pct', label: 'Meta atingida', icon: 'target', color: '#10B981', placeholder: 'Percentual (%)' },
  { id: 'bill_due', label: 'Conta vencendo em', icon: 'calendar', color: '#0096C7', placeholder: 'Dias de antecedência' },
];

const STORAGE_KEY = 'pf_custom_alerts';

export default function CustomAlertsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<CustomAlert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<AlertType>('category_spend');
  const [threshold, setThreshold] = useState('');
  const [taxSeeded, setTaxSeeded] = useState<boolean>(false);
  const [seedingTax, setSeedingTax] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(TAX_SEEDED_KEY).then((v) => setTaxSeeded(v === '1'));
  }, []);

  const seedTaxAlerts = useCallback(async () => {
    if (taxSeeded || seedingTax) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSeedingTax(true);
    try {
      const results = await Promise.allSettled(
        TAX_ALERTS_TO_SEED.map((a) =>
          configureTaxAlert({ alertType: a.alertType, threshold: a.threshold, channel: 'push', enabled: true })
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === results.length) {
        Alert.alert('Erro', 'Não foi possível ativar os alertas fiscais. Verifique sua conexão.');
        return;
      }
      await AsyncStorage.setItem(TAX_SEEDED_KEY, '1');
      setTaxSeeded(true);
      Alert.alert(
        'Alertas fiscais ativados',
        failed === 0
          ? 'Você receberá avisos automáticos de DAS, IRPF e limite MEI.'
          : `${results.length - failed} de ${results.length} alertas ativados.`,
      );
    } finally {
      setSeedingTax(false);
    }
  }, [taxSeeded, seedingTax]);

  const load = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setAlerts(JSON.parse(data));
    } catch {}
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const saveAlert = async () => {
    if (!threshold || parseFloat(threshold) <= 0) {
      Alert.alert('Atenção', 'Informe o valor limite');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const typeInfo = ALERT_TYPES.find((t) => t.id === selectedType)!;
    const newAlert: CustomAlert = {
      id: Date.now().toString(),
      type: selectedType,
      description: `${typeInfo.label} ${selectedType === 'goal_pct' ? threshold + '%' : selectedType === 'bill_due' ? threshold + ' dias' : formatBRL(parseFloat(threshold))}`,
      threshold: parseFloat(threshold),
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setThreshold(''); setShowForm(false);
  };

  const deleteAlert = (id: string) => {
    Alert.alert('Remover alerta?', 'O alerta será excluído permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const updated = alerts.filter((a) => a.id !== id);
          setAlerts(updated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      }
    ]);
  };

  const toggleAlert = async (id: string) => {
    Haptics.selectionAsync();
    const updated = alerts.map((a) => a.id === id ? { ...a, active: !a.active } : a);
    setAlerts(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const selectedTypeInfo = ALERT_TYPES.find((t) => t.id === selectedType)!;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
    >
      <View style={[styles.offlineNote, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}25` }]}>
        <Feather name="info" size={13} color={colors.warning} />
        <Text style={[styles.offlineText, { color: colors.warning, fontFamily: 'Inter_500Medium' }]}>
          Alertas salvos neste dispositivo
        </Text>
      </View>

      {/* Seed de alertas fiscais — uma vez */}
      <View style={[styles.taxSeed, {
        backgroundColor: taxSeeded ? `${colors.success}10` : `${colors.info}10`,
        borderColor: taxSeeded ? `${colors.success}30` : `${colors.info}30`,
      }]}>
        <View style={[styles.taxSeedIcon, { backgroundColor: `${(taxSeeded ? colors.success : colors.info)}20` }]}>
          <Feather
            name={taxSeeded ? 'check-circle' : 'shield'}
            size={18}
            color={taxSeeded ? colors.success : colors.info}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.taxSeedTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            {taxSeeded ? 'Alertas fiscais ativos' : 'Alertas fiscais essenciais'}
          </Text>
          <Text style={[styles.taxSeedDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {taxSeeded
              ? 'DAS dia 20, IRPF e limite MEI 80% — você será avisado.'
              : 'Ative DAS dia 20, IRPF e limite MEI 80% em um clique.'}
          </Text>
        </View>
        {!taxSeeded && (
          <Pressable
            onPress={seedTaxAlerts}
            disabled={seedingTax}
            style={[styles.taxSeedBtn, { backgroundColor: colors.info }]}
            testID="seed-tax-alerts"
          >
            {seedingTax
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={[styles.taxSeedBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Ativar</Text>}
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => { Haptics.selectionAsync(); setShowForm(!showForm); }}
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
      >
        <Feather name={showForm ? 'x' : 'bell'} size={18} color="#fff" />
        <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
          {showForm ? 'Cancelar' : 'Novo Alerta'}
        </Text>
      </Pressable>

      {showForm && (
        <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.formTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Tipo de alerta</Text>
          {ALERT_TYPES.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => { Haptics.selectionAsync(); setSelectedType(t.id); }}
              style={[
                styles.typeOption,
                { backgroundColor: selectedType === t.id ? `${t.color}15` : theme.surfaceElevated, borderColor: selectedType === t.id ? t.color : theme.border }
              ]}
            >
              <View style={[styles.typeIcon, { backgroundColor: `${t.color}20` }]}>
                <Feather name={t.icon} size={16} color={t.color} />
              </View>
              <Text style={[styles.typeLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{t.label}</Text>
              {selectedType === t.id && <Feather name="check-circle" size={16} color={t.color} />}
            </Pressable>
          ))}
          <View style={{ gap: 4, marginTop: 4 }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {selectedTypeInfo.placeholder}
            </Text>
            <TextInput
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              style={[styles.fieldInput, { backgroundColor: theme.surfaceElevated, borderColor: theme.border, color: theme.text, fontFamily: 'Inter_500Medium' }]}
            />
          </View>
          <Pressable onPress={saveAlert} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Criar Alerta</Text>
          </Pressable>
        </View>
      )}

      {alerts.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Nenhum alerta configurado"
          description="Crie alertas personalizados para acompanhar seus limites financeiros"
        />
      ) : (
        alerts.map((a) => {
          const typeInfo = ALERT_TYPES.find((t) => t.id === a.type)!;
          return (
            <View key={a.id} style={[styles.alertCard, { backgroundColor: theme.surface, borderColor: theme.border, opacity: a.active ? 1 : 0.5 }]}>
              <View style={[styles.alertIcon, { backgroundColor: `${typeInfo.color}15` }]}>
                <Feather name={typeInfo.icon} size={18} color={typeInfo.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertDesc, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{a.description}</Text>
                <Text style={[styles.alertStatus, { color: a.active ? colors.success : theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {a.active ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
              <Pressable onPress={() => toggleAlert(a.id)} hitSlop={8}>
                <Feather name={a.active ? 'toggle-right' : 'toggle-left'} size={22} color={a.active ? colors.primary : theme.textTertiary} />
              </Pressable>
              <Pressable onPress={() => deleteAlert(a.id)} hitSlop={8}>
                <Feather name="trash-2" size={18} color={colors.danger} />
              </Pressable>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  addBtnText: { fontSize: 16, color: '#fff' },
  form: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  formTitle: { fontSize: 15 },
  typeOption: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, borderWidth: 1 },
  typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 13, flex: 1 },
  fieldLabel: { fontSize: 13 },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 16 },
  saveBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, color: '#fff' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  alertIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertDesc: { fontSize: 14 },
  alertStatus: { fontSize: 12, marginTop: 2 },
  offlineNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  offlineText: { fontSize: 12, flex: 1 },
  taxSeed: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  taxSeedIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  taxSeedTitle: { fontSize: 14 },
  taxSeedDesc: { fontSize: 12, marginTop: 2 },
  taxSeedBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  taxSeedBtnText: { color: '#fff', fontSize: 13 },
});
