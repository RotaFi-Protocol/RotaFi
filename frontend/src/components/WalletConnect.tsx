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
      <div style={styles.container}>
        <span style={styles.statusDot}>...</span>
        <span style={styles.text}>Connecting...</span>
      </div>
    );
  }

  if (wallet.connected && wallet.publicKey) {
    return (
      <div style={styles.container}>
        <span style={styles.statusDotConnected} />
        <span style={styles.address}>
          {wallet.publicKey.slice(0, 4)}...{wallet.publicKey.slice(-4)}
        </span>
        <span style={styles.providerBadge}>{wallet.provider}</span>
        <button onClick={onDisconnect} style={styles.disconnectBtn}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <WalletButton onClick={() => onConnect('freighter')} label="Freighter" />
      <WalletButton onClick={() => onConnect('xbull')} label="xBull" />
      <WalletButton onClick={() => onConnect('rabet')} label="Rabet" />
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

function WalletButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={styles.walletBtn}>
      {label}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#F59E0B',
  },
  statusDotConnected: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
  },
  text: { fontSize: '0.875rem', color: '#6B7280' },
  address: {
    fontSize: '0.875rem',
    color: '#374151',
    fontFamily: 'monospace',
    fontWeight: 500,
  },
  providerBadge: {
    fontSize: '0.75rem',
    backgroundColor: '#7C3AED',
    color: 'white',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    textTransform: 'capitalize' as const,
  },
  disconnectBtn: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: 'transparent',
    border: '1px solid #E5E7EB',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    color: '#6B7280',
  },
  walletBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1F2937',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  error: {
    width: '100%',
    color: '#DC2626',
    fontSize: '0.75rem',
    margin: '0.25rem 0 0 0',
  },
};
