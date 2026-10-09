'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import BidStatus from '@/components/BidStatus';
import PageHeader from '@/components/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/States';
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
      <PageHeader title="Bids" subtitle="Submit sealed bids for auction-style circles">
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </PageHeader>

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
