import { apiGet } from '@/services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DreCategoryRow {
  categoryId?: string;
  category: string;
  type: 'income' | 'expense';
  parentId?: string | null;
  values: Record<string, number>; // month YYYY-MM => total
}

export interface DreReport {
  months: string[]; // ['2025-01', ...]
  rows: DreCategoryRow[];
  totals: {
    income: Record<string, number>;
    expense: Record<string, number>;
    result: Record<string, number>;
  };
}

export interface CashFlowPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
  cumulative?: number;
}

export interface CashFlowProjectionPoint {
  date: string;
  projected: number;
  upper?: number;
  lower?: number;
  type?: 'historical' | 'projected';
}

export interface CashFlowProjection {
  base: number;
  series: CashFlowProjectionPoint[];
  endOfMonth?: number;
  in30?: number;
  in60?: number;
  in90?: number;
  confidence?: number;
}

export interface MonthlyComparisonRow {
  month: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  topCategories?: { category: string; amount: number }[];
}

export interface MonthlyComparisonResponse {
  rows: MonthlyComparisonRow[];
  current?: MonthlyComparisonRow;
  previousMonth?: MonthlyComparisonRow;
  previousYear?: MonthlyComparisonRow;
  momIncomePct?: number;
  momExpensePct?: number;
  yoyIncomePct?: number;
  yoyExpensePct?: number;
}

export interface FinancialCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'dividend' | 'tax' | 'invoice';
  source?: string;
  category?: string;
}

export interface UpcomingEvent extends FinancialCalendarEvent {
  daysUntil: number;
}

export interface SpendingPatternCategory {
  category: string;
  categoryId?: string;
  averageAmount: number;
  currentAmount: number;
  changePct: number;
  isAnomaly?: boolean;
  zScore?: number;
}

export interface SpendingPatternsResponse {
  categories: SpendingPatternCategory[];
  topCategories?: { category: string; amount: number; color?: string }[];
  totalExpense?: number;
}

export interface ExpenseForecast {
  forecast: number;
  upper?: number;
  lower?: number;
  confidence?: number;
  basedOnMonths?: number;
}

export interface MarketComparison {
  portfolioReturn: number;
  ibov?: number;
  cdi?: number;
  ifix?: number;
  sp500?: number;
  period?: string;
}

export interface HealthDashboard {
  score: number;
  category?: string;
  savingsRate?: number;
  emergencyMonths?: number;
  debtRatio?: number;
  investmentRatio?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calls
// ─────────────────────────────────────────────────────────────────────────────

export async function getDre(months = 6): Promise<DreReport> {
  try {
    const data = await apiGet<any>(`/api/reports/dre?months=${months}`);
    const monthsArr: string[] = Array.isArray(data?.months) ? data.months : [];
    const rawRows: any[] = Array.isArray(data?.rows)
      ? data.rows
      : Array.isArray(data?.categories)
        ? data.categories
        : [];
    const rows: DreCategoryRow[] = rawRows.map((r) => {
      const values: Record<string, number> = {};
      if (r.values && typeof r.values === 'object') {
        for (const k of Object.keys(r.values)) values[k] = toNumber(r.values[k]);
      }
      return {
        categoryId: r.categoryId ?? undefined,
        category: r.category ?? r.name ?? 'Sem categoria',
        type: r.type === 'income' ? 'income' : 'expense',
        parentId: r.parentId ?? null,
        values,
      };
    });
    const totalsRaw = data?.totals ?? {};
    const totals = {
      income: (totalsRaw.income ?? {}) as Record<string, number>,
      expense: (totalsRaw.expense ?? {}) as Record<string, number>,
      result: (totalsRaw.result ?? {}) as Record<string, number>,
    };
    return { months: monthsArr, rows, totals };
  } catch {
    return { months: [], rows: [], totals: { income: {}, expense: {}, result: {} } };
  }
}

export async function getCashFlow(months = 12): Promise<CashFlowPoint[]> {
  try {
    const data = await apiGet<any>(`/api/reports/cash-flow?months=${months}`);
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.series) ? data.series : [];
    return arr.map((p) => ({
      month: String(p.month ?? p.date ?? ''),
      income: toNumber(p.income),
      expense: toNumber(p.expense),
      net: toNumber(p.net ?? toNumber(p.income) - toNumber(p.expense)),
      cumulative: p.cumulative !== undefined ? toNumber(p.cumulative) : undefined,
    }));
  } catch {
    return [];
  }
}

