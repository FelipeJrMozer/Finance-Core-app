import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  apiFetch,
  initApiSession,
  saveTokens,
  clearTokens,
  getApiBaseUrl,
  setOnAuthFailure,
} from '@/services/api';
import { safeGet, safeSet, safeRemove } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { isBiometricAvailable, isBiometricEnabled, authenticateBiometric } from '@/services/biometric';
import { trackSession } from '@/services/sessions';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan?: string;
  firstLogin?: boolean;
}

export interface RegisterConsent {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  termsVersion: string;
  privacyVersion: string;
  marketingAccepted?: boolean;
  referralCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isUnlocked: boolean;
  requireBiometric: boolean;
  unlock: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, consent: RegisterConsent) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_KEY = 'pf_user';
const BACKGROUND_LOCK_MS = 2 * 60 * 1000; // 2 min

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

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string | null;
}

async function doLogin(email: string, password: string): Promise<LoginResponse> {
  const base = getApiBaseUrl();
  logger.debug('[Auth] login attempt');
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  logger.debug('[Auth] login status', res.status);
  if (!res.ok) {
    let msg = 'Email ou senha incorretos';
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        const data = await res.json();
        if (data?.message) msg = data.message;
      } catch {}
    }
    throw new Error(msg);
  }
  const data = await res.json();
  const user = mapApiUser(data.user || { email });
  const accessToken: string | undefined = data.accessToken;
  const refreshToken: string | null = data.refreshToken || null;
  if (!accessToken) {
    logger.warn('[Auth] login response missing accessToken');
    throw new Error('Resposta inválida do servidor.');
  }
  if (!refreshToken) {
    logger.warn('[Auth] login response missing refreshToken; refresh will be unavailable');
  }
  return { user, accessToken, refreshToken };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requireBiometric, setRequireBiometric] = useState(false);

  const backgroundedAtRef = useRef<number | null>(null);

  const persistUser = async (u: User | null) => {
    setUser(u);
    if (u) await safeSet(USER_KEY, JSON.stringify(u));
    else await safeRemove(USER_KEY);
  };

  const logout = useCallback(async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch {}
    await clearTokens();
    setRequireBiometric(false);
    backgroundedAtRef.current = null;
    await persistUser(null);
  }, []);

  // Permite que o api.ts dispare logout quando o refresh falhar.
  useEffect(() => {
    setOnAuthFailure(() => {
      logout();
    });
    return () => setOnAuthFailure(null);
  }, [logout]);

  useEffect(() => {
    const init = async () => {
      try {
        await initApiSession();
        const cachedRaw = await safeGet<string>(USER_KEY);
        if (cachedRaw) {
          const cached: User = typeof cachedRaw === 'string' ? JSON.parse(cachedRaw) : (cachedRaw as User);
          setUser(cached);
          // Se biometria habilitada, exige unlock antes de tocar a API
          if (await isBiometricEnabled() && await isBiometricAvailable()) {
            setRequireBiometric(true);
          } else {
            try {
              const res = await apiFetch('/api/auth/user');
              if (res.ok) {
                const raw = await res.json();
                const fresh = mapApiUser(raw);
                setUser(fresh);
                await safeSet(USER_KEY, JSON.stringify(fresh));
                // Re-track sessão no resume
                trackSession();
              } else if (res.status === 401) {
                await clearTokens();
                await safeRemove(USER_KEY);
                setUser(null);
              }
            } catch {}
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Re-lock automático após X min em background.
  useEffect(() => {
    if (!user) return;
    const handleAppState = async (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAtRef.current = Date.now();
      } else if (state === 'active') {
        const ts = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (ts && Date.now() - ts >= BACKGROUND_LOCK_MS) {
          if (await isBiometricEnabled() && await isBiometricAvailable()) {
            setRequireBiometric(true);
          }
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, accessToken, refreshToken } = await doLogin(email, password);
    await saveTokens(accessToken, refreshToken);
    setRequireBiometric(false);
    await persistUser(u);
    // Registra a sessão no backend (deviceId estável)
    trackSession();
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string,
    consent: RegisterConsent,
  ) => {
    if (!consent?.termsAccepted || !consent?.privacyAccepted) {
      throw new Error('É preciso aceitar os Termos de Uso e a Política de Privacidade.');
    }
    if (!consent.termsVersion || !consent.privacyVersion) {
      throw new Error('Versões dos documentos legais indisponíveis. Tente novamente.');
    }
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ') || '';
    const base = getApiBaseUrl();

    const res = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: consent.termsVersion,
        privacyVersion: consent.privacyVersion,
        marketingAccepted: consent.marketingAccepted ?? false,
        referralCode: consent.referralCode || undefined,
      }),
    });

    if (!res.ok) {
      let msg = 'Falha ao criar conta';
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try { const d = await res.json(); if (d?.message) msg = d.message; } catch {}
      }
      throw new Error(msg);
    }

    const { user: loginUser, accessToken, refreshToken } = await doLogin(email, password);
    await saveTokens(accessToken, refreshToken);
    setRequireBiometric(false);
    await persistUser(loginUser);
    trackSession();
  }, []);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      safeSet(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const unlock = useCallback(async () => {
    const ok = await authenticateBiometric('Desbloqueie para acessar suas finanças');
    if (ok) setRequireBiometric(false);
    return ok;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isUnlocked: !!user && !requireBiometric,
      requireBiometric,
      unlock,
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
