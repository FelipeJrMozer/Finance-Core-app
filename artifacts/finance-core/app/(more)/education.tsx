import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { router } from 'expo-router';

interface Article {
  id: string;
  title: string;
  desc: string;
  icon: string;
  color: string;
  category: string;
  readMin: number;
}

const ARTICLES: Article[] = [
  { id: '1', title: 'O que é a Regra dos 50/30/20?', desc: 'Aprenda a dividir sua renda em necessidades, desejos e poupança de forma simples.', icon: 'percent', color: '#10B981', category: 'Orçamento', readMin: 4 },
  { id: '2', title: 'Como montar uma reserva de emergência', desc: 'Entenda por que 6 meses de custo de vida é o mínimo recomendado e como chegar lá.', icon: 'shield', color: '#3B82F6', category: 'Poupança', readMin: 5 },
  { id: '3', title: 'Tesouro Direto para iniciantes', desc: 'Tudo o que você precisa saber para começar a investir em títulos públicos.', icon: 'book', color: '#7B39ED', category: 'Investimentos', readMin: 7 },
  { id: '4', title: 'CDI, Selic e IPCA: o que significam?', desc: 'As três taxas mais importantes do Brasil explicadas de forma clara e objetiva.', icon: 'bar-chart-2', color: '#F59E0B', category: 'Conceitos', readMin: 5 },
  { id: '5', title: 'Como funciona o FGTS', desc: 'Direitos do trabalhador, saque-aniversário e quando vale a pena resgatar.', icon: 'briefcase', color: '#EF4444', category: 'Direitos', readMin: 6 },
  { id: '6', title: 'Previdência Privada: PGBL vs VGBL', desc: 'Qual o melhor para o seu perfil tributário e como escolher o fundo certo.', icon: 'umbrella', color: '#9C27B0', category: 'Previdência', readMin: 8 },
  { id: '7', title: 'Imposto de Renda: dicas para pagar menos', desc: 'Deduções legais, dependentes e despesas médicas que muita gente esquece de declarar.', icon: 'file-text', color: '#F44336', category: 'Impostos', readMin: 6 },
  { id: '8', title: 'Independência Financeira (FIRE)', desc: 'Como calcular quando você pode parar de trabalhar e como acelerar o processo.', icon: 'trending-up', color: '#2196F3', category: 'Planejamento', readMin: 10 },
  { id: '9', title: 'Como sair das dívidas', desc: 'Estratégias comprovadas: método avalanche vs. bola de neve — qual escolher.', icon: 'alert-triangle', color: '#FF9800', category: 'Dívidas', readMin: 5 },
  { id: '10', title: 'Diversificação de portfólio', desc: 'Por que não concentrar os investimentos em um único ativo e como equilibrar.', icon: 'pie-chart', color: '#009688', category: 'Investimentos', readMin: 6 },
];

const TIPS = [
  { icon: 'zap', color: '#F59E0B', text: 'Pague-se primeiro: separe poupança assim que receber, antes de gastar.' },
  { icon: 'calendar', color: '#10B981', text: 'Revise seu orçamento mensalmente para identificar gastos desnecessários.' },
  { icon: 'credit-card', color: '#EF4444', text: 'Evite pagar o mínimo do cartão — os juros são os maiores do mercado.' },
  { icon: 'target', color: '#3B82F6', text: 'Defina metas financeiras com prazo e valor específico para cada uma.' },
  { icon: 'shield', color: '#7B39ED', text: 'Antes de investir, quite dívidas com juros acima de 12% a.a.' },
];

const CATEGORIES_FILTER = ['Todos', 'Orçamento', 'Poupança', 'Investimentos', 'Conceitos', 'Impostos', 'Planejamento', 'Dívidas'];

export default function EducationScreen() {
  const { theme, colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = selectedCategory === 'Todos' ? ARTICLES : ARTICLES.filter((a) => a.category === selectedCategory);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#EBF8FF', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Educação Financeira</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Conteúdo para evoluir sua relação com o dinheiro
        </Text>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        <View style={[s.tipsCard, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30`, marginHorizontal: 16, marginTop: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Feather name="star" size={15} color={colors.primary} />
            <Text style={[s.tipsTitle, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Dicas rápidas</Text>
          </View>
          {TIPS.map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={[s.tipIcon, { backgroundColor: `${tip.color}20` }]}>
                <Feather name={tip.icon as any} size={14} color={tip.color} />
              </View>
              <Text style={[s.tipText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{tip.text}</Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          style={{ flexShrink: 0 }}
        >
          {CATEGORIES_FILTER.map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[s.chip, {
                backgroundColor: selectedCategory === cat ? colors.primary : theme.surface,
                borderColor: selectedCategory === cat ? colors.primary : theme.border,
              }]}
            >
              <Text style={[s.chipText, { color: selectedCategory === cat ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {filtered.map((article) => {
            const expanded = expandedId === article.id;
            return (
              <Pressable
                key={article.id}
                onPress={() => setExpandedId(expanded ? null : article.id)}
                style={[s.article, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <View style={s.articleHeader}>
                  <View style={[s.articleIcon, { backgroundColor: `${article.color}20` }]}>
                    <Feather name={article.icon as any} size={18} color={article.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <View style={[s.catBadge, { backgroundColor: `${article.color}20` }]}>
                        <Text style={[s.catText, { color: article.color, fontFamily: 'Inter_500Medium' }]}>{article.category}</Text>
                      </View>
                      <Text style={[s.readTime, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {article.readMin} min
                      </Text>
                    </View>
                    <Text style={[s.articleTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                      {article.title}
                    </Text>
                  </View>
                  <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textTertiary} />
                </View>
                {expanded && (
                  <Text style={[s.articleDesc, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                    {article.desc}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginHorizontal: 16 }}>
          <Pressable
            onPress={() => Linking.openURL('https://www.bcb.gov.br/cidadaniafinanceira')}
            style={[s.externalLink, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Feather name="external-link" size={16} color={colors.primary} />
            <Text style={[s.externalText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
              Cidadania Financeira — Banco Central do Brasil
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  tipsCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  tipsTitle: { fontSize: 14 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13 },
  article: { borderRadius: 14, padding: 14, borderWidth: 1, gap: 10 },
  articleHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  articleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 11 },
  readTime: { fontSize: 11 },
  articleTitle: { fontSize: 14, lineHeight: 20 },
  articleDesc: { fontSize: 13, lineHeight: 19 },
  externalLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  externalText: { fontSize: 14 },
});
