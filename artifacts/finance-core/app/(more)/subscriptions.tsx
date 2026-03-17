import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

const PLANS = [
  {
    id: 'Free',
    label: 'Grátis',
    price: 0,
    priceLabel: 'R$ 0',
    period: '',
    color: '#6B7280',
    gradient: ['#6B7280', '#4B5563'] as [string, string],
    features: [
      'Até 50 transações/mês',
      '2 contas bancárias',
      '3 categorias de orçamento',
      'Relatórios básicos',
    ],
    missing: [
      'IA de análise financeira',
      'Módulo familiar',
      'Exportação de dados',
      'Relatórios avançados',
      'Suporte prioritário',
    ],
  },
  {
    id: 'Pro',
    label: 'Pro',
    price: 19.9,
    priceLabel: 'R$ 19,90',
    period: '/mês',
    color: '#0096C7',
    gradient: ['#0096C7', '#0077A3'] as [string, string],
    popular: true,
    features: [
      'Transações ilimitadas',
      'Contas ilimitadas',
      'Orçamentos ilimitados',
      'IA de análise financeira',
      'Exportação CSV/PDF',
      'Relatórios avançados',
      'Módulo familiar (até 4)',
    ],
    missing: ['Suporte prioritário 24h', 'Família até 8 membros'],
  },
  {
    id: 'Premium',
    label: 'Premium',
    price: 34.9,
    priceLabel: 'R$ 34,90',
    period: '/mês',
    color: '#7C3AED',
    gradient: ['#7C3AED', '#5B21B6'] as [string, string],
    features: [
      'Tudo do Pro',
      'Família até 8 membros',
      'Suporte prioritário 24h',
      'Gestor financeiro pessoal (IA)',
      'Alertas WhatsApp ilimitados',
      'API pública para integrações',
      'Backup automático na nuvem',
    ],
    missing: [],
  },
];

const PLAN_ORDER = ['Free', 'Pro', 'Premium'];

function getPlanIndex(plan?: string) {
  const idx = PLAN_ORDER.indexOf(plan || 'Free');
  return idx === -1 ? 0 : idx;
}

