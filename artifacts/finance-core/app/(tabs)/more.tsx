import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Alert
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

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  subtitle?: string;
  badge?: string;
  color?: string;
  onPress: () => void;
  testID?: string;
}

function MenuItem({ icon, label, subtitle, badge, color = '#00C853', onPress, testID }: MenuItemProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${color}20` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.menuSub, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{subtitle}</Text>
        )}
      </View>
      {badge && (
        <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.badgeText, { color }]}>{badge}</Text>
        </View>
      )}
      <Feather name="chevron-right" size={16} color={theme.textTertiary} />
    </Pressable>
  );
}

export default function MoreScreen() {
  const { theme, colors, isDark, themeMode, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const { budgets, goals, darfs, transactions, isLoading } = useFinance();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const currentMonth = getCurrentMonth();
  const monthlyTx = transactions.filter((t) => t.date.startsWith(currentMonth));
  const getBudgetSpent = (category: string) =>
    monthlyTx.filter((t) => t.category === category && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const unpaidDarfs = darfs.filter((d) => !d.paid);
  const pendingGoals = goals.filter((g) => g.currentAmount < g.targetAmount);

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
      }
    ]);
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
        <View style={styles.profile}>
          <View style={[styles.avatarLg, { backgroundColor: colors.primaryGlow, borderColor: `${colors.primary}30` }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
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
                <Text style={[styles.planText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                  Plano {user.plan}
                </Text>
              </View>
            )}
          </View>
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
            color={colors.accent}
            onPress={() => router.push('/chat')}
          />
          <MenuItem
            testID="menu-goals"
            icon="target"
            label="Metas Financeiras"
            subtitle={`${pendingGoals.length} metas em andamento`}
            badge={`${pendingGoals.length}`}
            color={colors.primary}
            onPress={() => router.push('/(more)/goals')}
          />
          <MenuItem
            testID="menu-accounts"
            icon="credit-card"
            label="Contas e Cartões"
            subtitle="Gerencie suas contas bancárias"
            color="#3B82F6"
            onPress={() => router.push('/(more)/accounts')}
          />
          <MenuItem
            testID="menu-darf"
            icon="file-text"
            label="DARFs e IR"
            subtitle={unpaidDarfs.length > 0 ? `${unpaidDarfs.length} DARF(s) pendente(s)` : 'Sem pendências'}
            badge={unpaidDarfs.length > 0 ? `${unpaidDarfs.length}` : undefined}
            color={unpaidDarfs.length > 0 ? colors.warning : theme.textSecondary as string}
            onPress={() => router.push('/(more)/darfs')}
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

        {/* Settings */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          CONFIGURAÇÕES
        </Text>
        <View style={styles.menuGroup}>
          <View style={[styles.themePicker, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="moon" size={20} color={colors.accent} />
            <Text style={[styles.themeLabel, { color: theme.text, fontFamily: 'Inter_500Medium', flex: 1 }]}>
              Tema
            </Text>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => { setThemeMode(mode); Haptics.selectionAsync(); }}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === mode ? colors.primary : theme.surfaceElevated,
                    borderColor: themeMode === mode ? colors.primary : theme.border,
                  }
                ]}
              >
                <Text style={[
                  styles.themeOptionText,
                  {
                    color: themeMode === mode ? '#000' : theme.textSecondary,
                    fontFamily: 'Inter_500Medium'
                  }
                ]}>
                  {mode === 'system' ? 'Auto' : mode === 'light' ? 'Claro' : 'Escuro'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
          CONTA
        </Text>
        <View style={styles.menuGroup}>
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
        </View>

        <Text style={[styles.version, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
          Finance Core v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLg: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  avatarInitial: { fontSize: 28 },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 20 },
  profileEmail: { fontSize: 14 },
  planBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
  planText: { fontSize: 12 },
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
  budgetsCard: { borderRadius: 16, padding: 16, gap: 16, borderWidth: 1 },
  viewMore: { borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center' },
  viewMoreText: { fontSize: 14 },
  themePicker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  themeLabel: { fontSize: 15 },
  themeOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  themeOptionText: { fontSize: 12 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  logoutText: { fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
