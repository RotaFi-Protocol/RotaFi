import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import { KeeperEngine } from './engine';
import { KeeperConfig } from './types';
import logger from './logger';

export const DEFAULT_POLL_INTERVAL_MS = 30000;
export const DEFAULT_SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

export function parseKeeperConfig(env: NodeJS.ProcessEnv = process.env): KeeperConfig {
  const rawPollInterval = env.POLL_INTERVAL_MS?.trim();
  let pollIntervalMs = DEFAULT_POLL_INTERVAL_MS;
  if (rawPollInterval) {
    const parsed = Number(rawPollInterval);
    if (Number.isFinite(parsed) && parsed > 0) {
      pollIntervalMs = Math.floor(parsed);
    } else {
      logger.warn('Invalid POLL_INTERVAL_MS provided; falling back to default', {
        provided: rawPollInterval,
        defaultPollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      });
    }
  }

  const vaultAddress = (env.CONTRIBUTION_VAULT_ADDRESS || '').trim();
  const rawRpcUrl = (env.SOROBAN_RPC_URL || '').trim();
  const rpcUrl = rawRpcUrl.length > 0 ? rawRpcUrl : DEFAULT_SOROBAN_RPC_URL;

  return {
    pollIntervalMs,
    vaultAddress,
    rpcUrl,
  };
}

export function parseHealthPort(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.KEEPER_HEALTH_PORT?.trim();
  if (!rawPort) return 0;
  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    logger.warn('Invalid KEEPER_HEALTH_PORT provided; disabling health server', {
      provided: rawPort,
    });
    return 0;
  }
  return parsed;
}

const config: KeeperConfig = parseKeeperConfig(process.env);

const engine = new KeeperEngine(config);

let healthServer: http.Server | null = null;

export function startHealthServer(
  port: number,
  targetEngine: KeeperEngine = engine
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', ...targetEngine.getState() }));
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

export function gracefulShutdown(
  targetEngine: KeeperEngine = engine,
  server: http.Server | null = healthServer,
  exitFn: (code: number) => void = process.exit
): void {
  logger.info('Received shutdown signal');
  targetEngine.stop();
  if (server) {
    server.close();
    if (server === healthServer) {
      healthServer = null;
    }
  }
  exitFn(0);
}

process.on('SIGTERM', () => gracefulShutdown());
process.on('SIGINT', () => gracefulShutdown());

if (require.main === module) {
  engine.start();

  const healthPort = parseHealthPort(process.env);
  if (healthPort > 0) {
    healthServer = startHealthServer(healthPort, engine);
  }

  logger.info('RotaFi Keeper Bot is running');
}

export { engine, config };
