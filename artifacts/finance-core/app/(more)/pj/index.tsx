import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Money } from '@/components/Money';
import { PressableScale, PressableElevate } from '@/components/ui/Pressable';
import { Icon } from '@/utils/icons';
import { FeatureGate } from '@/components/FeatureGate';
import { getCurrentMonth } from '@/utils/formatters';
import { listPjRevenues, listPjExpenses, listPjDas, type PjRevenue, type PjExpense, type PjDas } from '@/services/pj';
import { MEI_LIMITE_ANUAL } from '@/constants/pj';

export default function PJDashboard() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const currentMonth = getCurrentMonth();
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monthRev, setMonthRev] = useState<PjRevenue[]>([]);
  const [yearRev, setYearRev] = useState<PjRevenue[]>([]);
  const [monthExp, setMonthExp] = useState<PjExpense[]>([]);
  const [nextDas, setNextDas] = useState<PjDas | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [m, y, e, das] = await Promise.allSettled([
        listPjRevenues({ month: currentMonth }),
        listPjRevenues({ year: currentYear }),
        listPjExpenses({ month: currentMonth }),
        listPjDas({ year: currentYear, status: 'pendente' }),
      ]);
      setMonthRev(m.status === 'fulfilled' && Array.isArray(m.value) ? m.value : []);
      setYearRev(y.status === 'fulfilled' && Array.isArray(y.value) ? y.value : []);
      setMonthExp(e.status === 'fulfilled' && Array.isArray(e.value) ? e.value : []);
      const dasList = das.status === 'fulfilled' && Array.isArray(das.value) ? das.value : [];
      const sorted = [...dasList].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      setNextDas(sorted[0] ?? null);
      if ([m, y, e, das].every((r) => r.status === 'rejected')) {
        setError('Não foi possível conectar ao backend PJ. Tente novamente.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => { load(); }, [load]);

  const monthTotal = useMemo(() => monthRev.reduce((s, r) => s + r.amount, 0), [monthRev]);
  const monthExpTotal = useMemo(() => monthExp.reduce((s, e) => s + e.amount, 0), [monthExp]);
  const yearTotal = useMemo(() => yearRev.reduce((s, r) => s + r.amount, 0), [yearRev]);
  const limitPct = Math.min(100, (yearTotal / MEI_LIMITE_ANUAL) * 100);
  const limitColor = limitPct >= 100 ? colors.danger : limitPct >= 80 ? colors.warning : colors.success;

  const actions = [
    { name: 'pjRevenue',        label: 'Receitas',       route: '/(more)/pj/receitas',     color: colors.success },
    { name: 'pjExpenses',       label: 'Despesas',       route: '/(more)/pj/despesas',     color: colors.danger },
    { name: 'pjClients',        label: 'Clientes',       route: '/(more)/pj/clientes',     color: colors.primary },
    { name: 'pjDas',            label: 'DAS',            route: '/(more)/pj/das',          color: colors.warning },
    { name: 'pjDasn',           label: 'DASN-SIMEI',     route: '/(more)/pj/dasn-simei',   color: colors.info },
    { name: 'pjProlabore',      label: 'Pró-labore',     route: '/(more)/pj/retiradas',    color: colors.warning },
    { name: 'pjInvoices',       label: 'Notas fiscais',  route: '/(more)/pj/notas-fiscais', color: colors.primary },
    { name: 'pjCashflow',       label: 'Fluxo de caixa', route: '/(more)/pj/fluxo-caixa',  color: colors.success },
    { name: 'pjBusinessHealth', label: 'Saúde do negócio', route: '/(more)/pj/saude-negocio', color: colors.warning },
  ] as const;

  return (
    <FeatureGate
      feature="pj"
      title="Gestão PJ / MEI"
      icon="briefcase"
      description="Receitas, despesas, pró-labore, DAS, DASN-SIMEI e fluxo de caixa do seu negócio. Disponível nos planos PJ ou FAMILY."
    >
      <Stack.Screen options={{ title: 'PJ / MEI' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <LinearGradient
          colors={isDark ? ['#0A0F1E', '#131929'] : ['#EFF6FF', '#F7F9FC']}
          style={[styles.header, { paddingTop: 20 }]}
        >
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            PJ / MEI
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Gestão do seu negócio
          </Text>
        </LinearGradient>

        <View style={{ padding: 16, gap: 12 }}>
          {/* Cards principais */}
          <View style={styles.cardsRow}>
            <PressableElevate
              onPress={() => router.push('/(more)/pj/receitas')}
              haptic="light"
              style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              testID="pj-card-revenue"
            >
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Receitas (mês)
              </Text>
              <Money value={monthTotal} size="lg" weight="700" color={colors.success} />
            </PressableElevate>

            <PressableElevate
              onPress={() => router.push('/(more)/pj/despesas')}
              haptic="light"
              style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              testID="pj-card-expenses"
            >
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Despesas (mês)
              </Text>
              <Money value={monthExpTotal} size="lg" weight="700" color={colors.danger} />
            </PressableElevate>
          </View>

          {/* Limite MEI */}
          <View style={[styles.limitCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.limitHeader}>
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                Limite anual MEI
              </Text>
              <Text style={[styles.limitPct, { color: limitColor, fontFamily: 'RobotoMono_700Bold' }]}>
                {limitPct.toFixed(1)}%
              </Text>
            </View>
            <Money value={yearTotal} size="xl" weight="700" />
            <Text style={[styles.limitSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              de R$ {MEI_LIMITE_ANUAL.toLocaleString('pt-BR')}
            </Text>
            <View style={[styles.bar, { backgroundColor: theme.surfaceElevated }]}>
              <View style={[styles.barFill, { width: `${limitPct}%`, backgroundColor: limitColor }]} />
            </View>
          </View>

          {/* Próximo DAS */}
          {nextDas && (
            <PressableElevate
              onPress={() => router.push('/(more)/pj/das')}
              haptic="light"
              style={[styles.dasCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}
              testID="pj-next-das"
            >
              <View style={[styles.dasIcon, { backgroundColor: `${colors.warning}25` }]}>
                <Icon name="file-text" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.dasTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                  Próximo DAS
                </Text>
                <Text style={[styles.dasSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                  Vence {formatDate(nextDas.dueDate)}
                </Text>
              </View>
              <Money value={nextDas.amount} size="md" weight="700" color={colors.warning} />
            </PressableElevate>
          )}

          {/* Atalhos */}
          <View style={styles.actionsGrid}>
            {actions.map((a) => (
              <PressableScale
                key={a.label}
                onPress={() => router.push(a.route)}
                haptic="light"
                style={[styles.action, { backgroundColor: theme.card, borderColor: theme.border }]}
                testID={`pj-action-${a.name}`}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${a.color}15` }]}>
                  <Icon name={a.name as any} size={20} color={a.color} />
                </View>
                <Text style={[styles.actionLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
                  {a.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} />}
          {error && (
            <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </FeatureGate>
  );
}

function formatDate(iso: string) {
  try { return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR'); } catch { return iso; }
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  headerTitle: { fontSize: 26, letterSpacing: -0.5 },
  headerSub: { fontSize: 14 },

  cardsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, gap: 4 },
  statLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },

  limitCard: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 6 },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitPct: { fontSize: 16 },
  limitSub: { fontSize: 12 },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 8 },

  dasCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  dasIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dasTitle: { fontSize: 14 },
  dasSub: { fontSize: 12, marginTop: 2 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    flexBasis: '31.5%', flexGrow: 1,
    padding: 12, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', gap: 6,
  },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, textAlign: 'center' },

  errorText: { textAlign: 'center', marginTop: 8 },
});
