import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Switch, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import {
  PlanName, getSubscriptionInfo, startCheckout, normalizePlanName, trialDaysRemaining,
  SubscriptionInfo,
} from '@/services/subscription';

interface PlanDef {
  id: PlanName;
  label: string;
  subtitle: string;
  color: string;
  gradient: [string, string];
  popular?: boolean;
  paid: boolean;
  monthly: number;
  features: string[];
}

const ANNUAL_DISCOUNT = 0.17;

const PLANS: PlanDef[] = [
  {
    id: 'ESSENCIAL',
    label: 'Essencial',
    subtitle: 'Para começar a controlar suas finanças',
    color: '#6B7280',
    gradient: ['#374151', '#1F2937'],
    paid: false,
    monthly: 0,
    features: [
      'Até 100 transações/mês',
      'Até 2 contas bancárias',
      'Até 3 orçamentos por categoria',
      'Histórico de 3 meses',
      'Dashboard básico',
    ],
  },
  {
    id: 'PREMIUM',
    label: 'Premium',
    subtitle: 'Controle total + investimentos profissionais',
    color: '#EF4444',
    gradient: ['#DC2626', '#B91C1C'],
    popular: true,
    paid: true,
    monthly: 29.9,
    features: [
      'Transações, contas e cartões ilimitados',
      'Histórico completo',
      'Agente de IA financeira',
      'Investimentos avançados (19 ferramentas)',
      'DARF automático + Otimizador IR',
      'Exportação CSV/PDF/Excel',
      '4 simuladores financeiros',
    ],
  },
  {
    id: 'FAMILY',
    label: 'Family',
    subtitle: 'Premium completo para toda a família',
    color: '#7C3AED',
    gradient: ['#7C3AED', '#5B21B6'],
    paid: true,
    monthly: 49.9,
    features: [
      'Tudo do plano Premium',
      'Até 5 membros — cada um com dados privados',
      'Despesas compartilhadas',
      'Caixinha familiar',
      'Orçamento e metas familiares',
      'Suporte prioritário dedicado',
    ],
  },
  {
    id: 'PJ',
    label: 'PJ / MEI',
    subtitle: 'Gestão completa para autônomos e MEI',
    color: '#10B981',
    gradient: ['#10B981', '#047857'],
    paid: true,
    monthly: 39.9,
    features: [
      'Receitas, despesas e clientes PJ',
      'Pró-labore e retiradas',
      'DAS e DASN-SIMEI',
      'Notas fiscais e fluxo de caixa',
      'Saúde do negócio em tempo real',
    ],
  },
  {
    id: 'INVESTIDOR_PRO',
    label: 'Investidor Pro',
    subtitle: 'Análise de portfólio profissional',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#B45309'],
    paid: true,
    monthly: 59.9,
    features: [
      'Tudo do plano Premium',
      'Análise de risco e correlação',
      'Rebalanceamento automático',
      'Análise técnica e fundamentalista',
      'Screener de ações + alertas',
      'Benchmarks personalizados',
    ],
  },
];

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function annualMonthly(price: number) {
  return price * (1 - ANNUAL_DISCOUNT);
}

