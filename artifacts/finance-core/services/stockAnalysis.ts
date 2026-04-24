import { apiGet } from './api';

export interface FundamentalAnalysis {
  ticker: string;
  name?: string;
  sector?: string;
  segment?: string;
  price?: number;
  changePercent?: number;
  pl: number | null;
  pvp: number | null;
  roe: number | null;
  roic: number | null;
  dividendYield: number | null;
  netMargin: number | null;
  cagr5y: number | null;
  beta: number | null;
  marketCap: number | null;
  ebitda: number | null;
  liquidity: number | null;
  payout: number | null;
  debtToEquity: number | null;
  message?: string;
}

export interface FundamentalRankingItem {
  ticker: string;
  name?: string;
  value: number;
}

export interface ScorecardCategory {
  name: string;
  score: number;
  weight: number;
  details?: string;
}

export interface StockScorecard {
  ticker: string;
  score: number;
  rating?: string;
  categories: ScorecardCategory[];
  recommendation?: string;
  updatedAt?: string;
  message?: string;
}

export interface ScorecardRankingItem {
  ticker: string;
  name?: string;
  score: number;
  rating?: string;
}

export async function fetchFundamentalAnalysis(ticker: string): Promise<FundamentalAnalysis> {
  try {
    const raw = await apiGet<any>(`/api/fundamental-analysis/${encodeURIComponent(ticker)}`);
    return {
      ticker: String(raw?.ticker || ticker).toUpperCase(),
      name: raw?.name || undefined,
      sector: raw?.sector || undefined,
      segment: raw?.segment || undefined,
      price: raw?.price != null ? Number(raw.price) : undefined,
      changePercent: raw?.changePercent != null ? Number(raw.changePercent) : undefined,
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
      payout: raw?.payout != null ? Number(raw.payout) : null,
      debtToEquity: raw?.debtToEquity != null ? Number(raw.debtToEquity) : null,
    };
  } catch (e: any) {
    return {
      ticker: ticker.toUpperCase(),
      pl: null, pvp: null, roe: null, roic: null,
      dividendYield: null, netMargin: null, cagr5y: null, beta: null,
      marketCap: null, ebitda: null, liquidity: null, payout: null, debtToEquity: null,
      message: e?.message,
    };
  }
}

export async function fetchFundamentalRanking(indicator: string, limit = 20): Promise<FundamentalRankingItem[]> {
  try {
    const raw = await apiGet<any>(`/api/fundamental-analysis/ranking/${encodeURIComponent(indicator)}?limit=${limit}`);
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.ranking) ? raw.ranking : [];
    return arr.map((r: any) => ({
      ticker: String(r.ticker || '').toUpperCase(),
      name: r.name || undefined,
      value: Number(r.value || 0),
    }));
  } catch {
    return [];
  }
}

export async function fetchStockScorecard(ticker: string): Promise<StockScorecard> {
  try {
    const raw = await apiGet<any>(`/api/stock-scorecard/${encodeURIComponent(ticker)}`);
    return {
      ticker: String(raw?.ticker || ticker).toUpperCase(),
      score: Number(raw?.score || 0),
      rating: raw?.rating || undefined,
      categories: Array.isArray(raw?.categories) ? raw.categories.map((c: any) => ({
        name: String(c.name || ''),
        score: Number(c.score || 0),
        weight: Number(c.weight || 0),
        details: c.details || undefined,
      })) : [],
      recommendation: raw?.recommendation || undefined,
      updatedAt: raw?.updatedAt || undefined,
    };
  } catch (e: any) {
    return {
      ticker: ticker.toUpperCase(),
      score: 0,
      categories: [],
      message: e?.message,
    };
  }
}

export async function fetchScorecardTopRanking(limit = 20): Promise<ScorecardRankingItem[]> {
  try {
    const raw = await apiGet<any>(`/api/stock-scorecard/ranking/top?limit=${limit}`);
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.ranking) ? raw.ranking : [];
    return arr.map((r: any) => ({
      ticker: String(r.ticker || '').toUpperCase(),
      name: r.name || undefined,
      score: Number(r.score || 0),
      rating: r.rating || undefined,
    }));
  } catch {
    return [];
  }
}
