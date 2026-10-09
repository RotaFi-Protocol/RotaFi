import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  soroban: {
    rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    networkPassphrase:
      process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
    // When enabled, read endpoints are served from the live Soroban RPC
    // instead of the in-memory cache.
    liveReads: process.env.SOROBAN_LIVE_READS === 'true',
    // Per-request timeout for RPC calls, in milliseconds.
    timeoutMs: parseInt(process.env.SOROBAN_RPC_TIMEOUT_MS || '10000', 10),
  },

  contracts: {
    circleFactory:
      process.env.CIRCLE_FACTORY_ADDRESS ||
      'CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6',
    contributionVault:
      process.env.CONTRIBUTION_VAULT_ADDRESS ||
      'CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO',
    reputationRegistry:
      process.env.REPUTATION_REGISTRY_ADDRESS ||
      'CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC',
    bidEngine:
      process.env.BID_ENGINE_ADDRESS ||
      'CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};
