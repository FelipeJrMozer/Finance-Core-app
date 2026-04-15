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

function extractWallets(data: unknown): Omit<Wallet, 'color'>[] {
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

    console.log('[WalletContext] fetching wallets from:', getApiBaseUrl() + '/api/wallets');

    try {
      const res = await apiFetch('/api/wallets');
      console.log('[WalletContext] /api/wallets status:', res.status);

      if (res.ok) {
        const text = await res.text();
        console.log('[WalletContext] response:', text.slice(0, 300));
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { parsed = []; }
        const raw = extractWallets(parsed);
        console.log('[WalletContext] wallet count:', raw.length);
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
      } else if (res.status === 401) {
        console.warn('[WalletContext] 401 - session expired');
        setWalletError('session_expired');
      } else {
        const body = await res.text().catch(() => '');
        console.warn('[WalletContext] error', res.status, body.slice(0, 100));
        setWalletError(`HTTP ${res.status}`);
      }
    } catch (e) {
      const msg = String(e);
      console.warn('[WalletContext] fetch error:', msg);
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
        setWalletError('network');
      } else {
        setWalletError(msg.slice(0, 80));
      }
    } finally {
      setIsLoading(false);
    }
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
