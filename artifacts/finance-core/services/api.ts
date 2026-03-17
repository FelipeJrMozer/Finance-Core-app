import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  accessToken: 'pf_access_token',
  refreshToken: 'pf_refresh_token',
};

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_URL || 'https://pilarfinanceiro.replit.app';
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

export async function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  await AsyncStorage.removeItem(KEYS.accessToken);
  await AsyncStorage.removeItem(KEYS.refreshToken);
}

export function getAccessToken() {
  return _accessToken;
}

async function tryRefresh(): Promise<string | null> {
  if (!_refreshToken) return null;
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/auth/mobile/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });
    if (!res.ok) {
      await clearTokens();
      return null;
    }
    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${base}${path}`, { ...options, headers });

  if (res.status === 401 && _refreshToken) {
    if (_isRefreshing) {
      return new Promise((resolve) => {
        _refreshQueue.push(async (token) => {
          if (!token) {
            resolve(res);
            return;
          }
          const retryHeaders = { ...headers, Authorization: `Bearer ${token}` };
          resolve(fetch(`${base}${path}`, { ...options, headers: retryHeaders }));
        });
      });
    }

    _isRefreshing = true;
    const newToken = await tryRefresh();
    _isRefreshing = false;

    _refreshQueue.forEach((cb) => cb(newToken));
    _refreshQueue = [];

    if (!newToken) return res;

    const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
    return fetch(`${base}${path}`, { ...options, headers: retryHeaders });
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET ${path} ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
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
  return res.json();
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
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
}
