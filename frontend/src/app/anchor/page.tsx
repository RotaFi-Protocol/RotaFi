'use client';

import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import PageHeader from '@/components/PageHeader';
import AnchorPanel from '@/components/AnchorPanel';
import { EmptyState } from '@/components/States';

export default function AnchorPage() {
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();

  return (
    <div>
      <PageHeader
        title="Fund & Cash Out"
        subtitle="Buy Stellar assets with fiat to fund your contributions, or cash out received pots to your bank via SEP-24 anchors"
      >
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
          description="Connect your wallet to fund circles with fiat and cash out received pots."
        />
      )}

      {wallet.connected && <AnchorPanel wallet={wallet} />}
    </div>
  );
}