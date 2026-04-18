import { apiGet } from './api';

export interface Dividend {
  id: string;
  investmentId: string;
  type: string;
  amount: number;
  quantity?: number;
  paymentDate: string;
  exDividendDate?: string | null;
  notes?: string | null;
  ticker?: string;
}

export async function fetchDividends(from?: string, to?: string): Promise<Dividend[]> {
  const qs: string[] = [];
  if (from) qs.push(`from=${encodeURIComponent(from)}`);
  if (to) qs.push(`to=${encodeURIComponent(to)}`);
  const path = `/api/investments/dividends${qs.length ? '?' + qs.join('&') : ''}`;
  try {
    const raw = await apiGet<any[]>(path);
    if (!Array.isArray(raw)) return [];
    return raw.map((d) => ({
      id: String(d.id),
      investmentId: String(d.investmentId || ''),
      type: String(d.type || 'dividend'),
      amount: Number(d.amount || 0),
      quantity: d.quantity != null ? Number(d.quantity) : undefined,
      paymentDate: String(d.paymentDate || ''),
      exDividendDate: d.exDividendDate || null,
      notes: d.notes || null,
      ticker: d.ticker || undefined,
    }));
  } catch {
    return [];
  }
}
