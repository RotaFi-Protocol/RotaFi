'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WalletState, WalletProvider } from '@/types';

const STORAGE_KEY = 'rotafi_wallet_provider';

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    publicKey: null,
    provider: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (provider: WalletProvider) => {
    if (!provider) return;
    setError(null);

    try {
      let publicKey: string | null = null;

      if (provider === 'freighter') {
        const isAvailable = await (window as any).freighterApi
          ?.isConnected()
          .catch(() => false);
        if (!isAvailable) {
          throw new Error('Freighter wallet not available. Please install the extension.');
        }
        publicKey = await (window as any).freighterApi.getPublicKey();
      } else if (provider === 'xbull') {
        const isAvailable = !!(window as any).xBullSDK;
        if (!isAvailable) {
          throw new Error('xBull wallet not available. Please install the extension.');
        }
        const xBull = await (window as any).xBullSDK.getPublicKey();
        publicKey = xBull;
      } else if (provider === 'rabet') {
        const isAvailable = !!(window as any).rabet;
        if (!isAvailable) {
          throw new Error('Rabet wallet not available. Please install the extension.');
        }
        const rabet = await (window as any).rabet.connect();
        publicKey = rabet.publicKey;
      }

      if (publicKey) {
        const state: WalletState = {
          connected: true,
          publicKey,
          provider,
        };
        setWallet(state);
        localStorage.setItem(STORAGE_KEY, provider);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      setWallet({
        connected: false,
        publicKey: null,
        provider: null,
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      connected: false,
      publicKey: null,
      provider: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const savedProvider = localStorage.getItem(STORAGE_KEY) as WalletProvider;
    if (savedProvider && !wallet.connected) {
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  return {
    wallet,
    isLoading,
    error,
    connect,
    disconnect,
  };
}
