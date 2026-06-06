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
  pj: ['PJ', 'FAMILY', 'INVESTIDOR_PRO'],
  family: ['FAMILY', 'INVESTIDOR_PRO'],
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
 * Retorna se o usuário tem acesso à feature.
 * - Durante carregamento (isLoading): libera acesso para evitar flash de paywall.
 * - Em caso de erro na API: libera acesso (fail open).
 * - Plano desconhecido: normalizePlanName já mapeia para INVESTIDOR_PRO.
 */
export function useFeatureAccess(feature: Feature): boolean {
  const { data, isLoading, isError } = useSubscriptionInfo();

  // Enquanto carrega ou se a API falhou, não bloqueia o usuário
  if (isLoading || isError || !data) return true;

  const plan = normalizePlanName(data?.plan?.name as string | undefined);
  return FEATURE_PLANS[feature].includes(plan);
}
