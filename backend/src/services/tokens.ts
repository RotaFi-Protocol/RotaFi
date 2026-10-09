import { config } from '../config';

export interface SupportedToken {
  symbol: string;
  name: string;
  address: string;
  /** SEP-41 decimals reported by the Stellar asset contract. */
  decimals: number;
}

/**
 * Returns the assets the protocol currently supports for circle creation.
 *
 * The list is populated from `config.supportedTokens`, which merges sensible
 * testnet defaults (native XLM, USDC, EURC) with environment overrides, so
 * operators can point the API at any combination of Stellar tokens — or a
 * fully custom asset — per deployment.
 */
export function getSupportedTokens(): SupportedToken[] {
  return config.supportedTokens;
}

/** Looks up token metadata by contract address, or null when unknown. */
export function getTokenByAddress(address: string): SupportedToken | null {
  return config.supportedTokens.find((t) => t.address === address) ?? null;
}

/** Looks up token metadata by asset symbol (case-insensitive), or null. */
export function getTokenBySymbol(symbol: string): SupportedToken | null {
  const normalized = symbol.trim().toUpperCase();
  return (
    config.supportedTokens.find((t) => t.symbol.toUpperCase() === normalized) ??
    null
  );
}

/** True when the address matches a supported token (or no filter set). */
export function isSupportedToken(address: string): boolean {
  return config.supportedTokens.some((t) => t.address === address);
}