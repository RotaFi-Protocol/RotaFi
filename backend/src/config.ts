import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  soroban: {
    rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    networkPassphrase:
      process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015',
  },

  contracts: {
    circleFactory: process.env.CIRCLE_FACTORY_ADDRESS || '',
    contributionVault: process.env.CONTRIBUTION_VAULT_ADDRESS || '',
    reputationRegistry: process.env.REPUTATION_REGISTRY_ADDRESS || '',
    bidEngine: process.env.BID_ENGINE_ADDRESS || '',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};
