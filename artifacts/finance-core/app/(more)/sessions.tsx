import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { confirmDestructive } from '@/utils/confirm';
import { listSessions, revokeSession, ActiveSession } from '@/services/sessions';
import {
  listDevices, removeDevice, RegisteredDevice,
} from '@/services/devices';

type Tab = 'sessions' | 'devices';

function relTime(iso?: string) {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} d`;
}

function osIcon(os?: string): keyof typeof Feather.glyphMap {
  const v = (os || '').toLowerCase();
  if (v.includes('ios') || v.includes('android')) return 'smartphone';
  if (v.includes('web') || v.includes('mac') || v.includes('windows') || v.includes('linux')) return 'monitor';
  return 'globe';
}

function platformIcon(platform?: string): keyof typeof Feather.glyphMap {
  const v = (platform || '').toLowerCase();
  if (v === 'ios' || v === 'android') return 'smartphone';
  return 'monitor';
}

export default function SessionsScreen() {
  const { theme, colors } = useTheme();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('sessions');

  const sessions = useQuery<ActiveSession[]>({
    queryKey: ['/api/user/sessions'],
    queryFn: listSessions,
    staleTime: 30_000,
  });

  const devices = useQuery<RegisteredDevice[]>({
    queryKey: ['/api/devices'],
    queryFn: listDevices,
    staleTime: 30_000,
    enabled: tab === 'devices',
  });

  const revokeSessionMut = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['/api/user/sessions'] });
    },
    onError: (e: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', e instanceof Error ? e.message : 'Não foi possível encerrar a sessão.');
    },
  });

  const removeDeviceMut = useMutation({
    mutationFn: (id: string) => removeDevice(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', 'Não foi possível remover o dispositivo.');
    },
  });

  const confirmRevoke = async (s: ActiveSession) => {
    if (s.current) {
      Alert.alert('Sessão atual', 'Para encerrar esta sessão, use o botão Sair em Configurações.');
      return;
    }
    const ok = await confirmDestructive(
      'Encerrar sessão?',
      `Encerrar sessão em ${s.device || 'dispositivo desconhecido'}?`,
      'Encerrar',
    );
    if (ok) revokeSessionMut.mutate(s.id);
  };

  const confirmRemoveDevice = async (d: RegisteredDevice) => {
    const ok = await confirmDestructive(
      'Remover dispositivo?',
      `Remover ${d.deviceModel || d.platform || 'dispositivo'} da lista?`,
      'Remover',
    );
    if (ok) removeDeviceMut.mutate(d.id);
  };

  const renderSession = ({ item }: { item: ActiveSession }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID={`session-${item.id}`}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
        <Feather name={osIcon(item.os)} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {item.device || 'Dispositivo'}
          </Text>
          {item.current && (
            <View style={[styles.badge, { backgroundColor: `${colors.primary}25` }]}>
              <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Atual</Text>
            </View>
          )}
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          {item.os || '—'}{item.appVersion ? ` · v${item.appVersion}` : ''}
        </Text>
        <Text style={[styles.meta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
          {item.ip ? `IP ${item.ip} · ` : ''}Último acesso {relTime(item.lastActiveAt || item.createdAt)}
        </Text>
      </View>
      {!item.current && (
        <Pressable
          onPress={() => confirmRevoke(item)}
          style={({ pressed }) => [styles.killBtn, { opacity: pressed ? 0.7 : 1 }]}
          testID={`revoke-${item.id}`}
          hitSlop={8}
        >
          <Feather name="x-circle" size={20} color={colors.danger} />
        </Pressable>
      )}
    </View>
  );

  const renderDevice = ({ item }: { item: RegisteredDevice }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
        <Feather name={platformIcon(item.platform)} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
          {item.deviceModel || item.platform || 'Dispositivo mobile'}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          {item.platform ? item.platform.charAt(0).toUpperCase() + item.platform.slice(1) : ''}
          {item.createdAt ? ` · Registrado ${relTime(item.createdAt)}` : ''}
        </Text>
        {item.lastActiveAt && (
          <Text style={[styles.meta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            Ativo {relTime(item.lastActiveAt)}
          </Text>
        )}
      </View>
      <Pressable
        onPress={() => confirmRemoveDevice(item)}
        style={({ pressed }) => [styles.killBtn, { opacity: pressed ? 0.7 : 1 }]}
        hitSlop={8}
      >
        <Feather name="x-circle" size={20} color={colors.danger} />
      </Pressable>
    </View>
  );

  const isLoading = tab === 'sessions' ? sessions.isLoading : devices.isLoading;
  const hasError = tab === 'sessions' ? !!sessions.error : !!devices.error;
  const isRefreshing = tab === 'sessions' ? sessions.isRefetching : devices.isRefetching;
  const onRefresh = tab === 'sessions'
    ? () => sessions.refetch()
    : () => devices.refetch();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Dispositivos e Sessões' }} />

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {(['sessions', 'devices'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Feather
              name={t === 'sessions' ? 'monitor' : 'smartphone'}
              size={15}
              color={tab === t ? colors.primary : theme.textSecondary}
            />
            <Text style={[styles.tabText, {
              color: tab === t ? colors.primary : theme.textSecondary,
              fontFamily: tab === t ? 'Inter_600SemiBold' : 'Inter_400Regular',
            }]}>
              {t === 'sessions' ? 'Sessões Web' : 'Dispositivos'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : hasError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={26} color={colors.warning} />
          <Text style={[styles.empty, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Não foi possível carregar.
          </Text>
          <Pressable onPress={onRefresh} style={[styles.retry, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : tab === 'sessions' ? (
        <FlatList
          data={sessions.data || []}
          keyExtractor={(s) => s.id}
          renderItem={renderSession}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="monitor" size={32} color={theme.textTertiary} />
              <Text style={[styles.empty, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Nenhuma sessão ativa.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={devices.data || []}
          keyExtractor={(d) => d.id}
          renderItem={renderDevice}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="smartphone" size={32} color={theme.textTertiary} />
              <Text style={[styles.empty, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Nenhum dispositivo registrado.
              </Text>
              <Text style={[styles.emptyHint, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Dispositivos aparecem aqui após notificações push serem ativadas.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14 },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, flexShrink: 1 },
  meta: { fontSize: 12, marginTop: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10 },
  killBtn: { padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, minHeight: 200 },
  empty: { fontSize: 14, textAlign: 'center' },
  emptyHint: { fontSize: 12, textAlign: 'center', maxWidth: 260 },
  retry: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, marginTop: 6 },
});
