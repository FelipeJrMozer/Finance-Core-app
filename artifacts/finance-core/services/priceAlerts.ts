import { apiGet, apiPost, apiPut, apiDelete } from './api';

export type PriceAlertCondition = 'above' | 'below' | 'change_pct';
export type PriceAlertStatus = 'active' | 'triggered' | 'paused';

export interface PriceAlert {
  id: string;
  ticker: string;
  condition: PriceAlertCondition;
  targetValue: number;
  status: PriceAlertStatus;
  triggeredAt?: string | null;
  lastPrice?: number;
  notes?: string;
  createdAt?: string;
}

export interface PriceAlertPayload {
  ticker: string;
  condition: PriceAlertCondition;
  targetValue: number;
  notes?: string;
}

export interface PriceAlertCheckResult {
  checked: number;
  triggered: PriceAlert[];
  message?: string;
}

function normalizeCondition(raw: unknown): PriceAlertCondition {
  const s = String(raw || '').toLowerCase();
  if (s === 'above' || s === 'acima' || s === 'gt' || s === '>') return 'above';
  if (s === 'below' || s === 'abaixo' || s === 'lt' || s === '<') return 'below';
  if (s === 'change_pct' || s === 'change' || s === 'variation' || s === 'variacao') return 'change_pct';
  return 'above';
}

function normalizeStatus(raw: unknown): PriceAlertStatus {
  const s = String(raw || '').toLowerCase();
  if (s === 'triggered' || s === 'disparado') return 'triggered';
  if (s === 'paused' || s === 'pausado') return 'paused';
  return 'active';
}

function transform(raw: any): PriceAlert {
  return {
    id: String(raw?.id || ''),
    ticker: String(raw?.ticker || '').toUpperCase(),
    condition: normalizeCondition(raw?.condition),
    targetValue: Number(raw?.targetValue ?? raw?.value ?? 0),
    status: normalizeStatus(raw?.status),
    triggeredAt: raw?.triggeredAt || null,
    lastPrice: raw?.lastPrice != null ? Number(raw.lastPrice) : undefined,
    notes: raw?.notes || undefined,
    createdAt: raw?.createdAt || undefined,
  };
}

export async function listPriceAlerts(): Promise<PriceAlert[]> {
  try {
    const raw = await apiGet<any>('/api/price-alerts');
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.alerts) ? raw.alerts : [];
    return arr.map(transform);
  } catch {
    return [];
  }
}

export async function createPriceAlert(payload: PriceAlertPayload): Promise<PriceAlert | null> {
  const raw = await apiPost<any>('/api/price-alerts', payload);
  return raw?.id ? transform(raw) : null;
}

export async function updatePriceAlert(id: string, payload: Partial<PriceAlertPayload> & { status?: PriceAlertStatus }): Promise<PriceAlert | null> {
  try {
    const raw = await apiPut<any>(`/api/price-alerts/${id}`, payload);
    return raw?.id ? transform(raw) : null;
  } catch {
    return null;
  }
}

export async function deletePriceAlert(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/price-alerts/${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function checkPriceAlerts(): Promise<PriceAlertCheckResult> {
  try {
    const raw = await apiPost<any>('/api/price-alerts/check', {});
    const arr = Array.isArray(raw?.triggered) ? raw.triggered : [];
    return {
      checked: Number(raw?.checked ?? 0),
      triggered: arr.map(transform),
      message: raw?.message,
    };
  } catch (e: any) {
    return { checked: 0, triggered: [], message: e?.message };
  }
}

export function describeCondition(c: PriceAlertCondition, value: number): string {
  if (c === 'above') return `acima de R$ ${value.toFixed(2).replace('.', ',')}`;
  if (c === 'below') return `abaixo de R$ ${value.toFixed(2).replace('.', ',')}`;
  return `variação maior que ${value.toFixed(2)}%`;
}
