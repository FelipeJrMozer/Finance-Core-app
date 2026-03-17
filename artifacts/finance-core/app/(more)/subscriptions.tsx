import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const MONTHLY_PRICES: Record<string, number> = {
  Free: 0,
  Premium: 14.9,
  Family: 34.9,
};

const ANNUAL_DISCOUNT = 0.17;

function annualMonthly(price: number) {
  return price * (1 - ANNUAL_DISCOUNT);
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PLANS = [
  {
    id: 'Free',
    label: 'Free',
    subtitle: 'Para começar a controlar suas finanças',
    color: '#6B7280',
    gradient: ['#374151', '#1F2937'] as [string, string],
    popular: false,
    trial: false,
    features: [
      'Até 100 transações/mês',
      'Até 2 contas bancárias',
      'Até 3 orçamentos por categoria',
      'Até 10 investimentos',
      'Histórico de 3 meses',
      'Dashboard básico',
      '1 controle financeiro',
    ],
    missing: [
      'Exportação de dados',
      'Agent de IA',
      'Análises avançadas de portfólio',
      'DARF automático',
      'Múltiplos controles financeiros',
    ],
  },
  {
    id: 'Premium',
    label: 'Premium',
    subtitle: 'Controle total + investimentos profissionais',
    color: '#EF4444',
    gradient: ['#DC2626', '#B91C1C'] as [string, string],
    popular: true,
    trial: true,
    features: [
      'Transações, contas e cartões ilimitados',
      'Histórico completo e ilimitado',
      'Agent de IA para análise financeira',
      '19 ferramentas de investimentos',
      'Análise de risco e correlação de portfólio',
      'Rebalanceamento automático de carteira',
      'DARF automático + Otimizador IR',
      'Análise Técnica e Fundamentalista',
      'Screener de Ações e Alertas de Preço',
      'Exportação CSV/PDF/Excel',
      '4 simuladores financeiros',
      'Múltiplos controles financeiros',
    ],
    missing: [],
  },
  {
    id: 'Family',
    label: 'Family',
    subtitle: 'Premium completo para toda a família',
    color: '#7C3AED',
    gradient: ['#7C3AED', '#5B21B6'] as [string, string],
    popular: false,
    trial: true,
    features: [
      'Tudo do plano Premium',
      'Até 5 membros — cada um com dados privados',
      'Despesas compartilhadas e divisão automática',
      'Transferências entre carteiras familiares',
      'Caixinha familiar com saldo compartilhado',
      'Orçamento familiar consolidado',
      'Metas coletivas (férias, reforma, fundo de emergência)',
      'Dashboard familiar — visão do patrimônio total',
      'Suporte prioritário dedicado',
    ],
    missing: [],
  },
];

const PLAN_ORDER = ['Free', 'Premium', 'Family'];

function getPlanIndex(plan?: string) {
  const idx = PLAN_ORDER.indexOf(plan || 'Free');
  return idx === -1 ? 0 : idx;
}

export default function SubscriptionsScreen() {
  const { theme, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlanId = user?.plan || 'Free';
  const currentPlanIdx = getPlanIndex(currentPlanId);
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];
  const isSubscriber = currentPlanIdx > 0;

  function getPrice(plan: typeof PLANS[0]) {
    const base = MONTHLY_PRICES[plan.id] || 0;
    if (base === 0) return base;
    return annual ? annualMonthly(base) : base;
  }

  function getPriceLabel(plan: typeof PLANS[0]) {
    const p = getPrice(plan);
    if (p === 0) return 'R$ 0';
    return `R$ ${formatBRL(p)}`;
  }

  const handleSubscribe = (plan: typeof PLANS[0]) => {
    if (plan.id === currentPlanId) return;
    const isUpgrade = getPlanIndex(plan.id) > currentPlanIdx;
    const isDowngrade = !isUpgrade;

    const verb = isDowngrade ? 'Fazer downgrade para' : plan.trial ? 'Começar trial do' : 'Ativar';
    const msg = isDowngrade
      ? `Fazer downgrade para o plano ${plan.label}? Você perderá acesso a alguns recursos.`
      : plan.trial
        ? `Começar 30 dias grátis do plano ${plan.label}? Cartão necessário, sem cobrança agora.`
        : 'Ativar plano gratuito?';

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(plan.id);
    setTimeout(async () => {
      updateUser({ plan: plan.id });
      setLoading(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1200);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Assinaturas' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Escolha seu plano
          </Text>
          <Text style={[styles.heroSubtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Todo plano pago começa com{' '}
            <Text style={{ fontFamily: 'Inter_700Bold', color: theme.text }}>30 dias grátis</Text>
            . Requer cadastro de cartão — nenhum valor é cobrado durante o período. Renova automaticamente ao final; cancele quando quiser.
          </Text>

          {/* Billing toggle */}
          <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable onPress={() => setAnnual(false)}>
              <Text style={[styles.toggleLabel, { color: !annual ? theme.text : theme.textTertiary, fontFamily: annual ? 'Inter_400Regular' : 'Inter_600SemiBold' }]}>
                Mensal
              </Text>
            </Pressable>
            <Switch
              value={annual}
              onValueChange={(v) => { setAnnual(v); Haptics.selectionAsync(); }}
              trackColor={{ false: theme.border, true: '#EF4444' }}
              thumbColor="#fff"
            />
            <Pressable onPress={() => setAnnual(true)} style={styles.annualRow}>
              <Text style={[styles.toggleLabel, { color: annual ? theme.text : theme.textTertiary, fontFamily: annual ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                Anual
              </Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>17% OFF</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Current plan banner for subscribers */}
        {isSubscriber && (
          <LinearGradient
            colors={currentPlan.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.currentBanner}
          >
            <View style={styles.currentBannerTop}>
              <View>
                <Text style={styles.currentBannerSub}>Plano atual</Text>
                <Text style={styles.currentBannerTitle}>{currentPlan.label}</Text>
              </View>
              <View style={styles.currentBadge}>
                <Feather name="check-circle" size={13} color="#fff" />
                <Text style={styles.currentBadgeText}>Ativo</Text>
              </View>
            </View>
            <Text style={styles.currentBannerPrice}>
              {getPriceLabel(currentPlan)}
              <Text style={styles.currentBannerPeriod}>/mês</Text>
            </Text>
            {currentPlan.trial && (
              <Text style={styles.currentBannerNote}>Próxima cobrança em 15/04/2026</Text>
            )}
          </LinearGradient>
        )}

        {/* Plan cards */}
        <View style={styles.cards}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isUpgrade = getPlanIndex(plan.id) > currentPlanIdx;
            const isLoading = loading === plan.id;
            const price = getPrice(plan);
            const monthlyBase = MONTHLY_PRICES[plan.id];

            return (
              <View
                key={plan.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.card, borderColor: isCurrent ? plan.color : plan.popular ? plan.color : theme.border },
                  (isCurrent || plan.popular) && { borderWidth: 2 },
                ]}
              >
                {/* Badges */}
                {plan.popular && !isCurrent && (
                  <View style={[styles.badge, { backgroundColor: plan.color }]}>
                    <Text style={styles.badgeText}>MAIS POPULAR</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={[styles.badge, { backgroundColor: plan.color }]}>
                    <Text style={styles.badgeText}>Plano atual</Text>
                  </View>
                )}

                {/* Plan header */}
                <View style={styles.cardHeader}>
                  <View style={[styles.planDot, { backgroundColor: plan.color }]} />
                  <View>
                    <Text style={[styles.planName, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.planSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {plan.subtitle}
                    </Text>
                  </View>
                </View>

                {/* Price */}
                <View style={styles.priceRow}>
                  <Text style={[styles.priceMain, { color: isCurrent ? plan.color : theme.text, fontFamily: 'Inter_700Bold' }]}>
                    {getPriceLabel(plan)}
                  </Text>
                  {price > 0 && (
                    <Text style={[styles.pricePeriod, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      /mês
                    </Text>
                  )}
                  {price === 0 && monthlyBase === 0 && (
                    <Text style={[styles.pricePeriod, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      /sempre
                    </Text>
                  )}
                </View>

                {/* Annual savings note */}
                {annual && price > 0 && (
                  <Text style={[styles.annualNote, { color: plan.color, fontFamily: 'Inter_400Regular' }]}>
                    {plan.trial ? '30 dias grátis — sem cobrança agora' : `Economize 17% no plano anual`}
                  </Text>
                )}
                {!annual && plan.trial && (
                  <Text style={[styles.annualNote, { color: plan.color, fontFamily: 'Inter_400Regular' }]}>
                    30 dias grátis — sem cobrança agora
                  </Text>
                )}
                {plan.trial && (
                  <Text style={[styles.trialNote, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                    Requer cartão · Renova automático · Cancele quando quiser
                  </Text>
                )}

                {/* Features */}
                <View style={styles.featureList}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Feather name="check" size={14} color={plan.color} />
                      <Text style={[styles.featureText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                  {plan.missing.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Feather name="x" size={14} color={theme.textTertiary} />
                      <Text style={[styles.featureText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }, styles.featureMissing]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                {isCurrent ? (
                  <Pressable
                    style={[styles.ctaOutline, { borderColor: plan.color }]}
                    onPress={() => {}}
                  >
                    <Text style={[styles.ctaOutlineText, { color: plan.color, fontFamily: 'Inter_500Medium' }]}>
                      Gerenciar assinatura
                    </Text>
                  </Pressable>
                ) : plan.id === 'Free' ? (
                  <Pressable
                    style={[styles.ctaOutline, { borderColor: theme.border }]}
                    onPress={() => handleSubscribe(plan)}
                    disabled={!!isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={theme.textSecondary} />
                    ) : (
                      <Text style={[styles.ctaOutlineText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                        Usar grátis
                      </Text>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.ctaSolid,
                      { backgroundColor: plan.color, opacity: pressed ? 0.85 : 1 },
                    ]}
                    onPress={() => handleSubscribe(plan)}
                    disabled={!!isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={[styles.ctaSolidText, { fontFamily: 'Inter_600SemiBold' }]}>
                          {isUpgrade
                            ? `Começar 30 dias grátis →`
                            : `Mudar para ${plan.label}`}
                        </Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Footer notes */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            • Cancele a qualquer momento sem taxas
          </Text>
          <Text style={[styles.footerText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            • Cobrança via cartão de crédito ou Pix
          </Text>
          <Text style={[styles.footerText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            • Ao assinar você concorda com os{' '}
            <Text style={{ color: colors.primary }}>Termos de Uso</Text>
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 12 },
  heroTitle: { fontSize: 24, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, color: '#666' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  toggleLabel: { fontSize: 15 },
  annualRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountBadge: {
    backgroundColor: '#EF4444', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  discountText: { fontSize: 11, color: '#fff', fontFamily: 'Inter_700Bold' },

  currentBanner: {
    marginHorizontal: 16, marginBottom: 8, marginTop: 12,
    borderRadius: 16, padding: 18, gap: 4,
  },
  currentBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  currentBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  currentBannerTitle: { fontSize: 20, color: '#fff', fontFamily: 'Inter_700Bold' },
  currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  currentBadgeText: { fontSize: 12, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  currentBannerPrice: { fontSize: 24, color: '#fff', fontFamily: 'Inter_700Bold' },
  currentBannerPeriod: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  currentBannerNote: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },

  cards: { paddingHorizontal: 16, gap: 12, marginTop: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 0 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  badgeText: { fontSize: 11, color: '#fff', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  planDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  planName: { fontSize: 20 },
  planSub: { fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 },
  priceMain: { fontSize: 30 },
  pricePeriod: { fontSize: 14 },
  annualNote: { fontSize: 13, marginBottom: 2 },
  trialNote: { fontSize: 11, marginBottom: 12 },
  featureList: { gap: 7, marginBottom: 16, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { fontSize: 13, flex: 1, lineHeight: 18 },
  featureMissing: { opacity: 0.5, textDecorationLine: 'line-through' },

  ctaSolid: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ctaSolidText: { fontSize: 15, color: '#fff' },
  ctaOutline: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, marginTop: 4 },
  ctaOutlineText: { fontSize: 14 },

  footer: { paddingHorizontal: 20, paddingTop: 20, gap: 6 },
  footerText: { fontSize: 12, lineHeight: 18 },
});
