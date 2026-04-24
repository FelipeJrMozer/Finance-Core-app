import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { parseAmount, parseDate } from '@/utils/parse';

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  category?: string;
  isRecurring?: boolean;
  recurrence?: string;
  paidAt?: string;
  notes?: string;
  accountId?: string;
}

export interface BillCreatePayload {
  description: string;
  amount: number;
  dueDate: string;
  category?: string;
  isRecurring?: boolean;
  notes?: string;
}

export interface BillUpdatePayload extends Partial<BillCreatePayload> {
  isPaid?: boolean;
}

export interface BillPayPayload {
  accountId: string;
  paidDate?: string;
  amount?: number;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'bills']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function transformBill(raw: Record<string, unknown>): Bill {
  return {
    id: String(raw.id || ''),
    description: String(raw.description || raw.name || ''),
    amount: parseAmount(raw.amount),
    dueDate: parseDate(raw.dueDate ?? raw.due_at ?? ''),
    isPaid: Boolean(raw.isPaid ?? raw.paid),
    category: (raw.category as string) || undefined,
    isRecurring: Boolean(raw.isRecurring),
    recurrence: (raw.recurrence as string) || undefined,
    paidAt: raw.paidAt ? parseDate(raw.paidAt as string) : undefined,
    notes: (raw.notes as string) || undefined,
    accountId: (raw.accountId as string) || undefined,
  };
}

function buildQS(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`).join('&');
}

export async function listBills(opts: { walletId?: string; days?: number } = {}): Promise<Bill[]> {
  const qs = buildQS({
    walletId: opts.walletId,
    days: opts.days != null ? String(opts.days) : undefined,
  });
  try {
    const data = await apiGet<unknown>(`/api/bills${qs}`);
    return toArray<Record<string, unknown>>(data).map(transformBill);
  } catch {
    return [];
  }
}

export async function createBill(payload: BillCreatePayload, walletId?: string): Promise<Bill | null> {
  try {
    const body: Record<string, unknown> = { ...payload };
    if (walletId) body.walletId = walletId;
    const raw = await apiPost<Record<string, unknown>>('/api/bills', body);
    if (!raw || !raw.id) return null;
    return transformBill(raw);
  } catch {
    return null;
  }
}

export async function updateBill(id: string, payload: BillUpdatePayload): Promise<Bill | null> {
  try {
    const raw = await apiPatch<Record<string, unknown>>(`/api/bills/${id}`, payload);
    if (!raw || !raw.id) return null;
    return transformBill(raw);
  } catch {
    return null;
  }
}

export async function payBill(id: string, payload: BillPayPayload): Promise<boolean> {
  try {
    await apiPatch(`/api/bills/${id}/pay`, {
      accountId: payload.accountId,
      paidDate: payload.paidDate || new Date().toISOString().split('T')[0],
      amount: payload.amount,
    });
    return true;
  } catch {
    return false;
  }
}

export async function deleteBill(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/bills/${id}`);
    return true;
  } catch {
    return false;
  }
}
