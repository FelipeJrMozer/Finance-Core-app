import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  TextInput, KeyboardAvoidingView, Platform, Modal, RefreshControl
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-gifted-charts';
import { Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import {
  useFinance, DARF, IRRendimento, IRDeducao,
  RendimentoType, DeducaoType
} from '@/context/FinanceContext';
import { formatBRL, formatDate } from '@/utils/formatters';

const { width } = Dimensions.get('window');

// ─── IRPF 2024 Brackets ────────────────────────────────────────────
const ANNUAL_BRACKETS = [
  { limit: 27110.40, rate: 0, deduction: 0, label: 'Isento' },
  { limit: 33919.80, rate: 0.075, deduction: 2033.28, label: '7,5%' },
  { limit: 45012.60, rate: 0.15, deduction: 4586.23, label: '15%' },
  { limit: 55976.16, rate: 0.225, deduction: 8359.49, label: '22,5%' },
  { limit: Infinity, rate: 0.275, deduction: 11157.17, label: '27,5%' },
];

const MONTHLY_BRACKETS = [
  { limit: 2259.20, rate: 0, deduction: 0 },
  { limit: 2826.65, rate: 0.075, deduction: 169.44 },
  { limit: 3751.05, rate: 0.15, deduction: 381.44 },
  { limit: 4664.68, rate: 0.225, deduction: 662.77 },
  { limit: Infinity, rate: 0.275, deduction: 896.00 },
];

function calcIR(base: number, brackets: typeof ANNUAL_BRACKETS): number {
  for (const b of brackets) {
    if (base <= b.limit) return Math.max(0, base * b.rate - b.deduction);
  }
  return 0;
}

function getBracket(base: number, brackets: typeof ANNUAL_BRACKETS) {
  return brackets.find((b) => base <= b.limit) ?? brackets[brackets.length - 1];
}

// ─── Helpers ────────────────────────────────────────────────────────
const RENDIMENTO_LABELS: Record<RendimentoType, string> = {
  salario: 'Salário / Pró-labore',
  freelance: 'Autônomo / Freelance',
  aluguel: 'Aluguéis',
  dividendo: 'Dividendos / FIIs',
  pensao: 'Pensão alimentícia',
  outros: 'Outros',
};
const RENDIMENTO_ICONS: Record<RendimentoType, string> = {
  salario: 'briefcase', freelance: 'code', aluguel: 'home', dividendo: 'trending-up', pensao: 'heart', outros: 'more-horizontal',
};
const RENDIMENTO_COLORS: Record<RendimentoType, string> = {
  salario: '#2196F3', freelance: '#9C27B0', aluguel: '#FF9800', dividendo: '#4CAF50', pensao: '#E91E8C', outros: '#607D8B',
};

const DEDUCAO_LABELS: Record<DeducaoType, string> = {
  inss: 'INSS / Previdência Social',
  previdencia: 'Previdência Privada (PGBL)',
  educacao: 'Educação',
  saude: 'Saúde (médico, plano)',
  dependente: 'Dependente',
  pensao_alimenticia: 'Pensão alimentícia paga',
  outros: 'Outras deduções',
};
const DEDUCAO_ICONS: Record<DeducaoType, string> = {
  inss: 'shield', previdencia: 'umbrella', educacao: 'book', saude: 'heart', dependente: 'users', pensao_alimenticia: 'dollar-sign', outros: 'tag',
};
const DEDUCAO_COLORS: Record<DeducaoType, string> = {
  inss: '#2196F3', previdencia: '#00BCD4', educacao: '#FF9800', saude: '#E91E8C', dependente: '#9C27B0', pensao_alimenticia: '#FF5722', outros: '#607D8B',
};

const DARF_CODES = [
  { code: '6015', label: '6015 — Renda Variável (Ações)' },
  { code: '6006', label: '6006 — Day Trade' },
  { code: '4600', label: '4600 — Ganho de Capital' },
  { code: '0190', label: '0190 — Carnê-Leão' },
  { code: '5936', label: '5936 — Criptoativos' },
  { code: '3299', label: '3299 — FIIs' },
];

type TabId = 'resumo' | 'darfs' | 'rendimentos' | 'deducoes' | 'calculadoras';

// ─── Sub-components ─────────────────────────────────────────────────
function SectionCard({ title, icon, children, action }: { title: string; icon: string; children: React.ReactNode; action?: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={sc.header}>
        <Feather name={icon as any} size={14} color={theme.textSecondary} />
        <Text style={[sc.title, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{title}</Text>
        {action && <View style={{ marginLeft: 'auto' }}>{action}</View>}
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, flex: 1 },
});

function InfoRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={ir.infoRow}>
      <Text style={[ir.infoLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
      <Text style={[ir.infoValue, { color: color ?? theme.text, fontFamily: bold ? 'Inter_700Bold' : 'Inter_500Medium' }]}>{value}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  infoLabel: { fontSize: 14, flex: 1 },
  infoValue: { fontSize: 14, textAlign: 'right' },
});

function GaugeBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const { theme } = useTheme();
  const pct = Math.min(value / Math.max(max, 1), 1);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
        <Text style={[{ color, fontSize: 12, fontFamily: 'Inter_600SemiBold' }]}>{(pct * 100).toFixed(0)}%</Text>
      </View>
      <View style={[{ height: 7, borderRadius: 4, backgroundColor: theme.surfaceElevated, overflow: 'hidden' }]}>
        <LinearGradient colors={[color, `${color}80`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct * 100}%`, height: 7, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ─── Add Modals ─────────────────────────────────────────────────────
function AddRendimentoModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (r: Omit<IRRendimento, 'id'>) => void }) {
  const { theme, colors } = useTheme();
  const [type, setType] = useState<RendimentoType>('salario');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [isMonthly, setIsMonthly] = useState(true);
  const [retido, setRetido] = useState('');

  const reset = () => { setType('salario'); setDesc(''); setAmount(''); setIsMonthly(true); setRetido(''); };

  const handleSave = () => {
    const val = parseFloat(amount.replace(',', '.'));
    if (!desc.trim() || isNaN(val) || val <= 0) { Alert.alert('Atenção', 'Preencha todos os campos'); return; }
    onSave({ type, description: desc.trim(), amount: val, isMonthly, retidoFonte: parseFloat(retido.replace(',', '.')) || 0, year: new Date().getFullYear() });
    reset(); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={modal.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[modal.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[modal.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Adicionar Rendimento</Text>
          <Text style={[modal.label, { color: theme.textSecondary }]}>Tipo de rendimento</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={modal.chipRow}>
              {(Object.keys(RENDIMENTO_LABELS) as RendimentoType[]).map((t) => (
                <Pressable key={t} onPress={() => setType(t)} style={[modal.chip, { backgroundColor: type === t ? `${RENDIMENTO_COLORS[t]}20` : theme.surfaceElevated, borderColor: type === t ? RENDIMENTO_COLORS[t] : theme.border }]}>
                  <Text style={[modal.chipText, { color: type === t ? RENDIMENTO_COLORS[t] : theme.textSecondary, fontFamily: type === t ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{RENDIMENTO_LABELS[t].split(' ')[0]}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text style={[modal.label, { color: theme.textSecondary }]}>Descrição</Text>
          <TextInput value={desc} onChangeText={setDesc} placeholder="Ex: Salário Empresa XYZ" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={[modal.label, { color: theme.textSecondary }]}>Valor (R$)</Text>
              <TextInput value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[modal.label, { color: theme.textSecondary }]}>IR Retido na fonte (R$)</Text>
              <TextInput value={retido} onChangeText={setRetido} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
            </View>
          </View>
          <View style={modal.toggleRow}>
            <Pressable onPress={() => setIsMonthly(true)} style={[modal.toggle, { backgroundColor: isMonthly ? `${colors.primary}20` : theme.surfaceElevated, borderColor: isMonthly ? colors.primary : theme.border }]}>
              <Text style={[modal.toggleText, { color: isMonthly ? colors.primary : theme.textSecondary, fontFamily: isMonthly ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>Mensal × 12</Text>
            </Pressable>
            <Pressable onPress={() => setIsMonthly(false)} style={[modal.toggle, { backgroundColor: !isMonthly ? `${colors.primary}20` : theme.surfaceElevated, borderColor: !isMonthly ? colors.primary : theme.border }]}>
              <Text style={[modal.toggleText, { color: !isMonthly ? colors.primary : theme.textSecondary, fontFamily: !isMonthly ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>Valor anual</Text>
            </Pressable>
          </View>
          <View style={modal.actions}>
            <Pressable onPress={() => { reset(); onClose(); }} style={[modal.btn, { backgroundColor: theme.surfaceElevated }]}><Text style={[modal.btnText, { color: theme.textSecondary }]}>Cancelar</Text></Pressable>
            <Pressable onPress={handleSave} style={[modal.btn, { backgroundColor: colors.primary, flex: 1.5 }]}><Text style={[modal.btnText, { color: '#000' }]}>Adicionar</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddDeducaoModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (d: Omit<IRDeducao, 'id'>) => void }) {
  const { theme, colors } = useTheme();
  const [type, setType] = useState<DeducaoType>('inss');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const reset = () => { setType('inss'); setDesc(''); setAmount(''); };

  const handleSave = () => {
    const val = parseFloat(amount.replace(',', '.'));
    if (!desc.trim() || isNaN(val) || val <= 0) { Alert.alert('Atenção', 'Preencha todos os campos'); return; }
    onSave({ type, description: desc.trim(), amount: val, year: new Date().getFullYear() });
    reset(); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={modal.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[modal.sheet, { backgroundColor: theme.surface }]}>
          <Text style={[modal.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Adicionar Dedução</Text>
          <Text style={[modal.label, { color: theme.textSecondary }]}>Tipo de dedução</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={modal.chipRow}>
              {(Object.keys(DEDUCAO_LABELS) as DeducaoType[]).map((t) => (
                <Pressable key={t} onPress={() => setType(t)} style={[modal.chip, { backgroundColor: type === t ? `${DEDUCAO_COLORS[t]}20` : theme.surfaceElevated, borderColor: type === t ? DEDUCAO_COLORS[t] : theme.border }]}>
                  <Text style={[modal.chipText, { color: type === t ? DEDUCAO_COLORS[t] : theme.textSecondary, fontFamily: type === t ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{DEDUCAO_LABELS[t].split(' ')[0]}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text style={[modal.label, { color: theme.textSecondary }]}>Descrição</Text>
          <TextInput value={desc} onChangeText={setDesc} placeholder="Ex: Plano de saúde Unimed" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
          <Text style={[modal.label, { color: theme.textSecondary }]}>Valor anual (R$)</Text>
          <TextInput value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
          <View style={modal.actions}>
            <Pressable onPress={() => { reset(); onClose(); }} style={[modal.btn, { backgroundColor: theme.surfaceElevated }]}><Text style={[modal.btnText, { color: theme.textSecondary }]}>Cancelar</Text></Pressable>
            <Pressable onPress={handleSave} style={[modal.btn, { backgroundColor: colors.primary, flex: 1.5 }]}><Text style={[modal.btnText, { color: '#000' }]}>Adicionar</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddDARFModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (d: Omit<DARF, 'id'>) => void }) {
  const { theme, colors } = useTheme();
  const [tipo, setTipo] = useState('DARF - Renda Variável');
  const [code, setCode] = useState('6015');
  const [amount, setAmount] = useState('');
  const [base, setBase] = useState('');
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => { setTipo('DARF - Renda Variável'); setCode('6015'); setAmount(''); setBase(''); setDueDate(''); setNotes(''); };

  const handleSave = () => {
    const val = parseFloat(amount.replace(',', '.'));
    if (!tipo.trim() || isNaN(val) || val <= 0 || !dueDate.trim()) { Alert.alert('Atenção', 'Preencha tipo, valor e vencimento'); return; }
    onSave({ type: tipo.trim(), month, amount: val, dueDate, paid: false, codigoReceita: code, baseCalculo: parseFloat(base.replace(',', '.')) || undefined, notes: notes.trim() || undefined });
    reset(); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={modal.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <View style={[modal.sheet, { backgroundColor: theme.surface }]}>
            <Text style={[modal.title, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>Novo DARF</Text>
            <Text style={[modal.label, { color: theme.textSecondary }]}>Código da receita</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={modal.chipRow}>
                {DARF_CODES.map((c) => (
                  <Pressable key={c.code} onPress={() => { setCode(c.code); setTipo(`DARF - ${c.label.split(' — ')[1]}`); }} style={[modal.chip, { backgroundColor: code === c.code ? `${colors.primary}20` : theme.surfaceElevated, borderColor: code === c.code ? colors.primary : theme.border }]}>
                    <Text style={[modal.chipText, { color: code === c.code ? colors.primary : theme.textSecondary, fontFamily: code === c.code ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={[modal.label, { color: theme.textSecondary }]}>Descrição / Tipo</Text>
            <TextInput value={tipo} onChangeText={setTipo} placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[modal.label, { color: theme.textSecondary }]}>Competência (AAAA-MM)</Text>
                <TextInput value={month} onChangeText={setMonth} placeholder="2026-03" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[modal.label, { color: theme.textSecondary }]}>Vencimento (AAAA-MM-DD)</Text>
                <TextInput value={dueDate} onChangeText={setDueDate} placeholder="2026-04-30" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={[modal.label, { color: theme.textSecondary }]}>Base de cálculo (R$)</Text>
                <TextInput value={base} onChangeText={setBase} placeholder="Opcional" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[modal.label, { color: theme.textSecondary }]}>Valor do DARF (R$) *</Text>
                <TextInput value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
              </View>
            </View>
            <Text style={[modal.label, { color: theme.textSecondary }]}>Observações</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Opcional" multiline placeholderTextColor={theme.textTertiary} style={[modal.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, minHeight: 60, textAlignVertical: 'top' }]} />
            <View style={modal.actions}>
              <Pressable onPress={() => { reset(); onClose(); }} style={[modal.btn, { backgroundColor: theme.surfaceElevated }]}><Text style={[modal.btnText, { color: theme.textSecondary }]}>Cancelar</Text></Pressable>
              <Pressable onPress={handleSave} style={[modal.btn, { backgroundColor: colors.primary, flex: 1.5 }]}><Text style={[modal.btnText, { color: '#000' }]}>Adicionar DARF</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, paddingBottom: 32 },
  title: { fontSize: 19, marginBottom: 4 },
  label: { fontSize: 12, marginTop: 4, fontFamily: 'Inter_500Medium' },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 15, fontFamily: 'Inter_400Regular' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  toggleText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12 },
  btnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});

// ─── Main Screen ─────────────────────────────────────────────────────
export default function IRScreen() {
  const { theme, colors, isDark, maskValue } = useTheme();
  const {
    darfs, rendimentosIR, deducoesIR,
    markDARFPaid, addDARF, deleteDARF,
    addRendimento, deleteRendimento,
    addDeducao, deleteDeducao,
  } = useFinance();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('resumo');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddRendimento, setShowAddRendimento] = useState(false);
  const [showAddDeducao, setShowAddDeducao] = useState(false);
  const [showAddDARF, setShowAddDARF] = useState(false);
  const [calcBase, setCalcBase] = useState('');
  const [calcVenda, setCalcVenda] = useState('');
  const [calcCusto, setCalcCusto] = useState('');
  const [calcTipo, setCalcTipo] = useState<'acoes' | 'daytrade' | 'fii' | 'imovel'>('acoes');

  const currentYear = new Date().getFullYear();
  const yearRendimentos = rendimentosIR.filter((r) => r.year === currentYear);
  const yearDeducoes = deducoesIR.filter((d) => d.year === currentYear);

  const totalRendimentos = useMemo(() =>
    yearRendimentos.reduce((s, r) => s + (r.isMonthly ? r.amount * 12 : r.amount), 0),
    [yearRendimentos]
  );
  const totalRetidoFonte = useMemo(() =>
    yearRendimentos.reduce((s, r) => s + (r.isMonthly ? r.retidoFonte * 12 : r.retidoFonte), 0),
    [yearRendimentos]
  );
  const totalDeducoes = useMemo(() =>
    yearDeducoes.reduce((s, d) => s + d.amount, 0),
    [yearDeducoes]
  );

  const baseCalculo = Math.max(0, totalRendimentos - totalDeducoes);
  const irDevido = calcIR(baseCalculo, ANNUAL_BRACKETS);
  const saldo = totalRetidoFonte - irDevido;
  const bracket = getBracket(baseCalculo, ANNUAL_BRACKETS);
  const aliquotaEfetiva = baseCalculo > 0 ? (irDevido / baseCalculo) * 100 : 0;

  const unpaidDarfs = darfs.filter((d) => !d.paid);
  const paidDarfs = darfs.filter((d) => d.paid);
  const totalUnpaid = unpaidDarfs.reduce((s, d) => s + d.amount + (d.multa || 0) + (d.juros || 0), 0);
  const totalPaidYear = paidDarfs.reduce((s, d) => s + d.amount, 0);

  // Carnê-Leão calculator
  const calcBaseNum = parseFloat(calcBase.replace(',', '.')) || 0;
  const carneleaoIR = calcIR(calcBaseNum, MONTHLY_BRACKETS);
  const carneleaoBracket = getBracket(calcBaseNum, MONTHLY_BRACKETS);

  // Ganho de Capital calculator
  const vendaNum = parseFloat(calcVenda.replace(',', '.')) || 0;
  const custoNum = parseFloat(calcCusto.replace(',', '.')) || 0;
  const ganho = vendaNum - custoNum;
  const taxRate = calcTipo === 'daytrade' ? 0.20 : calcTipo === 'fii' ? 0.20 : calcTipo === 'imovel' ? 0.15 : 0.15;
  const isento = calcTipo === 'acoes' && vendaNum <= 20000;
  const impostoGanho = isento ? 0 : Math.max(0, ganho * taxRate);

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: 'resumo', label: 'Resumo', icon: 'file-text' },
    { id: 'rendimentos', label: 'Rendimentos', icon: 'trending-up' },
    { id: 'deducoes', label: 'Deduções', icon: 'minus-circle' },
    { id: 'darfs', label: 'DARFs', icon: 'alert-circle' },
    { id: 'calculadoras', label: 'Calculadoras', icon: 'calculator' },
  ];

  const handleMarkPaid = (darf: DARF) => {
    Alert.alert('Marcar como Pago', `Confirmar pagamento de ${formatBRL(darf.amount)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => { markDARFPaid(darf.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } },
    ]);
  };

  const handleDeleteDARF = (id: string) => {
    Alert.alert('Excluir DARF', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteDARF(id) },
    ]);
  };

  const bracketBarData = ANNUAL_BRACKETS.filter((b) => b.limit !== Infinity).map((b, i) => ({
    value: b.limit,
    label: b.label,
    frontColor: baseCalculo <= b.limit && (i === 0 || baseCalculo > ANNUAL_BRACKETS[i - 1].limit) ? colors.primary : theme.surfaceElevated,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 800); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#0A0A1F', '#0A1530'] : ['#EBF4FF', '#F0F7FF']}
          style={styles.hero}
        >
          <Text style={[styles.heroTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
            Imposto de Renda {currentYear}
          </Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
            IRPF • Gestão e Declaração
          </Text>

          {/* Summary strip */}
          <View style={styles.heroStrip}>
            <View style={[styles.heroCard, { backgroundColor: saldo >= 0 ? `${colors.primary}18` : `${colors.danger}15`, borderColor: saldo >= 0 ? `${colors.primary}40` : `${colors.danger}40` }]}>
              <Feather name={saldo >= 0 ? 'arrow-down-circle' : 'arrow-up-circle'} size={18} color={saldo >= 0 ? colors.primary : colors.danger} />
              <View>
                <Text style={[styles.heroCardLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                  {saldo >= 0 ? 'Restituição prevista' : 'IR a pagar'}
                </Text>
                <Text style={[styles.heroCardValue, { color: saldo >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                  {maskValue(formatBRL(Math.abs(saldo)))}
                </Text>
              </View>
            </View>
            <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="percent" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.heroCardLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Alíquota efetiva</Text>
                <Text style={[styles.heroCardValue, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>{aliquotaEfetiva.toFixed(1)}%</Text>
              </View>
            </View>
            {unpaidDarfs.length > 0 && (
              <View style={[styles.heroCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}40` }]}>
                <Feather name="alert-triangle" size={18} color={colors.warning} />
                <View>
                  <Text style={[styles.heroCardLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>DARFs pendentes</Text>
                  <Text style={[styles.heroCardValue, { color: colors.warning, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalUnpaid))}</Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabContent}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => { setActiveTab(tab.id); Haptics.selectionAsync(); }}
              style={[styles.tab, { borderBottomColor: activeTab === tab.id ? colors.primary : 'transparent', borderBottomWidth: 2 }]}
            >
              <Feather name={tab.icon as any} size={13} color={activeTab === tab.id ? colors.primary : theme.textTertiary} />
              <Text style={[styles.tabText, { color: activeTab === tab.id ? colors.primary : theme.textTertiary, fontFamily: activeTab === tab.id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.content}>

          {/* ── RESUMO TAB ── */}
          {activeTab === 'resumo' && (
            <>
              {/* Annual calculation */}
              <SectionCard title="Cálculo Anual IRPF" icon="file-text">
                <InfoRow label="(+) Total de rendimentos" value={maskValue(formatBRL(totalRendimentos))} color={colors.primary} />
                <InfoRow label="(-) Total de deduções" value={maskValue(formatBRL(totalDeducoes))} color={colors.danger} />
                <View style={[{ height: 1, backgroundColor: theme.border, marginVertical: 4 }]} />
                <InfoRow label="(=) Base de cálculo" value={maskValue(formatBRL(baseCalculo))} bold />
                <InfoRow label="(×) Alíquota" value={bracket.label} />
                <InfoRow label="(=) IR devido" value={maskValue(formatBRL(irDevido))} color={colors.danger} />
                <InfoRow label="(-) IR retido na fonte" value={maskValue(formatBRL(totalRetidoFonte))} color={colors.primary} />
                <View style={[{ height: 1, backgroundColor: theme.border, marginVertical: 4 }]} />
                <View style={[styles.saldoBox, { backgroundColor: saldo >= 0 ? `${colors.primary}12` : `${colors.danger}12`, borderColor: saldo >= 0 ? `${colors.primary}30` : `${colors.danger}30` }]}>
                  <Feather name={saldo >= 0 ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={saldo >= 0 ? colors.primary : colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.saldoLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
                      {saldo >= 0 ? 'Restituição a receber' : 'IR a recolher complementar'}
                    </Text>
                    <Text style={[styles.saldoValue, { color: saldo >= 0 ? colors.primary : colors.danger, fontFamily: 'Inter_700Bold' }]}>
                      {maskValue(formatBRL(Math.abs(saldo)))}
                    </Text>
                  </View>
                </View>
              </SectionCard>

              {/* Tax bracket visualization */}
              <SectionCard title="Faixas do IRPF" icon="layers">
                {ANNUAL_BRACKETS.map((b, i) => {
                  const min = i === 0 ? 0 : ANNUAL_BRACKETS[i - 1].limit;
                  const isActive = baseCalculo > min && (b.limit === Infinity ? true : baseCalculo <= b.limit);
                  const bracketColor = b.rate === 0 ? colors.primary : b.rate <= 0.075 ? '#4CAF50' : b.rate <= 0.15 ? colors.warning : b.rate <= 0.225 ? '#FF6B35' : colors.danger;
                  return (
                    <View key={i} style={[styles.bracketRow, { backgroundColor: isActive ? `${bracketColor}15` : 'transparent', borderRadius: 10, padding: 8 }]}>
                      <View style={[styles.bracketDot, { backgroundColor: bracketColor }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.bracketRange, { color: theme.text, fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                          {i === 0 ? `Até ${formatBRL(b.limit)}` : b.limit === Infinity ? `Acima de ${formatBRL(ANNUAL_BRACKETS[i - 1].limit)}` : `${formatBRL(min + 0.01)} até ${formatBRL(b.limit)}`}
                        </Text>
                        <Text style={[styles.bracketRate, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>
                          {b.rate === 0 ? 'Isento' : `${(b.rate * 100).toFixed(1)}% — Ded. ${formatBRL(b.deduction)}`}
                        </Text>
                      </View>
                      {isActive && <View style={[styles.activeBadge, { backgroundColor: bracketColor }]}><Text style={[styles.activeBadgeText, { fontFamily: 'Inter_600SemiBold' }]}>Atual</Text></View>}
                    </View>
                  );
                })}
              </SectionCard>

              {/* Indicators */}
              <SectionCard title="Indicadores" icon="activity">
                <GaugeBar label="Rendimentos tributáveis declarados" value={yearRendimentos.length} max={10} color={colors.primary} />
                <GaugeBar label="Deduções aproveitadas" value={yearDeducoes.length} max={8} color={colors.primary} />
                <GaugeBar label="Redução com deduções" value={totalDeducoes} max={totalRendimentos || 1} color={totalDeducoes / (totalRendimentos || 1) >= 0.2 ? colors.primary : colors.warning} />
                <View style={{ marginTop: 4 }}>
                  <InfoRow label="DARFs pagos no ano" value={maskValue(formatBRL(totalPaidYear))} />
                  <InfoRow label="Alíquota marginal" value={bracket.label} />
                  <InfoRow label="Alíquota efetiva" value={`${aliquotaEfetiva.toFixed(2)}%`} color={aliquotaEfetiva > 15 ? colors.danger : colors.primary} />
                </View>
              </SectionCard>

              <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                <Feather name="info" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                  Este resumo é uma estimativa baseada nos dados lançados. A declaração oficial deve ser feita pelo programa IRPF da Receita Federal até 30/04 de cada ano.
                </Text>
              </View>
            </>
          )}

          {/* ── RENDIMENTOS TAB ── */}
          {activeTab === 'rendimentos' && (
            <>
              <View style={[styles.summaryStrip, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}25` }]}>
                <View>
                  <Text style={[styles.stripLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Total anual declarado</Text>
                  <Text style={[styles.stripValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalRendimentos))}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stripLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Retido na fonte</Text>
                  <Text style={[styles.stripValue, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(totalRetidoFonte))}</Text>
                </View>
              </View>

              {yearRendimentos.map((r) => {
                const annual = r.isMonthly ? r.amount * 12 : r.amount;
                const ic = RENDIMENTO_ICONS[r.type]; const co = RENDIMENTO_COLORS[r.type];
                return (
                  <View key={r.id} style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.typeIcon, { backgroundColor: `${co}15` }]}>
                        <Feather name={ic as any} size={18} color={co} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ color: theme.text, fontSize: 14, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{r.description}</Text>
                        <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>{RENDIMENTO_LABELS[r.type]} • {r.isMonthly ? `R$ ${r.amount.toFixed(2).replace('.', ',')} × 12` : 'Anual'}</Text>
                      </View>
                      <Pressable onPress={() => Alert.alert('Excluir', 'Excluir este rendimento?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteRendimento(r.id) }])}>
                        <Feather name="trash-2" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                    <View style={[{ height: 1, backgroundColor: theme.border }]} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View><Text style={[{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }]}>Valor anual</Text><Text style={[{ color: co, fontSize: 16, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(annual))}</Text></View>
                      {r.retidoFonte > 0 && <View style={{ alignItems: 'flex-end' }}><Text style={[{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular' }]}>IR retido/ano</Text><Text style={[{ color: colors.primary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(r.isMonthly ? r.retidoFonte * 12 : r.retidoFonte))}</Text></View>}
                    </View>
                  </View>
                );
              })}

              <Pressable onPress={() => setShowAddRendimento(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={18} color="#000" />
                <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Adicionar rendimento</Text>
              </Pressable>

              <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                  Dividendos de ações e lucros distribuídos por empresas do Simples Nacional são isentos de IR. FIIs pagam IR de 20% somente sobre ganho de capital na venda.
                </Text>
              </View>
            </>
          )}

          {/* ── DEDUÇÕES TAB ── */}
          {activeTab === 'deducoes' && (
            <>
              <View style={[styles.summaryStrip, { backgroundColor: `${colors.danger}10`, borderColor: `${colors.danger}25` }]}>
                <View>
                  <Text style={[styles.stripLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Total de deduções</Text>
                  <Text style={[styles.stripValue, { color: colors.danger, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(totalDeducoes))}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stripLabel, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>Economia em IR</Text>
                  <Text style={[styles.stripValue, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{maskValue(formatBRL(totalDeducoes * bracket.rate))}</Text>
                </View>
              </View>

              {yearDeducoes.map((d) => {
                const ic = DEDUCAO_ICONS[d.type]; const co = DEDUCAO_COLORS[d.type];
                return (
                  <View key={d.id} style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.typeIcon, { backgroundColor: `${co}15` }]}>
                        <Feather name={ic as any} size={18} color={co} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ color: theme.text, fontSize: 14, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{d.description}</Text>
                        <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>{DEDUCAO_LABELS[d.type]}</Text>
                      </View>
                      <Text style={[{ color: colors.danger, fontSize: 16, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(d.amount))}</Text>
                      <Pressable onPress={() => Alert.alert('Excluir', 'Excluir esta dedução?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteDeducao(d.id) }])}>
                        <Feather name="trash-2" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              <Pressable onPress={() => setShowAddDeducao(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={18} color="#000" />
                <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Adicionar dedução</Text>
              </Pressable>

              <SectionCard title="Limites de dedução IRPF 2024" icon="info">
                {[
                  { label: 'Dependente', limit: 'R$ 2.275,08 / dependente (sem limite)' },
                  { label: 'Educação', limit: 'Até R$ 3.561,50 / pessoa' },
                  { label: 'INSS', limit: 'Sem limite' },
                  { label: 'PGBL', limit: 'Até 12% da renda bruta' },
                  { label: 'Saúde', limit: 'Sem limite (com comprovantes)' },
                  { label: 'Pensão alimentícia', limit: 'Sem limite (judicial)' },
                ].map((r) => (
                  <View key={r.label} style={ir.infoRow}>
                    <Text style={[ir.infoLabel, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{r.label}</Text>
                    <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1.5, textAlign: 'right' }]}>{r.limit}</Text>
                  </View>
                ))}
              </SectionCard>
            </>
          )}

          {/* ── DARFS TAB ── */}
          {activeTab === 'darfs' && (
            <>
              {unpaidDarfs.length > 0 ? (
                <LinearGradient colors={[colors.warning, '#E65100']} style={styles.alertBanner}>
                  <Feather name="alert-triangle" size={22} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' }]}>{unpaidDarfs.length} DARF{unpaidDarfs.length > 1 ? 's' : ''} pendente{unpaidDarfs.length > 1 ? 's' : ''}</Text>
                    <Text style={[{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'Inter_400Regular' }]}>Total: {maskValue(formatBRL(totalUnpaid))}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.alertBanner}>
                  <Feather name="check-circle" size={22} color="#000" />
                  <Text style={[{ color: '#000', fontSize: 17, fontFamily: 'Inter_700Bold' }]}>Sem DARFs pendentes</Text>
                </LinearGradient>
              )}

              <View style={[styles.infoBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                <Feather name="info" size={13} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>
                  Código 6015 (Ações): pago até o último dia útil do mês seguinte. Vendas acima de R$ 20.000/mês tributadas a 15%. Código 6006 (Day trade): sempre tributado a 20%.
                </Text>
              </View>

              {unpaidDarfs.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Pendentes</Text>
                  {unpaidDarfs.map((d) => {
                    const overdue = new Date(d.dueDate) < new Date();
                    return (
                      <View key={d.id} style={[sc.card, { backgroundColor: theme.surface, borderColor: overdue ? colors.danger : theme.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[styles.darfIcon, { backgroundColor: overdue ? `${colors.danger}15` : `${colors.warning}15` }]}>
                            <Feather name="file-text" size={18} color={overdue ? colors.danger : colors.warning} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[{ color: theme.text, fontSize: 14, fontFamily: 'Inter_600SemiBold' }]}>{d.type}</Text>
                            <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>
                              Competência: {d.month}{d.codigoReceita ? ` • Cód. ${d.codigoReceita}` : ''}
                            </Text>
                          </View>
                          {overdue && <View style={[{ backgroundColor: `${colors.danger}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }]}><Text style={[{ color: colors.danger, fontSize: 11, fontFamily: 'Inter_600SemiBold' }]}>Vencido</Text></View>}
                          <Pressable onPress={() => handleDeleteDARF(d.id)}>
                            <Feather name="trash-2" size={15} color={colors.danger} />
                          </Pressable>
                        </View>
                        {d.baseCalculo && <InfoRow label="Base de cálculo" value={maskValue(formatBRL(d.baseCalculo))} />}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <View>
                            <Text style={[{ color: theme.text, fontSize: 26, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(d.amount))}</Text>
                            <Text style={[{ color: overdue ? colors.danger : theme.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular' }]}>Vencimento: {formatDate(d.dueDate)}</Text>
                            {(d.multa || d.juros) && <Text style={[{ color: colors.danger, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>+ Multa/Juros: {maskValue(formatBRL((d.multa || 0) + (d.juros || 0)))}</Text>}
                          </View>
                        </View>
                        {d.notes && <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular', fontStyle: 'italic' }]}>{d.notes}</Text>}
                        <Pressable onPress={() => handleMarkPaid(d)} style={[styles.payBtn, { backgroundColor: colors.primary }]}>
                          <Feather name="check" size={16} color="#000" />
                          <Text style={[{ color: '#000', fontSize: 15, fontFamily: 'Inter_600SemiBold' }]}>Marcar como Pago</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </>
              )}

              {paidDarfs.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: 'Inter_600SemiBold' }]}>Pagos</Text>
                  {paidDarfs.map((d) => (
                    <View key={d.id} style={[sc.card, { backgroundColor: theme.surface, borderColor: `${colors.primary}30` }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={[styles.darfIcon, { backgroundColor: `${colors.primary}15` }]}>
                          <Feather name="check-circle" size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[{ color: theme.text, fontSize: 14, fontFamily: 'Inter_600SemiBold' }]}>{d.type}</Text>
                          <Text style={[{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>Pago em {d.paidDate ? formatDate(d.paidDate) : '—'}</Text>
                        </View>
                        <Text style={[{ color: colors.primary, fontSize: 16, fontFamily: 'Inter_700Bold' }]}>{maskValue(formatBRL(d.amount))}</Text>
                        <Pressable onPress={() => handleDeleteDARF(d.id)}>
                          <Feather name="trash-2" size={15} color={theme.textTertiary} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <Pressable onPress={() => setShowAddDARF(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={18} color="#000" />
                <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Novo DARF</Text>
              </Pressable>
            </>
          )}

          {/* ── CALCULADORAS TAB ── */}
          {activeTab === 'calculadoras' && (
            <>
              {/* Carnê-Leão */}
              <SectionCard title="Carnê-Leão — Autônomo / Freelance" icon="edit">
                <Text style={[{ color: theme.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular' }]}>
                  Calculadora mensal para autônomos, profissionais liberais e recebimentos sem retenção.
                </Text>
                <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>Rendimento mensal bruto (R$)</Text>
                <TextInput
                  value={calcBase}
                  onChangeText={setCalcBase}
                  placeholder="Ex: 5000,00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.textTertiary}
                  style={[styles.calcInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                />
                {calcBaseNum > 0 && (
                  <View style={{ gap: 8 }}>
                    <View style={[{ height: 1, backgroundColor: theme.border }]} />
                    <InfoRow label="Rendimento" value={maskValue(formatBRL(calcBaseNum))} />
                    <InfoRow label="Faixa" value={`${(carneleaoBracket.rate * 100).toFixed(1)}%`} />
                    <InfoRow label="Deduções da tabela" value={maskValue(formatBRL(carneleaoBracket.deduction))} color={colors.danger} />
                    <View style={[{ height: 1, backgroundColor: theme.border }]} />
                    <InfoRow label="Carnê-Leão do mês" value={maskValue(formatBRL(carneleaoIR))} color={carneleaoIR > 0 ? colors.danger : colors.primary} bold />
                    <InfoRow label="Estimativa anual" value={maskValue(formatBRL(carneleaoIR * 12))} />
                    <View style={[styles.codeBox, { backgroundColor: theme.surfaceElevated }]}>
                      <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>DARF Código 0190 • Vencimento: último dia útil do mês seguinte</Text>
                    </View>
                    {carneleaoIR > 0 && (
                      <Pressable
                        onPress={() => {
                          const d = new Date();
                          const next = d.getMonth() === 11 ? `${d.getFullYear() + 1}-01` : `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}`;
                          addDARF({ type: 'DARF - Carnê-Leão (Autônomo)', month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, amount: carneleaoIR, dueDate: `${next}-30`, paid: false, codigoReceita: '0190', baseCalculo: calcBaseNum });
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('DARF criado', 'O DARF foi adicionado à sua lista.');
                        }}
                        style={[styles.addBtn, { backgroundColor: colors.primary }]}
                      >
                        <Feather name="plus" size={16} color="#000" />
                        <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Criar DARF automaticamente</Text>
                      </Pressable>
                    )}
                  </View>
                )}
                {/* Monthly brackets table */}
                <Text style={[{ color: theme.textSecondary, fontSize: 13, fontFamily: 'Inter_600SemiBold' }]}>Tabela progressiva mensal 2024</Text>
                {MONTHLY_BRACKETS.map((b, i) => {
                  const min = i === 0 ? 0 : MONTHLY_BRACKETS[i - 1].limit;
                  return (
                    <View key={i} style={ir.infoRow}>
                      <Text style={[ir.infoLabel, { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>
                        {b.limit === Infinity ? `Acima de ${formatBRL(min)}` : `Até ${formatBRL(b.limit)}`}
                      </Text>
                      <Text style={[ir.infoValue, { fontSize: 12, color: b.rate === 0 ? colors.primary : theme.text, fontFamily: 'Inter_500Medium' }]}>
                        {b.rate === 0 ? 'Isento' : `${(b.rate * 100).toFixed(1)}%`}
                      </Text>
                    </View>
                  );
                })}
              </SectionCard>

              {/* Ganho de Capital */}
              <SectionCard title="Ganho de Capital — Renda Variável" icon="trending-up">
                <Text style={[{ color: theme.textTertiary, fontSize: 13, fontFamily: 'Inter_400Regular' }]}>
                  Calcule o imposto sobre lucro em vendas de ações, FIIs, criptoativos ou imóveis.
                </Text>

                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {([['acoes', 'Ações (15%)'], ['daytrade', 'Day Trade (20%)'], ['fii', 'FIIs (20%)'], ['imovel', 'Imóvel (15%)']] as const).map(([id, lbl]) => (
                    <Pressable key={id} onPress={() => setCalcTipo(id)} style={[styles.typeChip, { backgroundColor: calcTipo === id ? `${colors.primary}20` : theme.surfaceElevated, borderColor: calcTipo === id ? colors.primary : theme.border }]}>
                      <Text style={[{ fontSize: 13, color: calcTipo === id ? colors.primary : theme.textSecondary, fontFamily: calcTipo === id ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{lbl}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>Valor de venda (R$)</Text>
                    <TextInput value={calcVenda} onChangeText={setCalcVenda} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[styles.calcInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>Custo de aquisição (R$)</Text>
                    <TextInput value={calcCusto} onChangeText={setCalcCusto} placeholder="0,00" keyboardType="decimal-pad" placeholderTextColor={theme.textTertiary} style={[styles.calcInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]} />
                  </View>
                </View>

                {(vendaNum > 0 || custoNum > 0) && (
                  <View style={{ gap: 6 }}>
                    <View style={[{ height: 1, backgroundColor: theme.border }]} />
                    <InfoRow label="Valor de venda" value={maskValue(formatBRL(vendaNum))} />
                    <InfoRow label="Custo médio" value={maskValue(formatBRL(custoNum))} />
                    <InfoRow label={ganho >= 0 ? 'Lucro (ganho)' : 'Prejuízo (perda)'} value={maskValue(formatBRL(Math.abs(ganho)))} color={ganho >= 0 ? colors.primary : colors.danger} />
                    <View style={[{ height: 1, backgroundColor: theme.border }]} />
                    {isento ? (
                      <View style={[styles.isentoBox, { backgroundColor: `${colors.primary}15` }]}>
                        <Feather name="check-circle" size={16} color={colors.primary} />
                        <Text style={[{ color: colors.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' }]}>Isento! Venda de ações abaixo de R$ 20.000 no mês</Text>
                      </View>
                    ) : (
                      <>
                        <InfoRow label="Alíquota aplicada" value={`${(taxRate * 100).toFixed(0)}%`} />
                        <InfoRow label="Imposto a pagar" value={maskValue(formatBRL(impostoGanho))} color={impostoGanho > 0 ? colors.danger : colors.primary} bold />
                        <View style={[styles.codeBox, { backgroundColor: theme.surfaceElevated }]}>
                          <Text style={[{ color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium' }]}>
                            {calcTipo === 'acoes' ? 'DARF 6015' : calcTipo === 'daytrade' ? 'DARF 6006' : calcTipo === 'fii' ? 'DARF 3299' : 'DARF 4600'}
                            {' '}• Vencimento: último dia útil do mês seguinte
                          </Text>
                        </View>
                        {impostoGanho > 0 && (
                          <Pressable
                            onPress={() => {
                              const dt = new Date();
                              const next = dt.getMonth() === 11 ? `${dt.getFullYear() + 1}-01` : `${dt.getFullYear()}-${String(dt.getMonth() + 2).padStart(2, '0')}`;
                              const codeMap: Record<string, string> = { acoes: '6015', daytrade: '6006', fii: '3299', imovel: '4600' };
                              const labelMap: Record<string, string> = { acoes: 'Renda Variável (Ações)', daytrade: 'Day Trade', fii: 'FIIs', imovel: 'Ganho de Capital (Imóvel)' };
                              addDARF({ type: `DARF - ${labelMap[calcTipo]}`, month: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`, amount: impostoGanho, dueDate: `${next}-30`, paid: false, codigoReceita: codeMap[calcTipo], baseCalculo: ganho });
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              Alert.alert('DARF criado', 'O DARF foi adicionado à sua lista.');
                            }}
                            style={[styles.addBtn, { backgroundColor: colors.primary }]}
                          >
                            <Feather name="plus" size={16} color="#000" />
                            <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Criar DARF automaticamente</Text>
                          </Pressable>
                        )}
                      </>
                    )}
                  </View>
                )}
              </SectionCard>

              {/* Rules card */}
              <SectionCard title="Regras de tributação — Renda Variável" icon="book">
                {[
                  { label: 'Ações — vendas ≤ R$ 20.000/mês', rule: 'Isento de IR' },
                  { label: 'Ações — vendas > R$ 20.000/mês', rule: '15% sobre o lucro' },
                  { label: 'Day trade (ações/derivativos)', rule: '20% sobre o lucro (sem isenção)' },
                  { label: 'FIIs — ganho de capital na venda', rule: '20% sobre o lucro' },
                  { label: 'FIIs — rendimentos mensais', rule: 'Isento para PF (portador de ≤ 10% do fundo)' },
                  { label: 'Criptoativos — vendas ≤ R$ 35.000/mês', rule: 'Isento de IR' },
                  { label: 'Criptoativos — vendas > R$ 35.000/mês', rule: '15% a 22,5% progressivo' },
                  { label: 'Dividendos de ações', rule: 'Isento (atualmente) *' },
                  { label: 'Juros sobre Capital Próprio (JCP)', rule: '15% retido na fonte' },
                  { label: 'Tesouro Direto / CDB', rule: '22,5% a 15% (regressivo por prazo)' },
                ].map((r) => (
                  <View key={r.label} style={[ir.infoRow, { borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 6 }]}>
                    <Text style={[ir.infoLabel, { color: theme.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }]}>{r.label}</Text>
                    <Text style={[{ color: theme.text, fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'right', flex: 1 }]}>{r.rule}</Text>
                  </View>
                ))}
                <Text style={[{ color: theme.textTertiary, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 4 }]}>* Sujeito a alterações legislativas. Consulte um contador.</Text>
              </SectionCard>
            </>
          )}
        </View>
      </ScrollView>

      <AddRendimentoModal visible={showAddRendimento} onClose={() => setShowAddRendimento(false)} onSave={(r) => { addRendimento(r); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} />
      <AddDeducaoModal visible={showAddDeducao} onClose={() => setShowAddDeducao(false)} onSave={(d) => { addDeducao(d); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} />
      <AddDARFModal visible={showAddDARF} onClose={() => setShowAddDARF(false)} onSave={(d) => { addDARF(d); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20, gap: 10 },
  heroTitle: { fontSize: 24 },
  heroSub: { fontSize: 14, marginBottom: 4 },
  heroStrip: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  heroCard: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12, borderWidth: 1 },
  heroCardLabel: { fontSize: 11 },
  heroCardValue: { fontSize: 16 },
  tabBar: { borderBottomWidth: 1 },
  tabContent: { flexDirection: 'row', paddingHorizontal: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 11 },
  tabText: { fontSize: 13 },
  content: { padding: 16, gap: 14 },
  saldoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  saldoLabel: { fontSize: 13 },
  saldoValue: { fontSize: 22 },
  bracketRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bracketDot: { width: 10, height: 10, borderRadius: 5 },
  bracketRange: { fontSize: 13 },
  bracketRate: { fontSize: 11, marginTop: 1 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadgeText: { color: '#fff', fontSize: 10 },
  summaryStrip: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 14, borderWidth: 1 },
  stripLabel: { fontSize: 12 },
  stripValue: { fontSize: 20 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12 },
  addBtnText: { color: '#000', fontSize: 15 },
  alertBanner: { borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  darfIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10 },
  sectionLabel: { fontSize: 17 },
  calcInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 20, fontFamily: 'Inter_700Bold' },
  codeBox: { padding: 10, borderRadius: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  isentoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
});
