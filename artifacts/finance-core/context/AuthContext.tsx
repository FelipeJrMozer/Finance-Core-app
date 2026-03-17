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
  const name = [raw.firstName, raw.lastName].filter(Boolean).join(' ')
    || raw.name
    || raw.email?.split('@')[0]
    || 'Usuário';
  return {
    id: raw.id || '1',
    name,
    email: raw.email,
    avatar: raw.profileImageUrl || undefined,
    plan: raw.plan || undefined,
  };
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
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/auth/mobile/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Email ou senha incorretos');
    }
    const data = await res.json();
    await saveTokens(data.accessToken, data.refreshToken);
    const u = mapApiUser(data.user || { email });
    await persistUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ');
    const base = getApiBaseUrl();
    const res = await fetch(`${base}/api/auth/mobile/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const fallback = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      if (!fallback.ok) throw new Error('Falha ao criar conta');
      const d2 = await fallback.json();
      if (d2.accessToken) await saveTokens(d2.accessToken, d2.refreshToken);
      const u2 = mapApiUser({ ...d2.user, name });
      await persistUser(u2);
      return;
    }

    const data = await res.json();
    if (data.accessToken) await saveTokens(data.accessToken, data.refreshToken);
    const u = mapApiUser({ ...data.user, name });
    await persistUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/mobile/logout', { method: 'POST' });
    } catch {}
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
