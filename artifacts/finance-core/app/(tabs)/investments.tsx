import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, Investment } from '@/context/FinanceContext';
import { formatBRL, formatPercent } from '@/utils/formatters';

const TYPE_LABELS: Record<string, string> = {
  stocks: 'Ações BR', fii: 'FIIs', reit: 'REITs', fixed: 'Renda Fixa', crypto: 'Cripto', etf: 'ETFs'
};
const TYPE_COLORS: Record<string, string> = {
  stocks: '#2196F3', fii: '#9C27B0', reit: '#FF9800', fixed: '#4CAF50', crypto: '#FF6B35', etf: '#00BCD4'
};

function InvestmentCard({ investment, onPress }: { investment: Investment; onPress: () => void }) {
  const { theme, colors, maskValue } = useTheme();
  const invested = investment.quantity * investment.avgPrice;
  const current = investment.quantity * investment.currentPrice;
  const profit = current - invested;
  const pctReturn = invested > 0 ? ((current - invested) / invested) * 100 : 0;
  const typeColor = TYPE_COLORS[investment.type] || colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={[styles.investCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.typeTag, { backgroundColor: `${typeColor}20` }]}>
          <Text style={[styles.typeTagText, { color: typeColor, fontFamily: 'Inter_600SemiBold' }]}>
            {TYPE_LABELS[investment.type]}
          </Text>
        </View>
        <View style={styles.investTop}>
          <View>
            <Text style={[styles.ticker, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {investment.ticker}
            </Text>
            <Text style={[styles.investName, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
              {investment.name}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.currentValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {maskValue(formatBRL(current))}
            </Text>
            <View style={[
              styles.pctBadge,
              { backgroundColor: pctReturn >= 0 ? `${colors.primary}20` : `${colors.danger}20` }
            ]}>
              <Feather
                name={pctReturn >= 0 ? 'trending-up' : 'trending-down'}
                size={12}
                color={pctReturn >= 0 ? colors.primary : colors.danger}
              />
              <Text style={[
                styles.pctText,
                { color: pctReturn >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_600SemiBold' }
              ]}>
                {formatPercent(pctReturn)}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.investBottom}>
          <View>
            <Text style={[styles.metaLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Investido</Text>
            <Text style={[styles.metaValue, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {maskValue(formatBRL(invested))}
            </Text>
          </View>
          <View>
            <Text style={[styles.metaLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Qtd</Text>
            <Text style={[styles.metaValue, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              {investment.quantity}
            </Text>
          </View>
          <View>
            <Text style={[styles.metaLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
              {profit >= 0 ? 'Lucro' : 'Perda'}
            </Text>
            <Text style={[styles.metaValue, { color: profit >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
              {maskValue(formatBRL(profit))}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function InvestmentsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { investments, isLoading } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const totalInvested = investments.reduce((s, i) => s + i.quantity * i.avgPrice, 0);
  const totalCurrent = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalProfit = totalCurrent - totalInvested;
  const pctReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const filtered = filter === 'all' ? investments : investments.filter((i) => i.type === filter);

  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ['#0A0A0F', '#0D1A14'] : ['#F0FFF4', '#F5F7FA']}
          style={[styles.header, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.headerTop}>
            <Text style={[styles.screenTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Carteira
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                testID="add-investment"
                onPress={() => { Haptics.selectionAsync(); router.push('/investment/add'); }}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={20} color="#000" />
              </Pressable>
            </View>
          </View>

          {/* Portfolio Card */}
          <LinearGradient
            colors={totalProfit >= 0 ? [colors.primary, colors.primaryDark] : [colors.danger, '#CC0000']}
            style={styles.portfolioCard}
          >
            <Text style={[styles.portfolioLabel, { fontFamily: 'Inter_400Regular' }]}>Valor atual</Text>
            <Text style={[styles.portfolioValue, { fontFamily: 'Inter_700Bold' }]}>
              {maskValue(formatBRL(totalCurrent))}
            </Text>
            <View style={styles.portfolioStats}>
              <View>
                <Text style={[styles.portfolioMeta, { fontFamily: 'Inter_400Regular' }]}>Investido</Text>
                <Text style={[styles.portfolioMetaVal, { fontFamily: 'Inter_600SemiBold' }]}>
                  {maskValue(formatBRL(totalInvested))}
                </Text>
              </View>
              <View style={[styles.dividerV, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
              <View>
                <Text style={[styles.portfolioMeta, { fontFamily: 'Inter_400Regular' }]}>
                  {totalProfit >= 0 ? 'Lucro' : 'Perda'}
                </Text>
                <Text style={[styles.portfolioMetaVal, { fontFamily: 'Inter_600SemiBold' }]}>
                  {maskValue(formatBRL(totalProfit))}
                </Text>
              </View>
              <View style={[styles.dividerV, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
              <View>
                <Text style={[styles.portfolioMeta, { fontFamily: 'Inter_400Regular' }]}>Retorno</Text>
                <Text style={[styles.portfolioMetaVal, { fontFamily: 'Inter_600SemiBold' }]}>
                  {formatPercent(pctReturn)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Type Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 12 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, flexDirection: 'row' }}>
          {['all', 'stocks', 'fii', 'reit', 'fixed', 'crypto', 'etf'].map((type) => (
            <Pressable
              key={type}
              onPress={() => { setFilter(type); Haptics.selectionAsync(); }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === type ? colors.primary : theme.surfaceElevated,
                  borderColor: filter === type ? colors.primary : theme.border,
                }
              ]}
            >
              <Text style={[
                styles.filterText,
                {
                  color: filter === type ? '#000' : theme.textSecondary,
                  fontFamily: filter === type ? 'Inter_600SemiBold' : 'Inter_400Regular'
                }
              ]}>
                {type === 'all' ? 'Todos' : TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Investments List */}
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="pie-chart" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Nenhum ativo
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Adicione seu primeiro investimento
              </Text>
            </View>
          ) : (
            filtered.map((inv) => (
              <InvestmentCard
                key={inv.id}
                investment={inv}
                onPress={() => router.push({ pathname: '/investment/[id]', params: { id: inv.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  screenTitle: { fontSize: 26 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  portfolioCard: { borderRadius: 20, padding: 20, gap: 16 },
  portfolioLabel: { color: 'rgba(0,0,0,0.7)', fontSize: 14 },
  portfolioValue: { color: '#000', fontSize: 36 },
  portfolioStats: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  portfolioMeta: { color: 'rgba(0,0,0,0.7)', fontSize: 12 },
  portfolioMetaVal: { color: '#000', fontSize: 15 },
  dividerV: { width: 1, height: 30 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13 },
  investCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  typeTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeTagText: { fontSize: 11 },
  investTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticker: { fontSize: 20 },
  investName: { fontSize: 13, marginTop: 2 },
  currentValue: { fontSize: 18 },
  pctBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  pctText: { fontSize: 13 },
  divider: { height: 1 },
  investBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 11 },
  metaValue: { fontSize: 14, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
