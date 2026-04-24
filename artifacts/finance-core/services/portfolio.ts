import { apiGet, apiPost } from './api';

export interface PortfolioReturns {
  twr: number | null;
  twrAnnualized: number | null;
  mwr: number | null;
  insufficientData: boolean;
  availablePoints: number;
  requiredPoints: number;
  message?: string;
}

export interface RiskAnalysis {
  volatility: number | null;
  volatilityAnnualized: number | null;
  sharpe: number | null;
  alpha: number | null;
  beta: number | null;
  rSquared: number | null;
  observations: number;
  message?: string;
}

export interface DrawdownPoint {
  date: string;
  value: number;
  drawdown: number;
}

export interface DrawdownAnalysis {
  maxDrawdown: number | null;
  peakDate: string | null;
  troughDate: string | null;
  recoveryDate: string | null;
  durationDays: number | null;
  series: DrawdownPoint[];
  message?: string;
}

export interface SortinoAnalysis {
  sortino: number | null;
  downsideDeviation: number | null;
  message?: string;
}

export interface BetaAnalysis {
  beta: number | null;
  benchmark: string;
  observations: number;
  message?: string;
}

export interface BenchmarkPoint {
  date: string;
  portfolio: number;
  cdi?: number;
  ibov?: number;
  ipca?: number;
}

export interface BenchmarkingResult {
  period: string;
  portfolioReturn: number | null;
  cdiReturn: number | null;
  ibovReturn: number | null;
  ipcaReturn: number | null;
  series: BenchmarkPoint[];
  message?: string;
}

export interface RebalanceSuggestion {
  type: string;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  delta: number;
  action: 'buy' | 'sell' | 'hold';
}

export interface RebalanceResult {
  totalValue: number;
  suggestions: RebalanceSuggestion[];
  message?: string;
}

export interface SuggestedAllocation {
  profile: 'conservador' | 'moderado' | 'agressivo';
  allocations: { type: string; targetPercent: number; description?: string }[];
}

export interface SectorAllocation {
  sector: string;
  value: number;
  percent: number;
  count: number;
}

export interface SectorAnalysis {
  sectors: SectorAllocation[];
  hhi: number | null;
  concentrationLevel?: 'baixa' | 'moderada' | 'alta';
  message?: string;
}

export interface CorrelationCell {
  ticker: string;
  values: { ticker: string; correlation: number }[];
}

export interface CorrelationMatrix {
  tickers: string[];
  matrix: CorrelationCell[];
  message?: string;
}

export interface OptimizerPoint {
  expectedReturn: number;
  volatility: number;
  weights: { ticker: string; weight: number }[];
}

export interface OptimizerResult {
  efficientFrontier: OptimizerPoint[];
  optimalSharpe?: OptimizerPoint;
  minVariance?: OptimizerPoint;
  message?: string;
}

export interface XirrResult {
  xirr: number | null;
  iterations: number;
  converged: boolean;
  message?: string;
}

function qs(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? '?' + parts.join('&') : '';
}

async function fetchSafe<T = any>(path: string): Promise<T | null> {
  try { return await apiGet<T>(path); } catch { return null; }
}

export async function fetchPortfolioReturns(from?: string, to?: string, portfolioId?: string): Promise<PortfolioReturns> {
  const suffix = qs({ from, to, portfolioId });
  const [twrData, mwrData] = await Promise.all([
    fetchSafe<any>(`/api/portfolio/twr${suffix}`),
    fetchSafe<any>(`/api/portfolio/mwr${suffix}`),
  ]);
  const insufficient =
    !!twrData?.insufficientData ||
    !!mwrData?.insufficientData ||
    twrData == null || mwrData == null ||
    (twrData?.twr == null && mwrData?.mwr == null);

  return {
    twr: twrData?.twr != null ? Number(twrData.twr) : null,
    twrAnnualized: twrData?.twrAnnualized != null ? Number(twrData.twrAnnualized) : null,
    mwr: mwrData?.mwr != null ? Number(mwrData.mwr) : null,
    insufficientData: insufficient,
    availablePoints: Number(twrData?.availablePoints ?? mwrData?.availablePoints ?? 0),
    requiredPoints: Number(twrData?.requiredPoints ?? mwrData?.requiredPoints ?? 60),
    message: twrData?.message || mwrData?.message,
  };
}

