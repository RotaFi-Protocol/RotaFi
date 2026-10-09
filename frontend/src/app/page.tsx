'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import CircleCard from '@/components/CircleCard';
import PageHeader from '@/components/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/States';
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
      <PageHeader title="Circle Browser" subtitle="Discover and join ROSCA circles on Stellar">
        <WalletConnect
          wallet={wallet}
          isLoading={walletLoading}
          error={walletError}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </PageHeader>

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
            <div className="circle-grid">
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
