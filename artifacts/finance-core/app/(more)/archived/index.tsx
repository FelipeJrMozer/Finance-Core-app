import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { apiGet, apiPatch } from '@/services/api';
import { formatBRL, formatDate } from '@/utils/formatters';

type ArchivedType = 'goal' | 'account' | 'budget' | 'recurring' | 'alert';

interface ArchivedItem {
  id: string;
  type: ArchivedType;
  name: string;
  description?: string;
  archivedAt?: string;
  amount?: number;
  currency?: string;
}

interface ApiArchived {
  goals?: ArchivedItem[];
  accounts?: ArchivedItem[];
  budgets?: ArchivedItem[];
  recurrings?: ArchivedItem[];
  alerts?: ArchivedItem[];
}

const TYPE_META: Record<ArchivedType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  goal:      { label: 'Meta',         icon: 'target',       color: '#10B981' },
  account:   { label: 'Conta',        icon: 'briefcase',    color: '#3B82F6' },
  budget:    { label: 'Orçamento',    icon: 'pie-chart',    color: '#F59E0B' },
  recurring: { label: 'Recorrência',  icon: 'repeat',       color: '#7B39ED' },
  alert:     { label: 'Alerta',       icon: 'bell',         color: '#EF4444' },
};

const TAB_TYPES: ArchivedType[] = ['goal', 'account', 'budget', 'recurring', 'alert'];

export default function ArchivedHubScreen() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<ApiArchived>({});
  const [activeType, setActiveType] = useState<ArchivedType>('goal');
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiGet<ApiArchived>('/api/archived');
      setData(res ?? {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getItems = (): ArchivedItem[] => {
    switch (activeType) {
      case 'goal':      return data.goals ?? [];
      case 'account':   return data.accounts ?? [];
      case 'budget':    return data.budgets ?? [];
      case 'recurring': return data.recurrings ?? [];
      case 'alert':     return data.alerts ?? [];
    }
  };

  const handleRestore = async (item: ArchivedItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestoring(item.id);
    try {
      await apiPatch(`/api/archived/${item.type}s/${item.id}/restore`, {});
      setData((prev) => {
        const key = `${item.type}s` as keyof ApiArchived;
        return {
          ...prev,
          [key]: ((prev[key] as ArchivedItem[] | undefined) ?? []).filter((i) => i.id !== item.id),
        };
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
    } finally {
      setRestoring(null);
    }
  };

  const items = getItems();
  const meta = TYPE_META[activeType];
  const totalCount = TAB_TYPES.reduce((s, t) => {
    const k = `${t}s` as keyof ApiArchived;
    return s + ((data[k] as ArchivedItem[] | undefined)?.length ?? 0);
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#F5F3FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.headerIcon, { backgroundColor: `${colors.primary}20` }]}>
            <Feather name="archive" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Itens Arquivados</Text>
            <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {totalCount} item{totalCount !== 1 ? 's' : ''} arquivado{totalCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.tabRow}>
            {TAB_TYPES.map((t) => {
              const m = TYPE_META[t];
              const count = ((data[`${t}s` as keyof ApiArchived] as ArchivedItem[] | undefined)?.length ?? 0);
              const active = t === activeType;
              return (
                <Pressable
                  key={t}
                  onPress={() => { Haptics.selectionAsync(); setActiveType(t); }}
                  style={[s.tab, {
                    backgroundColor: active ? m.color : theme.surfaceElevated,
                    borderColor: active ? m.color : theme.border,
                  }]}
                >
                  <Feather name={m.icon} size={13} color={active ? '#fff' : theme.textSecondary} />
                  <Text style={[s.tabText, { color: active ? '#fff' : theme.textSecondary, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                    {m.label} {count > 0 ? `(${count})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 32 }}
        >
          {items.length === 0 ? (
            <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
              <View style={[s.emptyIcon, { backgroundColor: `${meta.color}15` }]}>
                <Feather name={meta.icon} size={32} color={meta.color} />
              </View>
              <Text style={[s.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Sem {meta.label.toLowerCase()}s arquivadas
              </Text>
              <Text style={[s.emptyDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Itens arquivados aparecem aqui e podem ser restaurados a qualquer momento.
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[s.itemIcon, { backgroundColor: `${meta.color}15` }]}>
                  <Feather name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemName, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text style={[s.itemDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                  {item.amount != null && (
                    <Text style={[s.itemAmount, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {formatBRL(item.amount)}
                    </Text>
                  )}
                  {item.archivedAt && (
                    <Text style={[s.itemDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                      Arquivado em {formatDate(item.archivedAt)}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => handleRestore(item)}
                  disabled={restoring === item.id}
                  style={[s.restoreBtn, { borderColor: meta.color }]}
                >
                  {restoring === item.id ? (
                    <ActivityIndicator size="small" color={meta.color} />
                  ) : (
                    <>
                      <Feather name="rotate-ccw" size={14} color={meta.color} />
                      <Text style={[s.restoreText, { color: meta.color, fontFamily: 'Inter_600SemiBold' }]}>Restaurar</Text>
                    </>
                  )}
                </Pressable>
              </View>
            ))
          )}

          <View style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="info" size={14} color={theme.textTertiary} />
            <Text style={[s.infoText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              Itens arquivados são mantidos para histórico e podem ser restaurados. Itens não restaurados são removidos permanentemente após 90 dias.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22 },
  subtitle: { fontSize: 13, marginTop: 1 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 13 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14 },
  itemDesc: { fontSize: 12, marginTop: 2 },
  itemAmount: { fontSize: 12, marginTop: 2 },
  itemDate: { fontSize: 11, marginTop: 3 },
  restoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  restoreText: { fontSize: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17 },
  emptyDesc: { fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  infoCard: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
