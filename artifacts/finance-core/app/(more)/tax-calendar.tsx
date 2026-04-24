import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { getTaxCalendar, type TaxCalendarEntry } from '@/services/tax';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const TYPE_COLOR: Record<TaxCalendarEntry['type'], string> = {
  IRPF: '#0EA5E9',
  DARF: '#F97316',
  DAS:  '#10B981',
  DASN: '#A855F7',
  Outro: '#64748B',
};

export default function TaxCalendarScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<TaxCalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const list = await getTaxCalendar(year);
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setError('Não foi possível carregar o calendário fiscal.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const byMonth = useMemo(() => {
    const map: Record<number, TaxCalendarEntry[]> = {};
    for (const entry of items) {
      const m = Number(entry.date.split('-')[1] ?? 0);
      if (m < 1 || m > 12) continue;
      (map[m] ??= []).push(entry);
    }
    for (const k of Object.keys(map)) {
      map[Number(k)].sort((a, b) => a.date.localeCompare(b.date));
    }
    return map;
  }, [items]);

  return (
    <>
      <Stack.Screen options={{ title: 'Calendário fiscal' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.yearRow}>
          <PressableScale onPress={() => setYear((y) => y - 1)} haptic="light" style={[styles.yearBtn, { borderColor: theme.border }]} testID="cal-prev-year">
            <Icon name="chevron-left" size={18} color={theme.text} />
          </PressableScale>
          <Text style={[styles.yearText, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{year}</Text>
          <PressableScale onPress={() => setYear((y) => y + 1)} haptic="light" style={[styles.yearBtn, { borderColor: theme.border }]} testID="cal-next-year">
            <Icon name="chevron-right" size={18} color={theme.text} />
          </PressableScale>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="Sem obrigações neste ano"
            description={error ?? 'Nenhuma data fiscal encontrada para o ano selecionado.'}
          />
        ) : (
          MONTH_NAMES.map((name, idx) => {
            const month = idx + 1;
            const entries = byMonth[month] ?? [];
            if (entries.length === 0) return null;
            return (
              <View key={month} style={[styles.monthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.monthTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                  {name}
                </Text>
                {entries.map((e, i) => (
                  <View key={`${e.date}-${i}`} style={styles.entryRow}>
                    <View style={[styles.chip, { backgroundColor: `${TYPE_COLOR[e.type] ?? colors.primary}22` }]}>
                      <Text style={{
                        color: TYPE_COLOR[e.type] ?? colors.primary,
                        fontSize: 11, fontFamily: 'Inter_700Bold',
                      }}>
                        {e.type}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.entryTitle, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                        {e.title}
                      </Text>
                      {e.description && (
                        <Text style={[styles.entryDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                          {e.description}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.entryDate, { color: theme.textSecondary, fontFamily: 'RobotoMono_500Medium' }]}>
                      {formatDate(e.date)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 4 },
  yearBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  yearText: { fontSize: 22, minWidth: 80, textAlign: 'center' },

  monthCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  monthTitle: { fontSize: 15 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  entryTitle: { fontSize: 13 },
  entryDesc: { fontSize: 11, marginTop: 1 },
  entryDate: { fontSize: 12 },
});
