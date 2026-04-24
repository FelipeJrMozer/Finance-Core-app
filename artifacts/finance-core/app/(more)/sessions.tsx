import React from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { listSessions, revokeSession, ActiveSession } from '@/services/sessions';

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
  if (v.includes('ios')) return 'smartphone';
  if (v.includes('android')) return 'smartphone';
  if (v.includes('web') || v.includes('mac') || v.includes('windows') || v.includes('linux')) return 'monitor';
  return 'globe';
}

export default function SessionsScreen() {
  const { theme, colors } = useTheme();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isRefetching } = useQuery<ActiveSession[]>({
    queryKey: ['/api/user/sessions'],
    queryFn: listSessions,
    staleTime: 30_000,
  });

  const mut = useMutation({
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

  const confirm = (s: ActiveSession) => {
    if (s.current) {
      Alert.alert('Sessão atual', 'Para encerrar esta sessão, use o botão Sair na tela de Configurações.');
      return;
    }
    Alert.alert(
      'Encerrar sessão?',
      `Tem certeza que deseja encerrar a sessão em ${s.device || 'dispositivo desconhecido'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Encerrar', style: 'destructive', onPress: () => mut.mutate(s.id) },
      ],
    );
  };

  const renderItem = ({ item }: { item: ActiveSession }) => (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} testID={`session-${item.id}`}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
        <Feather name={osIcon(item.os)} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {item.device || 'Dispositivo'}
          </Text>
          {item.current && (
            <View style={[styles.badge, { backgroundColor: `${colors.primary}25` }]}>
              <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Atual</Text>
            </View>
          )}
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          {item.os || '—'} · {item.appVersion ? `v${item.appVersion}` : ''}
        </Text>
        <Text style={[styles.meta, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
          {item.ip ? `IP ${item.ip} · ` : ''}Último acesso {relTime(item.lastActiveAt || item.createdAt)}
        </Text>
      </View>
      {!item.current && (
        <Pressable
          onPress={() => confirm(item)}
          style={({ pressed }) => [styles.killBtn, { opacity: pressed ? 0.7 : 1 }]}
          testID={`revoke-${item.id}`}
          hitSlop={8}
        >
          <Feather name="x-circle" size={20} color={colors.danger} />
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ title: 'Dispositivos e Sessões' }} />
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={26} color={colors.warning} />
          <Text style={[styles.empty, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Não foi possível carregar as sessões.
          </Text>
          <Pressable onPress={() => refetch()} style={[styles.retry, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data || []}
          keyExtractor={(s) => s.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="monitor" size={32} color={theme.textTertiary} />
              <Text style={[styles.empty, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Nenhuma sessão ativa encontrada.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, flexShrink: 1 },
  meta: { fontSize: 12, marginTop: 1 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10 },
  killBtn: { padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  empty: { fontSize: 14, textAlign: 'center' },
  retry: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, borderWidth: 1, marginTop: 6 },
});
