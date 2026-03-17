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

export default function AccountsScreen() {
  const { theme, colors, valuesVisible, toggleValuesVisible, maskValue } = useTheme();
  const { accounts, creditCards, updateAccount } = useFinance();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.archived);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={colors.primary} />}
    >
      {/* Bank Accounts */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Contas Bancárias
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => { toggleValuesVisible(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.eyeBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
            >
              <Feather name={valuesVisible ? 'eye' : 'eye-off'} size={16} color={colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/account/add')}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={18} color="#000" />
            </Pressable>
          </View>
        </View>

        {activeAccounts.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="credit-card" size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Nenhuma conta cadastrada</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {activeAccounts.map((acc) => (
              <View key={acc.id} style={[styles.accountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <LinearGradient colors={[`${acc.color}20`, `${acc.color}08`]} style={styles.cardGrad}>
                  <View style={styles.accountTop}>
                    <View style={[styles.accountIcon, { backgroundColor: `${acc.color}25` }]}>
                      <Feather name="credit-card" size={20} color={acc.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{acc.name}</Text>
                      <Text style={[styles.accountInst, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        {acc.institution} • {ACCOUNT_TYPE_LABELS[acc.type]}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        Alert.alert('Arquivar conta', 'Deseja arquivar esta conta?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Arquivar', onPress: () => { updateAccount(acc.id, { archived: true }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } }
                        ]);
                      }}
                    >
                      <Feather name="archive" size={16} color={theme.textTertiary} />
                    </Pressable>
                  </View>
                  <Text style={[styles.accountBalance, { color: acc.color, fontFamily: 'Inter_700Bold' }]}>
                    {maskValue(formatBRL(acc.balance))}
                  </Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Credit Cards */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
            Cartões de Crédito
          </Text>
        </View>
        {creditCards.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>Nenhum cartão cadastrado</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {creditCards.map((card) => {
              const usedPct = card.used / card.limit;
              return (
                <View key={card.id} style={[styles.cardCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.accountIcon, { backgroundColor: `${card.color}25` }]}>
                      <Feather name="credit-card" size={20} color={card.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{card.name}</Text>
                      <Text style={[styles.accountInst, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        {card.institution} • Vence {card.dueDate.split('-')[2]}/{card.dueDate.split('-')[1]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardUsage}>
                    <View style={styles.cardAmounts}>
                      <Text style={[styles.cardUsed, { color: usedPct > 0.8 ? colors.danger : theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                        {maskValue(formatBRL(card.used))}
                      </Text>
                      <Text style={[styles.cardLimit, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        / {maskValue(formatBRL(card.limit))}
                      </Text>
                    </View>
                    <Text style={[styles.cardAvail, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                      {maskValue(formatBRL(card.limit - card.used))} disponível
                    </Text>
                  </View>
                  <View style={[styles.usageBar, { backgroundColor: theme.surfaceElevated }]}>
                    <View
                      style={[
                        styles.usageFill,
                        {
                          backgroundColor: usedPct > 0.8 ? colors.danger : colors.primary,
                          width: `${usedPct * 100}%`,
                        }
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18 },
  eyeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 12 },
  accountCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  cardGrad: { padding: 16, gap: 12 },
  accountTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 16 },
  accountInst: { fontSize: 12, marginTop: 2 },
  accountBalance: { fontSize: 28 },
  cardCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardUsage: { gap: 2 },
  cardAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  cardUsed: { fontSize: 20 },
  cardLimit: { fontSize: 14 },
  cardAvail: { fontSize: 13 },
  usageBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  usageFill: { height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15 },
});
