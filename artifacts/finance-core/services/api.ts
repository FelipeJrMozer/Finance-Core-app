import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  accessToken: 'pf_access_token',
  refreshToken: 'pf_refresh_token',
};

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _walletId: string | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

export function setCurrentWalletId(id: string | null) {
  _walletId = id;
}

export function getApiBaseUrl() {
  return (process.env.EXPO_PUBLIC_API_URL || 'https://pilarfinanceiro.replit.app').replace(/\/$/, '');
}

export async function initApiSession() {
  _accessToken = await AsyncStorage.getItem(KEYS.accessToken);
  _refreshToken = await AsyncStorage.getItem(KEYS.refreshToken);
}

export async function saveTokens(accessToken: string, refreshToken: string) {
  _accessToken = accessToken;
  _refreshToken = refreshToken;
  await AsyncStorage.setItem(KEYS.accessToken, accessToken);
  await AsyncStorage.setItem(KEYS.refreshToken, refreshToken);
}

export async function updateAccessToken(accessToken: string) {
  _accessToken = accessToken;
  await AsyncStorage.setItem(KEYS.accessToken, accessToken);
}

export async function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  await AsyncStorage.removeItem(KEYS.accessToken);
  await AsyncStorage.removeItem(KEYS.refreshToken);
}

export function getAccessToken() { return _accessToken; }
export function getRefreshToken() { return _refreshToken; }

async function tryRefresh(): Promise<string | null> {
  if (!_refreshToken) return null;
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      return null;
    }
    const data = await res.json();
    const newAccess: string = data.accessToken;
    if (!newAccess) { await clearTokens(); return null; }
    await updateAccessToken(newAccess);
    if (data.refreshToken) {
      _refreshToken = data.refreshToken;
      await AsyncStorage.setItem(KEYS.refreshToken, data.refreshToken);
    }
    return newAccess;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  if (_walletId) {
    headers['x-wallet-id'] = _walletId;
  }

  const res = await fetch(`${base}${path}`, { ...options, headers });

  if (res.status === 401 && _refreshToken) {
    if (_isRefreshing) {
      return new Promise((resolve) => {
        _refreshQueue.push(async (token) => {
          if (!token) { resolve(res); return; }
          resolve(fetch(`${base}${path}`, { ...options, headers: { ...headers, Authorization: `Bearer ${token}` } }));
        });
      });
    }

    _isRefreshing = true;
    const newToken = await tryRefresh();
    _isRefreshing = false;
    _refreshQueue.forEach((cb) => cb(newToken));
    _refreshQueue = [];

    if (!newToken) return res;
    return fetch(`${base}${path}`, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } });
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  const text = await res.text();
  if (!text || text === 'null') return [] as unknown as T;
  return JSON.parse(text);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `POST ${path} ${res.status}`);
  }
  const text = await res.text();
  if (!text || text === 'null') return {} as T;
  return JSON.parse(text);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `PATCH ${path} ${res.status}`);
  }
  const text = await res.text();
  if (!text || text === 'null') return {} as T;
  return JSON.parse(text);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `PUT ${path} ${res.status}`);
  }
  const text = await res.text();
  if (!text || text === 'null') return {} as T;
  return JSON.parse(text);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
}
