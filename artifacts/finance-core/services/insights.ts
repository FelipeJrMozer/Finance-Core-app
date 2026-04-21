import { apiGet } from '@/services/api';

export interface AnomalyItem {
  id?: string;
  category?: string;
  categoryId?: string;
  amount?: number;
  averageAmount?: number;
  increasePct?: number;
  description?: string;
  month?: string;
}

export interface MonthlyRecap {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
  topCategory?: { name: string; amount: number };
  changePct?: number;
  transactionCount?: number;
  topMerchant?: { name: string; amount: number };
}

export interface EmergencyFundStatus {
  current: number;
  target: number;
  monthsCovered: number;
  recommendedMonths: number;
  monthlyExpenses: number;
  progress?: number;
}

export async function getAnomalies(months = 3): Promise<AnomalyItem[]> {
  const data = await apiGet<AnomalyItem[] | { anomalies: AnomalyItem[] }>(
    `/api/insights/anomalies?months=${encodeURIComponent(String(months))}`
  );
  if (Array.isArray(data)) return data;
  return data?.anomalies || [];
}

export async function getMonthlyRecap(month?: string): Promise<MonthlyRecap | null> {
  const q = month ? `?month=${encodeURIComponent(month)}` : '';
  try {
    const data = await apiGet<MonthlyRecap>(`/api/insights/monthly-recap${q}`);
    if (!data || typeof data !== 'object' || !('month' in data)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getEmergencyFund(): Promise<EmergencyFundStatus | null> {
  try {
    const data = await apiGet<EmergencyFundStatus>('/api/insights/emergency-fund');
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export type AnomalySeverity = 'high' | 'medium' | 'low';

export function severityOf(increasePct: number | undefined): AnomalySeverity {
  const v = Number(increasePct ?? 0);
  if (v >= 100) return 'high';
  if (v >= 50) return 'medium';
  return 'low';
}
