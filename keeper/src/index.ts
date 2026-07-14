import dotenv from 'dotenv';
dotenv.config();

import { KeeperEngine } from './engine';
import { KeeperConfig } from './types';
import logger from './logger';

const config: KeeperConfig = {
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
  vaultAddress: process.env.CONTRIBUTION_VAULT_ADDRESS || '',
  rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
};

const engine = new KeeperEngine(config);

function gracefulShutdown(): void {
  logger.info('Received shutdown signal');
  engine.stop();
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

if (require.main === module) {
  engine.start();
  logger.info('RotaFi Keeper Bot is running');
}

export { engine, config };
