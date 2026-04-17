import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

export default function CardsScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { creditCards } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const totalCardUsed = creditCards.reduce((s, c) => s + c.used, 0);
  const totalCardLimit = creditCards.reduce((s, c) => s + c.limit, 0);
  const totalAvailable = totalCardLimit - totalCardUsed;
  const utilizationPct = totalCardLimit > 0 ? Math.min(totalCardUsed / totalCardLimit, 1) : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }}
          tintColor={colors.primary}
        />
      }
    >
      <View style={[styles.summaryCard, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}30` }]}>
        <View style={styles.summaryRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: colors.danger, fontFamily: 'Inter_400Regular' }]}>Fatura total</Text>
            <Text style={[styles.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalCardUsed))}</Text>
            <Text style={[styles.summarySub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>de {maskValue(formatBRL(totalCardLimit))} de limite</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.summaryLabel, { color: colors.success, fontFamily: 'Inter_400Regular' }]}>Disponível</Text>
            <Text style={[styles.summarySubValue, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(totalAvailable))}</Text>
          </View>
        </View>
        {totalCardLimit > 0 && (
          <View style={[styles.bar, { backgroundColor: theme.surfaceElevated, marginTop: 12 }]}>
            <View style={[styles.barFill, { width: `${utilizationPct * 100}%`, backgroundColor: utilizationPct > 0.8 ? colors.danger : colors.warning }]} />
          </View>
        )}
      </View>

      <View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Meus Cartões
          </Text>
          <Pressable
            onPress={() => router.push('/card/add')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#000" />
          </Pressable>
        </View>

        {creditCards.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="credit-card" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Nenhum cartão cadastrado
            </Text>
            <Pressable
              onPress={() => router.push('/card/add')}
              style={[styles.emptyBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}40` }]}
            >
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.emptyBtnText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                Adicionar cartão
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {creditCards.map((card) => {
              const usedPct = card.limit > 0 ? Math.min(card.used / card.limit, 1) : 0;
              const isHighUsage = usedPct > 0.8;
              return (
                <Pressable
                  key={card.id}
                  onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
                  style={[styles.cardCard, { backgroundColor: theme.surface, borderColor: isHighUsage ? `${colors.danger}60` : theme.border }]}
                >
                  <LinearGradient colors={[`${card.color}15`, `${card.color}05`]} style={styles.cardInner}>
                    <View style={styles.cardTop}>
                      <View style={[styles.accountIcon, { backgroundColor: `${card.color}25` }]}>
                        <Feather name="credit-card" size={20} color={card.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.accountName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{card.name}</Text>
                        <Text style={[styles.accountInst, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                          {card.institution} • Vence dia {card.dueDate.split('-')[2]}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.textTertiary} />
                    </View>

                    <View style={styles.cardUsage}>
                      <View style={styles.cardAmounts}>
                        <Text style={[styles.cardUsed, { color: isHighUsage ? colors.danger : theme.text, fontFamily: 'Inter_700Bold' }]}>
                          {maskValue(formatBRL(card.used))}
                        </Text>
                        <Text style={[styles.cardLimit, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                          {' '}/ {maskValue(formatBRL(card.limit))}
                        </Text>
                      </View>
                      <View style={styles.cardMeta}>
                        <Text style={[styles.cardAvail, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                          {maskValue(formatBRL(card.limit - card.used))} disponível
                        </Text>
                        {isHighUsage && (
                          <View style={[styles.alertBadge, { backgroundColor: `${colors.danger}20` }]}>
                            <Feather name="alert-circle" size={11} color={colors.danger} />
                            <Text style={[styles.alertText, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                              Limite alto
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={[styles.usageBar, { backgroundColor: theme.surfaceElevated }]}>
                      <View style={[styles.usageFill, { backgroundColor: isHighUsage ? colors.danger : card.color, width: `${usedPct * 100}%` }]} />
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={[styles.cardFooterText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        Fecha dia {card.closingDate.split('-')[2]}
                      </Text>
                      <Text style={[styles.cardFooterText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {Math.round(usedPct * 100)}% utilizado
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 24 },
  summarySub: { fontSize: 11, marginTop: 4 },
  summarySubValue: { fontSize: 18 },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 12 },
  accountIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 15 },
  accountInst: { fontSize: 12, marginTop: 2 },
  cardCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  cardInner: { padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardUsage: { gap: 4 },
  cardAmounts: { flexDirection: 'row', alignItems: 'baseline' },
  cardUsed: { fontSize: 22 },
  cardLimit: { fontSize: 14 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardAvail: { fontSize: 12 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  alertText: { fontSize: 10 },
  usageBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  usageFill: { height: 8, borderRadius: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardFooterText: { fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 15 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  emptyBtnText: { fontSize: 14 },
});
