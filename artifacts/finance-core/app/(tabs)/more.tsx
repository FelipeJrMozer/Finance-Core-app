import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';
import { BudgetProgress } from '@/components/BudgetProgress';
import { ACCENT_PRESETS } from '@/constants/colors';

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
  testID?: string;
  right?: React.ReactNode;
}

function MenuItem({ icon, label, subtitle, badge, badgeColor, onPress, testID, right }: MenuItemProps) {
  const { theme, colors } = useTheme();
  const bColor = badgeColor || colors.primary;
  return (
    <Pressable
      testID={testID}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${colors.primary}20` }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.menuSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{subtitle}</Text>
        )}
      </View>
      {right}
      {badge && (
        <View style={[styles.badge, { backgroundColor: `${bColor}20` }]}>
          <Text style={[styles.badgeText, { color: bColor }]}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color={theme.textTertiary} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const { theme, colors, isDark, accentId } = useTheme();
  const { user, logout } = useAuth();
  const { budgets, goals, darfs, transactions, totalBalance, investments, familyMembers, subscriptions } = useFinance();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const currentMonth = getCurrentMonth();
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const getBudgetSpent = (category: string) =>
    monthlyTx.filter((t) => t.category === category && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const unpaidDarfs = darfs.filter((d) => !d.paid);
  const activeSubscriptions = subscriptions.filter((s) => s.active);
  const monthlySubTotal = activeSubscriptions.reduce((sum, s) => {
    const mult = s.billingCycle === 'monthly' ? 1 : s.billingCycle === 'quarterly' ? 1 / 3 : 1 / 12;
    return sum + s.amount * mult;
  }, 0);
  const pendingGoals = goals.filter((g) => g.currentAmount < g.targetAmount);

  const currentPreset = ACCENT_PRESETS.find(p => p.id === accentId) ?? ACCENT_PRESETS[0];

  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const netWorth = totalBalance + totalInvestments;

  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl) return;
    try {
      const res = await fetch(`${apiUrl}/api/pending-transactions`);
      if (res.ok) {
        const data = await res.json();
        setPendingCount((data.transactions ?? []).length);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingCount]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout().catch(() => {});
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 20 }}
    >
      {/* Header / Profile */}
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1A14'] : ['#F0FFF4', '#F5F7FA']}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.profileRow}>
          <View style={[styles.avatarLg, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarInitial, { fontFamily: 'Inter_700Bold', color: '#000' }]}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {user?.name || 'Usuário'}
            </Text>
            <Text style={[styles.profileEmail, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {user?.email}
            </Text>
            {user?.plan && (
              <View style={[styles.planBadge, { backgroundColor: colors.primaryGlow }]}>
                <Feather name="star" size={10} color={colors.primary} />
                <Text style={[styles.planText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  Plano {user.plan}
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => router.push('/(more)/settings')}
            style={[styles.settingsBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
          >
            <Feather name="settings" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Quick Access */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          RECURSOS
        </Text>
        <View style={styles.menuGroup}>
          <MenuItem
            testID="menu-ai"
            icon="cpu"
            label="Assistente IA"
            subtitle="Conselhos financeiros personalizados"
            onPress={() => router.push('/chat')}
          />
          <MenuItem
            testID="menu-goals"
            icon="target"
            label="Metas Financeiras"
            subtitle={`${pendingGoals.length} meta${pendingGoals.length !== 1 ? 's' : ''} em andamento`}
            badge={pendingGoals.length > 0 ? `${pendingGoals.length}` : undefined}
            onPress={() => router.push('/(more)/goals')}
          />
          <MenuItem
            testID="menu-accounts"
            icon="credit-card"
            label="Contas e Cartões"
            subtitle="Gerencie suas contas bancárias"
            onPress={() => router.push('/(more)/accounts')}
          />
          <MenuItem
            testID="menu-darf"
            icon="file-text"
            label="Imposto de Renda (IRPF)"
            subtitle={unpaidDarfs.length > 0 ? `${unpaidDarfs.length} DARF(s) pendente(s)` : 'Declaração, DARFs e Calculadoras'}
            badge={unpaidDarfs.length > 0 ? `${unpaidDarfs.length}` : undefined}
            badgeColor={unpaidDarfs.length > 0 ? colors.warning : undefined}
            onPress={() => router.push('/(more)/ir')}
          />
          <MenuItem
            testID="menu-family"
            icon="users"
            label="Módulo Familiar"
            subtitle={familyMembers.length > 0 ? `${familyMembers.length} membro${familyMembers.length !== 1 ? 's' : ''} no grupo` : 'Nenhum membro adicionado'}
            badge={familyMembers.length > 0 ? `${familyMembers.length}` : undefined}
            onPress={() => router.push('/(more)/family')}
          />
          <MenuItem
            testID="menu-subscriptions"
            icon="award"
            label="Assinaturas"
            subtitle={user?.plan && user.plan !== 'Free' ? `Plano ${user.plan} • Ativo` : 'Nenhum plano ativo'}
            onPress={() => router.push('/(more)/subscriptions')}
          />
          <MenuItem
            testID="menu-bank-notifications"
            icon="bell"
            label="Central de Notificações Bancárias"
            subtitle="Importe SMS e notificações do banco para lançar movimentações"
            onPress={() => router.push('/(more)/bank-notifications')}
          />
          <MenuItem
            testID="menu-pending-transactions"
            icon="message-circle"
            label="Aprovações Pendentes (WhatsApp/IA)"
            subtitle={pendingCount > 0 ? `${pendingCount} lançamento${pendingCount !== 1 ? 's' : ''} aguardando aprovação` : 'Lançamentos enviados via WhatsApp com IA'}
            badge={pendingCount > 0 ? `${pendingCount}` : undefined}
            badgeColor={pendingCount > 0 ? colors.warning : undefined}
            onPress={() => router.push('/(more)/pending-transactions')}
          />
          <MenuItem
            testID="menu-notification-access"
            icon="shield"
            label="Acesso a Notificações e SMS"
            subtitle="Ative a leitura automática de notificações bancárias"
            onPress={() => router.push('/(more)/notification-access')}
          />
        </View>

        {/* Budgets Quick View */}
        {budgets.filter((b) => b.month === currentMonth).length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              ORÇAMENTOS DO MÊS
            </Text>
            <View style={[styles.budgetsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {budgets.filter((b) => b.month === currentMonth).map((b) => (
                <BudgetProgress
                  key={b.id}
                  category={b.category}
                  limit={b.limit}
                  spent={getBudgetSpent(b.category)}
                />
              ))}
              <Pressable
                onPress={() => router.push('/(more)/budgets')}
                style={[styles.viewMore, { borderColor: colors.primary }]}
              >
                <Text style={[styles.viewMoreText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                  Gerenciar Orçamentos
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Settings / Config */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          CONFIGURAÇÕES
        </Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="settings"
            label="Configurações do App"
            subtitle={`Tema, cor, notificações • Cor: ${currentPreset.label}`}
            right={
              <View style={[styles.colorDot, { backgroundColor: currentPreset.primary }]} />
            }
            onPress={() => router.push('/(more)/settings')}
          />
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          CONTA
        </Text>
        <View style={styles.menuGroup}>
          {!showLogoutModal ? (
            <Pressable
              testID="logout-btn"
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutBtn,
                { backgroundColor: `${colors.danger}15`, borderColor: `${colors.danger}30`, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Feather name="log-out" size={18} color={colors.danger} />
              <Text style={[styles.logoutText, { color: colors.danger, fontFamily: 'Inter_600SemiBold' }]}>
                Sair da conta
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.logoutConfirm, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}30` }]}>
              <Text style={[styles.logoutConfirmTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Tem certeza que deseja sair?
              </Text>
              <View style={styles.logoutConfirmBtns}>
                <Pressable
                  style={({ pressed }) => [styles.logoutConfirmCancel, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => setShowLogoutModal(false)}
                >
                  <Text style={[styles.logoutConfirmCancelText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  testID="logout-confirm-btn"
                  style={({ pressed }) => [styles.logoutConfirmDanger, { backgroundColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}
                  onPress={confirmLogout}
                >
                  <Feather name="log-out" size={15} color="#fff" />
                  <Text style={[styles.logoutConfirmDangerText, { fontFamily: 'Inter_600SemiBold' }]}>
                    Sair
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <Text style={[styles.version, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Pilar Financeiro v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLg: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 28 },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 20 },
  profileEmail: { fontSize: 14 },
  planBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2
  },
  planText: { fontSize: 12 },
  settingsBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, letterSpacing: 1 },
  menuGroup: { gap: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuContent: { flex: 1 },
  menuLabel: { fontSize: 15 },
  menuSub: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  colorDot: { width: 18, height: 18, borderRadius: 9 },
  budgetsCard: { borderRadius: 16, padding: 16, gap: 16, borderWidth: 1 },
  viewMore: { borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  viewMoreText: { fontSize: 14 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  logoutText: { fontSize: 15 },
  logoutConfirm: {
    borderRadius: 14, borderWidth: 1, padding: 14, gap: 12,
  },
  logoutConfirmTitle: { fontSize: 14 },
  logoutConfirmBtns: { flexDirection: 'row', gap: 8 },
  logoutConfirmCancel: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center',
  },
  logoutConfirmCancelText: { fontSize: 14 },
  logoutConfirmDanger: {
    flex: 1, borderRadius: 10, paddingVertical: 10,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  logoutConfirmDangerText: { fontSize: 14, color: '#fff' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
