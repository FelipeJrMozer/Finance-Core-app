import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  listPriceAlerts, createPriceAlert, deletePriceAlert, checkPriceAlerts, describeCondition,
  type PriceAlert, type PriceAlertCondition,
} from '@/services/priceAlerts';

const CONDITIONS: { id: PriceAlertCondition; label: string; hint: string }[] = [
  { id: 'above',     label: 'Preço acima de', hint: 'R$ por ação/cota' },
  { id: 'below',     label: 'Preço abaixo de', hint: 'R$ por ação/cota' },
  { id: 'change_pct', label: 'Variação maior que', hint: '% no dia' },
];

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function notifyTriggered(triggered: PriceAlert[]) {
  if (Platform.OS === 'web' || triggered.length === 0) return;
  const ok = await ensureNotificationPermission();
  if (!ok) return;
  for (const alert of triggered) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Alerta disparado · ${alert.ticker}`,
          body: `${describeCondition(alert.condition, alert.targetValue)} — preço atual ${alert.lastPrice != null ? `R$ ${alert.lastPrice.toFixed(2).replace('.', ',')}` : 'indisponível'}`,
          data: { ticker: alert.ticker, alertId: alert.id },
        },
        trigger: null,
      });
    } catch {
      // ignora falhas de notificação
    }
  }
}

export default function PriceAlertsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [ticker, setTicker] = useState('');
  const [condition, setCondition] = useState<PriceAlertCondition>('above');
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const subRef = useRef<Notifications.Subscription | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listPriceAlerts();
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar alertas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    subRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data: any = response.notification.request.content.data;
      if (data?.ticker) {
        router.push({ pathname: '/(more)/stock-detail/[ticker]', params: { ticker: String(data.ticker) } });
      }
    });
    return () => {
      subRef.current?.remove();
      subRef.current = null;
    };
  }, []);

  const openCreate = () => {
    Haptics.selectionAsync();
    setTicker('');
    setCondition('above');
    setTarget('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const t = ticker.trim().toUpperCase();
    const v = Number(target.replace(',', '.'));
    if (!t) { Alert.alert('Atenção', 'Informe o ticker.'); return; }
    if (!isFinite(v) || v <= 0) { Alert.alert('Atenção', 'Informe um valor válido.'); return; }
    setSaving(true);
    try {
      const created = await createPriceAlert({ ticker: t, condition, targetValue: v });
      if (created) {
        setItems((prev) => [created, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível criar o alerta.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (a: PriceAlert) => {
    Alert.alert('Remover alerta', `Deseja remover o alerta de ${a.ticker}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          const ok = await deletePriceAlert(a.id);
          if (ok) {
            setItems((prev) => prev.filter((i) => i.id !== a.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  };

  const handleCheck = async () => {
    setChecking(true);
    Haptics.selectionAsync();
    try {
      const result = await checkPriceAlerts();
      await notifyTriggered(result.triggered);
      const triggeredCount = result.triggered.length;
      if (triggeredCount > 0) {
        Alert.alert('Verificação concluída', `${triggeredCount} alerta(s) disparado(s). Atualize a lista.`);
      } else {
        Alert.alert('Verificação concluída', `Nenhum alerta disparado nesta verificação${result.checked ? ` (${result.checked} alvo(s) avaliados)` : ''}.`);
      }
      load();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao verificar.');
    } finally {
      setChecking(false);
    }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const grouped = useMemo(() => {
    const triggered = items.filter((a) => a.status === 'triggered');
    const active = items.filter((a) => a.status === 'active');
    const paused = items.filter((a) => a.status === 'paused');
    return { triggered, active, paused };
  }, [items]);

  const renderAlert = (a: PriceAlert) => {
    const isTriggered = a.status === 'triggered';
    return (
      <PressableElevate
        key={a.id}
        onPress={() => router.push({ pathname: '/(more)/stock-detail/[ticker]', params: { ticker: a.ticker } })}
        testID={`open-alert-${a.ticker}`}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.avatar, {
              backgroundColor: isTriggered ? `${colors.danger}20` : `${colors.primary}15`,
            }]}>
              <Icon name={a.status === 'paused' ? 'bell-off' : 'alert'} size={20}
                color={isTriggered ? colors.danger : a.status === 'paused' ? theme.textTertiary : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>{a.ticker}</Text>
                <View style={[styles.badge, { backgroundColor: isTriggered ? `${colors.danger}20` : a.status === 'paused' ? `${theme.textTertiary}20` : `${colors.success}20` }]}>
                  <Text style={{ color: isTriggered ? colors.danger : a.status === 'paused' ? theme.textTertiary : colors.success, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                    {isTriggered ? 'DISPARADO' : a.status === 'paused' ? 'PAUSADO' : 'ATIVO'}
                  </Text>
                </View>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 3, fontFamily: 'Inter_500Medium' }}>
                {describeCondition(a.condition, a.targetValue)}
              </Text>
              {a.lastPrice != null && (
                <Text style={{ color: theme.textTertiary, fontSize: 11, marginTop: 1, fontFamily: 'Inter_400Regular' }}>
                  Último preço: R$ {a.lastPrice.toFixed(2).replace('.', ',')}
                </Text>
              )}
            </View>
            <PressableScale onPress={() => handleDelete(a)} testID={`delete-alert-${a.ticker}`} hitSlop={10}>
              <Icon name="delete" size={18} color={theme.textTertiary} />
            </PressableScale>
          </View>
        </Card>
      </PressableElevate>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Alertas de preço' }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 12 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button label="Verificar agora" onPress={handleCheck} loading={checking} variant="secondary" testID="check-alerts" />
              </View>
            </View>

            {error && (
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="alert" size={18} color={colors.danger} />
                  <Text style={{ color: theme.text, flex: 1, fontFamily: 'Inter_500Medium' }}>{error}</Text>
                </View>
              </Card>
            )}

            {items.length === 0 && !error ? (
              <EmptyState
                icon="bell"
                title="Nenhum alerta"
                description="Configure alertas para ser notificado quando preços atingirem alvos."
                action={{ label: 'Criar alerta', onPress: openCreate }}
              />
            ) : (
              <>
                {grouped.triggered.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.danger }]}>DISPARADOS</Text>
                    {grouped.triggered.map(renderAlert)}
                  </>
                )}
                {grouped.active.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ATIVOS</Text>
                    {grouped.active.map(renderAlert)}
                  </>
                )}
                {grouped.paused.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textTertiary }]}>PAUSADOS</Text>
                    {grouped.paused.map(renderAlert)}
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}

        <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
          <PressableScale
            onPress={openCreate}
            testID="add-alert"
            haptic="medium"
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          >
            <Icon name="plus" size={22} color="#000" />
          </PressableScale>
        </View>

        <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Novo alerta</Text>
                <PressableScale onPress={() => setShowForm(false)} hitSlop={10} testID="close-alert-form">
                  <Icon name="close" size={22} color={theme.textTertiary} />
                </PressableScale>
              </View>

              <Text style={styles.fieldLabel}>TICKER</Text>
              <TextInput
                value={ticker}
                onChangeText={setTicker}
                placeholder="Ex.: PETR4"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="characters"
                style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                testID="input-alert-ticker"
              />

              <Text style={styles.fieldLabel}>CONDIÇÃO</Text>
              <View style={{ gap: 6 }}>
                {CONDITIONS.map((c) => (
                  <PressableScale
                    key={c.id}
                    onPress={() => { setCondition(c.id); Haptics.selectionAsync(); }}
                    style={[styles.condRow, {
                      backgroundColor: condition === c.id ? `${colors.primary}15` : theme.surfaceElevated,
                      borderColor: condition === c.id ? colors.primary : theme.border,
                    }]}
                    testID={`pick-condition-${c.id}`}
                  >
                    <Icon name={condition === c.id ? 'check-circle' : 'target'} size={16} color={condition === c.id ? colors.primary : theme.textTertiary} />
                    <Text style={{ color: theme.text, flex: 1, fontFamily: 'Inter_500Medium' }}>{c.label}</Text>
                    <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{c.hint}</Text>
                  </PressableScale>
                ))}
              </View>

              <Text style={styles.fieldLabel}>VALOR ALVO</Text>
              <TextInput
                value={target}
                onChangeText={setTarget}
                placeholder={condition === 'change_pct' ? 'Ex.: 5 (5%)' : 'Ex.: 32,50'}
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
                testID="input-alert-target"
              />

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancelar" variant="secondary" onPress={() => setShowForm(false)} fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Criar" onPress={handleSave} loading={saving} fullWidth testID="save-alert" />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sectionTitle: { fontSize: 11, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold', marginTop: 4, marginBottom: -4 },
  fab: { position: 'absolute', right: 20 },
  fabBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold', color: '#888', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  condRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
});
