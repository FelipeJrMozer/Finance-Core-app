import { apiGet, apiPost } from '@/services/api';

export interface ReferralInfo {
  code: string;
  shareUrl: string;
  totalReferrals: number;
  convertedReferrals: number;
}

export interface ReferralListItem {
  id: string;
  email?: string;
  name?: string;
  status: 'pending' | 'converted' | 'rejected' | string;
  createdAt?: string;
  convertedAt?: string;
}

export async function getMyReferralCode(): Promise<ReferralInfo> {
  return apiGet<ReferralInfo>('/api/referral/my-code');
}

export async function applyReferralCode(code: string): Promise<{ ok: boolean; message?: string }> {
  return apiPost('/api/referral/apply', { code });
}

export async function listReferrals(): Promise<ReferralListItem[]> {
  const data = await apiGet<ReferralListItem[] | { referrals: ReferralListItem[] }>('/api/referral/list');
  if (Array.isArray(data)) return data;
  return data?.referrals || [];
}
