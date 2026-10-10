'use client';

import type { WalletState, WalletProvider } from '@/types';

interface WalletConnectProps {
  wallet: WalletState;
  isLoading: boolean;
  error: string | null;
  onConnect: (provider: WalletProvider) => void;
  onDisconnect: () => void;
}

export default function WalletConnect({
  wallet,
  isLoading,
  error,
  onConnect,
  onDisconnect,
}: WalletConnectProps) {
  if (isLoading) {
    return (
      <div className="wallet-connect">
        <span className="wallet-status-dot is-loading" aria-hidden="true" />
        <span className="wallet-text">Connecting...</span>
      </div>
    );
  }

  if (wallet.connected && wallet.publicKey) {
    return (
      <div className="wallet-connect">
        <span className="wallet-status-dot is-connected" aria-hidden="true" />
        <span className="wallet-address" data-testid="wallet-address">
          {wallet.publicKey.slice(0, 4)}...{wallet.publicKey.slice(-4)}
        </span>
        <span className="wallet-provider" data-testid="wallet-provider">
          {wallet.provider}
        </span>
        <button
          onClick={onDisconnect}
          className="btn btn-ghost wallet-disconnect"
          data-testid="wallet-disconnect"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-actions">
        <WalletButton
          onClick={() => onConnect('freighter')}
          label="Freighter"
          testId="connect-freighter"
        />
        <WalletButton
          onClick={() => onConnect('xbull')}
          label="xBull"
          testId="connect-xbull"
        />
        <WalletButton
          onClick={() => onConnect('rabet')}
          label="Rabet"
          testId="connect-rabet"
        />
      </div>
      {error && (
        <p className="wallet-error" data-testid="wallet-error">
          {error}
        </p>
      )}
    </div>
  );
}

function WalletButton({
  onClick,
  label,
  testId,
}: {
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="btn btn-dark"
      data-testid={testId}
    >
      {label}
    </button>
  );
}
