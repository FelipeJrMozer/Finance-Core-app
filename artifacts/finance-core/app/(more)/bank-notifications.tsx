import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useFinance } from '@/context/FinanceContext';
import { formatBRL } from '@/utils/formatters';

// ─── Parser ─────────────────────────────────────────────────────────────────
interface ParsedBankMessage {
  bank: string;
  amount: number;
  type: 'expense' | 'income';
  description: string;
  merchant: string;
  rawText: string;
  category: string;
  parsedAt: string;
}

const BANK_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'Nubank', regex: /nubank/i },
  { name: 'Itaú', regex: /ita[uú]/i },
  { name: 'Bradesco', regex: /bradesco/i },
  { name: 'Santander', regex: /santander/i },
  { name: 'Banco do Brasil', regex: /\bbb\b|banco do brasil/i },
  { name: 'Caixa', regex: /caixa|cef\b/i },
  { name: 'Inter', regex: /\binter\b/i },
  { name: 'Sicredi', regex: /sicredi/i },
  { name: 'Sicoob', regex: /sicoob/i },
  { name: 'C6 Bank', regex: /c6\s*bank/i },
  { name: 'XP', regex: /\bxp\b/i },
  { name: 'BTG', regex: /\bbtg\b/i },
  { name: 'Safra', regex: /safra/i },
  { name: 'Cresol', regex: /cresol/i },
];

const INCOME_KEYWORDS = [
  /pix\s+recebido/i, /receb(eu|ido|imento)/i, /créd(ito)?\.?/i, /\bcréd\b/i,
  /transferência recebida/i, /depósito/i, /creditado/i, /entrou/i,
  /salário/i, /pagamento recebido/i, /ted recebido/i, /doc recebido/i,
];
const EXPENSE_KEYWORDS = [
  /compra/i, /déb(ito)?\.?/i, /\bdéb\b/i, /debitado/i, /pagamento\s+(de|realizado)/i,
  /pix\s+(enviado|pago)/i, /transferência\s+(enviada|realizada)/i, /boleto\s+pago/i,
  /saiu/i, /fatura/i, /ted\s+(enviado|realizado)/i, /doc\s+(enviado|realizado)/i,
  /parcelado/i, /aprovada/i,
];

const MERCHANT_PATTERNS = [
  /\bem\s+([A-ZÀ-Ú\s]{2,30})/,       // "em SUPERMERCADO"
  /para\s+([A-ZÀ-Ú][a-zA-ZÀ-Ú\s.]{2,25})/i, // "para João Silva"
  /de\s+([A-ZÀ-Ú][a-zA-ZÀ-Ú\s.]{2,25})/i,   // "de Maria Santos"
  /-\s*([A-ZÀ-Ú\s]{3,30})/,          // "- POSTO IPIRANGA"
];

const AMOUNT_PATTERN = /R\$\s*([\d.,]+)/i;

function guessCategory(merchant: string, type: 'expense' | 'income'): string {
  if (type === 'income') return 'income';
  const m = merchant.toLowerCase();
  if (/supermercado|mercado|pão de açúcar|extra|carrefour|atacadão|assaí|fort|comida|aliment|restaurante|lanchonete|ifood|rappi|uber eats|mcdonalds|burger|pizza|padaria|açougue/i.test(m)) return 'food';
  if (/posto|combustível|gasolina|uber|99|taxi|ônibus|metrô|metro|trem|pedágio|estacionamento/i.test(m)) return 'transport';
  if (/energia|luz|água|gás|internet|telefone|aluguel|condomínio|iptu/i.test(m)) return 'housing';
  if (/farmácia|hospital|clínica|médico|dentista|plano de saúde|consulta|exame/i.test(m)) return 'health';
  if (/netflix|spotify|youtube|amazon|disney|cinema|teatro|show|entretenimento|steam/i.test(m)) return 'entertainment';
  if (/escola|faculdade|curso|livro|papelaria|educação/i.test(m)) return 'education';
  if (/roupa|moda|renner|c&a|riachuelo|zara|decathlon|esporte|shopee|amazon|americanas|magazineluiza|magalu/i.test(m)) return 'clothing';
  if (/invest|tesouro|ação|fundo|cdb|lci/i.test(m)) return 'investment';
  if (/boleto|fatura|tributo|imposto|darf/i.test(m)) return 'housing';
  return 'other';
}

