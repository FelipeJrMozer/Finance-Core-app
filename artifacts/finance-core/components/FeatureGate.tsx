import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useFeatureAccess, FEATURE_REQUIRED_LABEL, type Feature } from '@/hooks/useFeatureAccess';

interface FeatureGateProps {
  feature: Feature;
  /** Conteúdo liberado quando o plano permite. */
  children: React.ReactNode;
  /** Título do upsell. Default: "Recurso exclusivo". */
  title?: string;
  /** Descrição curta do que está bloqueado. */
  description?: string;
  /** Ícone do hero. */
  icon?: keyof typeof Feather.glyphMap;
}

/**
 * Bloqueia o conteúdo para planos abaixo do exigido pela feature.
 * Mostra um card de upsell que abre /(more)/subscriptions.
 */
export function FeatureGate({
  feature,
  children,
  title = 'Recurso exclusivo',
  description,
  icon = 'lock',
}: FeatureGateProps) {
  const allowed = useFeatureAccess(feature);
  const { theme, colors } = useTheme();

  if (allowed) return <>{children}</>;

  const requiredLabel = FEATURE_REQUIRED_LABEL[feature];
  const subtitle = description
    || `Disponível no plano ${requiredLabel} ou superior. Comece com 14 dias grátis.`;

  return (
    <View style={[styles.wrap, { backgroundColor: theme.background }]} testID={`feature-gate-${feature}`}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconWrap}
      >
        <Feather name={icon} size={32} color="#fff" />
      </LinearGradient>
      <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        {subtitle}
      </Text>
      <Pressable
        onPress={() => router.push('/(more)/subscriptions')}
        style={[styles.cta, { backgroundColor: colors.primary }]}
        testID={`upsell-cta-${feature}`}
      >
        <Feather name="arrow-up-right" size={16} color="#fff" />
        <Text style={[styles.ctaText, { fontFamily: 'Inter_600SemiBold' }]}>Ver planos</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, textAlign: 'center', marginTop: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 6 },
  ctaText: { color: '#fff', fontSize: 15 },
});
