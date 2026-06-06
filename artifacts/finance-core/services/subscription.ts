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
 * Normaliza nomes de plano do backend para o conjunto interno.
 * Planos desconhecidos mas não-nulos recebem acesso total (INVESTIDOR_PRO)
 * para evitar falsos bloqueios em planos admin/owner/lifetime.
 */
export function normalizePlanName(plan: string | undefined | null): PlanName {
  if (!plan) return 'ESSENCIAL';
  const n = plan.toString().toUpperCase().trim();
  if (n === 'FREE' || n === 'ESSENCIAL' || n === '') return 'ESSENCIAL';
  if (n === 'PREMIUM') return 'PREMIUM';
  if (n === 'FAMILY') return 'FAMILY';
  if (n === 'PJ') return 'PJ';
  if (n === 'INVESTIDOR_PRO' || n === 'INVESTIDORPRO' || n === 'INVESTOR_PRO') return 'INVESTIDOR_PRO';
  // Planos admin/owner/lifetime/pro/business/enterprise → acesso total
  if (
    n === 'ADMIN' ||
    n === 'OWNER' ||
    n === 'LIFETIME' ||
    n === 'PRO' ||
    n === 'BUSINESS' ||
    n === 'ENTERPRISE' ||
    n === 'MASTER' ||
    n === 'FULL'
  ) return 'INVESTIDOR_PRO';
  // Qualquer outro plano pago desconhecido → acesso total (fail open)
  return 'INVESTIDOR_PRO';
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
