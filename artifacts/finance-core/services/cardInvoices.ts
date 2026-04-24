import { apiGet, apiPost } from './api';
import { parseAmount, parseDate } from '@/utils/parse';

export interface CardInvoice {
  id: string;
  cardId: string;
  month: string;
  totalAmount: number;
  paidAmount: number;
  status: 'open' | 'closed' | 'paid' | 'partial' | 'overdue';
  closingDate: string;
  dueDate: string;
  installmentsAvailable?: boolean;
}

export interface CardInvoiceTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  installmentNumber?: number;
  totalInstallments?: number;
  isPaid?: boolean;
}

export interface CardInvoiceDetails extends CardInvoice {
  transactions: CardInvoiceTransaction[];
  remainingAmount: number;
}

function transformInvoice(raw: Record<string, unknown>): CardInvoice {
  const totalAmount = parseAmount(raw.totalAmount ?? raw.total ?? raw.amount);
  const paidAmount = parseAmount(raw.paidAmount ?? raw.paid ?? 0);
  const statusRaw = String(raw.status || '').toLowerCase();
  const status: CardInvoice['status'] =
    statusRaw === 'paid' ? 'paid'
    : statusRaw === 'partial' ? 'partial'
    : statusRaw === 'overdue' ? 'overdue'
    : statusRaw === 'closed' ? 'closed'
    : 'open';
  return {
    id: String(raw.id || ''),
    cardId: String(raw.cardId || raw.creditCardId || ''),
    month: String(raw.month || raw.invoiceMonth || ''),
    totalAmount,
    paidAmount,
    status,
    closingDate: parseDate(raw.closingDate ?? raw.closeDate ?? ''),
    dueDate: parseDate(raw.dueDate ?? ''),
    installmentsAvailable: Boolean(raw.installmentsAvailable),
  };
}

function transformInvoiceTx(raw: Record<string, unknown>): CardInvoiceTransaction {
  return {
    id: String(raw.id || ''),
    description: String(raw.description || ''),
    amount: Math.abs(parseAmount(raw.amount)),
    date: parseDate(raw.date ?? raw.transactionDate ?? ''),
    category: (raw.category as string) || (raw.categoryName as string) || null,
    installmentNumber: raw.installmentNumber != null ? Number(raw.installmentNumber) : undefined,
    totalInstallments: raw.totalInstallments != null ? Number(raw.totalInstallments) : undefined,
    isPaid: raw.isPaid as boolean | undefined,
  };
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'invoices', 'transactions']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export async function listInvoices(cardId?: string, month?: string): Promise<CardInvoice[]> {
  const params: string[] = [];
  if (cardId) params.push(`cardId=${encodeURIComponent(cardId)}`);
  if (month) params.push(`month=${encodeURIComponent(month)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  try {
    const data = await apiGet<unknown>(`/api/card-invoices${qs}`);
    return toArray<Record<string, unknown>>(data).map(transformInvoice);
  } catch {
    return [];
  }
}

export async function getInvoice(id: string): Promise<CardInvoice | null> {
  try {
    const data = await apiGet<Record<string, unknown>>(`/api/card-invoices/${id}`);
    if (!data || !data.id) return null;
    return transformInvoice(data);
  } catch {
    return null;
  }
}

export async function getInvoiceDetails(id: string): Promise<CardInvoiceDetails | null> {
  try {
    const data = await apiGet<Record<string, unknown>>(`/api/card-invoices/${id}/details`);
    if (!data) return null;
    const base = transformInvoice(data);
    const txs = toArray<Record<string, unknown>>(data.transactions ?? data.items ?? []).map(transformInvoiceTx);
    const remaining = Math.max(0, base.totalAmount - base.paidAmount);
    return { ...base, transactions: txs, remainingAmount: remaining };
  } catch {
    return null;
  }
}

export async function payInvoice(id: string, accountId: string, amount: number): Promise<boolean> {
  try {
    await apiPost(`/api/card-invoices/${id}/pay`, { accountId, amount });
    return true;
  } catch {
    return false;
  }
}

export async function earlyPayment(id: string, amount: number, accountId?: string): Promise<boolean> {
  try {
    await apiPost(`/api/card-invoices/${id}/early-payment`, { amount, accountId });
    return true;
  } catch {
    return false;
  }
}

export async function installInvoice(id: string, installments: number, fee?: number): Promise<boolean> {
  try {
    await apiPost(`/api/card-invoices/${id}/install`, { installments, fee: fee ?? 0 });
    return true;
  } catch {
    return false;
  }
}
