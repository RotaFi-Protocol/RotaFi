'use client';

import type { Circle } from '@/types';
import AssetBadge from './AssetBadge';
import { formatAssetAmount, getAsset } from '@/lib/assets';

interface CircleCardProps {
  circle: Circle;
  onJoin?: (id: number) => void;
}

export default function CircleCard({ circle, onJoin }: CircleCardProps) {
  const payoutNames = ['Lottery', 'Auction', 'Priority'];
  const payoutName = payoutNames[circle.payout_method] || 'Unknown';
  const asset = getAsset(circle.token_symbol || circle.token_address);

  return (
    <div className="circle-card" data-testid={`circle-card-${circle.id}`}>
      <div className="circle-card-header">
        <span className="circle-card-id">Circle #{circle.id}</span>
        <span className="circle-card-meta">
          <AssetBadge symbol={circle.token_symbol} address={circle.token_address} />
          <span className={`badge ${circle.active ? 'badge-active' : 'badge-setup'}`}>
            {circle.active ? 'Active' : 'Setup'}
          </span>
        </span>
      </div>

      <div className="circle-details">
        <Detail label="Payout" value={payoutName} />
        <Detail label="Members" value={`Up to ${circle.member_cap}`} />
        <Detail
          label="Contribution"
          value={formatAssetAmount(circle.contribution_amount, asset)}
        />
      </div>

      {onJoin && !circle.active && (
        <button
          onClick={() => onJoin(circle.id)}
          className="btn btn-primary btn-block"
          data-testid={`join-circle-${circle.id}`}
        >
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
