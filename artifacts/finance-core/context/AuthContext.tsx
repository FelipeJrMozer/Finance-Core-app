import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, initApiSession, saveTokens, clearTokens, getApiBaseUrl } from '@/services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = 'pf_user';

function mapApiUser(raw: Record<string, string>): User {
  const name = [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim()
    || raw.name
    || raw.email?.split('@')[0]
    || 'Usuário';
  return {
    id: raw.id || '1',
    name,
    email: raw.email,
    avatar: raw.profileImageUrl || undefined,
    plan: (raw as unknown as Record<string, string>).plan || undefined,
  };
}

async function doLogin(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = 'Email ou senha incorretos';
    try { msg = JSON.parse(text).message || msg; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  const user = mapApiUser(data.user || { email });
  return { user, accessToken: data.accessToken, refreshToken: data.refreshToken };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await initApiSession();
      const cached = await AsyncStorage.getItem(USER_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
        try {
          const res = await apiFetch('/api/auth/user');
          if (res.ok) {
            const raw = await res.json();
            const fresh = mapApiUser(raw);
            setUser(fresh);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh));
          } else if (res.status === 401) {
            await clearTokens();
            await AsyncStorage.removeItem(USER_KEY);
            setUser(null);
          }
        } catch {}
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const persistUser = async (u: User | null) => {
    setUser(u);
    if (u) await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    else await AsyncStorage.removeItem(USER_KEY);
  };

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, accessToken, refreshToken } = await doLogin(email, password);
    await saveTokens(accessToken, refreshToken);
    await persistUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ') || '';
    const base = getApiBaseUrl();

    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = 'Falha ao criar conta';
      try { msg = JSON.parse(text).message || msg; } catch {}
      throw new Error(msg);
    }

    const { user: loginUser, accessToken, refreshToken } = await doLogin(email, password);
    await saveTokens(accessToken, refreshToken);
    await persistUser(loginUser);
  }, []);

  const logout = useCallback(async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    await clearTokens();
    await persistUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
      apiUrl: getApiBaseUrl(),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
