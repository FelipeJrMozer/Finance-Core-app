import { apiGet, apiPost, apiPatch, apiDelete } from './api';

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface PortfolioPayload {
  name: string;
  description?: string;
}

function transform(raw: any): Portfolio {
  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || ''),
    description: raw?.description || undefined,
    isDefault: !!raw?.isDefault,
    createdAt: raw?.createdAt || undefined,
  };
}

export async function listPortfolios(): Promise<Portfolio[]> {
  try {
    const raw = await apiGet<any>('/api/portfolios');
    if (Array.isArray(raw)) return raw.map(transform);
    if (Array.isArray(raw?.portfolios)) return raw.portfolios.map(transform);
    return [];
  } catch {
    return [];
  }
}

export async function createPortfolio(payload: PortfolioPayload): Promise<Portfolio | null> {
  try {
    const raw = await apiPost<any>('/api/portfolios', payload);
    return raw?.id ? transform(raw) : null;
  } catch {
    return null;
  }
}

export async function updatePortfolio(id: string, payload: Partial<PortfolioPayload>): Promise<Portfolio | null> {
  try {
    const raw = await apiPatch<any>(`/api/portfolios/${id}`, payload);
    return raw?.id ? transform(raw) : null;
  } catch {
    return null;
  }
}

export async function deletePortfolio(id: string): Promise<boolean> {
  try {
    await apiDelete(`/api/portfolios/${id}`);
    return true;
  } catch {
    return false;
  }
}
