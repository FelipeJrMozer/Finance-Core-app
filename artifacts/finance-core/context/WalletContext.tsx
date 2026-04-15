import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/services/api';
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

interface WalletContextType {
  wallets: Wallet[];
  selectedWallet: Wallet | null;
  selectedWalletId: string | null;
  isLoading: boolean;
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

  const refreshWallets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await apiGet<Omit<Wallet, 'color'>[]>('/api/wallets');
      const raw = Array.isArray(data) ? data : [];
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
    } catch (e) {
      console.warn('[WalletContext] fetchWallets error:', e);
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
