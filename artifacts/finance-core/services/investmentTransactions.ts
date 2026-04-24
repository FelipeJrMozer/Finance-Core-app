import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { parseAmount, parseDate } from '@/utils/parse';

export type InvestmentTxKind = 'buy' | 'sell' | 'dividend' | 'jcp' | 'fee' | 'split';

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  kind: InvestmentTxKind;
  quantity: number;
  price: number;
  total: number;
  date: string;
  notes?: string;
}

export interface InvestmentTxPayload {
  investmentId: string;
  kind: InvestmentTxKind;
  quantity: number;
  price: number;
  date: string;
  notes?: string;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'transactions']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function normalizeKind(raw: unknown): InvestmentTxKind {
  const s = String(raw || '').toLowerCase();
  if (s === 'sell' || s === 'venda') return 'sell';
  if (s === 'dividend' || s === 'dividendo') return 'dividend';
  if (s === 'jcp') return 'jcp';
  if (s === 'fee' || s === 'taxa') return 'fee';
  if (s === 'split' || s === 'desdobramento') return 'split';
  return 'buy';
}

function transformInvestmentTx(raw: Record<string, unknown>): InvestmentTransaction {
  const quantity = parseAmount(raw.quantity);
  const price = parseAmount(raw.price ?? raw.unitPrice);
  const total = raw.total != null ? parseAmount(raw.total) : quantity * price;
  return {
    id: String(raw.id || ''),
    investmentId: String(raw.investmentId || ''),
    kind: normalizeKind(raw.kind ?? raw.type),
    quantity,
    price,
    total,
    date: parseDate(raw.date ?? raw.transactionDate ?? ''),
    notes: (raw.notes as string) || undefined,
  };
}

export async function listInvestmentTransactions(investmentId?: string): Promise<InvestmentTransaction[]> {
  const qs = investmentId ? `?investmentId=${encodeURIComponent(investmentId)}` : '';
  try {
    const data = await apiGet<unknown>(`/api/investment-transactions${qs}`);
    return toArray<Record<string, unknown>>(data)
      .map(transformInvestmentTx)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}

export async function addInvestmentTransaction(payload: InvestmentTxPayload): Promise<InvestmentTransaction | null> {
  try {
    const raw = await apiPost<Record<string, unknown>>('/api/investment-transactions', payload);
    if (!raw || !raw.id) return null;
    return transformInvestmentTx(raw);
  } catch {
    return null;
  }
}

export async function updateInvestmentTransaction(id: string, payload: Partial<InvestmentTxPayload>): Promise<InvestmentTransaction | null> {
  try {
    const raw = await apiPatch<Record<string, unknown>>(`/api/investment-transactions/${id}`, payload);
    if (!raw || !raw.id) return null;
    return transformInvestmentTx(raw);
  } catch {
    return null;
  }
}

export async function removeInvestmentTransaction(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/investment-transactions/${id}`);
    return true;
  } catch {
    return false;
  }
}
