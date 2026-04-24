import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Alert, Modal, TextInput, FlatList,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  listWatchlist, addToWatchlist, removeFromWatchlist, type WatchlistItem,
} from '@/services/watchlist';
import { listAvailableTickers, type AvailableTicker } from '@/services/stockComparator';

export default function WatchlistScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [available, setAvailable] = useState<AvailableTicker[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await listWatchlist();
      setItems(list);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar a watchlist.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = useCallback(async () => {
    Haptics.selectionAsync();
    setShowAdd(true);
    setSearch('');
    if (available.length === 0) {
      const list = await listAvailableTickers();
      setAvailable(list);
    }
  }, [available.length]);

  const filtered = useMemo(() => {
    if (!search.trim()) return available.slice(0, 50);
    const q = search.trim().toUpperCase();
    return available.filter((t) =>
      t.ticker.includes(q) || (t.name && t.name.toUpperCase().includes(q))
    ).slice(0, 50);
  }, [available, search]);

  const handleAdd = async (ticker: string) => {
    if (items.some((w) => w.ticker === ticker.toUpperCase())) {
      Alert.alert('Já está na watchlist', `${ticker} já foi adicionado.`);
      return;
    }
    setAdding(true);
    try {
      const created = await addToWatchlist({ ticker });
      if (created) {
        setItems((prev) => [created, ...prev]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowAdd(false);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível adicionar.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (item: WatchlistItem) => {
    Alert.alert('Remover', `Deseja remover ${item.ticker} da watchlist?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          const ok = await removeFromWatchlist(item.id);
          if (ok) {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      },
    ]);
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: 'Watchlist' }} />
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100, gap: 10 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
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
                icon="eye"
                title="Nada acompanhado ainda"
                description="Adicione ativos que você deseja monitorar sem comprar."
                action={{ label: 'Adicionar ativo', onPress: openAdd }}
              />
            ) : (
              items.map((item) => {
                const isUp = (item.changePercent ?? 0) >= 0;
                return (
                  <PressableElevate
                    key={item.id}
                    onPress={() => router.push({ pathname: '/(more)/stock-detail/[ticker]', params: { ticker: item.ticker } })}
                    testID={`open-watchlist-${item.ticker}`}
                  >
                    <Card>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.avatar, { backgroundColor: `${colors.primary}15` }]}>
                          <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: 11 }}>
                            {item.ticker.slice(0, 4)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.text, fontSize: 15, fontFamily: 'Inter_700Bold' }}>{item.ticker}</Text>
                          {item.name ? (
                            <Text style={{ color: theme.textTertiary, fontSize: 12, marginTop: 1, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                              {item.name}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {item.currentPrice != null ? (
                            <Money value={item.currentPrice} size="sm" weight="700" />
                          ) : (
                            <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular' }}>—</Text>
                          )}
                          {item.changePercent != null && (
                            <Text style={{ color: isUp ? colors.success : colors.danger, fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 2 }}>
                              {isUp ? '+' : ''}{item.changePercent.toFixed(2)}%
                            </Text>
                          )}
                        </View>
                        <PressableScale onPress={() => handleRemove(item)} testID={`remove-watchlist-${item.ticker}`} hitSlop={10}>
                          <Icon name="star" size={20} color={colors.warning} />
                        </PressableScale>
                      </View>
                    </Card>
                  </PressableElevate>
                );
              })
            )}
          </ScrollView>
        )}

        <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
          <PressableScale
            onPress={openAdd}
            testID="add-watchlist"
            haptic="medium"
            style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          >
            <Icon name="plus" size={22} color="#000" />
          </PressableScale>
        </View>

        <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modal, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <Text style={{ color: theme.text, fontSize: 18, fontFamily: 'Inter_700Bold' }}>Adicionar à watchlist</Text>
                <PressableScale onPress={() => setShowAdd(false)} hitSlop={10} testID="close-add-watchlist">
                  <Icon name="close" size={22} color={theme.textTertiary} />
                </PressableScale>
              </View>

              <View style={[styles.searchBox, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Icon name="search" size={16} color={theme.textTertiary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Buscar ticker (ex.: PETR4)"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="characters"
                  style={{ flex: 1, color: theme.text, fontFamily: 'Inter_400Regular', fontSize: 15 }}
                  testID="input-watchlist-search"
                />
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.ticker}
                style={{ maxHeight: 360, marginTop: 8 }}
                ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border }} />}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular' }}>
                      {available.length === 0 ? 'Carregando...' : 'Nenhum ticker encontrado'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <PressableScale
                    onPress={() => handleAdd(item.ticker)}
                    style={styles.tickerRow}
                    disabled={adding}
                    testID={`pick-ticker-${item.ticker}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontFamily: 'Inter_700Bold', fontSize: 15 }}>{item.ticker}</Text>
                      {item.name ? (
                        <Text style={{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                          {item.name}
                        </Text>
                      ) : null}
                    </View>
                    <Icon name="plus" size={18} color={colors.primary} />
                  </PressableScale>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20 },
  fabBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 28 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  tickerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
});
