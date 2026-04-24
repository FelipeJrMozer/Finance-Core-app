import { apiGet, apiPost, apiPatch, apiDelete } from './api';
import { parseAmount, parseDate } from '@/utils/parse';

export type RecurringType = 'income' | 'expense';
export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly' | 'daily';

export interface Recurring {
  id: string;
  description: string;
  amount: number;
  type: RecurringType;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
  category?: string;
  categoryId?: string;
  accountId?: string;
  notes?: string;
}

export interface RecurringPayload {
  description: string;
  amount: number;
  type: RecurringType;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  accountId?: string;
  notes?: string;
  active?: boolean;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'recurring', 'recurrences']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function transformRecurring(raw: Record<string, unknown>): Recurring {
  const freqRaw = String(raw.frequency || raw.recurrenceType || 'monthly').toLowerCase();
  const frequency: RecurringFrequency =
    freqRaw === 'weekly' ? 'weekly'
    : freqRaw === 'yearly' || freqRaw === 'annual' ? 'yearly'
    : freqRaw === 'daily' ? 'daily'
    : 'monthly';
  return {
    id: String(raw.id || ''),
    description: String(raw.description || raw.name || ''),
    amount: parseAmount(raw.amount),
    type: (raw.type as RecurringType) || 'expense',
    frequency,
    dayOfMonth: raw.dayOfMonth != null ? Number(raw.dayOfMonth) : undefined,
    startDate: raw.startDate ? parseDate(raw.startDate as string) : undefined,
    endDate: raw.endDate ? parseDate(raw.endDate as string) : undefined,
    active: raw.active != null ? Boolean(raw.active) : true,
    category: (raw.category as string) || undefined,
    categoryId: (raw.categoryId as string) || undefined,
    accountId: (raw.accountId as string) || undefined,
    notes: (raw.notes as string) || undefined,
  };
}

export async function listRecurring(): Promise<Recurring[]> {
  try {
    const data = await apiGet<unknown>('/api/recurring');
    return toArray<Record<string, unknown>>(data).map(transformRecurring);
  } catch {
    return [];
  }
}

export async function createRecurring(payload: RecurringPayload, walletId?: string): Promise<Recurring | null> {
  try {
    const body: Record<string, unknown> = { ...payload };
    if (walletId) body.walletId = walletId;
    const raw = await apiPost<Record<string, unknown>>('/api/recurring', body);
    if (!raw || !raw.id) return null;
    return transformRecurring(raw);
  } catch {
    return null;
  }
}

export async function updateRecurring(id: string, payload: Partial<RecurringPayload>): Promise<Recurring | null> {
  try {
    const raw = await apiPatch<Record<string, unknown>>(`/api/recurring/${id}`, payload);
    if (!raw || !raw.id) return null;
    return transformRecurring(raw);
  } catch {
    return null;
  }
}

export async function setRecurringActive(id: string, active: boolean): Promise<boolean> {
  try {
    await apiPatch(`/api/recurring/${id}`, { active });
    return true;
  } catch {
    return false;
  }
}

export async function deleteRecurring(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/recurring/${id}`);
    return true;
  } catch {
    return false;
  }
}
