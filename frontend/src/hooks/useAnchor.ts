'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AnchorInfo,
  AnchorTransaction,
  AnchorTransfer,
  AnchorTransferRecord,
  AnchorTransferState,
  WalletState,
} from '@/types';
import {
  fetchAnchorInfo,
  fetchAuthChallenge,
  fetchTransaction,
  startDeposit,
  startWithdraw,
  submitAuth,
} from '@/lib/anchor';
import { loadAnchorHistory, upsertAnchorRecord } from '@/lib/anchorHistory';
import { signSep10Challenge } from '@/lib/sep10';

const POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_ANCHOR_POLL_INTERVAL_MS || 5000);

export interface StartTransferOptions {
  assetCode: string;
  account: string;
  amount?: string;
  dest?: string;
}

export interface UseAnchorOptions {
  wallet: WalletState;
  /** Called once a transfer reaches a successful (`completed`) state. */
  onCompleted?: (record: AnchorTransferRecord, tx: AnchorTransaction) => void;
  /** Called when a transfer terminates without success. */
  onFailed?: (record: AnchorTransferRecord, tx: AnchorTransaction) => void;
}

/**
 * Drives the SEP-24 deposit/withdrawal lifecycle: SEP-10 sign-in, starting the
 * interactive transfer, opening the anchor popup and polling for completion.
 */
export function useAnchor({ wallet, onCompleted, onFailed }: UseAnchorOptions) {
  const [info, setInfo] = useState<AnchorInfo | null>(null);
  const [state, setState] = useState<AnchorTransferState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<AnchorTransferRecord | null>(null);
  const [history, setHistory] = useState<AnchorTransferRecord[]>([]);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);

  const tokenRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHistory(loadAnchorHistory());
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /** Loads (or reloads) the anchor's SEP-24 capabilities. */
  const loadInfo = useCallback(async () => {
    try {
      setError(null);
      const next = await fetchAnchorInfo();
      setInfo(next);
      return next;
    } catch (err: any) {
      setError(err.message || 'Failed to load anchor info');
      return null;
    }
  }, []);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  /** Ensures a valid SEP-10 JWT is available, signing a fresh challenge if not. */
  const ensureAuth = useCallback(
    async (anchor: AnchorInfo | null): Promise<string | undefined> => {
      if (!anchor?.auth_required) return tokenRef.current ?? undefined;
      if (tokenRef.current) return tokenRef.current;
      if (!wallet.publicKey) throw new Error('Connect your wallet to sign in with the anchor.');

      setState('authenticating');
      const challenge = await fetchAuthChallenge(wallet.publicKey);
      const signed = await signSep10Challenge(challenge, wallet);
      const { token } = await submitAuth(signed);
      tokenRef.current = token;
      return token;
    },
    [wallet],
  );

  const poll = useCallback(
    (record: AnchorTransferRecord, token?: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const tx = await fetchTransaction(record.id, token ?? tokenRef.current ?? undefined);
          const updated: AnchorTransferRecord = {
            ...record,
            status: tx.status,
            updatedAt: Date.now(),
          };
          setHistory(upsertAnchorRecord(updated));
          setActive(updated);

          if (tx.terminal) {
            stopPolling();
            if (tx.status === 'completed') {
              setState('completed');
              onCompleted?.(updated, tx);
            } else {
              setState('failed');
              setError(tx.message || `Anchor transfer ${tx.status}`);
              onFailed?.(updated, tx);
            }
          } else {
            setState('pending');
          }
        } catch (err: any) {
          setError(err.message || 'Failed to poll anchor transaction');
        }
      }, POLL_INTERVAL_MS);
    },
    [onCompleted, onFailed, stopPolling],
  );

  const begin = useCallback(
    async (
      direction: 'deposit' | 'withdraw',
      options: StartTransferOptions,
      popup: Window | null,
    ) => {
      setError(null);
      setPopupBlockedUrl(null);
      setState('starting');

      const anchor = info ?? (await loadInfo());
      const token = await ensureAuth(anchor);

      const payload = {
        asset_code: options.assetCode,
        account: options.account,
        amount: options.amount,
        ...(direction === 'withdraw' ? { dest: options.dest } : {}),
      };

      const transfer: AnchorTransfer =
        direction === 'deposit'
          ? await startDeposit(payload, token)
          : await startWithdraw(payload, token);

      setState('awaiting_user');
      const record: AnchorTransferRecord = {
        id: transfer.id,
        direction,
        assetCode: options.assetCode,
        amount: options.amount,
        account: options.account,
        status: transfer.status || 'incomplete',
        url: transfer.url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setActive(record);
      setHistory(upsertAnchorRecord(record));

      if (popup && !popup.closed) {
        popup.location.href = transfer.url;
      } else {
        setPopupBlockedUrl(transfer.url);
        window.open(transfer.url, '_blank', 'noopener,noreferrer');
      }

      poll(record, transfer.token);
      return record;
    },
    [ensureAuth, info, loadInfo, poll],
  );

  /** Opens the interactive deposit popup and starts a fiat on-ramp. */
  const deposit = useCallback(
    (options: StartTransferOptions) => {
      const popup = window.open('about:blank', 'sep24-deposit', 'width=560,height=760');
      return begin('deposit', options, popup);
    },
    [begin],
  );

  /** Opens the interactive withdrawal popup to cash out a pot. */
  const withdraw = useCallback(
    (options: StartTransferOptions) => {
      const popup = window.open('about:blank', 'sep24-withdraw', 'width=560,height=760');
      return begin('withdraw', options, popup);
    },
    [begin],
  );

  const reset = useCallback(() => {
    stopPolling();
    setState('idle');
    setActive(null);
    setError(null);
    setPopupBlockedUrl(null);
  }, [stopPolling]);

  return {
    info,
    state,
    error,
    active,
    history,
    popupBlockedUrl,
    loadInfo,
    deposit,
    withdraw,
    reset,
  };
}