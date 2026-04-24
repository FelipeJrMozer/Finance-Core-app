/**
 * PJ / MEI service — Pilar Financeiro mobile.
 * Endpoints `/api/pj/*` do backend.
 *
 * Substitui o workaround anterior de filtrar `transactions` por
 * `description.includes('[PJ]')` — agora as receitas/despesas/DAS
 * vêm de tabelas dedicadas no servidor.
 */

import { apiGet, apiPost, apiPatch, apiDelete } from './api';

// --------- Tipos ---------

export interface PjAccount {
  id: string;
  name: string;
  type: 'corrente' | 'poupanca' | 'caixa' | 'outro';
  bankName?: string;
  /** Saldo atual em R$. */
  balance?: number;
  isActive?: boolean;
}

export interface PjTag {
  id: string;
  name: string;
  color?: string;
}

export interface PjRevenue {
  id: string;
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;
  /** Recebido (true) ou previsto (false). */
  isPaid: boolean;
  receivedDate?: string;
  clientId?: string;
  clientName?: string;
  invoiceNumber?: string;
  accountId?: string;
  tags?: string[];
  category?: string;
  notes?: string;
}

export interface PjExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  category?: string;
  accountId?: string;
  tags?: string[];
  /** Despesa dedutível para apuração de lucro real / livro-caixa. */
  deductible?: boolean;
  notes?: string;
}

export type DasStatus = 'pendente' | 'pago' | 'atrasado';

export interface PjDas {
  id: string;
  /** YYYY-MM. */
  referenceMonth: string;
  amount: number;
  dueDate: string;
  status: DasStatus;
  paidDate?: string;
  paidVia?: string;
  /** Categoria MEI usada na geração (comercio_industria, servicos, ...). */
  category?: string;
  barCode?: string;
}

export interface DasnSimeiSummary {
  year: number;
  status: 'pendente' | 'entregue';
  totalRevenue: number;
  /** 12 meses de receita bruta. */
  monthlyRevenue: Array<{ month: string; amount: number }>;
  /** Limite anual MEI (R$ 81.000 ou proporcional). */
  annualLimit: number;
  exceededLimit: boolean;
  /** Data limite para entrega da DASN do ano em questão. */
  dueDate: string;
  /** URL da planilha gerada (quando disponível). */
  spreadsheetUrl?: string;
}

// --------- Helpers ---------

function buildQuery(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

// --------- Contas PJ ---------

export function listPjAccounts() {
  return apiGet<PjAccount[]>('/api/pj/accounts');
}
export function createPjAccount(payload: Omit<PjAccount, 'id'>) {
  return apiPost<PjAccount>('/api/pj/accounts', payload);
}
export function updatePjAccount(id: string, payload: Partial<Omit<PjAccount, 'id'>>) {
  return apiPatch<PjAccount>(`/api/pj/accounts/${encodeURIComponent(id)}`, payload);
}
export function deletePjAccount(id: string) {
  return apiDelete(`/api/pj/accounts/${encodeURIComponent(id)}`);
}

// --------- Tags ---------

export function listPjTags() {
  return apiGet<PjTag[]>('/api/pj/tags');
}

// --------- Receitas / Despesas ---------

export function listPjRevenues(params?: { month?: string; year?: number; clientId?: string }) {
  return apiGet<PjRevenue[]>(`/api/pj/revenues${buildQuery(params)}`);
}
export function createPjRevenue(payload: Omit<PjRevenue, 'id'>) {
  return apiPost<PjRevenue>('/api/pj/revenues', payload);
}
export function updatePjRevenue(id: string, payload: Partial<Omit<PjRevenue, 'id'>>) {
  return apiPatch<PjRevenue>(`/api/pj/revenues/${encodeURIComponent(id)}`, payload);
}
export function deletePjRevenue(id: string) {
  return apiDelete(`/api/pj/revenues/${encodeURIComponent(id)}`);
}

export function listPjExpenses(params?: { month?: string; year?: number; deductible?: boolean }) {
  return apiGet<PjExpense[]>(`/api/pj/expenses${buildQuery(params)}`);
}
export function createPjExpense(payload: Omit<PjExpense, 'id'>) {
  return apiPost<PjExpense>('/api/pj/expenses', payload);
}
export function updatePjExpense(id: string, payload: Partial<Omit<PjExpense, 'id'>>) {
  return apiPatch<PjExpense>(`/api/pj/expenses/${encodeURIComponent(id)}`, payload);
}
export function deletePjExpense(id: string) {
  return apiDelete(`/api/pj/expenses/${encodeURIComponent(id)}`);
}

// --------- DAS ---------

export function listPjDas(params?: { year?: number; status?: DasStatus }) {
  return apiGet<PjDas[]>(`/api/pj/das${buildQuery(params)}`);
}
export function createPjDas(payload: Omit<PjDas, 'id' | 'status'> & { status?: DasStatus }) {
  return apiPost<PjDas>('/api/pj/das', payload);
}
export function markPjDasPaid(id: string, payload: { paidDate: string; paidVia?: string }) {
  return apiPatch<PjDas>(`/api/pj/das/${encodeURIComponent(id)}/mark-paid`, payload);
}

// --------- DASN-SIMEI ---------

/**
 * Resumo DASN-SIMEI do ano.
 * Pode retornar 404 se o backend ainda não tiver o endpoint;
 * o caller deve cair no agregado calculado a partir de revenues.
 */
export function getDasnSimeiSummary(year: number) {
  return apiGet<DasnSimeiSummary>(`/api/pj/dasn-simei/${year}`);
}
