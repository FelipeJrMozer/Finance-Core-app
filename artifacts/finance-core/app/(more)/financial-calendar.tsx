import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { getUpcomingEvents, UpcomingEvent } from '@/services/reports';
import { formatBRL } from '@/utils/formatters';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  bill:    { icon: 'file-text', color: '#EF4444', label: 'Conta' },
  goal:    { icon: 'target',    color: '#3B82F6', label: 'Meta' },
  income:  { icon: 'trending-up', color: '#10B981', label: 'Receita' },
  expense: { icon: 'shopping-bag', color: '#F59E0B', label: 'Despesa' },
  tax:     { icon: 'percent',   color: '#9C27B0', label: 'Imposto' },
  other:   { icon: 'calendar',  color: '#6B7280', label: 'Evento' },
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function FinancialCalendarScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [days, setDays] = useState(30);

  const load = async () => {
    try {
      setLoading(true);
      const data = await getUpcomingEvents(days);
      setEvents(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const grouped = events.reduce<Record<string, UpcomingEvent[]>>((acc, e) => {
    const key = e.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const sortedKeys = Object.keys(grouped).sort();

  const urgent = events.filter((e) => daysUntil(e.date) <= 7);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Calendário Financeiro</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Próximos vencimentos e eventos
        </Text>
        <View style={s.periodRow}>
          {[7, 15, 30, 60].map((d) => (
            <Pressable
              key={d}
              onPress={() => setDays(d)}
              style={[s.periodBtn, { backgroundColor: days === d ? colors.primary : theme.surface, borderColor: days === d ? colors.primary : theme.border }]}
            >
              <Text style={[s.periodText, { color: days === d ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                {d}d
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 32 }}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : events.length === 0 ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <Feather name="calendar" size={40} color={theme.textTertiary} />
            <Text style={[{ color: theme.textSecondary, fontSize: 16, fontFamily: 'Inter_500Medium' }]}>
              Nenhum evento nos próximos {days} dias
            </Text>
          </View>
        ) : (
          <>
            {urgent.length > 0 && (
              <View style={[s.urgentCard, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30` }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Feather name="alert-circle" size={15} color={colors.danger} />
                  <Text style={[s.urgentTitle, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                    Próximos 7 dias ({urgent.length})
                  </Text>
                </View>
                {urgent.map((e) => {
                  const meta = TYPE_META[e.type] ?? TYPE_META.other;
                  const d = daysUntil(e.date);
                  return (
                    <View key={e.id} style={s.urgentRow}>
                      <View style={[s.dot, { backgroundColor: meta.color }]} />
                      <Text style={[s.urgentLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                        {e.description}
                      </Text>
                      <Text style={[s.urgentDays, { color: d === 0 ? colors.danger : theme.textTertiary, fontFamily: 'Inter_600SemiBold' }]}>
                        {d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `${d}d`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {sortedKeys.map((date) => {
              const dayEvents = grouped[date];
              const d = daysUntil(date);
              return (
                <View key={date}>
                  <View style={s.dateHeader}>
                    <View style={[s.dateBadge, { backgroundColor: d <= 3 ? `${colors.danger}20` : theme.surfaceElevated }]}>
                      <Text style={[s.dateText, { color: d <= 3 ? colors.danger : theme.textTertiary, fontFamily: 'Inter_600SemiBold' }]}>
                        {formatDate(date)}
                      </Text>
                    </View>
                    <View style={[s.dateLine, { backgroundColor: theme.border }]} />
                    <Text style={[s.daysAway, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                      {d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `em ${d} dias`}
                    </Text>
                  </View>
                  {dayEvents.map((e) => {
                    const meta = TYPE_META[e.type] ?? TYPE_META.other;
                    return (
                      <View key={e.id} style={[s.eventCard, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: meta.color }]}>
                        <View style={[s.eventIcon, { backgroundColor: `${meta.color}20` }]}>
                          <Feather name={meta.icon as any} size={16} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.eventTitle, { color: theme.text, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>
                            {e.description}
                          </Text>
                          <Text style={[s.eventType, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                            {meta.label}
                          </Text>
                        </View>
                        {e.amount != null && e.amount > 0 && (
                          <Text style={[s.eventAmount, { color: e.type === 'income' ? colors.primary : colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                            {maskValue(formatBRL(e.amount))}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  periodRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  periodText: { fontSize: 13 },
  urgentCard: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  urgentTitle: { fontSize: 14 },
  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  urgentLabel: { flex: 1, fontSize: 13 },
  urgentDays: { fontSize: 12 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dateBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dateText: { fontSize: 12 },
  dateLine: { flex: 1, height: 1 },
  daysAway: { fontSize: 11 },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, marginBottom: 8 },
  eventIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 14 },
  eventType: { fontSize: 11, marginTop: 1 },
  eventAmount: { fontSize: 14 },
});
