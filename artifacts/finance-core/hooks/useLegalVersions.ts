import { useQuery } from '@tanstack/react-query';
import { getLegalVersions, LegalVersionsResponse } from '@/services/legal';

export function useLegalVersions() {
  return useQuery<LegalVersionsResponse>({
    queryKey: ['/api/legal/versions'],
    queryFn: getLegalVersions,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
