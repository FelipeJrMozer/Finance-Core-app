/**
 * Tax service — Pilar Financeiro mobile.
 * Espelha os endpoints `/api/tax/*` do backend (https://pilar-financeiro.replit.app).
 *
 * Notas:
 * - Todos os métodos lançam `Error` em caso de falha; o caller deve `try/catch`
 *   e renderizar `<EmptyState>` quando apropriado.
 * - Schemas TS abaixo são propositalmente "lenientes" (campos opcionais)
 *   porque o backend ainda evolui — não quebrar a UI por causa de um campo novo.
 */

import { apiGet, apiPost, apiPatch, apiDelete, apiFetch } from './api';

// --------- Tipos ---------

export type DarfStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado';

export interface DarfCalculation {
  id: string;
  /** Mês de competência YYYY-MM. */
  referenceMonth: string;
  /** Valor em reais. */
  amount: number;
  /** Vencimento ISO (YYYY-MM-DD). */
  dueDate: string;
  /** Código de receita (ex.: 6015 — ganho de capital, 0190 — carnê-leão). */
  revenueCode?: string;
  /** Linha digitável (boleto/PIX) quando disponível. */
  barCode?: string;
  /** QR Code Pix em base64/string Brcode. */
  pixQrCode?: string;
  status: DarfStatus;
  paidDate?: string;
  paidVia?: string;
  /** Tipo de operação que gerou o DARF (acoes, fiis, cripto, carne-leao...). */
  source?: string;
}

export interface MonthlyTaxSummary {
  /** YYYY-MM. */
  month: string;
  taxableIncome: number;
  exemptIncome: number;
  taxDue: number;
  totalLosses: number;
  /** Operações tributadas no período. */
  operationsCount?: number;
  /** Próximo vencimento agregado. */
  nextDueDate?: string;
}

export interface AnnualTaxSummary {
  year: number;
  taxableIncome: number;
  exemptIncome: number;
  totalDarfs: number;
  totalDarfsPaid: number;
  /** "yes" | "no" | "maybe" — quem precisa entregar o IRPF. */
  mustFileIrpf: 'yes' | 'no' | 'maybe';
  reasons?: string[];
  /** Total de bens/direitos > teto, vendas > teto, etc. */
  thresholds?: {
    incomeAbove?: number;
    propertyAbove?: number;
    salesAbove?: number;
  };
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  /** Compra/Venda/Provento etc. */
  type: string;
  asset: string;
  quantity?: number;
  price?: number;
  total: number;
  taxImpact?: number;
}

export interface TaxCalendarEntry {
  date: string;            // ISO YYYY-MM-DD
  title: string;
  description?: string;
  type: 'IRPF' | 'DARF' | 'DAS' | 'DASN' | 'Outro';
}

export interface AccumulatedLoss {
  assetType: 'acoes' | 'fiis' | 'etfs' | 'cripto';
  operationType: 'comum' | 'daytrade';
  /** Valor em R$ (negativo = prejuízo a compensar). */
  amount: number;
  asOf: string;
}

export interface OptimizerSuggestion {
  title: string;
  description: string;
  estimatedSaving?: number;
  action?: 'sell' | 'hold' | 'buy' | 'distribute' | string;
  asset?: string;
}

export interface TaxIncome {
  id: string;
  year: number;
  type: string;
  description: string;
  amount: number;
  payerDoc?: string;
  payerName?: string;
}

export interface TaxDeduction {
  id: string;
  year: number;
  type: string;
  description: string;
  amount: number;
  beneficiaryDoc?: string;
  beneficiaryName?: string;
}

export interface IrpfGuideStep {
  step: number;
  title: string;
  description: string;
  fields?: Array<{ label: string; value: string | number }>;
}

export interface IrpfGuide {
  year: number;
  steps: IrpfGuideStep[];
  generatedAt?: string;
}

// --------- Endpoints principais ---------

export function getMonthlyTaxes(year: number, month: number) {
  const m = String(month).padStart(2, '0');
  return apiGet<MonthlyTaxSummary>(`/api/tax/monthly/${year}/${m}`);
}

export function getTaxJournal(year: number, month: number) {
  const m = String(month).padStart(2, '0');
  return apiGet<JournalEntry[]>(`/api/tax/journal/${year}/${m}`);
}

export function getAnnualTax(year: number) {
  return apiGet<AnnualTaxSummary>(`/api/tax/annual/${year}`);
}

export function calculateDarf(payload: {
  year: number;
  month: number;
  assetType?: string;
  operationType?: 'comum' | 'daytrade';
  /** Operações específicas (opcional — backend pode usar dados já lançados). */
  operations?: Array<{ asset: string; quantity: number; price: number; type: 'buy' | 'sell'; date: string }>;
}) {
  return apiPost<DarfCalculation>('/api/tax/darf/calculate', payload);
}

