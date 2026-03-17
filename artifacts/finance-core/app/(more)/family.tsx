import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance, FamilyMember, Subscription } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

const ROLE_LABELS: Record<string, string> = {
  titular: 'Titular', conjuge: 'Cônjuge', filho: 'Filho(a)',
  dependente: 'Dependente', outro: 'Outro',
};

const BILLING_LABELS: Record<string, string> = {
  monthly: 'mensal', quarterly: 'trimestral', annual: 'anual',
};

const BILLING_MULTIPLIER: Record<string, number> = {
  monthly: 1, quarterly: 1 / 3, annual: 1 / 12,
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

export default function FamilyScreen() {
  const { theme, colors, maskValue } = useTheme();
  const {
    familyMembers, subscriptions,
    deleteFamilyMember, deleteSubscription, toggleSubscription,
  } = useFinance();
  const insets = useSafeAreaInsets();
  const [subFilter, setSubFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const activeSubscriptions = subscriptions.filter((s) => s.active);
  const monthlyTotal = useMemo(() =>
    activeSubscriptions.reduce((sum, s) => sum + s.amount * (BILLING_MULTIPLIER[s.billingCycle] || 1), 0),
    [activeSubscriptions]
  );
  const annualTotal = monthlyTotal * 12;

  const filteredSubs = useMemo(() => {
    if (subFilter === 'active') return subscriptions.filter((s) => s.active);
    if (subFilter === 'inactive') return subscriptions.filter((s) => !s.active);
    return subscriptions;
  }, [subscriptions, subFilter]);

  const handleDeleteMember = (m: FamilyMember) => {
    Alert.alert('Remover membro', `Remover "${m.name}" do grupo familiar?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: () => {
          deleteFamilyMember(m.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  const handleDeleteSub = (s: Subscription) => {
    Alert.alert('Excluir assinatura', `Excluir "${s.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => {
          deleteSubscription(s.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
              <Pressable
                onPress={() => router.push({ pathname: '/family/member', params: {} })}
                style={[styles.headerBtn, { backgroundColor: `${colors.primary}20` }]}
              >
                <Feather name="user-plus" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/subscription/add', params: {} })}
                style={[styles.headerBtn, { backgroundColor: `${colors.primary}20` }]}
              >
                <Feather name="plus" size={16} color={colors.primary} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 0 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Banner */}
        <LinearGradient
          colors={[colors.primary, `${colors.primary}99`]}
          style={styles.banner}
        >
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { fontFamily: 'Inter_700Bold' }]}>{familyMembers.length}</Text>
            <Text style={[styles.bannerLabel, { fontFamily: 'Inter_400Regular' }]}>Membros</Text>
          </View>
          <View style={[styles.bannerDiv, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { fontFamily: 'Inter_700Bold' }]}>{activeSubscriptions.length}</Text>
            <Text style={[styles.bannerLabel, { fontFamily: 'Inter_400Regular' }]}>Assinaturas ativas</Text>
          </View>
          <View style={[styles.bannerDiv, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerNum, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(monthlyTotal))}</Text>
            <Text style={[styles.bannerLabel, { fontFamily: 'Inter_400Regular' }]}>Por mês</Text>
          </View>
        </LinearGradient>

        {/* Annual cost note */}
        {monthlyTotal > 0 && (
          <View style={[styles.annualNote, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.annualNoteText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
              Total anual estimado:{' '}
              <Text style={{ fontFamily: 'Inter_700Bold' }}>{maskValue(formatBRL(annualTotal))}</Text>
            </Text>
          </View>
        )}

        {/* ── Members ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Membros da família
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/family/member', params: {} })}
              style={[styles.addBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
            >
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Adicionar
              </Text>
            </Pressable>
          </View>

          {familyMembers.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="users" size={32} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Nenhum membro cadastrado
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {familyMembers.map((m) => {
                const memberSubs = subscriptions.filter((s) => s.active && (s.memberId === m.id || s.sharedWith?.includes(m.id)));
                const memberCost = memberSubs.reduce((sum, s) => {
                  const base = s.amount * (BILLING_MULTIPLIER[s.billingCycle] || 1);
                  const share = (s.sharedWith?.length || 0) + 1;
                  return sum + (s.memberId === m.id ? base : base / share);
                }, 0);
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => router.push({ pathname: '/family/member', params: { id: m.id } })}
                    onLongPress={() => handleDeleteMember(m)}
                    delayLongPress={500}
                    style={({ pressed }) => [
                      styles.memberCard,
                      { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }
                    ]}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: m.color }]}>
                      <Text style={[styles.memberInitials, { fontFamily: 'Inter_700Bold' }]}>
                        {getInitials(m.name)}
                      </Text>
                    </View>
                    <Text style={[styles.memberName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                      {m.name}
                    </Text>
                    <View style={[styles.roleTag, { backgroundColor: `${m.color}20` }]}>
                      <Text style={[styles.roleTagText, { color: m.color, fontFamily: 'Inter_500Medium' }]}>
                        {ROLE_LABELS[m.role]}
                      </Text>
                    </View>
                    {m.monthlyBudget && (
                      <Text style={[styles.memberBudget, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        Orçamento: {maskValue(formatBRL(m.monthlyBudget))}
                      </Text>
                    )}
                    <View style={[styles.memberSubsRow, { borderTopColor: theme.border }]}>
                      <Feather name="refresh-cw" size={11} color={theme.textTertiary} />
                      <Text style={[styles.memberSubsText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {memberSubs.length} assinatura{memberSubs.length !== 1 ? 's' : ''}
                      </Text>
                      {memberCost > 0 && (
                        <Text style={[styles.memberSubsCost, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                          {maskValue(formatBRL(memberCost))}/mês
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ── Subscriptions ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Assinaturas
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/subscription/add', params: {} })}
              style={[styles.addBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
            >
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Nova
              </Text>
            </Pressable>
          </View>

          {/* Filter tabs */}
          <View style={[styles.filterTabs, { backgroundColor: theme.surfaceElevated }]}>
            {(['all', 'active', 'inactive'] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => { setSubFilter(f); Haptics.selectionAsync(); }}
                style={[styles.filterTab, subFilter === f && { backgroundColor: theme.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }]}
              >
                <Text style={[styles.filterTabText, { color: subFilter === f ? theme.text : theme.textTertiary, fontFamily: subFilter === f ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                  {f === 'all' ? 'Todas' : f === 'active' ? 'Ativas' : 'Pausadas'}
                </Text>
              </Pressable>
            ))}
          </View>

          {filteredSubs.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="refresh-cw" size={32} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Nenhuma assinatura encontrada
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10, paddingHorizontal: 16 }}>
              {filteredSubs.map((sub) => {
                const owner = familyMembers.find((m) => m.id === sub.memberId);
                const sharedMembers = (sub.sharedWith || []).map((id) => familyMembers.find((m) => m.id === id)).filter(Boolean) as FamilyMember[];
                const days = daysUntil(sub.nextBillingDate);
                const isDueSoon = sub.active && days <= 7 && days >= 0;
                const monthlyEquiv = sub.amount * (BILLING_MULTIPLIER[sub.billingCycle] || 1);

                return (
                  <Pressable
                    key={sub.id}
                    onPress={() => router.push({ pathname: '/subscription/add', params: { id: sub.id } })}
                    onLongPress={() => handleDeleteSub(sub)}
                    delayLongPress={500}
                    style={({ pressed }) => [
                      styles.subCard,
                      { backgroundColor: theme.surface, borderColor: isDueSoon ? colors.warning : theme.border, opacity: sub.active ? (pressed ? 0.85 : 1) : 0.6 }
                    ]}
                  >
                    {/* Left: icon */}
                    <View style={[styles.subIcon, { backgroundColor: `${sub.color}20` }]}>
                      <Feather name={sub.icon as any} size={20} color={sub.color} />
                    </View>

                    {/* Center: info */}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={[styles.subName, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                          {sub.name}
                        </Text>
                        {isDueSoon && (
                          <View style={[styles.dueBadge, { backgroundColor: `${colors.warning}20` }]}>
                            <Text style={[styles.dueBadgeText, { color: colors.warning, fontFamily: 'Inter_600SemiBold' }]}>
                              {days === 0 ? 'Hoje' : `${days}d`}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Billing info */}
                      <Text style={[styles.subBilling, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {formatBRL(sub.amount)} • {BILLING_LABELS[sub.billingCycle]} • vence {sub.nextBillingDate.split('-').reverse().join('/')}
                      </Text>

                      {/* Members row */}
                      {(owner || sharedMembers.length > 0) && (
                        <View style={styles.subMembersRow}>
                          {owner && (
                            <View style={[styles.subMemberDot, { backgroundColor: owner.color }]} />
                          )}
                          {sharedMembers.map((sm) => (
                            <View key={sm.id} style={[styles.subMemberDot, { backgroundColor: sm.color }]} />
                          ))}
                          <Text style={[styles.subMembersText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                            {[owner?.name, ...sharedMembers.map((s) => s.name)].filter(Boolean).join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Right: amount + toggle */}
                    <View style={styles.subRight}>
                      <Text style={[styles.subAmount, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                        {maskValue(formatBRL(sub.billingCycle === 'monthly' ? sub.amount : monthlyEquiv))}
                      </Text>
                      {sub.billingCycle !== 'monthly' && (
                        <Text style={[styles.subAmountSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>/mês</Text>
                      )}
                      <Switch
                        value={sub.active}
                        onValueChange={() => {
                          toggleSubscription(sub.id);
                          Haptics.selectionAsync();
                        }}
                        trackColor={{ false: theme.border, true: `${colors.primary}80` }}
                        thumbColor={sub.active ? colors.primary : theme.textTertiary}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Active total */}
          {activeSubscriptions.length > 0 && (
            <View style={[styles.totalRow, { backgroundColor: theme.surface, borderColor: theme.border, marginHorizontal: 16 }]}>
              <Text style={[styles.totalLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Total mensal ({activeSubscriptions.length} ativas)
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                {maskValue(formatBRL(monthlyTotal))}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', padding: 20, gap: 0 },
  bannerStat: { flex: 1, alignItems: 'center', gap: 4 },
  bannerNum: { color: '#fff', fontSize: 22 },
  bannerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  bannerDiv: { width: 1, marginVertical: 4 },
  annualNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  annualNoteText: { fontSize: 13, flex: 1 },
  section: { marginTop: 20, gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  sectionTitle: { fontSize: 17 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  addBtnText: { fontSize: 13 },
  empty: { marginHorizontal: 16, alignItems: 'center', paddingVertical: 32, gap: 8, borderRadius: 16, borderWidth: 1 },
  emptyText: { fontSize: 14 },
  memberCard: {
    width: 160, borderRadius: 16, borderWidth: 1, padding: 14, gap: 8, alignItems: 'center',
  },
  memberAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  memberInitials: { color: '#fff', fontSize: 20 },
  memberName: { fontSize: 14, textAlign: 'center' },
  roleTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleTagText: { fontSize: 12 },
  memberBudget: { fontSize: 11, textAlign: 'center' },
  memberSubsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 8, borderTopWidth: 1, width: '100%', justifyContent: 'center' },
  memberSubsText: { fontSize: 11 },
  memberSubsCost: { fontSize: 11 },
  filterTabs: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 3 },
  filterTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  filterTabText: { fontSize: 13 },
  subCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  subIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subName: { fontSize: 15 },
  subBilling: { fontSize: 12, marginTop: 2 },
  subMembersRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  subMemberDot: { width: 8, height: 8, borderRadius: 4 },
  subMembersText: { fontSize: 12 },
  subRight: { alignItems: 'flex-end', gap: 2 },
  subAmount: { fontSize: 15 },
  subAmountSub: { fontSize: 10 },
  dueBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  dueBadgeText: { fontSize: 11 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 4 },
  totalLabel: { fontSize: 13 },
  totalValue: { fontSize: 16 },
});
