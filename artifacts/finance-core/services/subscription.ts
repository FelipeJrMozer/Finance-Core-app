import { apiGet, apiPost } from '@/services/api';

export type PlanName =
  | 'ESSENCIAL'
  | 'PREMIUM'
  | 'FAMILY'
  | 'PJ'
  | 'INVESTIDOR_PRO';

export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due' | 'incomplete' | string;

export interface SubscriptionInfo {
  plan: { name: PlanName | string };
  status?: SubscriptionStatus;
  trialEnd?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}

export interface CheckoutResponse {
  url: string;
  sessionId?: string;
}

/**
 * Normaliza nomes legados (`FREE` → `ESSENCIAL`).
 */
export function normalizePlanName(plan: string | undefined | null): PlanName {
  const n = (plan || 'ESSENCIAL').toString().toUpperCase();
  if (n === 'FREE') return 'ESSENCIAL';
  if (
    n === 'ESSENCIAL' ||
    n === 'PREMIUM' ||
    n === 'FAMILY' ||
    n === 'PJ' ||
    n === 'INVESTIDOR_PRO'
  ) {
    return n;
  }
  return 'ESSENCIAL';
}

export async function getSubscriptionInfo(): Promise<SubscriptionInfo> {
  const data = await apiGet<SubscriptionInfo>('/api/subscription/info');
  return {
    ...data,
    plan: { name: normalizePlanName(data?.plan?.name) },
  };
}

export async function startCheckout(planName: PlanName): Promise<CheckoutResponse> {
  return apiPost<CheckoutResponse>('/api/stripe/checkout', { planName });
}

export function trialDaysRemaining(trialEnd?: string | null): number {
  if (!trialEnd) return 0;
  const end = new Date(trialEnd).getTime();
  if (Number.isNaN(end)) return 0;
  const days = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}
