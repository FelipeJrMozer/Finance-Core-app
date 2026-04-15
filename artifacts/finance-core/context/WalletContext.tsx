import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface Wallet {
  id: string;
  name: string;
  isDefault?: boolean;
  currency?: string;
  color?: string;
  description?: string;
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
      const data = await apiGet<Wallet[]>('/api/wallets');
      const list = Array.isArray(data) ? data : [];
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
