'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import AssetBadge from '@/components/AssetBadge';
import PageHeader from '@/components/PageHeader';
import { LoadingSpinner, ErrorState } from '@/components/States';
import type { Circle } from '@/types';
import { formatAssetAmount, getAsset } from '@/lib/assets';

export default function CircleDetailPage() {
  const params = useParams();
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [loading] = useState(false);

  const id = Number(params.id);
  const circle: Circle | null = id > 0 ? {
    id,
    organizer: 'CC2XL...BHDSX6',
    member_cap: 5,
    payout_method: 0,
    contribution_amount: '100000000',
    active: true,
    token_symbol: 'EURC',
  } : null;

  const asset = circle ? getAsset(circle.token_symbol || circle.token_address) : null;

  return (
    <div>
      <PageHeader title={`Circle #${id}`}>
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </PageHeader>

      {loading && <LoadingSpinner />}
      {!loading && !circle && <ErrorState message="Circle not found." />}
      {!loading && circle && (
        <div className="card">
          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-field-label">Organizer</span>
              <br />
              <span className="detail-field-value mono">{circle.organizer}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Payout Method</span>
              <br />
              <span className="detail-field-value">{['Lottery', 'Auction', 'Priority'][circle.payout_method]}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Member Cap</span>
              <br />
              <span className="detail-field-value">{circle.member_cap}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Contribution</span>
              <br />
              <span className="detail-field-value">
                {formatAssetAmount(circle.contribution_amount, asset)}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Currency</span>
              <br />
              <AssetBadge symbol={circle.token_symbol} address={circle.token_address} />
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Status</span>
              <br />
              <span className={circle.active ? 'detail-status-active' : 'detail-status-setup'}>
                {circle.active ? 'Active' : 'Setup'}
              </span>
            </div>
          </div>

          {!circle.active && wallet.connected && (
            <div className="detail-actions">
              <button
                onClick={() => alert('Joining circle (simulated)')}
                className="btn btn-primary"
              >
                Join Circle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
