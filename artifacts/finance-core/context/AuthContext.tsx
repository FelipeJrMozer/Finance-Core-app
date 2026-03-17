import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
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
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const USER_KEY = 'fc_user';
const SESSION_KEY = 'fc_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(USER_KEY).then((val) => {
      if (val) setUser(JSON.parse(val));
      setIsLoading(false);
    });
  }, []);

  const persistUser = async (u: User | null) => {
    setUser(u);
    if (u) await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    else await AsyncStorage.removeItem(USER_KEY);
  };

  const login = useCallback(async (email: string, password: string) => {
    if (API_URL) {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      await persistUser(data.user || { id: '1', name: email.split('@')[0], email });
    } else {
      // Demo mode
      if (email && password) {
        const u: User = { id: '1', name: 'Alex Silva', email, plan: 'Pro' };
        await persistUser(u);
      } else {
        throw new Error('Invalid credentials');
      }
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (API_URL) {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Registration failed');
      const data = await res.json();
      await persistUser(data.user || { id: '1', name, email });
    } else {
      const u: User = { id: '1', name, email, plan: 'Free' };
      await persistUser(u);
    }
  }, []);

  const logout = useCallback(async () => {
    if (API_URL) {
      await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    }
    await persistUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
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
      user, isLoading, isAuthenticated: !!user,
      login, register, logout, updateUser, apiUrl: API_URL
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
