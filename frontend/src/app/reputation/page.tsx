'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Reputation</h1>
          <p style={{ color: '#6B7280', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
            On-chain reputation score across all circles
          </p>
        </div>
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </div>

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
            <div style={styles.container}>
              <div style={styles.ratingCard}>
                <div style={{
                  ...styles.ratingCircle,
                  borderColor: rating >= 80 ? '#10B981' : rating >= 50 ? '#F59E0B' : '#EF4444',
                  color: rating >= 80 ? '#10B981' : rating >= 50 ? '#F59E0B' : '#EF4444',
                }}>
                  <span style={{ fontSize: '2rem', fontWeight: 700 }}>{rating}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>out of 100</span>
                </div>
                <p style={styles.ratingLabel}>
                  {rating >= 80 ? 'Excellent' : rating >= 50 ? 'Fair' : 'Poor'} Reputation
                </p>
              </div>

              <div style={styles.statsGrid}>
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
    <div style={statBoxStyle}>
      <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>{label}</span>
      <span style={{ fontWeight: 700, fontSize: '1.25rem', color: '#111827' }}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  ratingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
  },
  ratingCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '4px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '0.5rem',
  },
  ratingLabel: { color: '#374151', fontWeight: 500, margin: 0 },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '0.75rem',
  },
};

const statBoxStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #E5E7EB',
  borderRadius: '0.5rem',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};
