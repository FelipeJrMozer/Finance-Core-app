import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

interface FeePattern {
  id: string;
  keywords: string[];
  label: string;
  category: string;
  icon: string;
  color: string;
  tip: string;
}

const FEE_PATTERNS: FeePattern[] = [
  { id: 'anuidade', keywords: ['anuidade', 'tarifa', 'manutenção', 'mensalidade conta'], label: 'Anuidade / Tarifas Bancárias', category: 'Banco', icon: 'credit-card', color: '#EF4444', tip: 'Migre para bancos digitais (Nubank, C6, Inter) que oferecem conta sem tarifas.' },
  { id: 'juros', keywords: ['juros', 'multa', 'mora', 'encargo', 'iof'], label: 'Juros e Encargos', category: 'Crédito', icon: 'percent', color: '#F59E0B', tip: 'Pague sempre o valor total da fatura para evitar juros do rotativo.' },
  { id: 'streaming', keywords: ['netflix', 'spotify', 'amazon', 'hbo', 'disney', 'globo', 'deezer', 'youtube', 'prime'], label: 'Streaming e Assinaturas', category: 'Lazer', icon: 'tv', color: '#7B39ED', tip: 'Revise todas as assinaturas mensalmente e cancele as que não usa.' },
  { id: 'clube', keywords: ['mensalidade clube', 'academia', 'gym', 'smart fit', 'bodytech'], label: 'Academias e Clubes', category: 'Saúde', icon: 'activity', color: '#10B981', tip: 'Academias ao ar livre e apps de treino podem substituir por menos.' },
  { id: 'seguro', keywords: ['seguro', 'proteção', 'garantia estendida'], label: 'Seguros e Proteções', category: 'Serviços', icon: 'shield', color: '#3B82F6', tip: 'Compare apólices anualmente — o preço pode cair até 30% ao mudar de seguradora.' },
  { id: 'taxa_invest', keywords: ['taxa adm', 'taxa administração', 'come-cotas', 'performance'], label: 'Taxas de Investimento', category: 'Investimentos', icon: 'trending-up', color: '#9C27B0', tip: 'Prefira fundos com taxa de administração abaixo de 0,5% a.a. ou ETFs.' },
  { id: 'ted', keywords: ['ted', 'doc', 'tarifa transferência', 'tarifa pix'], label: 'Tarifas de Transferência', category: 'Banco', icon: 'send', color: '#F44336', tip: 'Use Pix — é gratuito e instantâneo. TEDs por conta pagam taxa.' },
  { id: 'manut', keywords: ['cota', 'taxa manutenção', 'taxa resgate'], label: 'Custos de Produtos Financeiros', category: 'Investimentos', icon: 'dollar-sign', color: '#FF9800', tip: 'Prefira CDBs diretos, LCIs e Tesouro Direto a fundos de gestão passiva.' },
];

