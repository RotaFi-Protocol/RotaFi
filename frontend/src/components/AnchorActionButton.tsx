'use client';

import { useCallback, useEffect } from 'react';
import type { WalletState } from '@/types';
import { useAnchor } from '@/hooks/useAnchor';
import { getAsset, toHumanUnits } from '@/lib/assets';

interface AnchorActionButtonProps {
  direction: 'deposit' | 'withdraw';
  wallet: WalletState;
  assetCode: string;
  /** Raw pot/contribution amount in the token's smallest unit. */
  amountStroops: string;
  className?: string;
  testId?: string;
  label?: string;
  /** Fired once the anchor transfer settles successfully. */
  onCompleted?: () => void;
}

/**
 * Single-action SEP-24 button used to fund a contribution from fiat
 * (deposit) or cash out a received pot (withdraw). Handles SEP-10 sign-in,
 * popup launch and status polling; reports completion through `onCompleted`.
 */
export default function AnchorActionButton({
  direction,
  wallet,
  assetCode,
  amountStroops,
  className = 'btn btn-ghost',
  testId,
  label,
  onCompleted,
}: AnchorActionButtonProps) {
  const account = wallet.publicKey ?? '';

  const handleCompleted = useCallback(() => {
    onCompleted?.();
  }, [onCompleted]);

  const {
    state,
    error,
    active,
    popupBlockedUrl,
    deposit,
    withdraw,
  } = useAnchor({ wallet, onCompleted: handleCompleted });

  useEffect(() => {
    if (state !== 'completed') return;
    // Keep the parent informed even if the callback identity changed.
    onCompleted?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const busy =
    state === 'authenticating' ||
    state === 'starting' ||
    state === 'awaiting_user' ||
    state === 'pending';

  const asset = getAsset(assetCode);
  const humanAmount = toHumanUnits(amountStroops, asset);
  const defaultLabel =
    direction === 'deposit'
      ? `Fund ${assetCode} via fiat`
      : `Cash out ${assetCode}`;

  const handleClick = () => {
    if (!account || busy) return;
    const start =
      direction === 'deposit'
        ? () => deposit({ assetCode, account, amount: humanAmount })
        : () => withdraw({ assetCode, account, amount: humanAmount });
    start();
  };

  return (
    <div className="anchor-action">
      <button
        className={className}
        data-testid={testId}
        disabled={!account || busy}
        onClick={handleClick}
      >
        {busy ? 'Processing…' : label ?? defaultLabel}
      </button>

      {error && (
        <p className="anchor-note" role="alert">
          {error}
        </p>
      )}

      {popupBlockedUrl && (
        <p className="anchor-note">
          Popup blocked —{' '}
          <a href={popupBlockedUrl} target="_blank" rel="noopener noreferrer">
            finish the transfer here
          </a>
          .
        </p>
      )}

      {active && (
        <span className={`anchor-mini-badge ${active.status}`} data-testid={`${testId}-status`}>
          {active.status === 'completed' ? 'Completed' : active.status}
        </span>
      )}
    </div>
  );
}