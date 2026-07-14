'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import CircleCard from '@/components/CircleCard';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';
import type { Circle } from '@/types';

const MOCK_CIRCLES: Circle[] = [
  { id: 1, organizer: '', member_cap: 5, payout_method: 0, contribution_amount: '100000000', active: false },
  { id: 2, organizer: '', member_cap: 3, payout_method: 1, contribution_amount: '50000000', active: true },
  { id: 3, organizer: '', member_cap: 10, payout_method: 2, contribution_amount: '200000000', active: false },
];

export default function HomePage() {
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [circles, _setCircles] = useState<Circle[]>(MOCK_CIRCLES);
  const [loading] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Circle Browser</h1>
          <p style={{ color: '#6B7280', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Discover and join ROSCA circles on Stellar
          </p>
        </div>
        <WalletConnect
          wallet={wallet}
          isLoading={walletLoading}
          error={walletError}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </div>

      {!wallet.connected && !walletLoading && (
        <EmptyState
          title="Connect your wallet"
          description="Connect Freighter, xBull, or Rabet to browse and join circles."
        />
      )}

      {wallet.connected && (
        <>
          {loading && <LoadingSpinner message="Loading circles..." />}
          {!loading && circles.length === 0 && (
            <EmptyState
              title="No circles yet"
              description="Be the first to create a ROSCA circle on RotaFi."
            />
          )}
          {!loading && circles.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {circles.map((circle) => (
                <CircleCard
                  key={circle.id}
                  circle={circle}
                  onJoin={wallet.connected ? (id) => alert(`Joining circle ${id}`) : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
