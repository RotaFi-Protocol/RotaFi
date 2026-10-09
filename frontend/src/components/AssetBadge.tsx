'use client';

import { getAsset } from '@/lib/assets';

interface AssetBadgeProps {
  symbol?: string;
  address?: string;
}

export default function AssetBadge({ symbol, address }: AssetBadgeProps) {
  const asset = getAsset(symbol || address);
  const label = asset?.symbol ?? symbol ?? 'USDC';

  return <span className="asset-badge">{label}</span>;
}