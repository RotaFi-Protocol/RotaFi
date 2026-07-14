'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import BidStatus from '@/components/BidStatus';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';
import type { Bid } from '@/types';

const MOCK_BIDS: Bid[] = [
  { member: 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47', discount_bps: 500, round: 1 },
  { member: 'GCITJ6GX4GZLFOG6XKVMQAWVVDYQ5K6NCXNB5YVFY2BBLBRUKSK5LLQI', discount_bps: 250, round: 1 },
];

export default function BidsPage() {
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [loading] = useState(false);
  const [bids] = useState<Bid[]>(MOCK_BIDS);

  const handleBid = (discountBps: number) => {
    alert(`Bid of ${discountBps} bps submitted (simulated)`);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Bids</h1>
          <p style={{ color: '#6B7280', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            Submit sealed bids for auction-style circles
          </p>
        </div>
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </div>

      {!wallet.connected && !walletLoading && (
        <EmptyState
          title="Connect your wallet"
          description="Connect your wallet to view and submit bids."
        />
      )}

      {wallet.connected && (
        <>
          {loading && <LoadingSpinner message="Loading bids..." />}
          {!loading && (
            <BidStatus bids={bids} currentRound={1} onBid={handleBid} />
          )}
        </>
      )}
    </div>
  );
}
