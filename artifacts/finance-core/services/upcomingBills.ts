import { apiGet } from './api';
import { parseAmount, parseDate } from '@/utils/parse';

export type UpcomingSource = 'bill' | 'invoice' | 'recurring';

export interface UpcomingBill {
  id: string;
  source: UpcomingSource;
  description: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
  category?: string;
  cardId?: string;
  cardName?: string;
}

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'upcoming', 'bills']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

function daysBetween(dateStr: string): number {
  if (!dateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function inferSource(raw: Record<string, unknown>): UpcomingSource {
  const s = String(raw.source || raw.type || '').toLowerCase();
  if (s.includes('invoice') || s.includes('card') || s.includes('fatura')) return 'invoice';
  if (s.includes('recurring') || s.includes('recorr')) return 'recurring';
  return 'bill';
}

function transformUpcoming(raw: Record<string, unknown>): UpcomingBill {
  const dueDate = parseDate(raw.dueDate ?? raw.due_at ?? raw.dueAt ?? '');
  const computedDays = raw.daysUntil != null ? Number(raw.daysUntil) : daysBetween(dueDate);
  return {
    id: String(raw.id || ''),
    source: inferSource(raw),
    description: String(raw.description || raw.name || raw.title || ''),
    amount: parseAmount(raw.amount ?? raw.totalAmount ?? raw.value),
    dueDate,
    daysUntil: computedDays,
    category: (raw.category as string) || (raw.categoryName as string) || undefined,
    cardId: (raw.cardId as string) || undefined,
    cardName: (raw.cardName as string) || undefined,
  };
}

export async function fetchUpcomingBills(days: number = 30): Promise<UpcomingBill[]> {
  try {
    const data = await apiGet<unknown>(`/api/upcoming-bills?days=${days}`);
    return toArray<Record<string, unknown>>(data)
      .map(transformUpcoming)
      .filter((b) => b.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  } catch {
    return [];
  }
}
