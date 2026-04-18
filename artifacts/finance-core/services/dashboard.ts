import { apiGet, apiPost } from './api';

export interface DashboardSummaryUpcomingBill {
  id: string;
  name: string;
  amount: number;
  dueAt: string;
  daysUntil: number;
  category: string;
}

export interface DashboardSummaryUpcomingInvoice {
  id: string;
  cardId: string;
  totalAmount: number;
  paidAmount: number;
  dueDate: string;
  daysUntil: number;
}

export interface DashboardSummaryRecentTx {
  id: string;
  description: string;
  amount: number;
  type: string;
  date: string;
  categoryName: string | null;
}

export interface DashboardSummaryWeeklyDay {
  day: string;
  income: number;
  expense: number;
}

export interface DashboardSummary {
  generatedAt: string;
  cashBalance: number;
  netWorth: number;
  totalCardDebt: number;
  totalInvestments: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  prevMonthIncome: number;
  prevMonthExpenses: number;
  healthScore: number;
  healthCategory: string | null;
  upcomingBills: DashboardSummaryUpcomingBill[];
  upcomingInvoices: DashboardSummaryUpcomingInvoice[];
  recentTransactions: DashboardSummaryRecentTx[];
  weeklyChart: DashboardSummaryWeeklyDay[];
  unreadAlerts: number;
}

export async function fetchDashboardSummary(fresh = false): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>(`/api/mobile/dashboard-summary${fresh ? '?fresh=1' : ''}`);
}

export async function invalidateDashboardCache(): Promise<void> {
  try {
    await apiPost('/api/mobile/dashboard-summary/invalidate', {});
  } catch {
    // Endpoint may not exist on backend; ignore.
  }
}
