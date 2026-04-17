import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', savings: 'Poupança', investment: 'Investimentos', credit: 'Crédito'
};

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  checking: 'briefcase', savings: 'database', investment: 'trending-up', credit: 'credit-card'
};

export default function AccountsScreen() {
  const { theme, colors, maskValue } = useTheme();
  const { accounts, creditCards, updateAccount } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.archived);
  // Bank accounts only — credit accounts have negative balances representing card debt
  // and would distort the total cash balance shown in this screen.
  const bankAccounts = activeAccounts.filter((a) => a.type !== 'credit');
  const totalBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalCardUsed = creditCards.reduce((s, c) => s + c.used, 0);
  const totalCardLimit = creditCards.reduce((s, c) => s + c.limit, 0);

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
      <View style={[styles.summaryCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
        <Text style={[styles.summaryLabel, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>Saldo total em contas</Text>
        <Text style={[styles.summaryValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalBalance))}</Text>
        <Text style={[styles.summarySub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{bankAccounts.length} conta{bankAccounts.length !== 1 ? 's' : ''} bancária{bankAccounts.length !== 1 ? 's' : ''}</Text>
      </View>

      <View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Contas Bancárias
          </Text>
          <Pressable
            onPress={() => router.push('/account/add')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#000" />
          </Pressable>
        </View>

        {bankAccounts.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="briefcase" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Nenhuma conta cadastrada
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {bankAccounts.map((acc) => (
              <Pressable
                key={acc.id}
                onPress={() => router.push({ pathname: '/account/[id]', params: { id: acc.id } })}
                style={[styles.accountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <LinearGradient colors={[`${acc.color}20`, `${acc.color}05`]} style={styles.cardGrad}>
                  <View style={styles.accountTop}>
                    <View style={[styles.accountIcon, { backgroundColor: `${acc.color}25` }]}>
                      <Feather name={(ACCOUNT_TYPE_ICONS[acc.type] || 'credit-card') as any} size={20} color={acc.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{acc.name}</Text>
                      <Text style={[styles.accountInst, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        {acc.institution} • {ACCOUNT_TYPE_LABELS[acc.type]}
                      </Text>
                    </View>
                    <View style={styles.accountActions}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert('Arquivar conta', `Deseja arquivar "${acc.name}"?`, [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Arquivar',
                              onPress: () => {
                                updateAccount(acc.id, { archived: true });
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              },
                            },
                          ]);
                        }}
                        hitSlop={8}
                      >
                        <Feather name="archive" size={16} color={theme.textTertiary} />
                      </Pressable>
                      <Feather name="chevron-right" size={16} color={theme.textTertiary} />
                    </View>
                  </View>
                  <Text style={[styles.accountBalance, { color: acc.color, fontFamily: 'Inter_700Bold' }]}>
                    {maskValue(formatBRL(acc.balance))}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {false && (
      <View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Cartões de Crédito
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
              const usedPct = Math.min(card.used / card.limit, 1);
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
                      <View
                        style={[
                          styles.usageFill,
                          { backgroundColor: isHighUsage ? colors.danger : card.color, width: `${usedPct * 100}%` }
                        ]}
                      />
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
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  summaryCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  summaryLabel: { fontSize: 12, marginBottom: 4 },
  summaryValue: { fontSize: 26 },
  summarySub: { fontSize: 11, marginTop: 4 },
  summarySubValue: { fontSize: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 12 },
  accountCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  cardGrad: { padding: 16, gap: 10 },
  cardInner: { padding: 16, gap: 10 },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 15 },
  accountInst: { fontSize: 12, marginTop: 2 },
  accountActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountBalance: { fontSize: 28 },
  cardCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
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
