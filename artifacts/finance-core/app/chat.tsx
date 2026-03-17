import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform, KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL, getCurrentMonth } from '@/utils/formatters';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

function getAIResponse(userMessage: string, context: {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netResult: number;
  healthScore: number;
}): string {
  const msg = userMessage.toLowerCase();
  const { totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore } = context;
  const savingsRate = monthlyIncome > 0 ? ((netResult / monthlyIncome) * 100).toFixed(1) : '0';

  if (msg.includes('saldo') || msg.includes('dinheiro') || msg.includes('quanto')) {
    return `Seu saldo total atual é ${formatBRL(totalBalance)}. Este mês você teve ${formatBRL(monthlyIncome)} de receitas e ${formatBRL(monthlyExpenses)} de despesas, resultando em um saldo mensal de ${formatBRL(netResult)}.`;
  }
  if (msg.includes('poupan') || msg.includes('guardar') || msg.includes('economiz')) {
    return `Sua taxa de poupança este mês é de ${savingsRate}%. ${
      parseFloat(savingsRate) >= 20
        ? 'Excelente! Você está acima da meta de 20% recomendada por especialistas.'
        : 'Tente aumentar para pelo menos 20%. Dica: corte despesas não essenciais e automatize transferências para poupança no início do mês.'
    }`;
  }
  if (msg.includes('investimento') || msg.includes('investir') || msg.includes('rend')) {
    return `Para quem está começando a investir, recomendo: 1) Primeiro, mantenha uma reserva de emergência de 6 meses de despesas. 2) Tesouro Selic para segurança. 3) IVVB11 para exposição ao S&P500. 4) FIIs para renda passiva. Sua saúde financeira atual é ${healthScore}/1000.`;
  }
  if (msg.includes('dívida') || msg.includes('cartão') || msg.includes('crédito')) {
    return `Estratégia para quitar dívidas: priorize as de maior juros (especialmente cartão de crédito). Tente pagar sempre o valor total da fatura. Com ${formatBRL(netResult)} de resultado mensal, você tem capacidade de acelerar a quitação.`;
  }
  if (msg.includes('aposentadoria') || msg.includes('previdência')) {
    return `Para aposentadoria, recomendo contribuir com pelo menos 15% da renda. Considere PGBL ou VGBL dependendo do seu imposto de renda. Invista em ativos diversificados: renda fixa, ações e FIIs. Com sua renda atual de ${formatBRL(monthlyIncome)}, contribuindo 15% resultaria em ${formatBRL(monthlyIncome * 0.15)} por mês.`;
  }
  if (msg.includes('imposto') || msg.includes('ir') || msg.includes('darf')) {
    return `Sobre imposto de renda: operações de venda de ações acima de R$ 20.000/mês precisam recolher DARF. FIIs distribuem rendimentos isentos de IR para PF. Fique atento aos prazos - DARF deve ser pago até o último dia útil do mês seguinte à operação.`;
  }
  if (msg.includes('meta') || msg.includes('objetivo') || msg.includes('sonho')) {
    return `Para atingir suas metas financeiras: 1) Defina objetivos específicos com valor e prazo. 2) Calcule quanto precisa guardar por mês. 3) Crie uma conta separada para cada meta. 4) Automatize aportes. Quer que eu calcule quanto você precisa guardar para alguma meta específica?`;
  }
  if (msg.includes('saúde') || msg.includes('score') || msg.includes('nota')) {
    return `Sua saúde financeira é ${healthScore}/1000 - ${
      healthScore >= 800 ? 'Excelente! Continue assim.' :
      healthScore >= 600 ? 'Boa! Você está no caminho certo.' :
      'Há espaço para melhorar. Foque em aumentar a poupança e os investimentos.'
    } Para melhorar seu score, mantenha gastos abaixo da renda, aumente investimentos e defina metas claras.`;
  }
  
  return `Olá! Sou seu assistente financeiro pessoal. Posso ajudá-lo com:\n\n• Análise do seu saldo e fluxo de caixa\n• Estratégias de poupança e investimento\n• Planejamento para metas e aposentadoria\n• Dicas sobre impostos e DARFs\n• Gestão de dívidas e cartão de crédito\n\nSua saúde financeira atual é ${healthScore}/1000. O que deseja analisar?`;
}

export default function ChatScreen() {
  const { theme, colors } = useTheme();
  const { totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore } = useFinance();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(),
      role: 'assistant',
      content: `Olá! Sou seu assistente financeiro AI. Estou analisando seus dados financeiros.\n\n📊 Resumo atual:\n• Saldo total: ${formatBRL(totalBalance)}\n• Saúde financeira: ${healthScore}/1000\n\nComo posso ajudar você hoje?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: uid(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [userMsg, ...prev]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getAIResponse(text, { totalBalance, monthlyIncome, monthlyExpenses, netResult, healthScore });
      const aiMsg: Message = { id: uid(), role: 'assistant', content: response, timestamp: new Date() };
      setMessages((prev) => [aiMsg, ...prev]);
      setIsTyping(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 800 + Math.random() * 600);
  };

  const QUICK_QUESTIONS = [
    'Como está meu saldo?',
    'Como melhorar minha poupança?',
    'Dicas de investimento',
    'Sobre aposentadoria',
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.role === 'user' ? styles.userBubble : styles.aiBubble,
            {
              backgroundColor: item.role === 'user' ? colors.primary : theme.surface,
              borderColor: item.role === 'user' ? colors.primary : theme.border,
            }
          ]}>
            {item.role === 'assistant' && (
              <View style={[styles.aiIcon, { backgroundColor: colors.primaryGlow }]}>
                <Feather name="cpu" size={14} color={colors.primary} />
              </View>
            )}
            <Text style={[
              styles.bubbleText,
              {
                color: item.role === 'user' ? '#000' : theme.text,
                fontFamily: 'Inter_400Regular',
              }
            ]}>
              {item.content}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.bubble, styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.aiIcon, { backgroundColor: colors.primaryGlow }]}>
                <Feather name="cpu" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.typing, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                Analisando...
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 12, gap: 8 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!messages.length}
      />

      {/* Quick Questions */}
      {messages.length <= 1 && (
        <View style={styles.quickRow}>
          {QUICK_QUESTIONS.map((q) => (
            <Pressable
              key={q}
              onPress={() => { setInput(q); }}
              style={[styles.quickChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            >
              <Text style={[styles.quickText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
                {q}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[
        styles.inputBar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 0) + 8,
        }
      ]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
          <TextInput
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte sobre suas finanças..."
            placeholderTextColor={theme.textTertiary}
            multiline
            style={[styles.chatInput, { color: theme.text, fontFamily: 'Inter_400Regular' }]}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <Pressable
            testID="send-btn"
            onPress={sendMessage}
            disabled={!input.trim() || isTyping}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isTyping ? colors.primary : theme.border,
                opacity: pressed ? 0.8 : 1,
              }
            ]}
          >
            <Feather name="send" size={16} color={input.trim() && !isTyping ? '#000' : theme.textTertiary} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '88%', padding: 12, borderRadius: 16, gap: 6, borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', flexDirection: 'row', borderBottomLeftRadius: 4, gap: 10 },
  aiIcon: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  bubbleText: { fontSize: 15, lineHeight: 22, flex: 1 },
  typing: { fontSize: 14 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickText: { fontSize: 13 },
  inputBar: { borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 12 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1,
  },
  chatInput: { flex: 1, fontSize: 16, maxHeight: 120, paddingTop: 4 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
