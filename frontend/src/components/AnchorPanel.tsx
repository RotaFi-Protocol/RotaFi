'use client';

import { useMemo, useState } from 'react';
import type { AnchorAsset, WalletState } from '@/types';
import { useAnchor } from '@/hooks/useAnchor';
import AnchorStatus from './AnchorStatus';

function statusBadgeClass(status: string): string {
  if (status === 'completed') return 'badge badge-active';
  if (status === 'incomplete' || status === 'pending_user_transfer_start') return 'badge badge-setup';
  return 'badge badge-setup';
}

export default function AnchorPanel({ wallet }: { wallet: WalletState }) {
  const account = wallet.publicKey ?? '';
  const { info, state, error, active, history, popupBlockedUrl, deposit, withdraw } = useAnchor({
    wallet,
  });

  const [assetCode, setAssetCode] = useState<string>('');
  const [amount, setAmount] = useState('');

  const assets: AnchorAsset[] = useMemo(() => {
    if (info?.assets?.length) return info.assets;
    return [];
  }, [info]);

  const selected = assetCode || info?.default_asset || assets[0]?.code || 'USDC';
  const selectedAsset = assets.find((a) => a.code === selected);
  const busy = state === 'authenticating' || state === 'starting' || state === 'awaiting_user' || state === 'pending';

  const handleDeposit = () => {
    if (!account) return;
    deposit({
      assetCode: selected,
      account,
      amount: amount.trim() || undefined,
    });
  };

  const handleWithdraw = () => {
    if (!account) return;
    withdraw({
      assetCode: selected,
      account,
      amount: amount.trim() || undefined,
    });
  };

  return (
    <div className="anchor-panel">
      <div className="card" data-testid="anchor-card">
        <h3 className="card-title">Fiat on/off ramp</h3>
        {info ? (
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">Anchor</span>
              <br />
              <span className="stat-value" data-testid="anchor-home-domain">
                {info.home_domain}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">SEP-10 sign-in</span>
              <br />
              <span className="stat-value">{info.auth_required ? 'Required' : 'Not required'}</span>
            </div>
          </div>
        ) : (
          <p className="anchor-status is-idle">Loading anchor…</p>
        )}

        <div className="anchor-form">
          <label className="anchor-field">
            <span className="anchor-label">Asset</span>
            <select
              className="currency-select"
              data-testid="anchor-asset"
              value={selected}
              onChange={(e) => setAssetCode(e.target.value)}
            >
              {assets.map((asset) => (
                <option key={asset.code} value={asset.code}>
                  {asset.code}
                </option>
              ))}
              {assets.length === 0 && <option value="USDC">USDC</option>}
            </select>
          </label>

          <label className="anchor-field">
            <span className="anchor-label">Amount (optional, fiat units)</span>
            <input
              className="anchor-input"
              data-testid="anchor-amount"
              type="text"
              inputMode="decimal"
              placeholder="e.g. 5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </div>

        {selectedAsset && (
          <p className="anchor-limits" data-testid="anchor-limits">
            Limit: {selectedAsset.deposit.min_amount ?? '—'}–
            {selectedAsset.deposit.max_amount ?? '—'} {selected}
          </p>
        )}

        <div className="anchor-actions">
          <button
            className="btn btn-primary"
            data-testid="anchor-deposit"
            disabled={!account || busy}
            onClick={handleDeposit}
          >
            Fund with {selected}
          </button>
          <button
            className="btn btn-dark"
            data-testid="anchor-withdraw"
            disabled={!account || busy}
            onClick={handleWithdraw}
          >
            Cash out {selected}
          </button>
        </div>

        <AnchorStatus state={state} />

        {error && (
          <p className="anchor-error" role="alert" data-testid="anchor-error">
            {error}
          </p>
        )}

        {popupBlockedUrl && (
          <p className="anchor-note">
            Your browser blocked the anchor window.{' '}
            <a href={popupBlockedUrl} target="_blank" rel="noopener noreferrer">
              Open it manually
            </a>{' '}
            to finish the transfer.
          </p>
        )}

        {active && (
          <div className="anchor-active" data-testid="anchor-active">
            <span className="anchor-active-label">
              {active.direction === 'deposit' ? 'Deposit' : 'Withdrawal'} {active.assetCode}
            </span>
            <span className={statusBadgeClass(active.status)} data-testid="anchor-active-status">
              {active.status}
            </span>
            <a
              className="anchor-reopen"
              href={active.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Reopen window
            </a>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card" data-testid="anchor-history">
          <h3 className="card-title">Recent transfers</h3>
          {history.map((record) => (
            <div className="bid-row" key={record.id} data-testid={`anchor-history-${record.id}`}>
              <span className="bid-member">
                {record.direction === 'deposit' ? 'Deposit' : 'Withdraw'} {record.assetCode}
                {record.amount ? ` · ${record.amount}` : ''}
              </span>
              <span className={statusBadgeClass(record.status)}>{record.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}