export default function SubscriptionsScreen() {
  const { theme, colors } = useTheme();
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState<string | null>(null);

  const currentPlanId = user?.plan || 'Free';
  const currentPlanIdx = getPlanIndex(currentPlanId);
  const currentPlan = PLANS.find((p) => p.id === currentPlanId) || PLANS[0];
  const isSubscriber = currentPlanIdx > 0;

  const handleSubscribe = (plan: typeof PLANS[0]) => {
    if (plan.id === currentPlanId) return;
    const isUpgrade = getPlanIndex(plan.id) > currentPlanIdx;
    const isDowngrade = getPlanIndex(plan.id) < currentPlanIdx;

    const verb = isDowngrade ? 'Fazer downgrade' : isUpgrade ? 'Assinar' : 'Ativar';
    const msg = isDowngrade
      ? `Tem certeza que deseja fazer downgrade para o plano ${plan.label}? Você perderá acesso a alguns recursos.`
      : `Deseja assinar o plano ${plan.label} por ${plan.priceLabel}${plan.period}?`;

    Alert.alert(verb + ' ' + plan.label, msg, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: plan.price === 0 ? 'Confirmar' : 'Ir para pagamento',
        onPress: async () => {
          setLoading(plan.id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await new Promise((r) => setTimeout(r, 1200));
          updateUser({ plan: plan.id });
          setLoading(null);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            '✅ Plano ' + plan.label,
            plan.price === 0
              ? 'Seu plano foi alterado para Grátis.'
              : `Bem-vindo ao ${plan.label}! Seus novos recursos já estão disponíveis.`
          );
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Assinaturas' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current plan banner — only when subscribed */}
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
                <Feather name="check-circle" size={14} color="#fff" />
                <Text style={styles.currentBadgeText}>Ativo</Text>
              </View>
            </View>
            <Text style={styles.currentBannerPrice}>
              {currentPlan.priceLabel}
              <Text style={styles.currentBannerPeriod}>{currentPlan.period}</Text>
            </Text>
            <Text style={styles.currentBannerNote}>
              Próxima cobrança em 15/04/2026
            </Text>
            <View style={styles.currentFeatures}>
              {currentPlan.features.slice(0, 4).map((f) => (
                <View key={f} style={styles.currentFeatureRow}>
                  <Feather name="check" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.currentFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        )}

        {/* Header for non-subscribers */}
        {!isSubscriber && (
          <View style={styles.heroSection}>
            <LinearGradient
              colors={[colors.primary, '#0077A3']}
              style={styles.heroIcon}
            >
              <Feather name="award" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.heroTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              Escolha seu plano
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              Desbloqueie recursos avançados e tenha controle total das suas finanças
            </Text>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const isUpgrade = getPlanIndex(plan.id) > currentPlanIdx;
            const isLoading = loading === plan.id;

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  { backgroundColor: theme.card, borderColor: isCurrent ? plan.color : theme.border },
                  isCurrent && styles.planCardCurrent,
                  plan.popular && !isCurrent && { borderColor: plan.color },
                ]}
              >
                {/* Popular badge */}
                {plan.popular && !isCurrent && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.popularText}>Mais popular</Text>
                  </View>
                )}
                {isCurrent && (
                  <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                    <Feather name="check-circle" size={11} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.popularText}>Plano atual</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={[styles.planDot, { backgroundColor: plan.color }]} />
                  <Text style={[styles.planLabel, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                    {plan.label}
                  </Text>
                </View>

                <View style={styles.planPriceRow}>
                  <Text style={[styles.planPrice, { color: isCurrent ? plan.color : theme.text, fontFamily: 'Inter_700Bold' }]}>
                    {plan.priceLabel}
                  </Text>
                  {plan.period ? (
                    <Text style={[styles.planPeriod, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {plan.period}
                    </Text>
                  ) : null}
                </View>

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
                {!isCurrent && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.planBtn,
                      {
                        backgroundColor: isUpgrade ? plan.color : `${plan.color}22`,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    onPress={() => handleSubscribe(plan)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={isUpgrade ? '#fff' : plan.color} />
                    ) : (
                      <Text style={[
                        styles.planBtnText,
                        { color: isUpgrade ? '#fff' : plan.color, fontFamily: 'Inter_600SemiBold' },
                      ]}>
                        {plan.price === 0
                          ? 'Usar grátis'
                          : isUpgrade
                            ? `Assinar ${plan.label}`
                            : `Mudar para ${plan.label}`}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>

        {/* Upgrade nudge for Pro users */}
        {currentPlanId === 'Pro' && (
          <View style={[styles.upgradeNudge, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
            <Feather name="zap" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nudgeTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Precisa de mais?
              </Text>
              <Text style={[styles.nudgeDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                O Premium adiciona suporte 24h, família expandida e gestor IA personalizado.
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.notes}>
          <Text style={[styles.noteText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            • Cancele a qualquer momento sem taxas
          </Text>
          <Text style={[styles.noteText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            • Cobrança mensal via cartão de crédito ou Pix
          </Text>
          <Text style={[styles.noteText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
            • Ao assinar você concorda com os{' '}
            <Text style={{ color: colors.primary }}>Termos de Uso</Text>
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  currentBanner: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  currentBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  currentBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  currentBannerTitle: { fontSize: 22, color: '#fff', fontFamily: 'Inter_700Bold' },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: { fontSize: 12, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  currentBannerPrice: { fontSize: 26, color: '#fff', fontFamily: 'Inter_700Bold' },
  currentBannerPeriod: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  currentBannerNote: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  currentFeatures: { marginTop: 8, gap: 4 },
  currentFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentFeatureText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_400Regular' },

  plansContainer: { paddingHorizontal: 16, gap: 12 },
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    gap: 0,
  },
  planCardCurrent: { borderWidth: 2 },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
  },
  popularText: { fontSize: 11, color: '#fff', fontFamily: 'Inter_600SemiBold' },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  planDot: { width: 10, height: 10, borderRadius: 5 },
  planLabel: { fontSize: 18 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 16 },
  planPrice: { fontSize: 28 },
  planPeriod: { fontSize: 14 },
  featureList: { gap: 8, marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, flex: 1 },
  featureMissing: { opacity: 0.5 },
  planBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  planBtnText: { fontSize: 15 },

  upgradeNudge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  nudgeTitle: { fontSize: 14, marginBottom: 2 },
  nudgeDesc: { fontSize: 13, lineHeight: 18 },

  notes: { paddingHorizontal: 20, paddingTop: 20, gap: 6 },
  noteText: { fontSize: 12, lineHeight: 18 },
});
