'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/States';
import type { MemberInfo, VaultState } from '@/types';

export default function DashboardPage() {
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [loading] = useState(false);
  const [vault] = useState<VaultState | null>({
    config: {
      circle_id: 1,
      contribution_per_member: '100000000',
      member_cap: 5,
      total_rounds: 5,
      min_collateral: '50000000',
    },
    current_round: 3,
    state: 'Active',
    member_count: 5,
    members_paid_current_round: 4,
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Dashboard</h1>
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </div>

      {!wallet.connected && !walletLoading && (
        <EmptyState
          title="Connect your wallet"
          description="Connect your wallet to view your active circles and contribution status."
        />
      )}

      {wallet.connected && (
        <>
          {loading && <LoadingSpinner message="Loading dashboard..." />}
          {!loading && !vault && (
            <EmptyState
              title="No active circles"
              description="You haven't joined any circles yet. Browse available circles to get started."
            />
          )}
          {!loading && vault && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>
                  Circle #{vault.config.circle_id}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <Stat label="Status" value={vault.state} />
                  <Stat label="Round" value={`${vault.current_round} / ${vault.config.total_rounds}`} />
                  <Stat label="Members Paid" value={`${vault.members_paid_current_round} / ${vault.member_count}`} />
                  <Stat label="Contribution" value={`${(parseInt(vault.config.contribution_per_member) / 1e7).toFixed(2)} USDC`} />
                  <Stat label="Collateral" value={`${(parseInt(vault.config.min_collateral) / 1e7).toFixed(2)} USDC`} />
                  <Stat label="Member Cap" value={String(vault.config.member_cap)} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div style={{ height: '8px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(vault.members_paid_current_round / vault.member_count) * 100}%`,
                      backgroundColor: '#7C3AED',
                      borderRadius: '4px',
                      transition: 'width 0.3s',
                    }} />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '0.25rem 0 0 0', textAlign: 'right' }}>
                    {Math.round((vault.members_paid_current_round / vault.member_count) * 100)}% paid
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ color: '#6B7280' }}>{label}</span>
      <br />
      <span style={{ fontWeight: 600, color: '#374151' }}>{value}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  backgroundColor: 'white',
};