export function parseBankMessage(text: string): ParsedBankMessage | null {
  const t = text.trim();
  if (!t) return null;

  // Extract amount
  const amountMatch = t.match(AMOUNT_PATTERN);
  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Detect bank
  const bank = BANK_PATTERNS.find((p) => p.regex.test(t))?.name ?? 'Banco';

  // Detect type
  const isIncome = INCOME_KEYWORDS.some((r) => r.test(t));
  const isExpense = EXPENSE_KEYWORDS.some((r) => r.test(t));
  const type: 'expense' | 'income' = isIncome && !isExpense ? 'income' : 'expense';

  // Extract merchant/counterpart
  let merchant = '';
  for (const pattern of MERCHANT_PATTERNS) {
    const m = t.match(pattern);
    if (m && m[1]) {
      merchant = m[1].trim().replace(/\s+/g, ' ').replace(/[^a-zA-ZÀ-Ú\s]/g, '').trim();
      if (merchant.length >= 2) break;
    }
  }
  if (!merchant) merchant = type === 'income' ? 'Receita' : 'Pagamento';

  const category = guessCategory(merchant, type);

  const desc = type === 'income'
    ? `${merchant} (${bank})`
    : `${merchant} (${bank})`;

  return {
    bank,
    amount,
    type,
    description: desc,
    merchant,
    rawText: t,
    category,
    parsedAt: new Date().toISOString(),
  };
}

// ─── History storage ─────────────────────────────────────────────────────────
const HISTORY_KEY = 'fc_bank_notif_history';

interface HistoryEntry extends ParsedBankMessage {
  id: string;
  launched: boolean;
  accountId?: string;
  creditCardId?: string;
}

async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveHistory(h: HistoryEntry[]) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 30)));
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// ─── Category picker quick labels ────────────────────────────────────────────
const CATS = [
  { id: 'food', label: 'Alimentação', icon: 'coffee' },
  { id: 'transport', label: 'Transporte', icon: 'map-pin' },
  { id: 'housing', label: 'Moradia', icon: 'home' },
  { id: 'health', label: 'Saúde', icon: 'heart' },
  { id: 'entertainment', label: 'Lazer', icon: 'film' },
  { id: 'education', label: 'Educação', icon: 'book' },
  { id: 'clothing', label: 'Compras', icon: 'shopping-bag' },
  { id: 'investment', label: 'Invest.', icon: 'trending-up' },
  { id: 'income', label: 'Renda', icon: 'dollar-sign' },
  { id: 'other', label: 'Outros', icon: 'more-horizontal' },
];

const CAT_COLORS: Record<string, string> = {
  food: '#FF6B35', transport: '#4CAF50', housing: '#2196F3',
  health: '#E91E8C', entertainment: '#9C27B0', education: '#FF9800',
  clothing: '#607D8B', investment: '#00BCD4', income: '#4CAF50', other: '#78909C',
};

// ─── Bank color/icon ──────────────────────────────────────────────────────────
const BANK_COLORS: Record<string, string> = {
  'Nubank': '#820AD1', 'Itaú': '#EC7000', 'Bradesco': '#CC092F',
  'Santander': '#EC0000', 'Banco do Brasil': '#FFDD00', 'Caixa': '#1B3F6F',
  'Inter': '#FF7A00', 'C6 Bank': '#242424', 'XP': '#00C900', 'BTG': '#1F4D8D',
};

