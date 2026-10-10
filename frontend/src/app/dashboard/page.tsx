'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useCircleLifecycle } from '@/hooks/useCircleLifecycle';
import WalletConnect from '@/components/WalletConnect';
import PageHeader from '@/components/PageHeader';
import AnchorActionButton from '@/components/AnchorActionButton';
import { EmptyState } from '@/components/States';
import type { CircleLifecycle, WalletState } from '@/types';
import { formatAssetAmount, getAsset } from '@/lib/assets';
import {
  canContribute,
  canReleasePayout,
  listLifecycles,
  progressPercent,
} from '@/lib/lifecycle';

export default function DashboardPage() {
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [lifecycles, setLifecycles] = useState<CircleLifecycle[]>([]);

  useEffect(() => {
    setLifecycles(listLifecycles());
  }, []);

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

      {wallet.connected && lifecycles.length === 0 && (
        <EmptyState
          title="No active circles"
          description="You haven't joined any circles yet. Browse available circles to get started."
        />
      )}

      {wallet.connected &&
        lifecycles.map((lifecycle) => (
          <DashboardLifecycleCard
            key={lifecycle.circleId}
            lifecycle={lifecycle}
            wallet={wallet}
            self={wallet.publicKey ?? ''}
          />
        ))}
    </div>
  );
}

function DashboardLifecycleCard({
  lifecycle: stored,
  wallet,
  self,
}: {
  lifecycle: CircleLifecycle;
  wallet: WalletState;
  self: string;
}) {
  const { lifecycle, contribute, payout } = useCircleLifecycle({
    circleId: stored.circleId,
    tokenSymbol: stored.tokenSymbol,
    contributionAmount: stored.contributionAmount,
    memberCap: stored.memberCap,
    totalRounds: stored.totalRounds,
  });

  const asset = getAsset(lifecycle.tokenSymbol);
  const completed = lifecycle.state === 'Completed';
  const pct = progressPercent(lifecycle);
  const potStroops = String(
    BigInt(lifecycle.contributionAmount || '0') * BigInt(lifecycle.memberCap || 0),
  );
  const payoutAmount = formatAssetAmount(potStroops, asset);

  return (
    <div className="card" data-testid={`dashboard-circle-${lifecycle.circleId}`}>
      <h3 className="card-title">Circle #{lifecycle.circleId}</h3>
      <div className="stat-grid">
        <Stat label="Status" value={lifecycle.state} testId="dashboard-status" />
        <Stat
          label="Round"
          value={`${lifecycle.currentRound} / ${lifecycle.totalRounds}`}
          testId="dashboard-round"
        />
        <Stat
          label="Members Paid"
          value={`${lifecycle.membersPaidCurrentRound} / ${lifecycle.memberCap}`}
        />
        <Stat
          label="Contribution"
          value={formatAssetAmount(lifecycle.contributionAmount, asset)}
        />
        <Stat label="Currency" value={asset?.symbol ?? lifecycle.tokenSymbol ?? 'USDC'} />
      </div>

      {completed && (
        <div className="completion-banner" data-testid="dashboard-completed">
          Circle completed — every member has been paid.
        </div>
      )}

      <div className="card-section">
        <div className="progress">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <p className="progress-caption" data-testid="dashboard-progress">
          {pct}% complete
        </p>
      </div>

      <div className="detail-actions">
        {canContribute(lifecycle) && (
          <>
            <button
              onClick={contribute}
              className="btn btn-primary"
              data-testid="contribute"
            >
              Contribute {formatAssetAmount(lifecycle.contributionAmount, asset)}
            </button>
            <AnchorActionButton
              direction="deposit"
              wallet={wallet}
              assetCode={asset?.symbol ?? lifecycle.tokenSymbol ?? 'USDC'}
              amountStroops={lifecycle.contributionAmount}
              testId={`fund-fiat-${lifecycle.circleId}`}
              onCompleted={contribute}
            />
          </>
        )}

        {canReleasePayout(lifecycle) && (
          <button
            onClick={() => payout(self)}
            className="btn btn-dark"
            data-testid="release-payout"
          >
            Release Payout of {payoutAmount}
          </button>
        )}

        {lifecycle.hasReceivedPot && (
          <>
            <span className="payout-note" data-testid="dashboard-received-pot">
              You have received the pot.
            </span>
            {!completed && (
              <AnchorActionButton
                direction="withdraw"
                wallet={wallet}
                assetCode={asset?.symbol ?? lifecycle.tokenSymbol ?? 'USDC'}
                amountStroops={potStroops}
                label="Cash out pot"
                testId={`cash-out-${lifecycle.circleId}`}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <br />
      <span className="stat-value" data-testid={testId}>
        {value}
      </span>
    </div>
  );
}