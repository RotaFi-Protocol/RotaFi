'use client';

import type { Circle } from '@/types';

interface CircleCardProps {
  circle: Circle;
  onJoin?: (id: number) => void;
}

export default function CircleCard({ circle, onJoin }: CircleCardProps) {
  const payoutNames = ['Lottery', 'Auction', 'Priority'];
  const payoutName = payoutNames[circle.payout_method] || 'Unknown';

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.id}>Circle #{circle.id}</span>
        <span style={{
          ...styles.badge,
          backgroundColor: circle.active ? '#D1FAE5' : '#FEF3C7',
          color: circle.active ? '#065F46' : '#92400E',
        }}>
          {circle.active ? 'Active' : 'Setup'}
        </span>
      </div>

      <div style={styles.details}>
        <Detail label="Payout" value={payoutName} />
        <Detail label="Members" value={`Up to ${circle.member_cap}`} />
        <Detail label="Contribution" value={`${(parseInt(circle.contribution_amount) / 1e7).toFixed(2)} USDC`} />
      </div>

      {onJoin && !circle.active && (
        <button onClick={() => onJoin(circle.id)} style={styles.joinBtn}>
          Join Circle
        </button>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detail}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '1px solid #E5E7EB',
    borderRadius: '0.5rem',
    padding: '1.25rem',
    backgroundColor: 'white',
    transition: 'box-shadow 0.2s',
    cursor: 'default',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  id: { fontWeight: 600, fontSize: '1rem', color: '#111827' },
  badge: {
    fontSize: '0.75rem',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px',
    fontWeight: 500,
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  detail: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
  },
  detailLabel: { color: '#6B7280' },
  detailValue: { color: '#374151', fontWeight: 500 },
  joinBtn: {
    marginTop: '1rem',
    width: '100%',
    padding: '0.5rem',
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