function bankColor(bank: string): string {
  return BANK_COLORS[bank] ?? '#607D8B';
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BankNotificationsScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const { accounts, creditCards, addTransaction } = useFinance();
  const insets = useSafeAreaInsets();

  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedBankMessage | null>(null);
  const [parseError, setParseError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Quick-add form state
  const [formType, setFormType] = useState<'expense' | 'income'>('expense');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('food');
  const [formAccountId, setFormAccountId] = useState('');
  const [formCardId, setFormCardId] = useState('');
  const [useCard, setUseCard] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [usedAI, setUsedAI] = useState(false);

  const activeAccounts = accounts.filter((a) => !a.archived);
  const activeCards = creditCards;

  const AI_CAT_MAP: Record<string, string> = {
    'Alimentação': 'food', 'Transporte': 'transport', 'Moradia': 'housing',
    'Saúde': 'health', 'Lazer': 'entertainment', 'Educação': 'education',
    'Compras': 'clothing', 'Renda': 'income', 'Transferência': 'other',
    'Serviços': 'other', 'Outro': 'other',
  };

  useEffect(() => {
    loadHistory().then((h) => { setHistory(h); setLoadingHistory(false); });
    if (activeAccounts.length > 0) setFormAccountId(activeAccounts[0].id);
    if (activeCards.length > 0) setFormCardId(activeCards[0].id);
  }, []);

  const handlePasteClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) { Alert.alert('Área de transferência vazia', 'Copie uma mensagem de banco antes de colar.'); return; }
      setRawText(text);
      attemptParse(text);
      Haptics.selectionAsync();
    } catch {
      Alert.alert('Erro', 'Não foi possível acessar a área de transferência.');
    }
  };

  const attemptParse = (text: string) => {
    const result = parseBankMessage(text);
    if (!result) {
      setParsed(null);
      setParseError('Não foi possível identificar uma mensagem bancária. Verifique se o texto contém um valor em R$.');
      setShowForm(false);
    } else {
      setParsed(result);
      setParseError('');
      setFormType(result.type);
      setFormDesc(result.description);
      setFormAmount(result.amount.toFixed(2).replace('.', ','));
      setFormCategory(result.category);
      setUseCard(result.type === 'expense' && activeCards.length > 0 ? false : false);
      setShowForm(true);
    }
  };

  const handleAIParse = async (text: string) => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    if (!apiUrl || !text.trim()) return;
    setAiParsing(true);
    setUsedAI(false);
    try {
      const res = await fetch(`${apiUrl}/api/ai/parse-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source: 'manual' }),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.parsed;
        if (p && p.isTransaction && p.amount > 0) {
          const aiParsed: ParsedBankMessage = {
            bank: p.bank ?? 'Banco',
            amount: p.amount,
            type: p.type,
            description: p.description,
            merchant: p.merchant ?? '',
            rawText: text,
            category: AI_CAT_MAP[p.category] ?? 'other',
            parsedAt: new Date().toISOString(),
          };
          setParsed(aiParsed);
          setParseError('');
          setFormType(aiParsed.type);
          setFormDesc(aiParsed.description);
          setFormAmount(aiParsed.amount.toFixed(2).replace('.', ','));
          setFormCategory(aiParsed.category);
          setShowForm(true);
          setUsedAI(true);
          return;
        }
      }
    } catch { }
    finally { setAiParsing(false); }
    attemptParse(text);
  };

  const handleTextChange = (text: string) => {
    setRawText(text);
    setUsedAI(false);
    if (text.trim().length > 10) {
      attemptParse(text);
    } else {
      setParsed(null);
      setParseError('');
      setShowForm(false);
    }
  };

  const handleLaunch = async () => {
    const amountNum = parseFloat(formAmount.replace(',', '.'));
    if (!formDesc.trim()) { Alert.alert('Atenção', 'Informe a descrição'); return; }
    if (isNaN(amountNum) || amountNum <= 0) { Alert.alert('Atenção', 'Valor inválido'); return; }
    if (!useCard && !formAccountId) { Alert.alert('Atenção', 'Selecione uma conta'); return; }
    if (useCard && !formCardId) { Alert.alert('Atenção', 'Selecione um cartão'); return; }

    setLaunching(true);
    try {
      const targetAccountId = useCard
        ? (activeCards.find((c) => c.id === formCardId)?.accountId ?? formAccountId)
        : formAccountId;

      addTransaction({
        description: formDesc.trim(),
        amount: amountNum,
        type: formType,
        category: formType === 'income' ? 'income' : formCategory,
        accountId: targetAccountId,
        creditCardId: useCard ? formCardId : undefined,
        date: new Date().toISOString().split('T')[0],
        notes: parsed ? `Importado de mensagem bancária: ${parsed.bank}` : undefined,
      });

      // Save to history
      if (parsed) {
        const entry: HistoryEntry = {
          ...parsed,
          id: uid(),
          launched: true,
          accountId: useCard ? undefined : formAccountId,
          creditCardId: useCard ? formCardId : undefined,
        };
        const newHistory = [entry, ...history];
        setHistory(newHistory);
        await saveHistory(newHistory);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset form
      setRawText('');
      setParsed(null);
      setShowForm(false);
      setParseError('');

      Alert.alert(
        '✅ Movimentação lançada!',
        `${formType === 'income' ? 'Receita' : 'Despesa'} de ${formatBRL(amountNum)} registrada com sucesso.`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível registrar a movimentação.');
    } finally {
      setLaunching(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    Alert.alert('Remover', 'Remover este item do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          const newHistory = history.filter((h) => h.id !== id);
          setHistory(newHistory);
          await saveHistory(newHistory);
        }
      },
    ]);
  };

  const relaunсhHistory = (entry: HistoryEntry) => {
    setRawText(entry.rawText);
    setParsed(entry);
    setFormType(entry.type);
    setFormDesc(entry.description);
    setFormAmount(entry.amount.toFixed(2).replace('.', ','));
    setFormCategory(entry.category);
    setShowForm(true);
    setParseError('');
    Haptics.selectionAsync();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#0A0A1F', '#0A1530'] : ['#EBF4FF', '#F0F7FF']}
          style={styles.hero}
        >
          <View style={styles.heroHeader}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Feather name="bell" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                Central de Notificações
              </Text>
              <Text style={[styles.heroSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                Cole mensagens do banco para lançar movimentações automaticamente
              </Text>
            </View>
          </View>

          {/* How-to strip */}
          <View style={[styles.howTo, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: theme.border }]}>
            {[
              { n: '1', t: 'Copie a mensagem do banco (SMS ou notificação)' },
              { n: '2', t: 'Cole aqui e o app identifica valor, tipo e loja automaticamente' },
              { n: '3', t: 'Confirme e lance a movimentação na conta ou cartão desejado' },
            ].map((s) => (
              <View key={s.n} style={styles.howToStep}>
                <View style={[styles.howToNum, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.howToNumText, { fontFamily: 'Inter_700Bold' }]}>{s.n}</Text>
                </View>
                <Text style={[styles.howToText, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{s.t}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.content}>

          {/* Paste area */}
          <View style={[styles.pasteCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.pasteHeader}>
              <Feather name="message-square" size={16} color={colors.primary} />
              <Text style={[styles.pasteLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>
                Mensagem do banco
              </Text>
              <Pressable onPress={handlePasteClipboard} style={[styles.pasteBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
                <Feather name="clipboard" size={14} color={colors.primary} />
                <Text style={[styles.pasteBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Colar área de transferência</Text>
              </Pressable>
            </View>

            <TextInput
              value={rawText}
              onChangeText={handleTextChange}
              multiline
              numberOfLines={5}
              placeholder={'Cole aqui a mensagem SMS ou notificação do banco...\n\nEx: "Nubank: Compra de R$ 89,90 em iFood aprovada no seu cartão."'}
              placeholderTextColor={theme.textTertiary}
              style={[styles.textArea, {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
                fontFamily: 'Inter_400Regular',
              }]}
            />

            {rawText.length > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                {process.env.EXPO_PUBLIC_API_URL ? (
                  <Pressable
                    onPress={() => handleAIParse(rawText)}
                    disabled={aiParsing}
                    style={[styles.pasteBtn, {
                      backgroundColor: `#7C3AED18`,
                      borderColor: '#7C3AED40',
                      opacity: aiParsing ? 0.6 : 1,
                    }]}
                  >
                    {aiParsing ? (
                      <ActivityIndicator size="small" color="#7C3AED" />
                    ) : (
                      <Feather name="cpu" size={14} color="#7C3AED" />
                    )}
                    <Text style={[styles.pasteBtnText, { color: '#7C3AED', fontFamily: 'Inter_600SemiBold' }]}>
                      {aiParsing ? 'Analisando…' : 'Analisar com IA'}
                    </Text>
                  </Pressable>
                ) : <View />}
                <Pressable onPress={() => { setRawText(''); setParsed(null); setParseError(''); setShowForm(false); setUsedAI(false); }}>
                  <Text style={[{ color: colors.danger, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>Limpar</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Parse error */}
          {parseError.length > 0 && (
            <View style={[styles.errorBox, { backgroundColor: `${colors.danger}12`, borderColor: `${colors.danger}30` }]}>
              <Feather name="alert-circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger, fontFamily: 'Inter_400Regular' }]}>{parseError}</Text>
            </View>
          )}

          {/* Parsed result */}
          {parsed && showForm && (
            <>
              <LinearGradient
                colors={[bankColor(parsed.bank), `${bankColor(parsed.bank)}80`]}
                style={styles.parsedCard}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <View style={styles.parsedRow}>
                  <View>
                    <Text style={[styles.parsedBank, { fontFamily: 'Inter_600SemiBold' }]}>{parsed.bank}</Text>
                    <Text style={[styles.parsedAmount, { fontFamily: 'Inter_700Bold' }]}>
                      {parsed.type === 'expense' ? '−' : '+'} {maskValue(formatBRL(parsed.amount))}
                    </Text>
                  </View>
                  <View style={[styles.parsedTypeBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Feather name={parsed.type === 'income' ? 'arrow-down-left' : 'arrow-up-right'} size={16} color="#fff" />
                    <Text style={[{ color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' }]}>
                      {parsed.type === 'income' ? 'Recebimento' : 'Débito / Compra'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.parsedMerchant, { fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                  {parsed.merchant}
                </Text>
                <View style={[styles.parsedStrip, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                  <Feather name={usedAI ? 'cpu' : 'check-circle'} size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={[{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Inter_400Regular' }]}>
                    {usedAI ? 'Analisado por Inteligência Artificial' : 'Mensagem identificada automaticamente'}
                  </Text>
                </View>
              </LinearGradient>

              {/* Quick-add form */}
              <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.formTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Confirmar movimentação</Text>

                {/* Type toggle */}
                <View style={styles.typeRow}>
                  <Pressable
                    onPress={() => { setFormType('expense'); setFormCategory('food'); }}
                    style={[styles.typeBtn, { backgroundColor: formType === 'expense' ? `${colors.danger}18` : theme.surfaceElevated, borderColor: formType === 'expense' ? colors.danger : theme.border }]}
                  >
                    <Feather name="arrow-up-right" size={16} color={formType === 'expense' ? colors.danger : theme.textTertiary} />
                    <Text style={[styles.typeBtnText, { color: formType === 'expense' ? colors.danger : theme.textTertiary, fontFamily: formType === 'expense' ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>Débito / Despesa</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setFormType('income'); setFormCategory('income'); }}
                    style={[styles.typeBtn, { backgroundColor: formType === 'income' ? `${colors.primary}18` : theme.surfaceElevated, borderColor: formType === 'income' ? colors.primary : theme.border }]}
                  >
                    <Feather name="arrow-down-left" size={16} color={formType === 'income' ? colors.primary : theme.textTertiary} />
                    <Text style={[styles.typeBtnText, { color: formType === 'income' ? colors.primary : theme.textTertiary, fontFamily: formType === 'income' ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>Crédito / Receita</Text>
                  </Pressable>
                </View>

                {/* Description */}
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Descrição</Text>
                <TextInput
                  value={formDesc}
                  onChangeText={setFormDesc}
                  placeholder="Ex: Compra no iFood"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.fieldInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, fontFamily: 'Inter_400Regular' }]}
                />

                {/* Amount */}
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Valor (R$)</Text>
                <TextInput
                  value={formAmount}
                  onChangeText={setFormAmount}
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.fieldInputLarge, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, fontFamily: 'Inter_700Bold' }]}
                />

                {/* Category (only for expenses) */}
                {formType === 'expense' && (
                  <>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Categoria</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.catRow}>
                        {CATS.filter((c) => c.id !== 'income').map((c) => {
                          const active = formCategory === c.id;
                          const co = CAT_COLORS[c.id] ?? colors.primary;
                          return (
                            <Pressable
                              key={c.id}
                              onPress={() => setFormCategory(c.id)}
                              style={[styles.catChip, { backgroundColor: active ? `${co}20` : theme.surfaceElevated, borderColor: active ? co : theme.border }]}
                            >
                              <Feather name={c.icon as any} size={13} color={active ? co : theme.textTertiary} />
                              <Text style={[styles.catChipText, { color: active ? co : theme.textTertiary, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{c.label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </>
                )}

                {/* Account or Card selector */}
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Lançar em</Text>

                {/* Account / Card toggle */}
                {formType === 'expense' && activeCards.length > 0 && (
                  <View style={styles.typeRow}>
                    <Pressable
                      onPress={() => setUseCard(false)}
                      style={[styles.typeBtn, { backgroundColor: !useCard ? `${colors.primary}15` : theme.surfaceElevated, borderColor: !useCard ? colors.primary : theme.border }]}
                    >
                      <Feather name="credit-card" size={14} color={!useCard ? colors.primary : theme.textTertiary} />
                      <Text style={[styles.typeBtnText, { color: !useCard ? colors.primary : theme.textTertiary, fontFamily: !useCard ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>Conta</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setUseCard(true)}
                      style={[styles.typeBtn, { backgroundColor: useCard ? `${colors.primary}15` : theme.surfaceElevated, borderColor: useCard ? colors.primary : theme.border }]}
                    >
                      <Feather name="credit-card" size={14} color={useCard ? colors.primary : theme.textTertiary} />
                      <Text style={[styles.typeBtnText, { color: useCard ? colors.primary : theme.textTertiary, fontFamily: useCard ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>Cartão de crédito</Text>
                    </Pressable>
                  </View>
                )}

                {/* Account picker */}
                {!useCard && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.acctRow}>
                      {activeAccounts.map((a) => {
                        const active = formAccountId === a.id;
                        return (
                          <Pressable key={a.id} onPress={() => setFormAccountId(a.id)}
                            style={[styles.acctChip, { backgroundColor: active ? `${colors.primary}18` : theme.surfaceElevated, borderColor: active ? colors.primary : theme.border }]}
                          >
                            <View style={[styles.acctDot, { backgroundColor: a.color }]} />
                            <Text style={[styles.acctChipText, { color: active ? colors.primary : theme.text, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]} numberOfLines={1}>{a.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {/* Card picker */}
                {useCard && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.acctRow}>
                      {activeCards.map((c) => {
                        const active = formCardId === c.id;
                        return (
                          <Pressable key={c.id} onPress={() => setFormCardId(c.id)}
                            style={[styles.acctChip, { backgroundColor: active ? `${colors.primary}18` : theme.surfaceElevated, borderColor: active ? colors.primary : theme.border }]}
                          >
                            <View style={[styles.acctDot, { backgroundColor: c.color }]} />
                            <Text style={[styles.acctChipText, { color: active ? colors.primary : theme.text, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]} numberOfLines={1}>{c.name}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}

                {/* Launch button */}
                <Pressable
                  onPress={handleLaunch}
                  disabled={launching}
                  style={[styles.launchBtn, { backgroundColor: formType === 'income' ? colors.primary : colors.danger }]}
                >
                  {launching ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Feather name="check-circle" size={18} color="#fff" />
                      <Text style={[styles.launchBtnText, { fontFamily: 'Inter_700Bold' }]}>
                        Lançar {formType === 'income' ? 'Receita' : 'Despesa'} de {maskValue(formatBRL(parseFloat(formAmount.replace(',', '.')) || 0))}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {/* Example messages */}
          {!showForm && !rawText && (
            <View style={[styles.examplesCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.examplesTitle, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Exemplos de mensagens suportadas</Text>
              {[
                { bank: 'Nubank', color: '#820AD1', msg: 'Compra de R$ 89,90 em iFood aprovada no cartão.' },
                { bank: 'Itaú', color: '#EC7000', msg: 'Débito de R$ 150,00 em SUPERMERCADO PÃO DE AÇÚCAR.' },
                { bank: 'Bradesco', color: '#CC092F', msg: 'Compra R$43,50 POSTO IPIRANGA aprovada no Cartão.' },
                { bank: 'BB', color: '#FFDD00', msg: 'BB: Déb R$123,45 em MERCADO EXTRA. Saldo: R$1.230,00' },
                { bank: 'Inter', color: '#FF7A00', msg: 'Você recebeu R$ 500,00 via Pix de João Silva.' },
                { bank: 'Genérico', color: '#607D8B', msg: 'PIX recebido: R$ 1.200,00 de Empresa XYZ Ltda.' },
              ].map((ex) => (
                <Pressable
                  key={ex.bank}
                  onPress={() => { setRawText(ex.msg); attemptParse(ex.msg); Haptics.selectionAsync(); }}
                  style={[styles.exampleItem, { borderColor: theme.border }]}
                >
                  <View style={[styles.exampleDot, { backgroundColor: ex.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.textSecondary, fontSize: 11, fontFamily: 'Inter_500Medium' }]}>{ex.bank}</Text>
                    <Text style={[{ color: theme.text, fontSize: 13, fontFamily: 'Inter_400Regular' }]}>{ex.msg}</Text>
                  </View>
                  <Feather name="arrow-right" size={14} color={theme.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}

          {/* History */}
          {history.length > 0 && (
            <View style={{ gap: 10 }}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
                  Histórico ({history.length})
                </Text>
                <Pressable onPress={() => Alert.alert('Limpar Histórico', 'Apagar todo o histórico?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Apagar', style: 'destructive', onPress: async () => { setHistory([]); await saveHistory([]); } },
                ])}>
                  <Text style={[{ color: colors.danger, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>Limpar tudo</Text>
                </Pressable>
              </View>

              {loadingHistory ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                history.map((entry) => (
                  <Pressable key={entry.id} onPress={() => relaunсhHistory(entry)}
                    style={[styles.historyItem, { backgroundColor: theme.surface, borderColor: entry.launched ? `${colors.primary}30` : theme.border }]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.histDot, { backgroundColor: bankColor(entry.bank) }]} />
                        <Text style={[{ color: theme.text, fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 }]} numberOfLines={1}>{entry.description}</Text>
                        <Text style={[{ color: entry.type === 'income' ? colors.primary : colors.danger, fontSize: 15, fontFamily: 'Inter_700Bold' }]}>
                          {entry.type === 'income' ? '+' : '−'} {maskValue(formatBRL(entry.amount))}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }]}>
                          {new Date(entry.parsedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {entry.launched && (
                          <View style={[styles.launchedBadge, { backgroundColor: `${colors.primary}18` }]}>
                            <Feather name="check" size={10} color={colors.primary} />
                            <Text style={[{ color: colors.primary, fontSize: 10, fontFamily: 'Inter_500Medium' }]}>Lançado</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Pressable onPress={() => handleDeleteHistory(entry.id)} style={{ padding: 6 }}>
                      <Feather name="trash-2" size={14} color={theme.textTertiary} />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* Info box */}
          <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
              Compatível com mensagens SMS e notificações de Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Caixa, Inter e outros bancos brasileiros. Basta copiar a mensagem e colar aqui.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, gap: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20 },
  heroSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  howTo: { borderRadius: 14, padding: 14, gap: 10, borderWidth: 1 },
  howToStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howToNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  howToNumText: { color: '#000', fontSize: 12 },
  howToText: { flex: 1, fontSize: 13, lineHeight: 18 },
  content: { padding: 16, gap: 14 },
  pasteCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  pasteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pasteLabel: { fontSize: 15, flex: 1 },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  pasteBtnText: { fontSize: 13 },
  textArea: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, minHeight: 110, textAlignVertical: 'top', lineHeight: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  parsedCard: { borderRadius: 18, padding: 18, gap: 10 },
  parsedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  parsedBank: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  parsedAmount: { color: '#fff', fontSize: 32, marginTop: 2 },
  parsedTypeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  parsedMerchant: { color: 'rgba(255,255,255,0.9)', fontSize: 18 },
  parsedStrip: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8 },
  formCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  formTitle: { fontSize: 17 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  typeBtnText: { fontSize: 13 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  fieldInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15 },
  fieldInputLarge: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 26 },
  catRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  catChipText: { fontSize: 12 },
  acctRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  acctChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  acctDot: { width: 10, height: 10, borderRadius: 5 },
  acctChipText: { fontSize: 14, maxWidth: 120 },
  launchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, marginTop: 4 },
  launchBtnText: { color: '#fff', fontSize: 16 },
  examplesCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  examplesTitle: { fontSize: 15 },
  exampleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  exampleDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: 17 },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  histDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  launchedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
