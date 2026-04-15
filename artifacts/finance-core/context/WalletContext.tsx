import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getApiBaseUrl } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface Wallet {
  id: string;
  name: string;
  isDefault?: boolean;
  currency?: string;
  color: string;
  description?: string;
}

const PALETTE = [
  '#0096C7', '#6C5CE7', '#00B894', '#FD9644', '#E84393',
  '#2ED573', '#F53B57', '#1E90FF', '#A29BFE', '#FDCB6E',
];

function assignColors(list: Omit<Wallet, 'color'>[]): Wallet[] {
  return list.map((w, i) => ({
    ...w,
    color: (w as Record<string, unknown>).color as string || PALETTE[i % PALETTE.length],
  }));
}

function extractWalletsFromResponse(data: unknown): Omit<Wallet, 'color'>[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.wallets)) return obj.wallets as Omit<Wallet, 'color'>[];
    if (Array.isArray(obj.data)) return obj.data as Omit<Wallet, 'color'>[];
    if (Array.isArray(obj.items)) return obj.items as Omit<Wallet, 'color'>[];
  }
  return [];
}

interface WalletContextType {
  wallets: Wallet[];
  selectedWallet: Wallet | null;
  selectedWalletId: string | null;
  isLoading: boolean;
  walletError: string | null;
  selectWallet: (wallet: Wallet) => Promise<void>;
  refreshWallets: () => Promise<void>;
}

const SELECTED_WALLET_KEY = 'pf_selected_wallet_id';
const WalletContext = createContext<WalletContextType | null>(null);

const WALLET_ENDPOINTS = [
  '/api/wallets',
  '/api/user/wallets',
  '/api/portfolios',
];

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const refreshWallets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setWalletError(null);

    const base = getApiBaseUrl();
    console.log('[WalletContext] base URL:', base);

    let lastError: string | null = null;
    let found = false;

    for (const endpoint of WALLET_ENDPOINTS) {
      try {
        console.log('[WalletContext] trying endpoint:', endpoint);
        const res = await apiFetch(endpoint);
        const statusText = `HTTP ${res.status}`;
        console.log('[WalletContext]', endpoint, statusText);

        if (res.ok) {
          const text = await res.text();
          console.log('[WalletContext] raw response:', text.slice(0, 300));
          let parsed: unknown;
          try { parsed = JSON.parse(text); } catch { parsed = []; }
          const raw = extractWalletsFromResponse(parsed);
          console.log('[WalletContext] parsed wallets count:', raw.length);
          const list = assignColors(raw);
          setWallets(list);

          const savedId = await AsyncStorage.getItem(SELECTED_WALLET_KEY);
          const saved = savedId ? list.find((w) => w.id === savedId) : null;
          if (saved) {
            setSelectedWallet(saved);
          } else if (list.length > 0) {
            const def = list.find((w) => w.isDefault) || list[0];
            setSelectedWallet(def);
            await AsyncStorage.setItem(SELECTED_WALLET_KEY, def.id);
          }
          found = true;
          break;
        } else if (res.status === 404) {
          lastError = `${endpoint}: não encontrado (404)`;
          console.warn('[WalletContext]', lastError);
        } else if (res.status === 401) {
          lastError = 'Sessão expirada — faça login novamente';
          console.warn('[WalletContext]', lastError);
          break;
        } else {
          const errText = await res.text().catch(() => '');
          lastError = `${endpoint}: erro ${res.status} - ${errText.slice(0, 100)}`;
          console.warn('[WalletContext]', lastError);
        }
      } catch (e) {
        lastError = `${endpoint}: ${String(e).slice(0, 100)}`;
        console.warn('[WalletContext] fetch error:', lastError);
      }
    }

    if (!found) {
      setWalletError(lastError || 'Não foi possível carregar as carteiras');
    }

    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshWallets();
    } else {
      setWallets([]);
      setSelectedWallet(null);
      setWalletError(null);
    }
  }, [isAuthenticated, refreshWallets]);

  const selectWallet = useCallback(async (wallet: Wallet) => {
    setSelectedWallet(wallet);
    await AsyncStorage.setItem(SELECTED_WALLET_KEY, wallet.id);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallets,
        selectedWallet,
        selectedWalletId: selectedWallet?.id || null,
        isLoading,
        walletError,
        selectWallet,
        refreshWallets,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
