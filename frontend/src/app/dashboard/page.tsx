'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import PageHeader from '@/components/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/States';
import type { VaultState } from '@/types';
import { formatAssetAmount, getAsset } from '@/lib/assets';

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
      token_symbol: 'XLM',
    },
    current_round: 3,
    state: 'Active',
    member_count: 5,
    members_paid_current_round: 4,
  });

  const asset = vault ? getAsset(vault.config.token_symbol || vault.config.token_address) : null;
  const paidPct = vault ? Math.round((vault.members_paid_current_round / vault.member_count) * 100) : 0;

  return (
    <div>
      <PageHeader title="Dashboard">
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </PageHeader>

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
            <div className="card">
              <h3 className="card-title">Circle #{vault.config.circle_id}</h3>
              <div className="stat-grid">
                <Stat label="Status" value={vault.state} />
                <Stat label="Round" value={`${vault.current_round} / ${vault.config.total_rounds}`} />
                <Stat label="Members Paid" value={`${vault.members_paid_current_round} / ${vault.member_count}`} />
                <Stat label="Contribution" value={formatAssetAmount(vault.config.contribution_per_member, asset)} />
                <Stat label="Collateral" value={formatAssetAmount(vault.config.min_collateral, asset)} />
                <Stat label="Member Cap" value={String(vault.config.member_cap)} />
                <Stat label="Currency" value={asset?.symbol ?? vault.config.token_symbol ?? 'USDC'} />
              </div>

              <div className="card-section">
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${paidPct}%` }} />
                </div>
                <p className="progress-caption">{paidPct}% paid</p>
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
    <div className="stat">
      <span className="stat-label">{label}</span>
      <br />
      <span className="stat-value">{value}</span>
    </div>
  );
}