export async function getCashFlowProjection(days = 90): Promise<CashFlowProjection> {
  try {
    const data = await apiGet<any>(`/api/reports/cash-flow-projection?days=${days}`);
    const series: CashFlowProjectionPoint[] = Array.isArray(data?.series)
      ? data.series.map((p: any) => ({
          date: String(p.date ?? ''),
          projected: toNumber(p.projected ?? p.value),
          upper: p.upper !== undefined ? toNumber(p.upper) : undefined,
          lower: p.lower !== undefined ? toNumber(p.lower) : undefined,
          type: p.type === 'historical' ? 'historical' : 'projected',
        }))
      : [];
    return {
      base: toNumber(data?.base ?? data?.startingBalance),
      series,
      endOfMonth: data?.endOfMonth !== undefined ? toNumber(data.endOfMonth) : undefined,
      in30: data?.in30 !== undefined ? toNumber(data.in30) : undefined,
      in60: data?.in60 !== undefined ? toNumber(data.in60) : undefined,
      in90: data?.in90 !== undefined ? toNumber(data.in90) : undefined,
      confidence: data?.confidence !== undefined ? toNumber(data.confidence) : undefined,
    };
  } catch {
    return { base: 0, series: [] };
  }
}

export async function getMonthlyComparison(months = 12): Promise<MonthlyComparisonResponse> {
  try {
    const data = await apiGet<any>(`/api/reports/monthly-comparison?months=${months}`);
    const rawRows: any[] = Array.isArray(data?.rows)
      ? data.rows
      : Array.isArray(data?.months)
        ? data.months
        : Array.isArray(data)
          ? data
          : [];
    const rows: MonthlyComparisonRow[] = rawRows.map((r) => {
      const income = toNumber(r.income);
      const expense = toNumber(r.expense);
      const net = r.net !== undefined ? toNumber(r.net) : income - expense;
      const savings = r.savingsRate !== undefined
        ? toNumber(r.savingsRate)
        : (income > 0 ? (net / income) * 100 : 0);
      return {
        month: String(r.month ?? r.label ?? ''),
        income, expense, net, savingsRate: savings,
        topCategories: Array.isArray(r.topCategories)
          ? r.topCategories.map((c: any) => ({ category: String(c.category ?? c.name ?? ''), amount: toNumber(c.amount) }))
          : undefined,
      };
    });
    return {
      rows,
      current: data?.current,
      previousMonth: data?.previousMonth,
      previousYear: data?.previousYear,
      momIncomePct: data?.momIncomePct !== undefined ? toNumber(data.momIncomePct) : undefined,
      momExpensePct: data?.momExpensePct !== undefined ? toNumber(data.momExpensePct) : undefined,
      yoyIncomePct: data?.yoyIncomePct !== undefined ? toNumber(data.yoyIncomePct) : undefined,
      yoyExpensePct: data?.yoyExpensePct !== undefined ? toNumber(data.yoyExpensePct) : undefined,
    };
  } catch {
    return { rows: [] };
  }
}

export async function getHealthDashboard(): Promise<HealthDashboard | null> {
  try {
    const data = await apiGet<any>('/api/reports/health-dashboard');
    if (!data || typeof data !== 'object') return null;
    return {
      score: toNumber(data.score),
      category: data.category ?? undefined,
      savingsRate: data.savingsRate !== undefined ? toNumber(data.savingsRate) : undefined,
      emergencyMonths: data.emergencyMonths !== undefined ? toNumber(data.emergencyMonths) : undefined,
      debtRatio: data.debtRatio !== undefined ? toNumber(data.debtRatio) : undefined,
      investmentRatio: data.investmentRatio !== undefined ? toNumber(data.investmentRatio) : undefined,
    };
  } catch {
    return null;
  }
}

