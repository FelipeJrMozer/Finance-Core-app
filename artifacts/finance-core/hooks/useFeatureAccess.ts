import { useQuery } from '@tanstack/react-query';
import {
  SubscriptionInfo,
  PlanName,
  getSubscriptionInfo,
  normalizePlanName,
} from '@/services/subscription';

export type Feature = 'ai' | 'investments' | 'pj' | 'family' | 'advancedPortfolio';

const FEATURE_PLANS: Record<Feature, PlanName[]> = {
  ai: ['PREMIUM', 'FAMILY', 'INVESTIDOR_PRO'],
  investments: ['PREMIUM', 'FAMILY', 'INVESTIDOR_PRO'],
  pj: ['PJ', 'FAMILY'],
  family: ['FAMILY'],
  advancedPortfolio: ['INVESTIDOR_PRO'],
};

export const FEATURE_REQUIRED_LABEL: Record<Feature, string> = {
  ai: 'PREMIUM',
  investments: 'PREMIUM',
  pj: 'PJ',
  family: 'FAMILY',
  advancedPortfolio: 'INVESTIDOR_PRO',
};

export function useSubscriptionInfo() {
  return useQuery<SubscriptionInfo>({
    queryKey: ['/api/subscription/info'],
    queryFn: getSubscriptionInfo,
    staleTime: 60_000,
    retry: 1,
  });
}

/**
 * Retorna se o usuário atual tem acesso à feature, segundo o plano vindo do backend.
 * Em ESSENCIAL, qualquer feature paga retorna `false`.
 */
export function useFeatureAccess(feature: Feature): boolean {
  const { data } = useSubscriptionInfo();
  const plan = normalizePlanName(data?.plan?.name as string | undefined);
  return FEATURE_PLANS[feature].includes(plan);
}
