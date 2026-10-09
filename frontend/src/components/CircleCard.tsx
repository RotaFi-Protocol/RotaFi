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
    <div className="circle-card">
      <div className="circle-card-header">
        <span className="circle-card-id">Circle #{circle.id}</span>
        <span className={`badge ${circle.active ? 'badge-active' : 'badge-setup'}`}>
          {circle.active ? 'Active' : 'Setup'}
        </span>
      </div>

      <div className="circle-details">
        <Detail label="Payout" value={payoutName} />
        <Detail label="Members" value={`Up to ${circle.member_cap}`} />
        <Detail label="Contribution" value={`${(parseInt(circle.contribution_amount) / 1e7).toFixed(2)} USDC`} />
      </div>

      {onJoin && !circle.active && (
        <button onClick={() => onJoin(circle.id)} className="btn btn-primary btn-block">
          Join Circle
        </button>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="circle-detail">
      <span className="circle-detail-label">{label}</span>
      <span className="circle-detail-value">{value}</span>
    </div>
  );
}
