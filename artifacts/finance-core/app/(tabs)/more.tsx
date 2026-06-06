import React, { useState } from 'react';
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
  const { budgets, goals, transactions, totalBalance, investments, notifications, settings, creditCards } = useFinance();
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;

  const currentMonth = getCurrentMonth();
  const monthlyTx = transactions.filter((t) => (t.transactionDate ?? t.date).startsWith(currentMonth));
  const getBudgetSpent = (b: { category: string; categoryId?: string }) =>
    monthlyTx
      .filter((t) => {
        if (t.type !== 'expense') return false;
        if (b.categoryId && t.categoryId) return t.categoryId === b.categoryId;
        return (t.category || '').toLowerCase() === (b.category || '').toLowerCase();
      })
      .reduce((s, t) => s + t.amount, 0);

  const pendingGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const currentPreset = ACCENT_PRESETS.find(p => p.id === accentId) ?? ACCENT_PRESETS[0];
  const totalInvestments = investments.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
  const totalCreditUsed = creditCards.reduce((s, c) => s + (c.used || 0), 0);
  const netWorth = totalBalance + totalInvestments - totalCreditUsed;

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
          <View style={{ alignItems: 'flex-end', gap: 10 }}>
            <Pressable
              onPress={() => router.push('/(more)/settings')}
              style={[styles.settingsBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
            >
              <Feather name="settings" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Net Worth quick view */}
        <View style={[styles.netWorthCard, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
          <Text style={[styles.netWorthLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Patrimônio total
          </Text>
          <Text style={[styles.netWorthValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            {formatBRL(netWorth)}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>

        {/* ── PRINCIPAL ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>PRINCIPAL</Text>
        <View style={styles.menuGroup}>
          <MenuItem testID="menu-accounts" icon="briefcase" label="Contas Bancárias" subtitle="Saldos, corrente, poupança e carteiras" onPress={() => router.push('/(more)/accounts')} />
          <MenuItem testID="menu-cards" icon="credit-card" label="Cartões de Crédito" subtitle="Faturas, limites e vencimentos" onPress={() => router.push('/(more)/cards')} />
          <MenuItem testID="menu-budgets" icon="pie-chart" label="Orçamentos" subtitle="Limites de gastos por categoria" onPress={() => router.push('/(more)/budgets')} />
          <MenuItem
            testID="menu-goals"
            icon="target"
            label="Metas Financeiras"
            subtitle={`${pendingGoals.length} meta${pendingGoals.length !== 1 ? 's' : ''} em andamento`}
            badge={pendingGoals.length > 0 ? String(pendingGoals.length) : undefined}
            onPress={() => router.push('/(more)/goals')}
          />
          {settings?.billsEnabled !== false && (
            <MenuItem testID="menu-bills" icon="file-text" label="Contas a Pagar" subtitle="Controle seus vencimentos e boletos" onPress={() => router.push('/(more)/bills')} />
          )}
          <MenuItem testID="menu-recurring" icon="repeat" label="Recorrências" subtitle="Receitas e despesas fixas mensais" onPress={() => router.push('/(more)/recurring')} />
        </View>

        {/* ── CONTROLE PESSOAL ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>CONTROLE PESSOAL</Text>
        <View style={styles.menuGroup}>
          <MenuItem testID="menu-health" icon="activity" label="Saúde Financeira" subtitle="Pontuação e recomendações para seu bolso" onPress={() => router.push('/(more)/health-score')} />
          <MenuItem testID="menu-rules" icon="filter" label="Regras de Categorização" subtitle="Categorize lançamentos automaticamente" onPress={() => router.push('/(more)/categorization-rules')} />
          {settings?.sinkingFundsEnabled !== false && (
            <MenuItem testID="menu-sinking" icon="archive" label="Reservas Programadas" subtitle="Poupe para objetivos específicos" onPress={() => router.push('/(more)/sinking-funds')} />
          )}
          <MenuItem testID="menu-debts" icon="trending-down" label="Dívidas" subtitle="Empréstimos e parcelamentos — método avalanche" onPress={() => router.push('/(more)/debts')} />
          <MenuItem testID="menu-familia" icon="users" label="Família" subtitle="Membros, despesas compartilhadas e caixinha" onPress={() => router.push('/(more)/familia')} />
          <MenuItem testID="menu-pending" icon="clock" label="Lançamentos Pendentes" subtitle="Pagamentos e recebimentos não confirmados" onPress={() => router.push('/(more)/pending-transactions')} />
          <MenuItem testID="menu-captura" icon="zap" label="Captura Automática" subtitle={Platform.OS === 'ios' ? 'WhatsApp e fluxo manual' : 'Notificações de bancos'} onPress={() => router.push('/(more)/captura-bancaria')} />
        </View>

        {/* ── INVESTIMENTOS ── */}
        {settings?.investmentsEnabled !== false && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>INVESTIMENTOS</Text>
            <View style={styles.menuGroup}>
              <MenuItem testID="menu-invest-report" icon="bar-chart-2" label="Relatório de Investimentos" subtitle="Dividendos, performance e benchmark" onPress={() => router.push('/(more)/investment-report')} />
              <MenuItem testID="menu-watchlist" icon="star" label="Watchlist" subtitle="Acompanhe ativos sem precisar comprar" onPress={() => router.push('/(more)/watchlist')} />
              <MenuItem testID="menu-price-alerts" icon="bell" label="Alertas de Preço" subtitle="Notificação quando ativo atingir alvo" onPress={() => router.push('/(more)/price-alerts')} />
              <MenuItem testID="menu-stock-comparator" icon="git-merge" label="Comparador de Ações" subtitle="Compare fundamentos de até 5 ativos" onPress={() => router.push('/(more)/stock-comparator')} />
              <MenuItem testID="menu-portfolios" icon="layers" label="Portfólios" subtitle="Múltiplas carteiras (aposentadoria, especulação…)" onPress={() => router.push('/(more)/portfolios')} />
            </View>
          </>
        )}

        {/* ── IMPOSTO DE RENDA ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>IMPOSTO DE RENDA</Text>
        <View style={styles.menuGroup}>
          <MenuItem testID="menu-taxes" icon="percent" label="Painel IRPF" subtitle="Status de obrigação, DARFs e acumulado" onPress={() => router.push('/(more)/taxes')} />
          <MenuItem testID="menu-darf" icon="file-minus" label="DARF" subtitle="Histórico, valores e marcar como pago" onPress={() => router.push('/(more)/darf')} />
          <MenuItem testID="menu-tax-calendar" icon="calendar" label="Calendário Fiscal" subtitle="Todas as datas de obrigações do ano" onPress={() => router.push('/(more)/tax-calendar')} />
          <MenuItem testID="menu-irpf-export" icon="download" label="Exportar IRPF" subtitle="Gerar arquivo .DEC e guia passo a passo" onPress={() => router.push('/(more)/irpf-export')} />
        </View>

        {/* ── MEI / ME / FREELANCER ── */}
        {settings?.pjEnabled === true && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>MEI / ME / FREELANCER</Text>
            <View style={styles.menuGroup}>
              <MenuItem testID="menu-pj" icon="briefcase" label="Dashboard PJ" subtitle="Faturamento, limite MEI e saúde do negócio" onPress={() => router.push('/(more)/pj')} />
              <MenuItem testID="menu-pj-receitas" icon="trending-up" label="Receitas PJ" subtitle="Entradas e faturamento do negócio" onPress={() => router.push('/(more)/pj/receitas')} />
              <MenuItem testID="menu-pj-despesas" icon="trending-down" label="Despesas PJ" subtitle="Custos operacionais e deduções" onPress={() => router.push('/(more)/pj/despesas')} />
              <MenuItem testID="menu-pj-clientes" icon="users" label="Clientes" subtitle="Cadastro de clientes e histórico" onPress={() => router.push('/(more)/pj/clientes')} />
              <MenuItem testID="menu-pj-das" icon="file-text" label="DAS MEI" subtitle="Guias pagas e próximo vencimento" onPress={() => router.push('/(more)/pj/das')} />
              <MenuItem testID="menu-pj-dasn" icon="clipboard" label="DASN-SIMEI" subtitle="Declaração anual de faturamento" onPress={() => router.push('/(more)/pj/dasn-simei')} />
              <MenuItem testID="menu-pj-retiradas" icon="dollar-sign" label="Pró-labore / Retiradas" subtitle="Remuneração e distribuição de lucros" onPress={() => router.push('/(more)/pj/retiradas')} />
              <MenuItem testID="menu-pj-notas" icon="file" label="Notas Fiscais" subtitle="NFSe emitidas e recebidas" onPress={() => router.push('/(more)/pj/notas-fiscais')} />
              <MenuItem testID="menu-pj-fluxo" icon="bar-chart" label="Fluxo de Caixa PJ" subtitle="Entradas e saídas do negócio no tempo" onPress={() => router.push('/(more)/pj/fluxo-caixa')} />
              <MenuItem testID="menu-pj-saude" icon="heart" label="Saúde do Negócio" subtitle="Indicadores e análise da empresa" onPress={() => router.push('/(more)/pj/saude-negocio')} />
            </View>
          </>
        )}

        {/* ── ORÇAMENTOS DO MÊS (widget) ── */}
        {budgets.filter((b) => b.month === currentMonth).length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>ORÇAMENTOS DO MÊS</Text>
            <View style={[styles.budgetsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {budgets.filter((b) => b.month === currentMonth).slice(0, 4).map((b) => (
                <BudgetProgress key={b.id} category={b.category} limit={b.limit} spent={getBudgetSpent(b)} />
              ))}
              <Pressable onPress={() => router.push('/(more)/budgets')} style={[styles.viewMore, { borderColor: colors.primary }]}>
                <Text style={[styles.viewMoreText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Gerenciar Orçamentos</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── FERRAMENTAS ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>FERRAMENTAS</Text>
        <View style={styles.menuGroup}>
          <MenuItem testID="menu-ai" icon="cpu" label="IA Pilar" subtitle="Conselhos financeiros personalizados" onPress={() => router.push('/chat')} />
          <MenuItem testID="menu-simulators" icon="sliders" label="Simuladores" subtitle="Juros compostos, FIRE, imóvel, aposentadoria…" onPress={() => router.push('/(more)/simulators')} />
          <MenuItem testID="menu-alerts" icon="bell" label="Alertas Personalizados" subtitle="Configure limites e notificações automáticas" onPress={() => router.push('/(more)/custom-alerts')} />
          <MenuItem testID="menu-sms" icon="message-square" label="Importar SMS" subtitle="Extrair lançamentos de SMS bancários" onPress={() => router.push('/(more)/sms-import-help')} />
        </View>

        {/* ── CONFIGURAÇÕES ── */}
        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>CONFIGURAÇÕES</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="settings"
            label="Configurações"
            subtitle={`Tema, cor, módulos • Cor: ${currentPreset.label}`}
            right={<View style={[styles.colorDot, { backgroundColor: currentPreset.primary }]} />}
            onPress={() => router.push('/(more)/settings')}
          />
          <MenuItem
            icon="bell"
            label="Notificações"
            subtitle="Alertas de orçamento, metas e relatórios"
            badge={unreadNotifs > 0 ? String(unreadNotifs) : undefined}
            badgeColor={colors.danger}
            onPress={() => router.push('/(more)/notifications')}
          />
          <MenuItem
            icon="award"
            label="Planos e Assinaturas"
            subtitle={user?.plan && user.plan !== 'Free' ? `Plano ${user.plan} ativo` : 'Ver planos disponíveis'}
            onPress={() => router.push('/(more)/subscriptions')}
          />
          <MenuItem icon="monitor" label="Sessões Ativas" subtitle="Web e dispositivos conectados" onPress={() => router.push('/(more)/sessions')} />
          <MenuItem icon="gift" label="Indicação" subtitle="Convide amigos e ganhe benefícios" onPress={() => router.push('/(more)/referral')} />
          <MenuItem icon="shield" label="Privacidade & LGPD" subtitle="Seus dados, consentimentos e exclusão de conta" onPress={() => router.push('/(more)/lgpd')} />
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>CONTA</Text>
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
  netWorthCard: {
    marginTop: 16, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  netWorthLabel: { fontSize: 12, marginBottom: 2 },
  netWorthValue: { fontSize: 22 },
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
