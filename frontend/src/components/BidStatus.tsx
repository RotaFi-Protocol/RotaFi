import type { Bid } from '@/types';

interface BidStatusProps {
  bids: Bid[];
  currentRound: number;
  onBid?: (discountBps: number) => void;
}

export default function BidStatus({ bids, currentRound, onBid }: BidStatusProps) {
  const userBid = bids.length > 0 ? bids[0] : null;

  return (
    <div className="card">
      <h3 className="card-title">Bid Status — Round {currentRound}</h3>

      {userBid ? (
        <div className="bid-info">
          <span className="bid-label">Your bid:</span>
          <span className="bid-value">
            {userBid.discount_bps} bps ({(userBid.discount_bps / 100).toFixed(2)}%)
          </span>
        </div>
      ) : (
        <p className="bid-empty">You haven&apos;t placed a bid yet.</p>
      )}

      {bids.length > 0 && (
        <div className="bid-list">
          <h4 className="bid-subheading">All Bids</h4>
          {bids.map((bid, i) => (
            <div key={i} className="bid-row">
              <span className="bid-member">
                {bid.member.slice(0, 6)}...{bid.member.slice(-4)}
              </span>
              <span className="bid-discount">{(bid.discount_bps / 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      )}

      {onBid && !userBid && (
        <div className="bid-actions">
          {[100, 250, 500, 1000].map((bps) => (
            <button key={bps} onClick={() => onBid(bps)} className="btn btn-primary">
              {(bps / 100).toFixed(2)}%
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
