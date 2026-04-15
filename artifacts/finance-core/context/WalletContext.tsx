import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getApiBaseUrl, setCurrentWalletId } from '@/services/api';
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

function isDefaultWallet(w: Record<string, unknown>): boolean {
  return !!(
    w.isDefault === true ||
    w.is_default === true ||
    w.default === true ||
    w.isPrimary === true ||
    w.is_primary === true ||
    w.primary === true ||
    w.isMain === true
  );
}

function findDefaultWallet(list: Wallet[]): Wallet | null {
  const byFlag = list.find((w) => isDefaultWallet(w as unknown as Record<string, unknown>));
  if (byFlag) return byFlag;
  const byName = list.find((w) =>
    w.name.toLowerCase().includes('principal') ||
    w.name.toLowerCase().includes('main') ||
    w.name.toLowerCase().includes('default')
  );
  return byName || null;
}

interface WalletContextType {
  wallets: Wallet[];
  selectedWallet: Wallet | null;
  selectedWalletId: string | null;
  isLoading: boolean;
  isReady: boolean;
  walletError: string | null;
  selectWallet: (wallet: Wallet) => Promise<void>;
  refreshWallets: () => Promise<void>;
}

const SELECTED_WALLET_KEY = 'pf_selected_wallet_id';
const USER_CHOSE_KEY = 'pf_user_chose_wallet';
const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
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
        console.log('[WalletContext] response:', text.slice(0, 400));
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { parsed = []; }
        const raw = extractWallets(parsed);
        console.log('[WalletContext] wallet count:', raw.length, '| names:', raw.map((w) => (w as Record<string, unknown>).name));
        const list = assignColors(raw);
        setWallets(list);

        if (list.length > 0) {
          const savedId = await AsyncStorage.getItem(SELECTED_WALLET_KEY);
          const userChose = await AsyncStorage.getItem(USER_CHOSE_KEY);

          const apiDefault = findDefaultWallet(list);
          console.log('[WalletContext] api default:', apiDefault?.name, '| savedId:', savedId, '| userChose:', userChose);

          if (apiDefault && !userChose) {
            console.log('[WalletContext] selecting API default:', apiDefault.name);
            setSelectedWallet(apiDefault);
            await AsyncStorage.setItem(SELECTED_WALLET_KEY, apiDefault.id);
          } else if (savedId) {
            const saved = list.find((w) => w.id === savedId);
            if (saved) {
              console.log('[WalletContext] selecting saved:', saved.name);
              setSelectedWallet(saved);
            } else {
              const fallback = apiDefault || list[0];
              console.log('[WalletContext] savedId not found, fallback:', fallback.name);
              setSelectedWallet(fallback);
              await AsyncStorage.setItem(SELECTED_WALLET_KEY, fallback.id);
              await AsyncStorage.removeItem(USER_CHOSE_KEY);
            }
          } else {
            const fallback = apiDefault || list[0];
            console.log('[WalletContext] no saved, using:', fallback.name);
            setSelectedWallet(fallback);
            await AsyncStorage.setItem(SELECTED_WALLET_KEY, fallback.id);
          }
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
      setIsReady(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshWallets();
    } else {
      setWallets([]);
      setSelectedWallet(null);
      setWalletError(null);
      setIsReady(false);
    }
  }, [isAuthenticated, refreshWallets]);

  useEffect(() => {
    setCurrentWalletId(selectedWallet?.id || null);
    console.log('[WalletContext] x-wallet-id header set to:', selectedWallet?.id || 'null');
  }, [selectedWallet]);

  const selectWallet = useCallback(async (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setCurrentWalletId(wallet.id);
    await AsyncStorage.setItem(SELECTED_WALLET_KEY, wallet.id);
    await AsyncStorage.setItem(USER_CHOSE_KEY, 'true');
    console.log('[WalletContext] user manually selected:', wallet.name);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallets,
        selectedWallet,
        selectedWalletId: selectedWallet?.id || null,
        isLoading,
        isReady,
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
