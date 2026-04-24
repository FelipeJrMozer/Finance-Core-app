import { apiGet, apiPost, apiPatch, apiDelete } from './api';

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

export interface DividendPayload {
  investmentId: string;
  type?: string;
  amount: number;
  quantity?: number;
  paymentDate: string;
  exDividendDate?: string | null;
  notes?: string | null;
  ticker?: string;
}

export interface UpcomingDividend {
  ticker: string;
  name?: string;
  type: string;
  amountPerShare: number;
  estimatedAmount: number;
  exDate: string;
  paymentDate: string;
  quantity: number;
}

export interface DividendDashboard {
  total12m: number;
  yieldYearly: number | null;
  yieldOnCost: number | null;
  totalLifetime: number;
  monthlyAverage12m: number | null;
  byMonth: { month: string; total: number }[];
  byType: { type: string; total: number; count: number }[];
  byTicker: { ticker: string; total: number; count: number }[];
  nextEstimated?: { ticker: string; amount: number; paymentDate: string };
  message?: string;
}

function transformDividend(raw: any): Dividend {
  return {
    id: String(raw?.id || ''),
    investmentId: String(raw?.investmentId || ''),
    type: String(raw?.type || 'dividend'),
    amount: Number(raw?.amount || 0),
    quantity: raw?.quantity != null ? Number(raw.quantity) : undefined,
    paymentDate: String(raw?.paymentDate || ''),
    exDividendDate: raw?.exDividendDate || null,
    notes: raw?.notes || null,
    ticker: raw?.ticker || undefined,
  };
}

export async function fetchDividends(from?: string, to?: string): Promise<Dividend[]> {
  const qs: string[] = [];
  if (from) qs.push(`from=${encodeURIComponent(from)}`);
  if (to) qs.push(`to=${encodeURIComponent(to)}`);
  const path = `/api/investments/dividends${qs.length ? '?' + qs.join('&') : ''}`;
  try {
    const raw = await apiGet<any[]>(path);
    if (!Array.isArray(raw)) return [];
    return raw.map(transformDividend);
  } catch {
    return [];
  }
}

export async function listDividends(from?: string, to?: string, portfolioId?: string): Promise<Dividend[]> {
  const qs: string[] = [];
  if (from) qs.push(`from=${encodeURIComponent(from)}`);
  if (to) qs.push(`to=${encodeURIComponent(to)}`);
  if (portfolioId) qs.push(`portfolioId=${encodeURIComponent(portfolioId)}`);
  const path = `/api/dividends${qs.length ? '?' + qs.join('&') : ''}`;
  try {
    const raw = await apiGet<any>(path);
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.dividends) ? raw.dividends : [];
    return arr.map(transformDividend);
  } catch {
    return [];
  }
}

export async function createDividend(payload: DividendPayload): Promise<Dividend> {
  const raw = await apiPost<any>('/api/dividends', payload);
  if (!raw?.id) throw new Error('Resposta inválida do servidor.');
  return transformDividend(raw);
}

export async function updateDividend(id: string, payload: Partial<DividendPayload>): Promise<Dividend> {
  const raw = await apiPatch<any>(`/api/dividends/${id}`, payload);
  if (!raw?.id) throw new Error('Resposta inválida do servidor.');
  return transformDividend(raw);
}

export async function deleteDividend(id: string): Promise<void> {
  await apiDelete(`/api/dividends/${id}`);
}

export async function fetchUpcomingDividends(days: number = 90, portfolioId?: string): Promise<UpcomingDividend[]> {
  try {
    const qs: string[] = [`days=${days}`];
    if (portfolioId) qs.push(`portfolioId=${encodeURIComponent(portfolioId)}`);
    const raw = await apiGet<any>(`/api/dividend-calendar/upcoming?${qs.join('&')}`);
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.upcoming) ? raw.upcoming : [];
    return arr.map((d: any) => ({
      ticker: String(d.ticker || ''),
      name: d.name || undefined,
      type: String(d.type || 'dividend'),
      amountPerShare: Number(d.amountPerShare || d.value || 0),
      estimatedAmount: Number(d.estimatedAmount || d.amount || 0),
      exDate: String(d.exDate || d.exDividendDate || ''),
      paymentDate: String(d.paymentDate || ''),
      quantity: Number(d.quantity || 0),
    }));
  } catch {
    return [];
  }
}

export async function fetchDividendDashboard(portfolioId?: string): Promise<DividendDashboard> {
  try {
    const path = portfolioId
      ? `/api/dividend-calendar/dashboard?portfolioId=${encodeURIComponent(portfolioId)}`
      : '/api/dividend-calendar/dashboard';
    const raw = await apiGet<any>(path);
    return {
      total12m: Number(raw?.total12m || 0),
      yieldYearly: raw?.yieldYearly != null ? Number(raw.yieldYearly) : null,
      yieldOnCost: raw?.yieldOnCost != null ? Number(raw.yieldOnCost) : null,
      totalLifetime: Number(raw?.totalLifetime || 0),
      monthlyAverage12m: raw?.monthlyAverage12m != null ? Number(raw.monthlyAverage12m) : null,
      byMonth: Array.isArray(raw?.byMonth)
        ? raw.byMonth.map((m: any) => ({ month: String(m.month || ''), total: Number(m.total || 0) }))
        : [],
      byType: Array.isArray(raw?.byType)
        ? raw.byType.map((t: any) => ({ type: String(t.type || ''), total: Number(t.total || 0), count: Number(t.count || 0) }))
        : [],
      byTicker: Array.isArray(raw?.byTicker)
        ? raw.byTicker.map((t: any) => ({ ticker: String(t.ticker || ''), total: Number(t.total || 0), count: Number(t.count || 0) }))
        : [],
      nextEstimated: raw?.nextEstimated
        ? {
            ticker: String(raw.nextEstimated.ticker || ''),
            amount: Number(raw.nextEstimated.amount || 0),
            paymentDate: String(raw.nextEstimated.paymentDate || ''),
          }
        : undefined,
    };
  } catch (e: any) {
    return {
      total12m: 0,
      yieldYearly: null,
      yieldOnCost: null,
      totalLifetime: 0,
      monthlyAverage12m: null,
      byMonth: [],
      byType: [],
      byTicker: [],
      message: e?.message,
    };
  }
}