export async function fetchRiskAnalysis(portfolioId?: string): Promise<RiskAnalysis> {
  const data = await fetchSafe<any>(`/api/portfolio/risk-analysis${qs({ portfolioId })}`);
  return {
    volatility: data?.volatility != null ? Number(data.volatility) : null,
    volatilityAnnualized: data?.volatilityAnnualized != null ? Number(data.volatilityAnnualized) : null,
    sharpe: data?.sharpe != null ? Number(data.sharpe) : null,
    alpha: data?.alpha != null ? Number(data.alpha) : null,
    beta: data?.beta != null ? Number(data.beta) : null,
    rSquared: data?.rSquared != null ? Number(data.rSquared) : null,
    observations: Number(data?.observations ?? 0),
    message: data?.message,
  };
}

export async function fetchDrawdown(portfolioId?: string): Promise<DrawdownAnalysis> {
  const data = await fetchSafe<any>(`/api/portfolio/drawdown${qs({ portfolioId })}`);
  const series = Array.isArray(data?.series) ? data.series.map((p: any) => ({
    date: String(p.date || ''),
    value: Number(p.value || 0),
    drawdown: Number(p.drawdown || 0),
  })) : [];
  return {
    maxDrawdown: data?.maxDrawdown != null ? Number(data.maxDrawdown) : null,
    peakDate: data?.peakDate || null,
    troughDate: data?.troughDate || null,
    recoveryDate: data?.recoveryDate || null,
    durationDays: data?.durationDays != null ? Number(data.durationDays) : null,
    series,
    message: data?.message,
  };
}

export async function fetchSortino(portfolioId?: string): Promise<SortinoAnalysis> {
  const data = await fetchSafe<any>(`/api/portfolio/sortino${qs({ portfolioId })}`);
  return {
    sortino: data?.sortino != null ? Number(data.sortino) : null,
    downsideDeviation: data?.downsideDeviation != null ? Number(data.downsideDeviation) : null,
    message: data?.message,
  };
}

export async function fetchBeta(portfolioId?: string): Promise<BetaAnalysis> {
  const data = await fetchSafe<any>(`/api/portfolio/beta${qs({ portfolioId })}`);
  return {
    beta: data?.beta != null ? Number(data.beta) : null,
    benchmark: String(data?.benchmark || 'IBOV'),
    observations: Number(data?.observations ?? 0),
    message: data?.message,
  };
}

export async function fetchBenchmarking(period: string = '1y', portfolioId?: string): Promise<BenchmarkingResult> {
  const data = await fetchSafe<any>(`/api/portfolio/benchmarking${qs({ period, portfolioId })}`);
  const series = Array.isArray(data?.series) ? data.series.map((p: any) => ({
    date: String(p.date || ''),
    portfolio: Number(p.portfolio || 0),
    cdi: p.cdi != null ? Number(p.cdi) : undefined,
    ibov: p.ibov != null ? Number(p.ibov) : undefined,
    ipca: p.ipca != null ? Number(p.ipca) : undefined,
  })) : [];
  return {
    period: String(data?.period || period),
    portfolioReturn: data?.portfolioReturn != null ? Number(data.portfolioReturn) : null,
    cdiReturn: data?.cdiReturn != null ? Number(data.cdiReturn) : null,
    ibovReturn: data?.ibovReturn != null ? Number(data.ibovReturn) : null,
    ipcaReturn: data?.ipcaReturn != null ? Number(data.ipcaReturn) : null,
    series,
    message: data?.message,
  };
}

