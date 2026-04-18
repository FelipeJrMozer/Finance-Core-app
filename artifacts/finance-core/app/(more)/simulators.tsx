import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Platform, KeyboardAvoidingView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { formatBRL } from '@/utils/formatters';
import { useBenchmarks } from '@/services/benchmarks';

const SIMULATORS = [
  { id: 'compound',   icon: 'trending-up',  label: 'Juros Compostos',           color: '#10B981' },
  { id: 'savings',    icon: 'target',       label: 'Meta de Poupança',           color: '#0096C7' },
  { id: 'loan',       icon: 'dollar-sign',  label: 'Simulador de Empréstimo',    color: '#F59E0B' },
  { id: 'emergency',  icon: 'shield',       label: 'Reserva de Emergência',      color: '#EF4444' },
  { id: 'mortgage',   icon: 'home',         label: 'Financiamento Imóvel',       color: '#7B39ED' },
  { id: 'vehicle',    icon: 'truck',        label: 'Financiamento Veículo',      color: '#FF9800' },
  { id: 'inflation',  icon: 'percent',      label: 'IPCA vs. CDI',               color: '#009688' },
  { id: 'ir',         icon: 'file-text',    label: 'Imposto de Renda',           color: '#F44336' },
  { id: 'fire',       icon: 'target',       label: 'Independência Financeira',   color: '#2196F3' },
  { id: 'pension',    icon: 'umbrella',     label: 'Previdência Privada',        color: '#9C27B0' },
  { id: 'card_cost',  icon: 'credit-card',  label: 'Custo Real do Cartão',       color: '#E91E63' },
  { id: 'portability',icon: 'refresh-cw',   label: 'Portabilidade de Crédito',   color: '#795548' },
] as const;

type SimId = typeof SIMULATORS[number]['id'];

