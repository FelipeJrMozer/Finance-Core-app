import { setSecure, getSecure, deleteSecure, migrateTokensIfNeeded } from '@/services/secureStorage';
import { logger } from '@/utils/logger';

const SECURE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
};

// Mapping para migrar do AsyncStorage legado
const LEGACY_TO_SECURE: Record<string, string> = {
  pf_access_token: SECURE_KEYS.accessToken,
  pf_refresh_token: SECURE_KEYS.refreshToken,
};

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _walletId: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let onAuthFailureCb: (() => void) | null = null;

export function setCurrentWalletId(id: string | null) {
  _walletId = id;
}

export function setOnAuthFailure(cb: (() => void) | null) {
  onAuthFailureCb = cb;
}

export function getApiBaseUrl() {
  return (process.env.EXPO_PUBLIC_API_URL || 'https://pilar-financeiro.replit.app').replace(/\/$/, '');
}

export async function initApiSession() {
  // Migra tokens antigos (AsyncStorage texto plano) para SecureStore — idempotente.
  await migrateTokensIfNeeded(LEGACY_TO_SECURE);
  _accessToken = await getSecure(SECURE_KEYS.accessToken);
  _refreshToken = await getSecure(SECURE_KEYS.refreshToken);
}

export async function saveTokens(accessToken: string, refreshToken: string | null | undefined) {
  if (!accessToken) {
    throw new Error('Resposta inválida do servidor (token ausente).');
  }
  _accessToken = accessToken;
  await setSecure(SECURE_KEYS.accessToken, accessToken);
  if (refreshToken) {
    _refreshToken = refreshToken;
    await setSecure(SECURE_KEYS.refreshToken, refreshToken);
  } else {
    logger.warn('[api] saveTokens called without a refresh token; refresh will be unavailable.');
    _refreshToken = null;
    await deleteSecure(SECURE_KEYS.refreshToken);
  }
}

export async function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  await deleteSecure(SECURE_KEYS.accessToken);
  await deleteSecure(SECURE_KEYS.refreshToken);
}

export function getAccessToken() { return _accessToken; }
export function getRefreshToken() { return _refreshToken; }

const STATUS_DEFAULTS: Record<number, string> = {
  400: 'Requisição inválida.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Acesso negado.',
  404: 'Recurso não encontrado.',
  408: 'Tempo limite. Tente novamente.',
  409: 'Conflito ao processar a requisição.',
  422: 'Dados inválidos.',
  429: 'Muitas tentativas. Aguarde um momento.',
  500: 'Erro no servidor. Tente novamente em instantes.',
  502: 'Servidor indisponível.',
  503: 'Servidor em manutenção.',
  504: 'Servidor demorou para responder.',
};

async function buildErrorFromResponse(res: Response, methodPath: string): Promise<Error> {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const data: any = await res.json();
      const msg = data?.message || data?.error || STATUS_DEFAULTS[res.status] || `Erro ${res.status}`;
      return new Error(msg);
    } catch {
      // fallthrough → genérico
    }
  } else {
    // descarta o body (HTML/texto) sem expor ao usuário
    try { await res.text(); } catch {}
  }
  return new Error(STATUS_DEFAULTS[res.status] || `Erro ${res.status} em ${methodPath}`);
}

const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  // Compose com signal externo, se existir
  const externalSignal = opts.signal as AbortSignal | undefined;
  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      ctrl.abort();
    } else {
      externalSignal.addEventListener('abort', () => ctrl.abort(), { once: true });
    }
  }

  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      if (externalSignal?.aborted) {
        // foi o caller que cancelou — propaga sem mascarar
        throw err;
      }
      throw new Error('Tempo limite de conexão. Verifique sua internet.');
    }
    throw new Error('Falha de rede. Verifique sua conexão.');
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getSecure(SECURE_KEYS.refreshToken);
      if (!refreshToken) {
        await clearTokens();
        return null;
      }
      const base = getApiBaseUrl();
      const res = await fetchWithTimeout(`${base}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        await clearTokens();
        return null;
      }
      const data = await res.json().catch(() => null);
      const newAccess: string | undefined = data?.accessToken;
      if (!newAccess) {
        await clearTokens();
        return null;
      }
      _accessToken = newAccess;
      await setSecure(SECURE_KEYS.accessToken, newAccess);
      // Só atualiza refresh se o backend rotacionar
      if (data.refreshToken) {
        _refreshToken = data.refreshToken;
        await setSecure(SECURE_KEYS.refreshToken, data.refreshToken);
      }
      return newAccess;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const method = (options.method || 'GET').toUpperCase();
  logger.debug('[api]', method, path);

  const buildHeaders = (token: string | null): Record<string, string> => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) h.Authorization = `Bearer ${token}`;
    if (_walletId) h['X-Wallet-Id'] = _walletId;
    return h;
  };

  const url = `${base}${path}`;
  let res = await fetchWithTimeout(url, { ...options, headers: buildHeaders(_accessToken) });

  if (res.status === 401 && _refreshToken) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      onAuthFailureCb?.();
      return res; // caller verá 401 → propagará erro
    }
    res = await fetchWithTimeout(url, { ...options, headers: buildHeaders(newToken) });
    if (res.status === 401) {
      // refresh aceito mas servidor ainda recusa → logout
      await clearTokens();
      onAuthFailureCb?.();
    }
  }

  return res;
}

async function parseOk<T>(res: Response, methodPath: string): Promise<T> {
  if (!res.ok) throw await buildErrorFromResponse(res, methodPath);
  const text = await res.text();
  if (!text || text === 'null') return [] as unknown as T;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Resposta inválida do servidor.');
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  return parseOk<T>(res, `GET ${path}`);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await buildErrorFromResponse(res, `POST ${path}`);
  const text = await res.text();
  if (!text || text === 'null') return {} as T;
  try { return JSON.parse(text); } catch { return {} as T; }
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  if (!res.ok) throw await buildErrorFromResponse(res, `PATCH ${path}`);
  const text = await res.text();
  if (!text || text === 'null') return {} as T;
  try { return JSON.parse(text); } catch { return {} as T; }
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) throw await buildErrorFromResponse(res, `PUT ${path}`);
  const text = await res.text();
  if (!text || text === 'null') return {} as T;
  try { return JSON.parse(text); } catch { return {} as T; }
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw await buildErrorFromResponse(res, `DELETE ${path}`);
}