export async function fetchRebalance(portfolioId?: string, profile?: 'conservador' | 'moderado' | 'agressivo'): Promise<RebalanceResult> {
  try {
    const data = await apiPost<any>(`/api/portfolio/rebalance`, { portfolioId, profile });
    const suggestions = Array.isArray(data?.suggestions) ? data.suggestions.map((s: any) => ({
      type: String(s.type || ''),
      currentValue: Number(s.currentValue || 0),
      currentPercent: Number(s.currentPercent || 0),
      targetPercent: Number(s.targetPercent || 0),
      delta: Number(s.delta || 0),
      action: (s.action === 'buy' || s.action === 'sell') ? s.action : 'hold' as const,
    })) : [];
    return {
      totalValue: Number(data?.totalValue || 0),
      suggestions,
      message: data?.message,
    };
  } catch (e: any) {
    return { totalValue: 0, suggestions: [], message: e?.message };
  }
}

export async function fetchSuggestedAllocations(): Promise<SuggestedAllocation[]> {
  const data = await fetchSafe<any>(`/api/portfolio/suggested-allocations`);
  if (!Array.isArray(data)) return [];
  return data.map((p: any) => ({
    profile: (p.profile === 'conservador' || p.profile === 'moderado' || p.profile === 'agressivo')
      ? p.profile
      : 'moderado' as const,
    allocations: Array.isArray(p.allocations) ? p.allocations.map((a: any) => ({
      type: String(a.type || ''),
      targetPercent: Number(a.targetPercent || 0),
      description: a.description,
    })) : [],
  }));
}

export async function fetchSectorAnalysis(portfolioId?: string): Promise<SectorAnalysis> {
  const data = await fetchSafe<any>(`/api/portfolio/sector-analysis${qs({ portfolioId })}`);
  const sectors = Array.isArray(data?.sectors) ? data.sectors.map((s: any) => ({
    sector: String(s.sector || 'Outros'),
    value: Number(s.value || 0),
    percent: Number(s.percent || 0),
    count: Number(s.count || 0),
  })) : [];
  return {
    sectors,
    hhi: data?.hhi != null ? Number(data.hhi) : null,
    concentrationLevel: data?.concentrationLevel,
    message: data?.message,
  };
}

export async function fetchCorrelation(portfolioId?: string): Promise<CorrelationMatrix> {
  const data = await fetchSafe<any>(`/api/portfolio/correlation-analysis${qs({ portfolioId })}`);
  const tickers = Array.isArray(data?.tickers) ? data.tickers.map((t: any) => String(t)) : [];
  const matrix = Array.isArray(data?.matrix) ? data.matrix.map((row: any) => ({
    ticker: String(row.ticker || ''),
    values: Array.isArray(row.values) ? row.values.map((v: any) => ({
      ticker: String(v.ticker || ''),
      correlation: Number(v.correlation || 0),
    })) : [],
  })) : [];
  return { tickers, matrix, message: data?.message };
}

export async function fetchOptimizer(portfolioId?: string): Promise<OptimizerResult> {
  const data = await fetchSafe<any>(`/api/portfolio/optimizer${qs({ portfolioId })}`);
  const points = (raw: any): OptimizerPoint => ({
    expectedReturn: Number(raw?.expectedReturn || 0),
    volatility: Number(raw?.volatility || 0),
    weights: Array.isArray(raw?.weights) ? raw.weights.map((w: any) => ({
      ticker: String(w.ticker || ''),
      weight: Number(w.weight || 0),
    })) : [],
  });
  const frontier = Array.isArray(data?.efficientFrontier) ? data.efficientFrontier.map(points) : [];
  return {
    efficientFrontier: frontier,
    optimalSharpe: data?.optimalSharpe ? points(data.optimalSharpe) : undefined,
    minVariance: data?.minVariance ? points(data.minVariance) : undefined,
    message: data?.message,
  };
}

export async function fetchXirr(from?: string, to?: string, portfolioId?: string): Promise<XirrResult> {
  const data = await fetchSafe<any>(`/api/investments/analytics/xirr${qs({ from, to, portfolioId })}`);
  return {
    xirr: data?.xirr != null ? Number(data.xirr) : null,
    iterations: Number(data?.iterations ?? 0),
    converged: !!data?.converged,
    message: data?.message,
  };
}
