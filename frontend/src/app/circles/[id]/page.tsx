'use client';

import { useParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useCircleLifecycle } from '@/hooks/useCircleLifecycle';
import WalletConnect from '@/components/WalletConnect';
import AssetBadge from '@/components/AssetBadge';
import PageHeader from '@/components/PageHeader';
import AnchorActionButton from '@/components/AnchorActionButton';
import { LoadingSpinner, ErrorState } from '@/components/States';
import type { Circle } from '@/types';
import { formatAssetAmount, getAsset } from '@/lib/assets';
import {
  canContribute,
  canReleasePayout,
  memberAddress,
} from '@/lib/lifecycle';
import { shortenAddress } from '@/lib/contracts';

export default function CircleDetailPage() {
  const params = useParams();
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();

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

  const { lifecycle, join, contribute, payout } = useCircleLifecycle({
    circleId: id,
    tokenSymbol: circle?.token_symbol || 'USDC',
    contributionAmount: circle?.contribution_amount || '0',
    memberCap: circle?.member_cap || 0,
  });

  const asset = circle ? getAsset(circle.token_symbol || circle.token_address) : null;
  const self = wallet.publicKey ?? '';
  const joined = lifecycle.joined;
  const completed = lifecycle.state === 'Completed';
  const potStroops = String(
    BigInt(lifecycle.contributionAmount || '0') * BigInt(lifecycle.memberCap || 0),
  );
  const payoutAmount = formatAssetAmount(potStroops, asset);

  return (
    <div>
      <PageHeader title={`Circle #${id}`}>
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </PageHeader>

      {!wallet.connected && !walletLoading && (
        <ErrorState message="Connect your wallet to view this circle." />
      )}

      {wallet.connected && !circle && <ErrorState message="Circle not found." />}

      {wallet.connected && circle && (
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
              <span
                data-testid="circle-status"
                className={
                  completed
                    ? 'detail-status-completed'
                    : joined
                      ? 'detail-status-active'
                      : 'detail-status-setup'
                }
              >
                {joined ? lifecycle.state : 'Setup'}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Round</span>
              <br />
              <span className="detail-field-value" data-testid="current-round">
                {joined ? lifecycle.currentRound : 0} / {lifecycle.totalRounds}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Members Paid</span>
              <br />
              <span className="detail-field-value" data-testid="members-paid">
                {lifecycle.membersPaidCurrentRound} / {circle.member_cap}
              </span>
            </div>
          </div>

          {completed && (
            <div className="completion-banner" data-testid="completion-banner">
              <strong>Circle complete.</strong> Every member has received the pot.
            </div>
          )}

          <div className="detail-actions">
            {!joined && (
              <button
                onClick={join}
                className="btn btn-primary"
                data-testid="join-circle"
              >
                Join Circle
              </button>
            )}

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
                  assetCode={asset?.symbol ?? circle.token_symbol ?? 'USDC'}
                  amountStroops={lifecycle.contributionAmount}
                  testId="fund-fiat"
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

            {joined && lifecycle.hasReceivedPot && (
              <>
                <span className="payout-note" data-testid="received-pot">
                  You have received the pot.
                </span>
                {!completed && (
                  <AnchorActionButton
                    direction="withdraw"
                    wallet={wallet}
                    assetCode={asset?.symbol ?? circle.token_symbol ?? 'USDC'}
                    amountStroops={potStroops}
                    label="Cash out pot"
                    testId="cash-out-pot"
                  />
                )}
              </>
            )}
          </div>

          {lifecycle.history.length > 0 && (
            <div className="card-section" data-testid="round-history">
              <h4 className="card-title">Payout History</h4>
              {lifecycle.history.map((record) => (
                <div className="bid-row" key={record.round} data-testid={`round-${record.round}`}>
                  <span className="bid-member">
                    Round {record.round} — {record.winner === self ? 'You' : shortenAddress(record.winner)}
                  </span>
                  <span className="bid-discount">
                    {formatAssetAmount(record.payout_amount, asset)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {wallet.connected && circle && (
        <p className="page-subtitle">
          Members: {[self, ...Array.from({ length: Math.max(circle.member_cap - 1, 0) }, (_, i) => memberAddress(i + 1))]
            .slice(0, circle.member_cap)
            .map((addr) => (addr === self ? 'you' : shortenAddress(addr)))
            .join(', ')}
        </p>
      )}
    </div>
  );
}
