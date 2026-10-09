'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import PageHeader from '@/components/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/States';
import type { ReputationScore } from '@/types';

export default function ReputationPage() {
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [loading] = useState(false);
  const [score] = useState<ReputationScore | null>({
    address: 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47',
    circles_joined: 5,
    circles_completed: 4,
    defaults: 1,
    total_slashed: '25000000',
    last_updated: Math.floor(Date.now() / 1000),
  });

  const rating = score
    ? Math.min(100, Math.floor((score.circles_completed * 100) / (score.circles_completed + score.defaults)))
    : 0;

  return (
    <div>
      <PageHeader title="Reputation" subtitle="On-chain reputation score across all circles">
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </PageHeader>

      {!wallet.connected && !walletLoading && (
        <EmptyState
          title="Connect your wallet"
          description="Connect your wallet to view your reputation score."
        />
      )}

      {wallet.connected && (
        <>
          {loading && <LoadingSpinner message="Loading reputation..." />}
          {!loading && !score && (
            <EmptyState
              title="No reputation yet"
              description="Join a circle to start building your on-chain reputation."
            />
          )}
          {!loading && score && (
            <div className="page-body">
              <div className="rating-card">
                <div
                  className="rating-circle"
                  style={{
                    borderColor: rating >= 80 ? '#10B981' : rating >= 50 ? '#F59E0B' : '#EF4444',
                    color: rating >= 80 ? '#10B981' : rating >= 50 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  <span className="rating-score">{rating}</span>
                  <span className="rating-scale">out of 100</span>
                </div>
                <p className="rating-label">
                  {rating >= 80 ? 'Excellent' : rating >= 50 ? 'Fair' : 'Poor'} Reputation
                </p>
              </div>

              <div className="stats-grid">
                <StatBox label="Circles Joined" value={String(score.circles_joined)} />
                <StatBox label="Completed" value={String(score.circles_completed)} />
                <StatBox label="Defaults" value={String(score.defaults)} />
                <StatBox label="Total Slashed" value={`${(parseInt(score.total_slashed) / 1e7).toFixed(2)} USDC`} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-box">
      <span className="stat-box-label">{label}</span>
      <span className="stat-box-value">{value}</span>
    </div>
  );
}
