import { apiGet, apiPost } from './api';

export interface AvailableTicker {
  ticker: string;
  name?: string;
  sector?: string;
  type?: string;
}

export interface StockMetrics {
  ticker: string;
  name?: string;
  sector?: string;
  price?: number;
  pl?: number | null;
  pvp?: number | null;
  roe?: number | null;
  roic?: number | null;
  dividendYield?: number | null;
  netMargin?: number | null;
  cagr5y?: number | null;
  beta?: number | null;
  marketCap?: number | null;
  ebitda?: number | null;
  liquidity?: number | null;
}

export interface ComparisonResult {
  tickers: string[];
  metrics: StockMetrics[];
  message?: string;
}

export async function listAvailableTickers(): Promise<AvailableTicker[]> {
  try {
    const raw = await apiGet<any>('/api/stock-comparator/available');
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.tickers) ? raw.tickers : [];
    return arr.map((t: any) => ({
      ticker: String(t.ticker || t).toUpperCase(),
      name: t.name || undefined,
      sector: t.sector || undefined,
      type: t.type || undefined,
    }));
  } catch {
    return [];
  }
}

function transformMetrics(raw: any): StockMetrics {
  return {
    ticker: String(raw?.ticker || '').toUpperCase(),
    name: raw?.name || undefined,
    sector: raw?.sector || undefined,
    price: raw?.price != null ? Number(raw.price) : undefined,
    pl: raw?.pl != null ? Number(raw.pl) : null,
    pvp: raw?.pvp != null ? Number(raw.pvp) : null,
    roe: raw?.roe != null ? Number(raw.roe) : null,
    roic: raw?.roic != null ? Number(raw.roic) : null,
    dividendYield: raw?.dividendYield != null ? Number(raw.dividendYield) : null,
    netMargin: raw?.netMargin != null ? Number(raw.netMargin) : null,
    cagr5y: raw?.cagr5y != null ? Number(raw.cagr5y) : null,
    beta: raw?.beta != null ? Number(raw.beta) : null,
    marketCap: raw?.marketCap != null ? Number(raw.marketCap) : null,
    ebitda: raw?.ebitda != null ? Number(raw.ebitda) : null,
    liquidity: raw?.liquidity != null ? Number(raw.liquidity) : null,
  };
}

export async function compareTickers(tickers: string[]): Promise<ComparisonResult> {
  try {
    const raw = await apiPost<any>('/api/stock-comparator/compare', { tickers });
    const arr = Array.isArray(raw?.metrics) ? raw.metrics : Array.isArray(raw?.results) ? raw.results : Array.isArray(raw) ? raw : [];
    return {
      tickers: tickers.map((t) => t.toUpperCase()),
      metrics: arr.map(transformMetrics),
      message: raw?.message,
    };
  } catch (e: any) {
    return { tickers, metrics: [], message: e?.message };
  }
}
