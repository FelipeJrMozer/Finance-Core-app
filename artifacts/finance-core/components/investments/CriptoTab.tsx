import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  listCryptoHoldings, createCryptoHolding, updateCryptoHolding, deleteCryptoHolding,
  type CryptoHolding,
} from '@/services/cryptoHoldings';

export function CriptoTab({ portfolioId }: { portfolioId?: string }) {
  const { theme, colors } = useTheme();
  const [items, setItems] = useState<CryptoHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CryptoHolding | null>(null);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [exchange, setExchange] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listCryptoHoldings(portfolioId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => { load(); }, [load]);

  const totals = items.reduce(
    (acc, h) => ({ invested: acc.invested + h.totalInvested, current: acc.current + h.totalCurrent }),
    { invested: 0, current: 0 }
  );
  const profit = totals.current - totals.invested;
  const profitPct = totals.invested > 0 ? (profit / totals.invested) * 100 : 0;

  const openAdd = () => {
    Haptics.selectionAsync();
    setEditing(null);
    setSymbol(''); setQuantity(''); setAveragePrice(''); setExchange('');
    setShowForm(true);
  };

  const openEdit = (h: CryptoHolding) => {
    Haptics.selectionAsync();
    setEditing(h);
    setSymbol(h.symbol);
    setQuantity(String(h.quantity).replace('.', ','));
    setAveragePrice(String(h.averagePrice).replace('.', ','));
    setExchange(h.exchange || '');
    setShowForm(true);
  };

  const openItemActions = (h: CryptoHolding) => {
    Alert.alert(h.symbol, 'O que deseja fazer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: () => openEdit(h) },
      { text: 'Excluir', style: 'destructive', onPress: () => confirmDelete(h) },
    ]);
  };

  const confirmDelete = (h: CryptoHolding) => {
    Alert.alert('Excluir', `Remover ${h.symbol} da carteira cripto?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          const ok = await deleteCryptoHolding(h.id);
          if (ok) {
            setItems((prev) => prev.filter((i) => i.id !== h.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    const sym = symbol.trim().toUpperCase();
    const qty = Number(quantity.replace(',', '.'));
    const avg = Number(averagePrice.replace(',', '.'));
    if (!sym) { Alert.alert('Atenção', 'Informe o símbolo (ex.: BTC).'); return; }
    if (!isFinite(qty) || qty <= 0) { Alert.alert('Atenção', 'Quantidade inválida.'); return; }
    if (!isFinite(avg) || avg <= 0) { Alert.alert('Atenção', 'Preço médio inválido.'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateCryptoHolding(editing.id, {
          symbol: sym, quantity: qty, averagePrice: avg,
          exchange: exchange.trim() || undefined,
        });
        if (updated) {
          setItems((prev) => prev.map((i) => (i.id === editing.id ? updated : i)));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowForm(false);
        } else {
          Alert.alert('Erro', 'Não foi possível atualizar.');
        }
      } else {
        const created = await createCryptoHolding({
          symbol: sym, quantity: qty, averagePrice: avg,
          exchange: exchange.trim() || undefined,
          portfolioId,
        });
        if (created) {
          setItems((prev) => [created, ...prev]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setShowForm(false);
        } else {
          Alert.alert('Erro', 'Não foi possível adicionar.');
        }
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <View style={styles.cardHeader}>
          <Icon name="bitcoin" size={18} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: theme.text }]}>Cripto · resumo</Text>
          <PressableScale onPress={openAdd} hitSlop={10} testID="add-crypto">
            <Icon name="plus" size={20} color={colors.primary} />
          </PressableScale>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiLabel, { color: theme.textTertiary }]}>Investido</Text>
            <Money value={totals.invested} size="md" weight="700" />
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiLabel, { color: theme.textTertiary }]}>Atual</Text>
            <Money value={totals.current} size="md" weight="700" />
          </View>
          <View style={styles.kpiCell}>
            <Text style={[styles.kpiLabel, { color: theme.textTertiary }]}>Resultado</Text>
            <Text style={{
              color: profit >= 0 ? colors.success : colors.danger,
              fontSize: 18, fontFamily: 'Inter_700Bold',
            }}>
              {profit >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
            </Text>
          </View>
        </View>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          icon="package"
          title="Sem cripto"
          description="Adicione suas posições em criptomoedas para acompanhar evolução e P&L."
          action={{ label: 'Adicionar cripto', onPress: openAdd }}
        />
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((h) => {
            const isUp = h.profit >= 0;
            return (
              <PressableElevate key={h.id} onPress={() => openItemActions(h)} testID={`open-crypto-${h.symbol}`}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={[styles.coin, { backgroundColor: `${colors.primary}15` }]}>
                      <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 11 }}>
                        {h.symbol.slice(0, 4)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>{h.symbol}</Text>
                      <Text style={{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                        {h.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} {h.symbol}{h.exchange ? ` · ${h.exchange}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Money value={h.totalCurrent} size="sm" weight="700" />
                      <Text style={{
                        color: isUp ? colors.success : colors.danger,
                        fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2,
                      }}>
                        {isUp ? '+' : ''}{h.profitPercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                </Card>
              </PressableElevate>
            );
          })}
        </View>
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.modal, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
                {editing ? 'Editar cripto' : 'Adicionar cripto'}
              </Text>
              <PressableScale onPress={() => setShowForm(false)} hitSlop={10} testID="close-crypto-form">
                <Icon name="close" size={22} color={theme.textTertiary} />
              </PressableScale>
            </View>

            <Text style={styles.fieldLabel}>SÍMBOLO</Text>
            <TextInput
              value={symbol}
              onChangeText={setSymbol}
              placeholder="Ex.: BTC, ETH"
              placeholderTextColor={theme.textTertiary}
              autoCapitalize="characters"
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
              testID="input-crypto-symbol"
            />

            <Text style={styles.fieldLabel}>QUANTIDADE</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
              testID="input-crypto-quantity"
            />

            <Text style={styles.fieldLabel}>PREÇO MÉDIO (R$)</Text>
            <TextInput
              value={averagePrice}
              onChangeText={setAveragePrice}
              placeholder="0,00"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
              testID="input-crypto-avg"
            />

            <Text style={styles.fieldLabel}>EXCHANGE (opcional)</Text>
            <TextInput
              value={exchange}
              onChangeText={setExchange}
              placeholder="Binance, Mercado Bitcoin..."
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, { backgroundColor: theme.surfaceElevated, color: theme.text, borderColor: theme.border }]}
              testID="input-crypto-exchange"
            />

            <Button label="Adicionar" onPress={handleSave} loading={saving} fullWidth style={{ marginTop: 16 }} testID="save-crypto" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: 32, alignItems: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  kpiRow: { flexDirection: 'row', gap: 8 },
  kpiCell: { flex: 1 },
  kpiLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  coin: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold', color: '#888', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
});
