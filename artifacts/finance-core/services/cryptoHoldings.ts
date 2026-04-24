import { apiGet, apiPost, apiPatch, apiDelete } from './api';

export interface CryptoHolding {
  id: string;
  symbol: string;
  name?: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  exchange?: string;
  notes?: string;
  change24h?: number | null;
  totalInvested: number;
  totalCurrent: number;
  profit: number;
  profitPercent: number;
}

export interface CryptoHoldingPayload {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice?: number;
  exchange?: string;
  notes?: string;
}

function transform(raw: any): CryptoHolding {
  const quantity = Number(raw?.quantity || 0);
  const averagePrice = Number(raw?.averagePrice ?? raw?.avgPrice ?? 0);
  const currentPrice = Number(raw?.currentPrice ?? averagePrice);
  const totalInvested = quantity * averagePrice;
  const totalCurrent = quantity * currentPrice;
  const profit = totalCurrent - totalInvested;
  const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
  return {
    id: String(raw?.id || ''),
    symbol: String(raw?.symbol || '').toUpperCase(),
    name: raw?.name || undefined,
    quantity,
    averagePrice,
    currentPrice,
    exchange: raw?.exchange || undefined,
    notes: raw?.notes || undefined,
    change24h: raw?.change24h != null ? Number(raw.change24h) : null,
    totalInvested,
    totalCurrent,
    profit,
    profitPercent,
  };
}

export async function listCryptoHoldings(portfolioId?: string): Promise<CryptoHolding[]> {
  try {
    const path = portfolioId
      ? `/api/crypto-holdings?portfolioId=${encodeURIComponent(portfolioId)}`
      : '/api/crypto-holdings';
    const raw = await apiGet<any>(path);
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.holdings) ? raw.holdings : [];
    return arr.map(transform);
  } catch {
    return [];
  }
}

export async function createCryptoHolding(payload: CryptoHoldingPayload & { portfolioId?: string }): Promise<CryptoHolding | null> {
  const raw = await apiPost<any>('/api/crypto-holdings', payload);
  return raw?.id ? transform(raw) : null;
}

export async function updateCryptoHolding(id: string, payload: Partial<CryptoHoldingPayload>): Promise<CryptoHolding | null> {
  try {
    const raw = await apiPatch<any>(`/api/crypto-holdings/${id}`, payload);
    return raw?.id ? transform(raw) : null;
  } catch {
    return null;
  }
}

export async function deleteCryptoHolding(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/crypto-holdings/${id}`);
    return true;
  } catch {
    return false;
  }
}
