import { apiGet, apiPost, getApiBaseUrl } from '@/services/api';

export interface LegalVersionsResponse {
  terms: { version: string; url: string; updatedAt?: string };
  privacy: { version: string; url: string; updatedAt?: string };
  dpoEmail: string;
}

export interface ConsentRecord {
  type: 'terms' | 'privacy' | 'marketing';
  accepted: boolean;
  version?: string;
  acceptedAt?: string;
}

export interface LegalStatus {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted?: boolean;
  needsRefresh?: boolean;
  termsVersion?: string;
  privacyVersion?: string;
}

export async function getLegalVersions(): Promise<LegalVersionsResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/legal/versions`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('Não foi possível carregar versões legais.');
  return res.json();
}

export async function postConsent(input: {
  type: 'terms' | 'privacy' | 'marketing';
  accepted: boolean;
  version?: string;
}): Promise<{ ok: boolean }> {
  return apiPost('/api/user/consent', input);
}

export async function getMyConsents(): Promise<ConsentRecord[]> {
  const data = await apiGet<ConsentRecord[] | { consents: ConsentRecord[] }>('/api/user/consents');
  if (Array.isArray(data)) return data;
  return data?.consents || [];
}

export async function getLegalStatus(): Promise<LegalStatus> {
  return apiGet<LegalStatus>('/api/user/legal-status');
}

export function buildLegalUrl(path: string): string {
  const base = getApiBaseUrl();
  if (!path) return base;
  return path.startsWith('http') ? path : `${base}${path}`;
}
