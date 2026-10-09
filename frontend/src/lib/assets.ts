import type { Asset } from '@/types';

/**
 * Currencies the RotaFi frontend offers for circle creation and display.
 *
 * These mirror the backend's `/api/v1/tokens` endpoint defaults. Addresses are
 * Stellar asset contract (SAC) ids on the testnet; override them per-network
 * through env vars (`NEXT_PUBLIC_*_TOKEN_ADDRESS`) as needed.
 */
export const SUPPORTED_ASSETS: Asset[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address:
      process.env.NEXT_PUBLIC_USDC_TOKEN_ADDRESS ||
      'CBUSYNQKASUYFWYC3M2GUEDMX4AIVWPALDBYJPNK6554BREHTGZ2IUNF',
    decimals: 7,
  },
  {
    symbol: 'EURC',
    name: 'Euro Coin',
    address:
      process.env.NEXT_PUBLIC_EURC_TOKEN_ADDRESS ||
      'CDDCKBVUKM4ADZHCTLFT263CYRTKG2YIWLIA6XWM5IVF3GWKRNRGS5JD',
    decimals: 7,
  },
  {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    address:
      process.env.NEXT_PUBLIC_XLM_TOKEN_ADDRESS ||
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    decimals: 7,
  },
];

/** Custom-token row used when a circle runs on an unwhitelisted asset. */
export const CUSTOM_ASSET: Asset = {
  symbol: 'CUSTOM',
  name: 'Custom Token',
  address: '',
  decimals: 7,
};

/** Resolves an asset from a symbol (case-insensitive) or contract address. */
export function getAsset(symbolOrAddress?: string): Asset | null {
  if (!symbolOrAddress) return null;
  const normalized = symbolOrAddress.trim();
  return (
    SUPPORTED_ASSETS.find(
      (a) =>
        a.symbol.toLowerCase() === normalized.toLowerCase() ||
        a.address === normalized,
    ) ?? null
  );
}

/** Formats a raw token amount (smallest unit) with the asset's symbol/decimals. */
export function formatAssetAmount(amount: string | number, asset?: Asset | null): string {
  const decimals = asset?.decimals ?? 7;
  const symbol = asset?.symbol ?? 'USDC';
  const numeric = typeof amount === 'number' ? amount : Number(amount || 0);
  const formatted = (numeric / 10 ** decimals).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 2,
  });
  return `${formatted} ${symbol}`;
}

/** Asset symbol for a circle/vault payload, handling legacy USDC defaults. */
export function assetSymbolFor(opts: { token_symbol?: string; token_address?: string }): string {
  if (opts.token_symbol) return opts.token_symbol;
  const byAddress = getAsset(opts.token_address);
  return byAddress?.symbol ?? (opts.token_address ? 'CUSTOM' : 'USDC');
}