export async function getFinancialCalendar(from: string, to: string): Promise<FinancialCalendarEvent[]> {
  try {
    const data = await apiGet<any>(`/api/reports/financial-calendar?from=${from}&to=${to}`);
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
    return arr.map((e: any) => ({
      id: String(e.id ?? `${e.date}-${e.title}`),
      date: String(e.date ?? '').slice(0, 10),
      title: String(e.title ?? e.description ?? ''),
      amount: toNumber(e.amount),
      type: ((): FinancialCalendarEvent['type'] => {
        const t = String(e.type ?? '').toLowerCase();
        if (t === 'income' || t === 'receita') return 'income';
        if (t === 'dividend' || t === 'dividendo') return 'dividend';
        if (t === 'tax' || t === 'darf' || t === 'das') return 'tax';
        if (t === 'invoice' || t === 'fatura') return 'invoice';
        return 'expense';
      })(),
      source: e.source ?? undefined,
      category: e.category ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function getUpcomingEvents(days = 30): Promise<UpcomingEvent[]> {
  try {
    const data = await apiGet<any>(`/api/reports/upcoming-events?days=${days}`);
    const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
    return arr.map((e: any) => ({
      id: String(e.id ?? `${e.date}-${e.title}`),
      date: String(e.date ?? '').slice(0, 10),
      title: String(e.title ?? e.description ?? ''),
      amount: toNumber(e.amount),
      type: (e.type as UpcomingEvent['type']) ?? 'expense',
      source: e.source ?? undefined,
      category: e.category ?? undefined,
      daysUntil: toNumber(e.daysUntil),
    }));
  } catch {
    return [];
  }
}

export async function getSpendingPatterns(): Promise<SpendingPatternsResponse> {
  try {
    const data = await apiGet<any>('/api/reports/spending-patterns');
    const cats: SpendingPatternCategory[] = Array.isArray(data?.categories)
      ? data.categories.map((c: any) => ({
          category: String(c.category ?? c.name ?? ''),
          categoryId: c.categoryId ?? undefined,
          averageAmount: toNumber(c.averageAmount ?? c.average),
          currentAmount: toNumber(c.currentAmount ?? c.amount),
          changePct: toNumber(c.changePct ?? c.changePercent),
          isAnomaly: !!c.isAnomaly,
          zScore: c.zScore !== undefined ? toNumber(c.zScore) : undefined,
        }))
      : [];
    const top = Array.isArray(data?.topCategories)
      ? data.topCategories.map((c: any) => ({
          category: String(c.category ?? c.name ?? ''),
          amount: toNumber(c.amount),
          color: c.color ?? undefined,
        }))
      : undefined;
    return {
      categories: cats,
      topCategories: top,
      totalExpense: data?.totalExpense !== undefined ? toNumber(data.totalExpense) : undefined,
    };
  } catch {
    return { categories: [] };
  }
}

export async function getExpenseForecast(): Promise<ExpenseForecast | null> {
  try {
    const data = await apiGet<any>('/api/reports/expense-forecast');
    if (!data || typeof data !== 'object') return null;
    return {
      forecast: toNumber(data.forecast ?? data.value),
      upper: data.upper !== undefined ? toNumber(data.upper) : undefined,
      lower: data.lower !== undefined ? toNumber(data.lower) : undefined,
      confidence: data.confidence !== undefined ? toNumber(data.confidence) : undefined,
      basedOnMonths: data.basedOnMonths !== undefined ? toNumber(data.basedOnMonths) : undefined,
    };
  } catch {
    return null;
  }
}

export async function getMarketComparison(): Promise<MarketComparison | null> {
  try {
    const data = await apiGet<any>('/api/reports/market-comparison');
    if (!data || typeof data !== 'object') return null;
    return {
      portfolioReturn: toNumber(data.portfolioReturn ?? data.return),
      ibov: data.ibov !== undefined ? toNumber(data.ibov) : undefined,
      cdi: data.cdi !== undefined ? toNumber(data.cdi) : undefined,
      ifix: data.ifix !== undefined ? toNumber(data.ifix) : undefined,
      sp500: data.sp500 !== undefined ? toNumber(data.sp500) : undefined,
      period: data.period ?? undefined,
    };
  } catch {
    return null;
  }
}
