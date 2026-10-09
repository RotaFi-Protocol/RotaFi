/**
 * Deployed-contract configuration for the RotaFi frontend.
 *
 * Values come from `NEXT_PUBLIC_*` env vars and fall back to the canonical
 * Stellar testnet deployment so local development and E2E runs are testnet
 * by default. Set `NEXT_PUBLIC_USE_LIVE_CONTRACTS=true` to read vault state
 * from the Soroban RPC instead of the in-browser simulation.
 */

export const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015';
export const TESTNET_RPC_URL = 'https://soroban-testnet.stellar.org';

export const TESTNET_CONTRACTS = {
  circleFactory: 'CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6',
  contributionVault:
    'CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO',
  reputationRegistry:
    'CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC',
  bidEngine: 'CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P',
} as const;

export interface NetworkConfig {
  rpcUrl: string;
  passphrase: string;
  contracts: {
    circleFactory: string;
    contributionVault: string;
    reputationRegistry: string;
    bidEngine: string;
  };
}

export const NETWORK: NetworkConfig = {
  rpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || TESTNET_RPC_URL,
  passphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || TESTNET_PASSPHRASE,
  contracts: {
    circleFactory:
      process.env.NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS ||
      TESTNET_CONTRACTS.circleFactory,
    contributionVault:
      process.env.NEXT_PUBLIC_CONTRIBUTION_VAULT_ADDRESS ||
      TESTNET_CONTRACTS.contributionVault,
    reputationRegistry:
      process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS ||
      TESTNET_CONTRACTS.reputationRegistry,
    bidEngine:
      process.env.NEXT_PUBLIC_BID_ENGINE_ADDRESS ||
      TESTNET_CONTRACTS.bidEngine,
  },
};

/** True when the app should read state from the live Soroban RPC. */
export const USE_LIVE_CONTRACTS =
  process.env.NEXT_PUBLIC_USE_LIVE_CONTRACTS === 'true';

/** True when the configured network is the Stellar testnet. */
export function isTestnet(): boolean {
  return NETWORK.passphrase === TESTNET_PASSPHRASE;
}

/** Shortens a Stellar address for compact display. */
export function shortenAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}
