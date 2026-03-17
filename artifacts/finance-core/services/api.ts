import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const BASE_URL = 'https://pilarfinanceiro.replit.app';
const COOKIE_KEY = 'pf_session_cookie';

let _cookie: string | null = null;

export async function initApiSession() {
  _cookie = await AsyncStorage.getItem(COOKIE_KEY);
}

export async function saveApiSession(cookie: string) {
  _cookie = cookie;
  await AsyncStorage.setItem(COOKIE_KEY, cookie);
}

export async function clearApiSession() {
  _cookie = null;
  await AsyncStorage.removeItem(COOKIE_KEY);
}

function extractConnectSid(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const parts = setCookieHeader.split(',');
  for (const part of parts) {
    const m = part.match(/connect\.sid=[^;]+/);
    if (m) return m[0];
  }
  return null;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const isWeb = Platform.OS === 'web';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!isWeb && _cookie) {
    headers['Cookie'] = _cookie;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: isWeb ? 'include' : 'omit',
  });

  if (!isWeb) {
    const newCookie = extractConnectSid(res.headers.get('set-cookie'));
    if (newCookie) {
      await saveApiSession(newCookie);
    }
  }

  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}
