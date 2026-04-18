import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { apiPatch } from '@/services/api';
import { logger } from '@/utils/logger';

const { width } = Dimensions.get('window');

interface Slide {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
  color: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'pie-chart',
    title: 'Tudo sobre seu dinheiro num lugar só',
    body: 'Despesas, receitas, cartões, investimentos e metas. Sem planilha, sem dor de cabeça.',
    color: '#0096C7',
  },
  {
    icon: 'briefcase',
    title: 'Pensado pra MEI e PJ no Brasil',
    body: 'Controle de DAS, pró-labore, notas e fluxo de caixa do seu negócio sem contador.',
    color: '#7C3AED',
  },
  {
    icon: 'trending-up',
    title: 'Investimentos com retorno real',
    body: 'TWR, MWR, dividendos e benchmarks. Saiba se sua carteira está mesmo rendendo.',
    color: '#10B981',
  },
  {
    icon: 'shield',
    title: 'Privado e seguro',
    body: 'Biometria, criptografia local e backup quando você quiser. Você no controle, sempre.',
    color: '#F59E0B',
  },
];

export default function OnboardingScreen() {
  const { theme, colors, isDark } = useTheme();
  const { updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const p = Math.round(x / width);
    if (p !== page) setPage(p);
  };

  const goNext = () => {
    Haptics.selectionAsync();
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
      setPage(page + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await apiPatch('/api/auth/user', { firstLogin: false });
    } catch (err) {
      logger.warn('[onboarding] Falha ao marcar firstLogin=false', err);
    }
    try { updateUser({ firstLogin: false }); } catch {}
    router.replace('/(tabs)');
  };

  const skip = async () => {
    Haptics.selectionAsync();
    await finish();
  };

  return (
    <LinearGradient
      colors={isDark ? ['#0A0A0F', '#091520'] : ['#EBF8FF', '#F5F7FA']}
      style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View style={styles.topBar}>
        <Pressable onPress={skip} hitSlop={10}>
          <Text style={[styles.skipText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
            Pular
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: `${s.color}20` }]}>
              <Feather name={s.icon} size={56} color={s.color} />
            </View>
            <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {s.title}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === page ? colors.primary : theme.border,
                width: i === page ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          testID="onboarding-next"
          onPress={goNext}
          style={[styles.cta, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.ctaText, { color: '#000', fontFamily: 'Inter_700Bold' }]}>
            {page < SLIDES.length - 1 ? 'Continuar' : 'Começar agora'}
          </Text>
          <Feather name="arrow-right" size={18} color="#000" />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'flex-end' },
  skipText: { fontSize: 14 },
  slide: {
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  iconWrap: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, textAlign: 'center', lineHeight: 32 },
  body: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  dot: { height: 8, borderRadius: 4 },
  bottomBar: { paddingHorizontal: 20, paddingBottom: 12 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
  },
  ctaText: { fontSize: 16 },
});
