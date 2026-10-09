import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { KeeperEngine } from './engine';
import { KeeperConfig } from './types';
import logger from './logger';

const config: KeeperConfig = {
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '30000', 10),
  vaultAddress: process.env.CONTRIBUTION_VAULT_ADDRESS || '',
  rpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
};

const engine = new KeeperEngine(config);

let healthServer: http.Server | null = null;

function startHealthServer(port: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', ...engine.getState() }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(port, () => {
    logger.info(`Keeper health endpoint listening on port ${port}`);
  });

  return server;
}

function gracefulShutdown(): void {
  logger.info('Received shutdown signal');
  engine.stop();
  if (healthServer) {
    healthServer.close();
  }
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

if (require.main === module) {
  engine.start();

  const healthPort = parseInt(process.env.KEEPER_HEALTH_PORT || '0', 10);
  if (healthPort > 0) {
    healthServer = startHealthServer(healthPort);
  }

  logger.info('RotaFi Keeper Bot is running');
}

export { engine, config };