function NumInput({ label, value, onChangeText, prefix = 'R$', suffix = '' }: {
  label: string; value: string; onChangeText: (v: string) => void; prefix?: string; suffix?: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[ni.label, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
      <View style={[ni.row, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        {prefix ? <Text style={[ni.prefix, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          style={[ni.input, { color: theme.text, fontFamily: 'Inter_500Medium', flex: 1 }]}
          placeholderTextColor={theme.textTertiary}
          placeholder="0"
        />
        {suffix ? <Text style={[ni.prefix, { color: theme.textTertiary, fontFamily: 'Inter_400Regular' }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}
const ni = StyleSheet.create({
  label: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  prefix: { fontSize: 14 },
  input: { fontSize: 16, padding: 0 },
});

function ResultRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const { theme, colors } = useTheme();
  return (
    <View style={[rr.row, { borderBottomColor: theme.border }]}>
      <Text style={[rr.label, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
      <Text style={[rr.value, { color: highlight ? colors.primary : theme.text, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
    </View>
  );
}
const rr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  value: { fontSize: 15 },
});

function SelectToggle({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  const { theme, colors } = useTheme();
  return (
    <View style={[st.row, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.id}
          onPress={() => { Haptics.selectionAsync(); onChange(opt.id); }}
          style={[st.opt, { backgroundColor: value === opt.id ? colors.primary : 'transparent' }]}
        >
          <Text style={[st.optText, { color: value === opt.id ? '#fff' : theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>{opt.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const st = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  opt: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  optText: { fontSize: 13 },
});

// ─── SIMULATORS ────────────────────────────────────────────────────────────────

function CompoundSim() {
  const [principal, setPrincipal] = useState('1000');
  const [monthly, setMonthly] = useState('200');
  const [rate, setRate] = useState('12');
  const [months, setMonths] = useState('24');

  const p = parseFloat(principal) || 0;
  const m = parseFloat(monthly) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = parseInt(months) || 1;
  const futureValue = r > 0
    ? p * Math.pow(1 + r, n) + m * ((Math.pow(1 + r, n) - 1) / r)
    : p + m * n;
  const invested = p + m * n;
  const gain = futureValue - invested;

  return (
    <>
      <NumInput label="Capital inicial" value={principal} onChangeText={setPrincipal} />
      <NumInput label="Aporte mensal" value={monthly} onChangeText={setMonthly} />
      <NumInput label="Taxa de juros anual (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.a." />
      <NumInput label="Período (meses)" value={months} onChangeText={setMonths} prefix="" suffix="meses" />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Total investido" value={formatBRL(invested)} />
        <ResultRow label="Juros ganhos" value={formatBRL(gain)} />
        <ResultRow label="Valor final" value={formatBRL(futureValue)} highlight />
      </View>
    </>
  );
}

function SavingsSim() {
  const [goal, setGoal] = useState('10000');
  const [monthly, setMonthly] = useState('500');
  const [rate, setRate] = useState('8');

  const g = parseFloat(goal) || 0;
  const m = parseFloat(monthly) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const months = r > 0
    ? Math.ceil(Math.log(1 + (g * r) / m) / Math.log(1 + r))
    : Math.ceil(g / Math.max(m, 1));
  const totalInvested = m * months;
  const gains = g - totalInvested;

  return (
    <>
      <NumInput label="Valor da meta" value={goal} onChangeText={setGoal} />
      <NumInput label="Aporte mensal" value={monthly} onChangeText={setMonthly} />
      <NumInput label="Rentabilidade anual (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.a." />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Tempo para atingir" value={`${months} meses (${Math.ceil(months / 12)} anos)`} highlight />
        <ResultRow label="Total aportado" value={formatBRL(totalInvested)} />
        <ResultRow label="Rendimentos" value={formatBRL(Math.max(0, gains))} />
      </View>
    </>
  );
}

function LoanSim() {
  const [amount, setAmount] = useState('20000');
  const [rate, setRate] = useState('2.5');
  const [months, setMonths] = useState('36');

  const p = parseFloat(amount) || 0;
  const r = (parseFloat(rate) || 0) / 100;
  const n = parseInt(months) || 1;
  const installment = r > 0 ? (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n;
  const total = installment * n;
  const totalInterest = total - p;

  return (
    <>
      <NumInput label="Valor do empréstimo" value={amount} onChangeText={setAmount} />
      <NumInput label="Taxa mensal (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.m." />
      <NumInput label="Prazo (meses)" value={months} onChangeText={setMonths} prefix="" suffix="meses" />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Parcela mensal" value={formatBRL(installment)} highlight />
        <ResultRow label="Total pago" value={formatBRL(total)} />
        <ResultRow label="Total de juros" value={formatBRL(totalInterest)} />
      </View>
    </>
  );
}

function EmergencySim() {
  const [monthly, setMonthly] = useState('3000');
  const [months, setMonths] = useState('6');
  const [saved, setSaved] = useState('5000');

  const goal = (parseFloat(monthly) || 0) * (parseInt(months) || 6);
  const current = parseFloat(saved) || 0;
  const remaining = Math.max(0, goal - current);
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;

  return (
    <>
      <NumInput label="Despesas mensais" value={monthly} onChangeText={setMonthly} />
      <NumInput label="Meses de reserva desejados" value={months} onChangeText={setMonths} prefix="" suffix="meses" />
      <NumInput label="Já guardei" value={saved} onChangeText={setSaved} />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Meta de reserva" value={formatBRL(goal)} highlight />
        <ResultRow label="Já guardado" value={formatBRL(current)} />
        <ResultRow label="Ainda falta" value={formatBRL(remaining)} />
        <ResultRow label="Progresso" value={`${pct.toFixed(1)}%`} />
      </View>
    </>
  );
}

function MortgageSim() {
  const [value, setValue] = useState('300000');
  const [entry, setEntry] = useState('60000');
  const [months, setMonths] = useState('360');
  const [rate, setRate] = useState('0.8');
  const [system, setSystem] = useState('PRICE');

  const loanAmount = (parseFloat(value) || 0) - (parseFloat(entry) || 0);
  const r = (parseFloat(rate) || 0) / 100;
  const n = parseInt(months) || 1;
  let firstInstallment = 0, lastInstallment = 0, totalPaid = 0;

  if (system === 'PRICE') {
    const installment = r > 0 ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loanAmount / n;
    firstInstallment = installment;
    lastInstallment = installment;
    totalPaid = installment * n;
  } else {
    const amortization = loanAmount / n;
    firstInstallment = amortization + loanAmount * r;
    lastInstallment = amortization + (loanAmount / n) * r;
    totalPaid = amortization * n + (loanAmount * r * (n + 1)) / 2;
  }
  const totalInterest = totalPaid - loanAmount;

  return (
    <>
      <NumInput label="Valor do imóvel" value={value} onChangeText={setValue} />
      <NumInput label="Entrada" value={entry} onChangeText={setEntry} />
      <NumInput label="Prazo (meses)" value={months} onChangeText={setMonths} prefix="" suffix="meses" />
      <NumInput label="Taxa mensal (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.m." />
      <SelectToggle options={[{ id: 'PRICE', label: 'PRICE' }, { id: 'SAC', label: 'SAC' }]} value={system} onChange={setSystem} />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Valor financiado" value={formatBRL(loanAmount)} />
        <ResultRow label="1ª parcela" value={formatBRL(firstInstallment)} highlight />
        <ResultRow label="Última parcela" value={formatBRL(lastInstallment)} />
        <ResultRow label="Total pago" value={formatBRL(totalPaid)} />
        <ResultRow label="Total de juros" value={formatBRL(totalInterest)} />
      </View>
    </>
  );
}

function VehicleSim() {
  const [value, setValue] = useState('50000');
  const [entry, setEntry] = useState('10000');
  const [months, setMonths] = useState('48');
  const [rate, setRate] = useState('1.5');

  const loan = (parseFloat(value) || 0) - (parseFloat(entry) || 0);
  const r = (parseFloat(rate) || 0) / 100;
  const n = parseInt(months) || 1;
  const installment = r > 0 ? (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n;
  const total = installment * n;
  const interest = total - loan;
  const annualRate = Math.pow(1 + r, 12) - 1;
  const cet = annualRate * 100;

  return (
    <>
      <NumInput label="Valor do veículo" value={value} onChangeText={setValue} />
      <NumInput label="Entrada" value={entry} onChangeText={setEntry} />
      <NumInput label="Prazo (meses)" value={months} onChangeText={setMonths} prefix="" suffix="meses" />
      <NumInput label="Taxa mensal (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.m." />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Parcela mensal" value={formatBRL(installment)} highlight />
        <ResultRow label="Total pago" value={formatBRL(total)} />
        <ResultRow label="Juros totais" value={formatBRL(interest)} />
        <ResultRow label="CET estimado" value={`${cet.toFixed(1)}% a.a.`} />
      </View>
    </>
  );
}

function InflationSim() {
  const { theme } = useTheme();
  const { data: bench, isStale, source } = useBenchmarks();
  const [initial, setInitial] = useState('10000');
  const [years, setYears] = useState('5');
  const [ipca, setIpca] = useState<string | null>(null);
  const [cdi, setCdi] = useState<string | null>(null);

  // Default IPCA/CDI values come from real API; user can override.
  const ipcaInput = ipca ?? (bench ? String(bench.ipca) : '');
  const cdiInput = cdi ?? (bench ? String(bench.cdi) : '');

  const p = parseFloat(initial) || 0;
  const y = parseFloat(years) || 1;
  const ipcaRate = (parseFloat(ipcaInput) || 0) / 100;
  const cdiRate = (parseFloat(cdiInput) || 0) / 100;

  const ipcaValue = p * Math.pow(1 + ipcaRate, y);
  const cdiValue = p * Math.pow(1 + cdiRate, y);
  const powerMaintained = cdiValue >= ipcaValue;

  return (
    <>
      <NumInput label="Valor inicial" value={initial} onChangeText={setInitial} />
      <NumInput label="Prazo (anos)" value={years} onChangeText={setYears} prefix="" suffix="anos" />
      <NumInput label="IPCA médio (%)" value={ipcaInput} onChangeText={setIpca} prefix="" suffix="% a.a." />
      <NumInput label="CDI (%)" value={cdiInput} onChangeText={setCdi} prefix="" suffix="% a.a." />
      {source === 'none' && (
        <Text style={{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
          Não foi possível carregar índices atuais — informe os valores manualmente.
        </Text>
      )}
      {isStale && (
        <Text style={{ color: theme.textTertiary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
          Não foi possível carregar índices atuais. Usando últimos valores conhecidos.
        </Text>
      )}
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Valor corrigido (IPCA)" value={formatBRL(ipcaValue)} />
        <ResultRow label="Valor com CDI" value={formatBRL(cdiValue)} highlight />
        <ResultRow label="Ganho real vs. IPCA" value={formatBRL(cdiValue - ipcaValue)} />
        <ResultRow label="Poder de compra" value={powerMaintained ? '✅ Mantido' : '⚠️ Perdido'} />
      </View>
    </>
  );
}

function IrSim() {
  const [gross, setGross] = useState('80000');
  const [dependents, setDependents] = useState('1');
  const [health, setHealth] = useState('5000');
  const [education, setEducation] = useState('3500');
  const [type, setType] = useState('completo');

  const g = parseFloat(gross) || 0;
  const dep = (parseInt(dependents) || 0) * 2275.08;
  const ded = type === 'completo'
    ? dep + (parseFloat(health) || 0) + Math.min(parseFloat(education) || 0, 3561.50)
    : g * 0.2;
  const base = Math.max(0, g - ded - 4950.72 /* INSS estimado */);

  let ir = 0;
  const brackets = [
    { limit: 24511.92, rate: 0, deduction: 0 },
    { limit: 33919.80, rate: 0.075, deduction: 1838.39 },
    { limit: 45012.60, rate: 0.15, deduction: 4382.38 },
    { limit: 55976.16, rate: 0.225, deduction: 7765.08 },
    { limit: Infinity, rate: 0.275, deduction: 10557.00 },
  ];
  for (const b of brackets) {
    if (base <= b.limit) { ir = base * b.rate - b.deduction; break; }
  }
  ir = Math.max(0, ir);
  const efectiveRate = g > 0 ? (ir / g) * 100 : 0;
  const irWithhold = g * 0.15; // simplified estimate withheld
  const difference = irWithhold - ir;

  return (
    <>
      <NumInput label="Rendimento bruto anual" value={gross} onChangeText={setGross} />
      <NumInput label="Dependentes" value={dependents} onChangeText={setDependents} prefix="" suffix="pessoa(s)" />
      <NumInput label="Gastos com saúde" value={health} onChangeText={setHealth} />
      <NumInput label="Gastos com educação" value={education} onChangeText={setEducation} />
      <SelectToggle options={[{ id: 'completo', label: 'Completo' }, { id: 'simples', label: 'Simplificado' }]} value={type} onChange={setType} />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Base de cálculo" value={formatBRL(base)} />
        <ResultRow label="IR devido" value={formatBRL(ir)} highlight />
        <ResultRow label="Alíquota efetiva" value={`${efectiveRate.toFixed(2)}%`} />
        <ResultRow label="Estimativa restituição/complemento" value={`${difference >= 0 ? '+ ' : '– '}${formatBRL(Math.abs(difference))}`} />
      </View>
    </>
  );
}

function FireSim() {
  const [patrimony, setPatrimony] = useState('50000');
  const [monthly, setMonthly] = useState('2000');
  const [rate, setRate] = useState('10');
  const [expense, setExpense] = useState('5000');

  const p = parseFloat(patrimony) || 0;
  const m = parseFloat(monthly) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const monthlyExpense = parseFloat(expense) || 0;
  const target = monthlyExpense * 12 * 25; // 4% rule
  const months = r > 0
    ? Math.ceil(Math.log((target - p) * r / m + 1) / Math.log(1 + r))
    : Math.ceil((target - p) / Math.max(m, 1));
  const validMonths = isFinite(months) && months > 0 ? months : null;
  const years = validMonths ? Math.floor(validMonths / 12) : null;
  const targetDate = validMonths ? new Date(Date.now() + validMonths * 30.5 * 24 * 3600 * 1000) : null;

  return (
    <>
      <NumInput label="Patrimônio atual" value={patrimony} onChangeText={setPatrimony} />
      <NumInput label="Aporte mensal" value={monthly} onChangeText={setMonthly} />
      <NumInput label="Rentabilidade anual (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.a." />
      <NumInput label="Despesa mensal desejada" value={expense} onChangeText={setExpense} />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Patrimônio necessário (4%)" value={formatBRL(target)} />
        <ResultRow label="Tempo para atingir" value={validMonths ? `${years} anos e ${validMonths % 12} meses` : 'Aporte insuficiente'} highlight />
        <ResultRow label="Data estimada" value={targetDate ? targetDate.getFullYear().toString() : '—'} />
      </View>
    </>
  );
}

function PensionSim() {
  const [monthly, setMonthly] = useState('500');
  const [years, setYears] = useState('30');
  const [rate, setRate] = useState('8');
  const [type, setType] = useState('VGBL');
  const [irRate, setIrRate] = useState('15');

  const m = parseFloat(monthly) || 0;
  const y = parseFloat(years) || 1;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = y * 12;
  const accumulated = r > 0 ? m * ((Math.pow(1 + r, n) - 1) / r) : m * n;
  const totalInvested = m * n;
  const annualContrib = m * 12;
  const irBenefit = type === 'PGBL' ? annualContrib * ((parseFloat(irRate) || 0) / 100) : 0;
  const monthlyIncome = accumulated * 0.004; // ~0.4% per month withdrawal

  return (
    <>
      <NumInput label="Aporte mensal" value={monthly} onChangeText={setMonthly} />
      <NumInput label="Prazo (anos)" value={years} onChangeText={setYears} prefix="" suffix="anos" />
      <NumInput label="Rentabilidade anual (%)" value={rate} onChangeText={setRate} prefix="" suffix="% a.a." />
      <SelectToggle options={[{ id: 'PGBL', label: 'PGBL' }, { id: 'VGBL', label: 'VGBL' }]} value={type} onChange={setType} />
      {type === 'PGBL' && (
        <NumInput label="Alíquota IR (%)" value={irRate} onChangeText={setIrRate} prefix="" suffix="%" />
      )}
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Total acumulado" value={formatBRL(accumulated)} highlight />
        <ResultRow label="Total investido" value={formatBRL(totalInvested)} />
        {type === 'PGBL' && <ResultRow label="Benefício fiscal anual" value={formatBRL(irBenefit)} />}
        <ResultRow label="Renda mensal estimada" value={formatBRL(monthlyIncome)} />
      </View>
    </>
  );
}

function CardCostSim() {
  // Simulação de saldo no rotativo do cartão. Juros incidem mensalmente
  // sobre o saldo remanescente (juros compostos) — NÃO é PRICE de parcela fixa.
  const [debt, setDebt] = useState('1000');
  const [annualRate, setAnnualRate] = useState('400'); // CDI rotativo médio ~ 400% a.a. no Brasil
  const [mode, setMode] = useState<'min' | 'fixed'>('min');
  const [minPct, setMinPct] = useState('15');
  const [fixedPay, setFixedPay] = useState('150');

  const initialBalance = parseFloat(debt) || 0;
  const annual = (parseFloat(annualRate) || 0) / 100;
  const monthlyRate = annual > 0 ? Math.pow(1 + annual, 1 / 12) - 1 : 0; // capitalização efetiva
  const minPctNum = (parseFloat(minPct) || 0) / 100;
  const fixedPayNum = parseFloat(fixedPay) || 0;

  const MAX_MONTHS = 120;
  let saldo = initialBalance;
  let totalPago = 0;
  let meses = 0;
  let nuncaQuita = false;

  while (saldo > 0.01 && meses < MAX_MONTHS) {
    const pagamento = mode === 'min'
      ? Math.max(saldo * minPctNum, 1) // mínimo nunca pode ser zero, ou nunca quita
      : fixedPayNum;
    if (pagamento <= 0) { nuncaQuita = true; break; }
    if (pagamento >= saldo) {
      // último pagamento quita o saldo
      totalPago += saldo;
      saldo = 0;
      meses += 1;
      break;
    }
    // o pagamento é cobrado primeiro, juros compostos sobre o saldo remanescente
    saldo = (saldo - pagamento) * (1 + monthlyRate);
    totalPago += pagamento;
    meses += 1;
    // se o pagamento não cobre os juros, a dívida cresce indefinidamente
    if (mode === 'fixed' && fixedPayNum < initialBalance * monthlyRate) {
      nuncaQuita = true;
      break;
    }
  }

  const totalJuros = totalPago - initialBalance;
  const quitouNoLimite = meses >= MAX_MONTHS && saldo > 0.01;

  return (
    <>
      <NumInput label="Saldo da fatura no rotativo" value={debt} onChangeText={setDebt} />
      <NumInput label="Juros do rotativo (% a.a.)" value={annualRate} onChangeText={setAnnualRate} prefix="" suffix="% a.a." />
      <SelectToggle
        options={[
          { id: 'min', label: 'Pago só o mínimo' },
          { id: 'fixed', label: 'Valor fixo mensal' },
        ]}
        value={mode}
        onChange={(v) => setMode(v as 'min' | 'fixed')}
      />
      {mode === 'min'
        ? <NumInput label="% mínimo da fatura" value={minPct} onChangeText={setMinPct} prefix="" suffix="%" />
        : <NumInput label="Pagamento mensal" value={fixedPay} onChangeText={setFixedPay} />
      }
      <View style={{ marginTop: 4 }}>
        {nuncaQuita || quitouNoLimite ? (
          <>
            <ResultRow label="Status" value="⚠️ Pagamento insuficiente — dívida não quita em 10 anos" highlight />
            <ResultRow label="Total pago em 10 anos" value={formatBRL(totalPago)} />
            <ResultRow label="Saldo restante" value={formatBRL(Math.max(0, saldo))} />
          </>
        ) : (
          <>
            <ResultRow label="Meses até quitar" value={`${meses} meses (${(meses / 12).toFixed(1)} anos)`} highlight />
            <ResultRow label="Total pago" value={formatBRL(totalPago)} />
            <ResultRow label="Total de juros" value={formatBRL(totalJuros)} />
          </>
        )}
      </View>
    </>
  );
}

function PortabilitySim() {
  const [debt, setDebt] = useState('20000');
  const [remainingMonths, setRemainingMonths] = useState('24');
  const [currentRate, setCurrentRate] = useState('3.5');
  const [newRate, setNewRate] = useState('2.0');

  const d = parseFloat(debt) || 0;
  const n = parseInt(remainingMonths) || 1;
  const rCurrent = (parseFloat(currentRate) || 0) / 100;
  const rNew = (parseFloat(newRate) || 0) / 100;

  const calcInstallment = (principal: number, rate: number, periods: number) =>
    rate > 0 ? (principal * rate * Math.pow(1 + rate, periods)) / (Math.pow(1 + rate, periods) - 1) : principal / periods;

  const currentInst = calcInstallment(d, rCurrent, n);
  const newInst = calcInstallment(d, rNew, n);
  const monthlySavings = currentInst - newInst;
  const totalSavings = monthlySavings * n;

  return (
    <>
      <NumInput label="Saldo devedor" value={debt} onChangeText={setDebt} />
      <NumInput label="Prazo restante (meses)" value={remainingMonths} onChangeText={setRemainingMonths} prefix="" suffix="meses" />
      <NumInput label="Taxa atual (% a.m.)" value={currentRate} onChangeText={setCurrentRate} prefix="" suffix="%" />
      <NumInput label="Taxa nova (% a.m.)" value={newRate} onChangeText={setNewRate} prefix="" suffix="%" />
      <View style={{ marginTop: 4 }}>
        <ResultRow label="Parcela atual" value={formatBRL(currentInst)} />
        <ResultRow label="Parcela nova" value={formatBRL(newInst)} highlight />
        <ResultRow label="Economia mensal" value={formatBRL(monthlySavings)} />
        <ResultRow label="Economia total" value={formatBRL(totalSavings)} />
      </View>
    </>
  );
}

const SIM_COMPONENTS: Record<SimId, React.ComponentType> = {
  compound: CompoundSim,
  savings: SavingsSim,
  loan: LoanSim,
  emergency: EmergencySim,
  mortgage: MortgageSim,
  vehicle: VehicleSim,
  inflation: InflationSim,
  ir: IrSim,
  fire: FireSim,
  pension: PensionSim,
  card_cost: CardCostSim,
  portability: PortabilitySim,
};

export default function SimulatorsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<SimId | null>(null);

  const selectedSim = SIMULATORS.find((s) => s.id === selected);
  const SimComponent = selected ? SIM_COMPONENTS[selected] : null;

  if (selected && SimComponent) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.background }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelected(null); }}
            style={[styles.backBtn, { borderColor: theme.border }]}
          >
            <Feather name="arrow-left" size={16} color={theme.textSecondary} />
            <Text style={[styles.backText, { color: theme.textSecondary, fontFamily: 'Inter_500Medium' }]}>
              Simuladores
            </Text>
          </Pressable>

          <View style={[styles.simHeader, { backgroundColor: `${selectedSim!.color}15` }]}>
            <View style={[styles.simHeaderIcon, { backgroundColor: selectedSim!.color }]}>
              <Feather name={selectedSim!.icon as any} size={22} color="#fff" />
            </View>
            <Text style={[styles.simHeaderTitle, { color: theme.text, fontFamily: 'Inter_700Bold' }]}>
              {selectedSim!.label}
            </Text>
          </View>

          <View style={[styles.simCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <SimComponent />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: insets.bottom + 32 }}
    >
      <Text style={[styles.headline, { color: theme.textSecondary, fontFamily: 'Inter_400Regular' }]}>
        Escolha um simulador para começar
      </Text>
      <View style={styles.grid}>
        {SIMULATORS.map((sim) => (
          <Pressable
            key={sim.id}
            onPress={() => { Haptics.selectionAsync(); setSelected(sim.id); }}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <View style={[styles.tileIcon, { backgroundColor: `${sim.color}20` }]}>
              <Feather name={sim.icon as any} size={20} color={sim.color} />
            </View>
            <Text style={[styles.tileLabel, { color: theme.text, fontFamily: 'Inter_500Medium' }]}>
              {sim.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headline: { fontSize: 14, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    alignItems: 'flex-start',
  },
  tileIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 13, lineHeight: 18 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14 },
  simHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 14,
  },
  simHeaderIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  simHeaderTitle: { fontSize: 20, flex: 1 },
  simCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 14 },
});
