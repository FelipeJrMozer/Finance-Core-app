import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, AppNotification } from '@/context/FinanceContext';

function formatRelativeDate(iso: string): string {
  const now = new Date();
  const d = new Date(iso);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return d.toLocaleDateString('pt-BR');
}

function notifIcon(type: string): { icon: string; color: string } {
  if (type === 'budget_alert') return { icon: 'alert-circle', color: '#FF9800' };
  if (type === 'goal_reached') return { icon: 'target', color: '#4CAF50' };
  if (type === 'goal_progress') return { icon: 'trending-up', color: '#2196F3' };
  if (type === 'bill_due') return { icon: 'credit-card', color: '#E91E63' };
  if (type === 'report_ready') return { icon: 'bar-chart-2', color: '#9C27B0' };
  return { icon: 'bell', color: '#0096C7' };
}

function NotifCard({ notif, onRead, onDismiss }: { notif: AppNotification; onRead: () => void; onDismiss: () => void }) {
  const { theme, colors } = useTheme();
  const { icon, color } = notifIcon(notif.type);

  return (
    <Pressable
      onPress={() => { if (!notif.read) { Haptics.selectionAsync(); onRead(); } }}
      style={[
        styles.card,
        {
          backgroundColor: notif.read ? theme.surface : `${color}08`,
          borderColor: notif.read ? theme.border : `${color}30`,
        }
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Feather name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
            {notif.title}
          </Text>
          {!notif.read && <View style={[styles.unreadDot, { backgroundColor: color }]} />}
        </View>
        <Text style={[styles.message, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
          {notif.message}
        </Text>
        <Text style={[styles.time, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          {formatRelativeDate(notif.createdAt)}
        </Text>
      </View>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onDismiss(); }}
        hitSlop={12}
        style={styles.dismiss}
      >
        <Feather name="x" size={14} color={theme.textTertiary} />
      </Pressable>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { theme, colors } = useTheme();
  const { notifications, markNotificationRead, dismissNotification, isLoading, refresh } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const markAllRead = useCallback(() => {
    notifications.filter((n) => !n.read).forEach((n) => markNotificationRead(n.id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [notifications, markNotificationRead]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {unreadCount > 0 && (
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Text style={[styles.headerText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
          </Text>
          <Pressable onPress={markAllRead}>
            <Text style={[styles.markAll, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              Marcar todas como lidas
            </Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24 },
          notifications.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <NotifCard
            notif={item}
            onRead={() => markNotificationRead(item.id)}
            onDismiss={() => dismissNotification(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
              <Feather name="bell" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
              Nenhuma notificação
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Alertas de orçamento, metas e relatórios aparecerão aqui
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerText: { fontSize: 13 },
  markAll: { fontSize: 13 },
  list: { padding: 16, gap: 10 },
  emptyList: { flex: 1, justifyContent: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  message: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 11, marginTop: 2 },
  dismiss: { padding: 4 },
  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17 },
  emptySub: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
});
