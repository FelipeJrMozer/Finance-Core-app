import { apiGet, apiPost } from '@/services/api';

export interface TransactionSplit {
  id?: string;
  transactionId?: string;
  categoryId?: string;
  category?: string;
  amount: number;
  percent?: number;
}

export async function getSplits(transactionId: string): Promise<TransactionSplit[]> {
  const data = await apiGet<TransactionSplit[] | { splits: TransactionSplit[] }>(
    `/api/transaction-splits/${encodeURIComponent(transactionId)}`
  );
  if (Array.isArray(data)) return data;
  return data?.splits || [];
}

export async function saveSplits(
  transactionId: string,
  splits: TransactionSplit[]
): Promise<{ ok: boolean }> {
  return apiPost('/api/transaction-splits', { transactionId, splits });
}

/**
 * Distribui um total entre N linhas, arredondando 2 casas. Sobra vai para a 1ª linha.
 */
export function distributeEqually(total: number, n: number): number[] {
  if (n <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const remainder = cents - base * n;
  const out: number[] = Array.from({ length: n }, (_, i) => (base + (i === 0 ? remainder : 0)) / 100);
  return out;
}

export function sumSplits(values: number[]): number {
  return Math.round(values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) * 100) / 100;
}

export function isSplitValid(total: number, splits: number[]): boolean {
  const diff = Math.abs(sumSplits(splits) - total);
  return diff <= 0.01;
}
