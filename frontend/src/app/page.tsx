'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import CircleCard from '@/components/CircleCard';
import PageHeader from '@/components/PageHeader';
import { LoadingSpinner, EmptyState } from '@/components/States';
import type { Circle } from '@/types';
import { SUPPORTED_ASSETS } from '@/lib/assets';

const MOCK_CIRCLES: Circle[] = [
  { id: 1, organizer: '', member_cap: 5, payout_method: 0, contribution_amount: '100000000', active: false, token_symbol: 'USDC' },
  { id: 2, organizer: '', member_cap: 3, payout_method: 1, contribution_amount: '75000000', active: true, token_symbol: 'EURC' },
  { id: 3, organizer: '', member_cap: 10, payout_method: 2, contribution_amount: '200000000', active: false, token_symbol: 'XLM' },
  { id: 4, organizer: '', member_cap: 6, payout_method: 0, contribution_amount: '250000000', active: false, token_symbol: 'CUSTOM' },
];

const ALL_CURRENCIES = 'ALL';

export default function HomePage() {
  const router = useRouter();
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [circles, _setCircles] = useState<Circle[]>(MOCK_CIRCLES);
  const [currency, setCurrency] = useState<string>(ALL_CURRENCIES);
  const [loading] = useState(false);

  const handleJoin = (id: number) => {
    router.push(`/circles/${id}`);
  };

  const visibleCircles =
    currency === ALL_CURRENCIES
      ? circles
      : circles.filter((c) => (c.token_symbol ?? 'USDC') === currency);

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
          <div className="toolbar">
            <label className="toolbar-label" htmlFor="currency-filter">
              Currency
            </label>
            <select
              id="currency-filter"
              className="currency-select"
              data-testid="currency-filter"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value={ALL_CURRENCIES}>All currencies</option>
              {SUPPORTED_ASSETS.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} — {asset.name}
                </option>
              ))}
              <option value="CUSTOM">CUSTOM — Custom Token</option>
            </select>
          </div>

          {loading && <LoadingSpinner message="Loading circles..." />}
          {!loading && circles.length === 0 && (
            <EmptyState
              title="No circles yet"
              description="Be the first to create a ROSCA circle on RotaFi."
            />
          )}
          {!loading && visibleCircles.length === 0 && (
            <EmptyState
              title="No circles in this currency"
              description={`No circles currently accept ${currency}. Try another currency.`}
            />
          )}
          {!loading && visibleCircles.length > 0 && (
            <div className="circle-grid" data-testid="circle-grid">
              {visibleCircles.map((circle) => (
                <CircleCard
                  key={circle.id}
                  circle={circle}
                  onJoin={wallet.connected ? handleJoin : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
