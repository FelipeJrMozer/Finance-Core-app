import { apiGet } from './api';

export interface PortfolioReturns {
  twr: number | null;
  twrAnnualized: number | null;
  mwr: number | null;
  insufficientData: boolean;
  availablePoints: number;
  requiredPoints: number;
  message?: string;
}

async function fetchSafe(path: string): Promise<any> {
  try { return await apiGet<any>(path); } catch { return null; }
}

export async function fetchPortfolioReturns(from?: string, to?: string): Promise<PortfolioReturns> {
  const qs: string[] = [];
  if (from) qs.push(`from=${encodeURIComponent(from)}`);
  if (to) qs.push(`to=${encodeURIComponent(to)}`);
  const suffix = qs.length ? '?' + qs.join('&') : '';
  const [twrData, mwrData] = await Promise.all([
    fetchSafe(`/api/portfolio/twr${suffix}`),
    fetchSafe(`/api/portfolio/mwr${suffix}`),
  ]);
  const insufficient =
    !!twrData?.insufficientData ||
    !!mwrData?.insufficientData ||
    twrData == null || mwrData == null ||
    (twrData?.twr == null && mwrData?.mwr == null);

  return {
    twr: twrData?.twr != null ? Number(twrData.twr) : null,
    twrAnnualized: twrData?.twrAnnualized != null ? Number(twrData.twrAnnualized) : null,
    mwr: mwrData?.mwr != null ? Number(mwrData.mwr) : null,
    insufficientData: insufficient,
    availablePoints: Number(twrData?.availablePoints ?? mwrData?.availablePoints ?? 0),
    requiredPoints: Number(twrData?.requiredPoints ?? mwrData?.requiredPoints ?? 60),
    message: twrData?.message || mwrData?.message,
  };
}
