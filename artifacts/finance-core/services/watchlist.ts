import { apiGet, apiPost, apiDelete } from './api';

export interface WatchlistItem {
  id: string;
  ticker: string;
  name?: string;
  currentPrice?: number;
  changePercent?: number;
  changeAmount?: number;
  notes?: string;
  createdAt?: string;
}

export interface WatchlistPayload {
  ticker: string;
  notes?: string;
}

function transform(raw: any): WatchlistItem {
  return {
    id: String(raw?.id || ''),
    ticker: String(raw?.ticker || '').toUpperCase(),
    name: raw?.name || raw?.companyName || undefined,
    currentPrice: raw?.currentPrice != null ? Number(raw.currentPrice) : undefined,
    changePercent: raw?.changePercent != null ? Number(raw.changePercent) : undefined,
    changeAmount: raw?.changeAmount != null ? Number(raw.changeAmount) : undefined,
    notes: raw?.notes || undefined,
    createdAt: raw?.createdAt || undefined,
  };
}

export async function listWatchlist(): Promise<WatchlistItem[]> {
  try {
    const raw = await apiGet<any>('/api/watchlist');
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.watchlist) ? raw.watchlist : [];
    return arr.map(transform);
  } catch {
    return [];
  }
}

export async function addToWatchlist(payload: WatchlistPayload): Promise<WatchlistItem | null> {
  const raw = await apiPost<any>('/api/watchlist', payload);
  return raw?.id ? transform(raw) : null;
}

export async function removeFromWatchlist(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/watchlist/${id}`);
    return true;
  } catch {
    return false;
  }
}