export function getDarfHistory(params: { year?: number; status?: DarfStatus; limit?: number } = {}) {
  const q = new URLSearchParams();
  if (params.year) q.set('year', String(params.year));
  if (params.status) q.set('status', params.status);
  if (params.limit) q.set('limit', String(params.limit));
  const qs = q.toString();
  return apiGet<DarfCalculation[]>(`/api/tax/calculations/history${qs ? `?${qs}` : ''}`);
}

export function markDarfPaid(id: string, payload: { paidDate: string; paidVia?: string }) {
  return apiPatch<DarfCalculation>(`/api/tax/calculations/${encodeURIComponent(id)}/mark-paid`, payload);
}

// IRPF — geração e download de arquivos

/** Cria/regenera o arquivo .DEC importável da RFB. */
export function generateIrpfExport(year: number) {
  return apiPost<{ url?: string; status?: string }>(`/api/tax/irpf/export/${year}`);
}

/** URL absoluta para download do .DEC (usar em FileSystem.downloadAsync). */
export function getIrpfDownloadUrl(year: number) {
  // O download é binário — retornamos a URL para o caller fazer download via FileSystem.
  // O caller deve adicionar Authorization via apiFetch ou via FileSystem.createDownloadResumable.
  return `/api/tax/irpf/download/${year}`;
}

/** Faz o download bruto do .DEC (response). */
export function downloadIrpfRaw(year: number) {
  return apiFetch(`/api/tax/irpf/download/${year}`);
}

export function getIrpfGuide(year: number) {
  return apiGet<IrpfGuide>(`/api/tax/irpf/guide/${year}`);
}

export function getIrpfGuidePdfPath(year: number) {
  return `/api/tax/irpf/guide/${year}/pdf`;
}

/** Faz o download do guia IRPF em PDF (response binário). */
export function downloadIrpfGuidePdf(year: number) {
  return apiFetch(`/api/tax/irpf/guide/${year}/pdf`);
}

export function runOptimizer(payload: {
  year?: number;
  plannedSale?: number;
  plannedAsset?: string;
  /** Outras hipóteses para sugestões. */
  context?: Record<string, unknown>;
}) {
  return apiPost<{ suggestions: OptimizerSuggestion[] }>('/api/tax/optimizer', payload);
}

export function getTaxCalendar(year: number) {
  return apiGet<TaxCalendarEntry[]>(`/api/tax/calendar/${year}`);
}

export function getAccumulatedLosses(
  year: number,
  month: number,
  assetType: 'acoes' | 'fiis' | 'etfs' | 'cripto',
  operationType: 'comum' | 'daytrade',
) {
  const m = String(month).padStart(2, '0');
  return apiGet<AccumulatedLoss>(
    `/api/tax/accumulated-losses/${year}/${m}/${assetType}/${operationType}`,
  );
}

export function getCryptoTaxTransactions(year: number, month: number) {
  const m = String(month).padStart(2, '0');
  return apiGet<JournalEntry[]>(`/api/tax/crypto/transactions/${year}/${m}`);
}

// --------- Alertas fiscais ---------

export type TaxAlertType =
  | 'mei-revenue-80'        // faturamento MEI passou de 80% do limite
  | 'darf-due-5d'           // DARF vence em 5 dias
  | 'das-due-day-20'        // DAS-MEI vence dia 20
  | 'irpf-deadline';        // prazo final IRPF

export interface TaxAlertConfig {
  alertType: TaxAlertType;
  threshold?: number;
  channel?: 'push' | 'email' | 'both';
  enabled?: boolean;
}

export function configureTaxAlert(payload: TaxAlertConfig) {
  return apiPost<{ id: string } & TaxAlertConfig>('/api/tax/alerts/configure', payload);
}

// --------- Rendimentos e Deduções (CRUD) ---------

export function listTaxIncomes(year?: number) {
  return apiGet<TaxIncome[]>(`/api/tax-incomes${year ? `?year=${year}` : ''}`);
}

export function createTaxIncome(payload: Omit<TaxIncome, 'id'>) {
  return apiPost<TaxIncome>('/api/tax-incomes', payload);
}

export function updateTaxIncome(id: string, payload: Partial<Omit<TaxIncome, 'id'>>) {
  return apiPatch<TaxIncome>(`/api/tax-incomes/${encodeURIComponent(id)}`, payload);
}

export function deleteTaxIncome(id: string) {
  return apiDelete(`/api/tax-incomes/${encodeURIComponent(id)}`);
}

export function listTaxDeductions(year?: number) {
  return apiGet<TaxDeduction[]>(`/api/tax-deductions${year ? `?year=${year}` : ''}`);
}

export function createTaxDeduction(payload: Omit<TaxDeduction, 'id'>) {
  return apiPost<TaxDeduction>('/api/tax-deductions', payload);
}

export function updateTaxDeduction(id: string, payload: Partial<Omit<TaxDeduction, 'id'>>) {
  return apiPatch<TaxDeduction>(`/api/tax-deductions/${encodeURIComponent(id)}`, payload);
}

export function deleteTaxDeduction(id: string) {
  return apiDelete(`/api/tax-deductions/${encodeURIComponent(id)}`);
}
