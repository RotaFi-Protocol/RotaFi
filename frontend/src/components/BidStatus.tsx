import type { Bid } from '@/types';

interface BidStatusProps {
  bids: Bid[];
  currentRound: number;
  onBid?: (discountBps: number) => void;
}

export default function BidStatus({ bids, currentRound, onBid }: BidStatusProps) {
  const userBid = bids.length > 0 ? bids[0] : null;

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>Bid Status — Round {currentRound}</h3>

      {userBid ? (
        <div style={styles.bidInfo}>
          <span style={styles.label}>Your bid:</span>
          <span style={styles.value}>{userBid.discount_bps} bps ({(userBid.discount_bps / 100).toFixed(2)}%)</span>
        </div>
      ) : (
        <p style={styles.noBid}>You haven&apos;t placed a bid yet.</p>
      )}

      {bids.length > 0 && (
        <div style={styles.allBids}>
          <h4 style={styles.subheading}>All Bids</h4>
          {bids.map((bid, i) => (
            <div key={i} style={styles.bidRow}>
              <span style={styles.member}>
                {bid.member.slice(0, 6)}...{bid.member.slice(-4)}
              </span>
              <span style={styles.discount}>
                {(bid.discount_bps / 100).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {onBid && !userBid && (
        <div style={styles.actions}>
          {[100, 250, 500, 1000].map((bps) => (
            <button key={bps} onClick={() => onBid(bps)} style={styles.bidBtn}>
              {(bps / 100).toFixed(2)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    backgroundColor: 'white',
  },
  heading: { margin: '0 0 1rem 0', fontSize: '1.125rem', color: '#111827' },
  bidInfo: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  label: { color: '#6B7280', fontSize: '0.875rem' },
  value: { fontWeight: 600, fontSize: '0.875rem', color: '#7C3AED' },
  noBid: { color: '#9CA3AF', fontSize: '0.875rem', margin: 0 },
  allBids: { marginTop: '1rem' },
  subheading: { fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' },
  bidRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.375rem 0',
    borderBottom: '1px solid #F3F4F6',
    fontSize: '0.8125rem',
  },
  member: { color: '#6B7280', fontFamily: 'monospace' },
  discount: { color: '#374151', fontWeight: 500 },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '1rem' },
  bidBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
