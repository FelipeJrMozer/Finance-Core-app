import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { parseBankSms, type ParsedSms } from '@/utils/smsParser';
import { safeGet } from '@/utils/storage';

export default function ShareImportScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string>('');
  const [parsed, setParsed] = useState<ParsedSms | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'intent' | 'clipboard' | 'manual' | null>(null);

  function applyText(body: string, src: 'intent' | 'clipboard' | 'manual') {
    setText(body);
    setSource(src);
    setParsed(body ? parseBankSms(body) : null);
  }

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        // 1) Intent text via deep link query (?text=)
        const url = await Linking.getInitialURL();
        if (url) {
          try {
            const parsedUrl = Linking.parse(url);
            const q = parsedUrl.queryParams as Record<string, string> | undefined;
            if (q?.text) {
              const body = decodeURIComponent(q.text);
              if (active && body) { applyText(body, 'intent'); return; }
            }
          } catch { /* ignore */ }
        }
        // 2) Auto clipboard: muitos lançadores Android colocam o conteúdo
        //    do Compartilhar no clipboard antes de abrir o app alvo.
        try {
          const clip = await Clipboard.getStringAsync();
          if (clip && clip.length > 5 && /R\$\s?\d/.test(clip)) {
            if (active) { applyText(clip, 'clipboard'); return; }
          }
        } catch { /* ignore */ }
      } finally {
        if (active) setLoading(false);
      }
    }
    run();

    const sub = Linking.addEventListener('url', (event) => {
      try {
        const parsedUrl = Linking.parse(event.url);
        const q = parsedUrl.queryParams as Record<string, string> | undefined;
        if (q?.text) applyText(decodeURIComponent(q.text), 'intent');
      } catch { /* ignore */ }
    });
    return () => { active = false; sub.remove(); };
  }, []);

  const confirmAndOpen = async () => {
    if (!parsed) return;
    Haptics.selectionAsync();
    const lastAccountId = (await safeGet<string>('quickAdd:lastAccountId')) || '';
    router.replace({
      pathname: '/transaction/add',
      params: {
        type: parsed.type ?? 'expense',
        description: parsed.description ?? '',
        amount: parsed.amount ? parsed.amount.toFixed(2) : '',
        notes: text ? `Importado de SMS (${parsed.bank ?? 'banco'}):\n${text}` : '',
        accountId: lastAccountId,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Importar SMS' }} />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: 'Importar SMS' }} />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="message-square" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Texto da mensagem
          </Text>
          {source && (
            <View style={[styles.tag, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                {source === 'intent' ? 'Compartilhado' : source === 'clipboard' ? 'Da área de transferência' : 'Manual'}
              </Text>
            </View>
          )}
        </View>
        <TextInput
          multiline
          value={text}
          onChangeText={(v) => applyText(v, 'manual')}
          placeholder="Cole aqui o SMS do banco para extrair os dados…"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={async () => {
              const clip = await Clipboard.getStringAsync();
              if (clip) applyText(clip, 'clipboard');
            }}
            style={[styles.smallBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
          >
            <Feather name="clipboard" size={13} color={theme.textSecondary} />
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>Colar</Text>
          </Pressable>
          {text ? (
            <Pressable
              onPress={() => { setText(''); setParsed(null); setSource(null); }}
              style={[styles.smallBtn, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
            >
              <Feather name="x" size={13} color={theme.textSecondary} />
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }}>Limpar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {parsed && (
        <View style={[styles.card, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}40` }]}>
          <Feather name="check-circle" size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
            Identificamos uma transação
          </Text>
          <View style={{ gap: 4 }}>
            {parsed.bank && <Row label="Banco" value={parsed.bank} theme={theme} />}
            {typeof parsed.amount === 'number' && (
              <Row label="Valor" value={`R$ ${parsed.amount.toFixed(2).replace('.', ',')}`} theme={theme} />
            )}
            {parsed.type && (
              <Row label="Tipo" value={parsed.type === 'income' ? 'Receita' : 'Despesa'} theme={theme} />
            )}
            {parsed.description && <Row label="Descrição" value={parsed.description} theme={theme} />}
            {parsed.cardLast4 && <Row label="Cartão" value={`final ${parsed.cardLast4}`} theme={theme} />}
          </View>
          <Pressable onPress={confirmAndOpen} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Feather name="plus-circle" size={16} color="#000" />
            <Text style={[styles.btnText, { fontFamily: 'Inter_700Bold' }]}>Confirmar e lançar</Text>
          </Pressable>
        </View>
      )}

      {!parsed && text.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="alert-circle" size={20} color={colors.warning} />
          <Text style={[styles.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Não conseguimos extrair os dados
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            Você pode lançar manualmente — abriremos a tela com o texto colado em observações.
          </Text>
          <Pressable
            onPress={() => router.replace({
              pathname: '/transaction/add',
              params: { type: 'expense', notes: text },
            })}
            style={[styles.btn, { backgroundColor: colors.primary }]}
          >
            <Feather name="edit-3" size={16} color="#000" />
            <Text style={[styles.btnText, { fontFamily: 'Inter_700Bold' }]}>Lançar manualmente</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => router.replace('/(more)/sms-import-help')} style={{ alignItems: 'center', padding: 8 }}>
        <Text style={{ color: colors.primary, fontFamily: 'Inter_500Medium', fontSize: 13 }}>
          Como compartilhar SMS para o app?
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: theme.textTertiary, fontFamily: 'Inter_400Regular', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontFamily: 'Inter_500Medium', fontSize: 13, flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  title: { fontSize: 15 },
  body: { fontSize: 13, lineHeight: 19 },
  input: {
    minHeight: 90, borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 13, lineHeight: 18, textAlignVertical: 'top',
  },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 'auto' as any },
  smallBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 10, marginTop: 6,
  },
  btnText: { color: '#000', fontSize: 14 },
});