export default function SubscriptionsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [annual, setAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<PlanName | null>(null);

  const { data: subInfo } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/subscription/info'],
    queryFn: getSubscriptionInfo,
    staleTime: 30_000,
    retry: 1,
  });

  const currentPlan: PlanName = normalizePlanName(subInfo?.plan?.name as string | undefined);
  const trialDays = trialDaysRemaining(subInfo?.trialEnd);
  const isTrialing = subInfo?.status === 'trialing' || trialDays > 0;

  const handleSubscribe = async (plan: PlanDef) => {
    if (plan.id === currentPlan) return;
    if (!plan.paid) {
      Alert.alert('Plano Essencial', 'Para mudar para o plano Essencial, abra o painel de gerenciamento.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingPlan(plan.id);
    try {
      const r = await startCheckout(plan.id);
      if (!r?.url) throw new Error('URL de checkout indisponível.');
      const result = await WebBrowser.openBrowserAsync(r.url);
      // Após retornar, revalida o plano
      qc.invalidateQueries({ queryKey: ['/api/subscription/info'] });
      if (result?.type === 'cancel') {
        // Apenas fecha — não notifica erro
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível iniciar o checkout.';
      // Mensagem amigável quando o backend ainda não tem o priceID configurado
      if (/price.*id|503|configurado|indispon/i.test(msg)) {
        Alert.alert('Plano indisponível', 'Este plano não está disponível para checkout no momento. Tente novamente mais tarde.');
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const getPrice = (plan: PlanDef) => (plan.monthly === 0 ? 0 : annual ? annualMonthly(plan.monthly) : plan.monthly);

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
            <Text style={{ fontFamily: 'Inter_700Bold', color: theme.text }}>14 dias grátis</Text>
            . Cancele quando quiser.
          </Text>

          <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Pressable onPress={() => setAnnual(false)} testID="billing-monthly">
              <Text style={[styles.toggleLabel, { color: !annual ? theme.text : theme.textTertiary, fontFamily: !annual ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                Mensal
              </Text>
            </Pressable>
            <Switch
              value={annual}
              onValueChange={(v) => { setAnnual(v); Haptics.selectionAsync(); }}
              trackColor={{ false: theme.border, true: '#EF4444' }}
              thumbColor="#fff"
              testID="billing-toggle"
            />
            <Pressable onPress={() => setAnnual(true)} style={styles.annualRow} testID="billing-annual">
              <Text style={[styles.toggleLabel, { color: annual ? theme.text : theme.textTertiary, fontFamily: annual ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                Anual
              </Text>
              <View style={styles.discountBadge}><Text style={styles.discountText}>17% OFF</Text></View>
            </Pressable>
          </View>
        </View>

        {/* Trial banner */}
        {isTrialing && trialDays > 0 && (
          <View style={[styles.trialBanner, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}>
            <Feather name="clock" size={16} color={colors.warning} />
            <Text style={[styles.trialBannerText, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
              Você está em teste gratuito — restam {trialDays} {trialDays === 1 ? 'dia' : 'dias'} no plano {currentPlan}.
            </Text>
          </View>
        )}

        {/* Cards */}
        <View style={styles.cards}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const isLoading = loadingPlan === plan.id;
            const price = getPrice(plan);
            return (
              <View
                key={plan.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.card,
                    borderColor: isCurrent ? plan.color : plan.popular ? plan.color : theme.border,
                  },
                  (isCurrent || plan.popular) && { borderWidth: 2 },
                ]}
                testID={`plan-${plan.id}`}
              >
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

                <View style={styles.cardHeader}>
                  <View style={[styles.planDot, { backgroundColor: plan.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                      {plan.label}
                    </Text>
                    <Text style={[styles.planSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {plan.subtitle}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.priceMain, { color: isCurrent ? plan.color : theme.text, fontFamily: 'Inter_700Bold' }]}>
                    {price === 0 ? 'R$ 0' : `R$ ${formatBRL(price)}`}
                  </Text>
                  <Text style={[styles.pricePeriod, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {price === 0 ? '/sempre' : '/mês'}
                  </Text>
                </View>
                {plan.paid && (
                  <Text style={[styles.trialNote, { color: plan.color, fontFamily: 'Inter_400Regular' }]}>
                    {annual ? '14 dias grátis · cobrança anual' : '14 dias grátis · sem fidelidade'}
                  </Text>
                )}

                <View style={styles.featureList}>
                  {plan.features.map((f) => (
                    <View key={f} style={styles.featureRow}>
                      <Feather name="check" size={14} color={plan.color} />
                      <Text style={[styles.featureText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{f}</Text>
                    </View>
                  ))}
                </View>

                {isCurrent ? (
                  <View style={[styles.ctaOutline, { borderColor: plan.color }]}>
                    <Text style={[styles.ctaOutlineText, { color: plan.color, fontFamily: 'Inter_600SemiBold' }]}>
                      Plano atual
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleSubscribe(plan)}
                    disabled={isLoading}
                    style={({ pressed }) => [
                      styles.ctaSolid,
                      { backgroundColor: plan.color, opacity: pressed ? 0.85 : 1 },
                    ]}
                    testID={`subscribe-${plan.id}`}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={[styles.ctaSolidText, { fontFamily: 'Inter_600SemiBold' }]}>
                        {plan.paid ? 'Começar 14 dias grátis →' : 'Continuar no Essencial'}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

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
  heroSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1, marginTop: 4,
  },
  toggleLabel: { fontSize: 15 },
  annualRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountBadge: { backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  discountText: { fontSize: 11, color: '#fff', fontFamily: 'Inter_700Bold' },

  trialBanner: {
    marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  trialBannerText: { fontSize: 13, flex: 1 },

  cards: { paddingHorizontal: 16, gap: 12, marginTop: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  badgeText: { fontSize: 11, color: '#fff', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  planDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  planName: { fontSize: 20 },
  planSub: { fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 4 },
  priceMain: { fontSize: 30 },
  pricePeriod: { fontSize: 14 },
  trialNote: { fontSize: 12, marginBottom: 12 },
  featureList: { gap: 7, marginBottom: 16, marginTop: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { fontSize: 13, flex: 1, lineHeight: 18 },

  ctaSolid: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  ctaSolidText: { fontSize: 15, color: '#fff' },
  ctaOutline: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1, marginTop: 4 },
  ctaOutlineText: { fontSize: 14 },

  footer: { paddingHorizontal: 20, paddingTop: 20, gap: 6 },
  footerText: { fontSize: 12, lineHeight: 18 },
});
