import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth, formatMonthYear } from '@/utils/formatters';
import { getCategoryInfo } from '@/components/CategoryBadge';

const { width } = Dimensions.get('window');
const CHART_W = width - 48;

type Period = '6m' | '12m';

export default function NetWorthScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { transactions, accounts, investments, creditCards } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('6m');

  const months = period === '6m' ? 6 : 12;

  const totalAccounts = accounts.filter((a) => !a.archived && a.type !== 'credit').reduce((s, a) => s + a.balance, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCredit = creditCards.reduce((s, c) => s + c.used, 0);
  const netWorth = totalAccounts + totalInvestments - totalCredit;

  const monthlyData = useMemo(() => Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthTx = transactions.filter((t) => (t.transactionDate ?? t.date) <= `${m}-31`);
    const inc = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { label: formatMonthYear(m), net: inc - exp, month: m };
  }), [transactions, months]);

  const chartData = monthlyData.map((d) => ({ value: Math.max(0, d.net + netWorth * 0.85), label: d.label.substring(0, 3) }));
  const maxVal = Math.max(...chartData.map((d) => d.value), netWorth, 1);

  const breakdown = [
    { label: 'Contas bancárias', value: totalAccounts, icon: 'credit-card', color: colors.primary, sign: 1 },
    { label: 'Investimentos', value: totalInvestments, icon: 'trending-up', color: '#10B981', sign: 1 },
    { label: 'Dívidas (cartão)', value: totalCredit, icon: 'alert-circle', color: colors.danger, sign: -1 },
  ];

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 700); };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Patrimônio Líquido</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Visão consolidada do seu patrimônio
        </Text>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={s.nwCard}>
          <Text style={[s.nwLabel, { fontFamily: 'Inter_400Regular' }]}>Total</Text>
          <Text style={[s.nwValue, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(netWorth))}</Text>
          <Text style={[s.nwSub, { fontFamily: 'Inter_400Regular' }]}>
            {netWorth >= 0 ? '▲ Patrimônio positivo' : '▼ Passivos superam ativos'}
          </Text>
        </LinearGradient>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Composição</Text>
          {breakdown.map((item) => (
            <View key={item.label} style={s.row}>
              <View style={[s.iconBox, { backgroundColor: `${item.color}15` }]}>
                <Feather name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={[s.rowLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                {item.label}
              </Text>
              <Text style={[s.rowValue, { color: item.sign === 1 ? item.color : colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                {item.sign === -1 ? '-' : ''}{maskValue(formatBRL(item.value))}
              </Text>
            </View>
          ))}
          <View style={[s.divider, { backgroundColor: theme.border }]} />
          <View style={s.row}>
            <Text style={[s.rowLabel, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Patrimônio Líquido</Text>
            <Text style={[s.rowValue, { color: netWorth >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
              {maskValue(formatBRL(netWorth))}
            </Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Evolução</Text>
            <View style={s.periodRow}>
              {(['6m', '12m'] as Period[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[s.periodBtn, { backgroundColor: period === p ? colors.primary : theme.surfaceElevated, borderColor: theme.border }]}
                >
                  <Text style={[s.periodText, { color: period === p ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {chartData.length > 1 && (
            <LineChart
              data={chartData}
              width={CHART_W - 24}
              height={140}
              color={colors.primary}
              thickness={2.5}
              curved
              hideDataPoints={false}
              dataPointsColor={colors.primary}
              dataPointsRadius={4}
              startFillColor={colors.primary}
              endFillColor={`${colors.primary}00`}
              startOpacity={0.25}
              endOpacity={0}
              areaChart
              noOfSections={4}
              rulesColor={theme.border}
              yAxisTextStyle={{ color: theme.textTertiary, fontSize: 9, fontFamily: 'Inter_400Regular' }}
              xAxisColor={theme.border}
              maxValue={maxVal * 1.1}
              initialSpacing={10}
              spacing={(CHART_W - 60) / Math.max(chartData.length - 1, 1)}
              xAxisLabelTextStyle={{ color: theme.textTertiary, fontSize: 8, fontFamily: 'Inter_400Regular' }}
            />
          )}
        </View>

        <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Indicadores</Text>
          {[
            {
              label: 'Liquidez imediata',
              desc: 'Meses de custo de vida em contas',
              value: (() => {
                const monthly = transactions
                  .filter((t) => t.type === 'expense' && (t.transactionDate ?? t.date) >= (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })())
                  .reduce((s, t) => s + t.amount, 0) / 3;
                return monthly > 0 ? (totalAccounts / monthly).toFixed(1) + ' meses' : '—';
              })(),
              icon: 'droplet',
              color: colors.primary,
            },
            {
              label: 'Alocação em investimentos',
              desc: `${totalInvestments > 0 ? ((totalInvestments / Math.max(netWorth, 1)) * 100).toFixed(0) : 0}% do patrimônio`,
              value: maskValue(formatBRL(totalInvestments)),
              icon: 'trending-up',
              color: '#10B981',
            },
            {
              label: 'Comprometimento (cartão)',
              desc: 'Passivo total',
              value: maskValue(formatBRL(totalCredit)),
              icon: 'alert-circle',
              color: totalCredit > netWorth * 0.3 ? colors.danger : colors.warning,
            },
          ].map((item) => (
            <View key={item.label} style={s.indicRow}>
              <View style={[s.iconBox, { backgroundColor: `${item.color}15` }]}>
                <Feather name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.indicLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{item.label}</Text>
                <Text style={[s.indicDesc, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{item.desc}</Text>
              </View>
              <Text style={[s.indicValue, { color: item.color, fontFamily: 'Inter_600SemiBold' }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  nwCard: { borderRadius: 20, padding: 18, gap: 4, marginTop: 8 },
  nwLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 13 },
  nwValue: { color: '#000', fontSize: 34 },
  nwSub: { color: 'rgba(0,0,0,0.6)', fontSize: 12, marginTop: 4 },
  card: { borderRadius: 16, padding: 16, gap: 14, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 14 },
  rowValue: { fontSize: 15 },
  divider: { height: 1 },
  periodRow: { flexDirection: 'row', gap: 6 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  periodText: { fontSize: 12 },
  indicRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  indicLabel: { fontSize: 14 },
  indicDesc: { fontSize: 12, marginTop: 1 },
  indicValue: { fontSize: 14 },
});
