import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput, Platform, KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { apiPost } from '@/services/api';
import { FeatureGate } from '@/components/FeatureGate';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

function MarkdownText({ content, color, fontFamily }: { content: string; color: string; fontFamily: string }) {
  const lines = content.split('\n');

  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith('* ') || line.trimStart().startsWith('- ');
        const text = isBullet ? line.trimStart().slice(2) : line;

        const parts: { text: string; bold: boolean }[] = [];
        const boldRegex = /\*\*([^*]+)\*\*/g;
        let last = 0;
        let match;
        while ((match = boldRegex.exec(text)) !== null) {
          if (match.index > last) parts.push({ text: text.slice(last, match.index), bold: false });
          parts.push({ text: match[1], bold: true });
          last = match.index + match[0].length;
        }
        if (last < text.length) parts.push({ text: text.slice(last), bold: false });

        if (!text.trim() && !isBullet) return <View key={i} style={{ height: 4 }} />;

        return (
          <View key={i} style={isBullet ? { flexDirection: 'row', gap: 6, alignItems: 'flex-start' } : undefined}>
            {isBullet && <Text style={{ color, fontFamily, fontSize: 15, lineHeight: 22 }}>•</Text>}
            <Text style={{ color, fontFamily, fontSize: 15, lineHeight: 22, flex: isBullet ? 1 : undefined }}>
              {parts.map((p, j) => (
                <Text key={j} style={p.bold ? { fontFamily: 'Inter_600SemiBold' } : undefined}>
                  {p.text}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
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
      content: `Olá! Sou seu assistente financeiro com IA. Estou pronto para analisar seus dados e responder suas perguntas sobre finanças pessoais.\n\nComo posso ajudar você hoje?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: Message = { id: uid(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [userMsg, ...prev]);
    setInput('');
    setIsTyping(true);

    try {
      const history = [...messages]
        .reverse()
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      const data = await apiPost<{ reply: string }>('/api/ai/chat', {
        message: text,
        messages: history,
        context: {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          netResult,
          healthScore,
        },
      });

      const aiMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: data.reply ?? 'Não foi possível obter uma resposta.',
        timestamp: new Date(),
      };
      setMessages((prev) => [aiMsg, ...prev]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      const errMsg: Message = {
        id: uid(),
        role: 'assistant',
        content: 'Desculpe, não consegui processar sua mensagem. Verifique sua conexão e tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [errMsg, ...prev]);
    } finally {
      setIsTyping(false);
    }
  };

  const QUICK_QUESTIONS = [
    'Como está meu saldo?',
    'Como melhorar minha poupança?',
    'Dicas de investimento',
    'Sobre aposentadoria',
  ];

  return (
    <FeatureGate
      feature="ai"
      title="Assistente Financeiro com IA"
      icon="cpu"
      description="Tire dúvidas, receba análises e simulações personalizadas pela nossa IA. Disponível no plano PREMIUM ou superior."
    >
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
            {item.role === 'assistant' ? (
              <View style={{ flex: 1 }}>
                <MarkdownText
                  content={item.content}
                  color={theme.text}
                  fontFamily="Inter_400Regular"
                />
              </View>
            ) : (
              <Text style={[styles.bubbleText, { color: '#000', fontFamily: 'Inter_400Regular' }]}>
                {item.content}
              </Text>
            )}
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
    </FeatureGate>
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
