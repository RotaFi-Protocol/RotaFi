'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import WalletConnect from '@/components/WalletConnect';
import { LoadingSpinner, ErrorState } from '@/components/States';
import type { Circle } from '@/types';

export default function CircleDetailPage() {
  const params = useParams();
  const { wallet, isLoading: walletLoading, error: walletError, connect, disconnect } = useWallet();
  const [loading] = useState(false);

  const id = Number(params.id);
  const circle: Circle | null = id > 0 ? {
    id,
    organizer: 'CC2XL...BHDSX6',
    member_cap: 5,
    payout_method: 0,
    contribution_amount: '100000000',
    active: true,
  } : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Circle #{id}</h1>
        <WalletConnect wallet={wallet} isLoading={walletLoading} error={walletError} onConnect={connect} onDisconnect={disconnect} />
      </div>

      {loading && <LoadingSpinner />}
      {!loading && !circle && <ErrorState message="Circle not found." />}
      {!loading && circle && (
        <div style={{ backgroundColor: 'white', border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
            <div><span style={{ color: '#6B7280' }}>Organizer</span><br /><span style={{ fontFamily: 'monospace' }}>{circle.organizer}</span></div>
            <div><span style={{ color: '#6B7280' }}>Payout Method</span><br /><span style={{ fontWeight: 500 }}>{['Lottery', 'Auction', 'Priority'][circle.payout_method]}</span></div>
            <div><span style={{ color: '#6B7280' }}>Member Cap</span><br /><span style={{ fontWeight: 500 }}>{circle.member_cap}</span></div>
            <div><span style={{ color: '#6B7280' }}>Contribution</span><br /><span style={{ fontWeight: 500 }}>{(parseInt(circle.contribution_amount) / 1e7).toFixed(2)} USDC</span></div>
            <div><span style={{ color: '#6B7280' }}>Status</span><br /><span style={{ fontWeight: 500, color: circle.active ? '#10B981' : '#F59E0B' }}>{circle.active ? 'Active' : 'Setup'}</span></div>
          </div>

          {!circle.active && wallet.connected && (
            <button onClick={() => alert('Joining circle (simulated)')} style={{
              marginTop: '1.5rem', padding: '0.75rem 2rem', backgroundColor: '#7C3AED', color: 'white',
              border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 600,
            }}>
              Join Circle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