export default function HiddenFeesScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { transactions } = useFinance();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);

  const detected = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().substring(0, 10);
    const recent = transactions.filter((t) =>
      t.type === 'expense' && (t.transactionDate ?? t.date) >= sixMonthsAgo
    );

    return FEE_PATTERNS.map((pattern) => {
      const matched = recent.filter((t) => {
        const desc = (t.description ?? '').toLowerCase();
        return pattern.keywords.some((k) => desc.includes(k));
      });
      const total = matched.reduce((s, t) => s + t.amount, 0);
      const monthly = total / 6;
      const annual = monthly * 12;
      return { ...pattern, matched, total, monthly, annual, hasData: matched.length > 0 };
    }).filter((p) => p.hasData);
  }, [transactions]);

  const totalMonthly = detected.reduce((s, d) => s + d.monthly, 0);
  const totalAnnual = detected.reduce((s, d) => s + d.annual, 0);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <LinearGradient
        colors={isDark ? ['#0A0A0F', '#0D1420'] : ['#FFF7ED', '#F5F7FA']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={[s.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Custos Ocultos</Text>
        <Text style={[s.subtitle, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
          Gastos invisíveis detectados nos últimos 6 meses
        </Text>
        {totalMonthly > 0 && (
          <LinearGradient colors={['#EF4444', '#DC2626']} style={s.summaryCard}>
            <Text style={[s.summaryLabel, { fontFamily: 'Inter_400Regular' }]}>Custo mensal estimado</Text>
            <Text style={[s.summaryValue, { fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalMonthly))}</Text>
            <Text style={[s.summaryAnual, { fontFamily: 'Inter_400Regular' }]}>
              {maskValue(formatBRL(totalAnnual))} / ano
            </Text>
          </LinearGradient>
        )}
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
      >
        {detected.length === 0 ? (
          <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
            <Feather name="check-circle" size={48} color={colors.primary} />
            <Text style={[{ color: theme.text, fontSize: 17, fontFamily: 'Inter_600SemiBold' }]}>
              Ótimo! Sem custos ocultos detectados
            </Text>
            <Text style={[{ color: theme.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' }]}>
              Continue monitorando seus gastos para identificar novas oportunidades de economia.
            </Text>
          </View>
        ) : (
          <>
            {detected.map((item) => {
              const isExpanded = expanded === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setExpanded(isExpanded ? null : item.id)}
                  style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border, borderLeftColor: item.color }]}
                >
                  <View style={s.cardHeader}>
                    <View style={[s.iconBox, { backgroundColor: `${item.color}20` }]}>
                      <Feather name={item.icon as any} size={18} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.feeLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{item.label}</Text>
                      <Text style={[s.feeCat, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {item.category} · {item.matched.length} transaç{item.matched.length === 1 ? 'ão' : 'ões'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[s.feeAmount, { color: item.color, fontFamily: 'Inter_700Bold' }]}>
                        {maskValue(formatBRL(item.monthly, true))}/mês
                      </Text>
                      <Text style={[s.feeAnnual, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                        {maskValue(formatBRL(item.annual, true))}/ano
                      </Text>
                    </View>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textTertiary} />
                  </View>
                  {isExpanded && (
                    <>
                      <View style={[s.tipBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
                        <Feather name="zap" size={13} color={colors.primary} />
                        <Text style={[s.tipText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>{item.tip}</Text>
                      </View>
                      <View style={{ gap: 6 }}>
                        {item.matched.slice(0, 5).map((t) => (
                          <View key={t.id} style={s.txRow}>
                            <Text style={[s.txDate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                              {(t.transactionDate ?? t.date).substring(5).replace('-', '/')}
                            </Text>
                            <Text style={[s.txDesc, { color: theme.text, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                              {t.description}
                            </Text>
                            <Text style={[s.txAmt, { color: colors.danger, fontFamily: 'Inter_500Medium' }]}>
                              {maskValue(formatBRL(t.amount, true))}
                            </Text>
                          </View>
                        ))}
                        {item.matched.length > 5 && (
                          <Text style={[s.more, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                            + {item.matched.length - 5} mais
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                </Pressable>
              );
            })}

            <View style={[s.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="info" size={15} color={theme.textTertiary} />
              <Text style={[s.infoText, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Detecção baseada em palavras-chave nas descrições das transações dos últimos 6 meses.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  title: { fontSize: 26 },
  subtitle: { fontSize: 14 },
  summaryCard: { borderRadius: 18, padding: 18, marginTop: 4, gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 32 },
  summaryAnual: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  card: { borderRadius: 14, padding: 14, borderWidth: 1, borderLeftWidth: 3, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  feeLabel: { fontSize: 14 },
  feeCat: { fontSize: 11, marginTop: 1 },
  feeAmount: { fontSize: 14 },
  feeAnnual: { fontSize: 11 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 12, width: 36 },
  txDesc: { flex: 1, fontSize: 12 },
  txAmt: { fontSize: 12 },
  more: { fontSize: 12, textAlign: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
