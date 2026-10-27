import http from 'http';
import { KeeperEngine } from '../src/engine';
import { KeeperConfig, VaultState } from '../src/types';
import { checkRoundAdvancement, findDefaulters, determineSlashActions, isCircleComplete } from '../src/watchers';
import {
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_SOROBAN_RPC_URL,
  gracefulShutdown,
  parseHealthPort,
  parseKeeperConfig,
  startHealthServer,
} from '../src/index';

function createTestVault(overrides: Partial<VaultState> = {}): VaultState {
  return {
    circle_id: 1,
    current_round: 1,
    state: 'Active' as any,
    member_count: 3,
    members_paid_current_round: 0,
    round_start_time: Math.floor(Date.now() / 1000) - 100,
    total_rounds: 3,
    member_cap: 3,
    round_length_seconds: 600,
    grace_period_seconds: 300,
    config: {
      circle_id: 1,
      token_address: 'CBUSYNQKASUYFWYC3M2GUEDMX4AIVWPALDBYJPNK6554BREHTGZ2IUNF',
      contribution_per_member: '100000000',
      member_cap: 3,
      total_rounds: 3,
      min_collateral: '50000000',
      round_length_seconds: 600,
      grace_period_seconds: 300,
    },
    ...overrides,
  };
}

function createTestConfig(): KeeperConfig {
  return {
    pollIntervalMs: 100,
    vaultAddress: 'CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO',
    rpcUrl: 'https://soroban-testnet.stellar.org',
  };
}

describe('Watcher: checkRoundAdvancement', () => {
  it('advances when all members paid', () => {
    const vault = createTestVault({ members_paid_current_round: 3 });
    const result = checkRoundAdvancement(vault, Math.floor(Date.now() / 1000));
    expect(result.advanced).toBe(true);
    expect(result.reason).toBe('all_members_paid');
  });

  it('does not advance when round is in progress', () => {
    const vault = createTestVault({ members_paid_current_round: 1 });
    const result = checkRoundAdvancement(vault, Math.floor(Date.now() / 1000));
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('round_in_progress');
  });

  it('advances when grace period expires', () => {
    const startTime = Math.floor(Date.now() / 1000) - 1000;
    const vault = createTestVault({
      members_paid_current_round: 1,
      round_start_time: startTime,
      round_length_seconds: 300,
      grace_period_seconds: 200,
    });
    const result = checkRoundAdvancement(vault, Math.floor(Date.now() / 1000));
    expect(result.advanced).toBe(true);
    expect(result.reason).toBe('grace_period_expired');
  });

  it('does not advance during grace period', () => {
    const startTime = Math.floor(Date.now() / 1000) - 800;
    const vault = createTestVault({
      members_paid_current_round: 1,
      round_start_time: startTime,
      round_length_seconds: 600,
      grace_period_seconds: 500,
    });
    const result = checkRoundAdvancement(vault, Math.floor(Date.now() / 1000));
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('round_expired_grace_active');
  });
});

describe('Watcher: findDefaulters', () => {
  it('finds members who have not paid', () => {
    const vault = createTestVault();
    const payments = new Map<string, boolean>([
      ['Alice', true],
      ['Bob', false],
      ['Charlie', true],
    ]);
    const defaulters = findDefaulters(vault, payments);
    expect(defaulters).toEqual(['Bob']);
  });

  it('returns empty when all have paid', () => {
    const vault = createTestVault();
    const payments = new Map<string, boolean>([
      ['Alice', true],
      ['Bob', true],
    ]);
    const defaulters = findDefaulters(vault, payments);
    expect(defaulters).toEqual([]);
  });
});

describe('Watcher: determineSlashActions', () => {
  it('returns slash actions after grace period expires', () => {
    const startTime = Math.floor(Date.now() / 1000) - 1000;
    const vault = createTestVault({
      round_start_time: startTime,
      round_length_seconds: 300,
      grace_period_seconds: 200,
    });
    const defaulters = ['Bob'];
    const actions = determineSlashActions(vault, defaulters, Math.floor(Date.now() / 1000));
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({ member: 'Bob', slashPercent: 50 });
  });

  it('returns empty before grace period expires', () => {
    const startTime = Math.floor(Date.now() / 1000);
    const vault = createTestVault({
      round_start_time: startTime,
      round_length_seconds: 3600,
      grace_period_seconds: 3600,
    });
    const defaulters = ['Bob'];
    const actions = determineSlashActions(vault, defaulters, Math.floor(Date.now() / 1000));
    expect(actions).toHaveLength(0);
  });
});

describe('Watcher: isCircleComplete', () => {
  it('returns true when current round exceeds total rounds', () => {
    const vault = createTestVault({ current_round: 4, total_rounds: 3 });
    expect(isCircleComplete(vault)).toBe(true);
  });

  it('returns false when rounds remain', () => {
    const vault = createTestVault({ current_round: 2, total_rounds: 3 });
    expect(isCircleComplete(vault)).toBe(false);
  });
});

describe('KeeperEngine', () => {
  it('starts and stops correctly', () => {
    const engine = new KeeperEngine(createTestConfig());
    const state = engine.getState();
    expect(state.isRunning).toBe(false);

    engine.start();
    expect(engine.getState().isRunning).toBe(true);

    engine.stop();
    expect(engine.getState().isRunning).toBe(false);
  });

  it('processes vault and advances round when all paid', (done) => {
    const engine = new KeeperEngine(createTestConfig());
    const vault = createTestVault({ members_paid_current_round: 3, member_count: 3 });

    engine.setVaultState(vault);

    // Start the engine - it should advance the round on first poll
    engine.start();

    setTimeout(() => {
      engine.stop();
      const state = engine.getState();
      expect(state.roundsProcessed).toBeGreaterThanOrEqual(1);
      done();
    }, 300);
  });

  it('detects defaults when grace period expires', (done) => {
    const engine = new KeeperEngine(createTestConfig());
    const startTime = Math.floor(Date.now() / 1000) - 1000;
    const vault = createTestVault({
      members_paid_current_round: 1,
      member_count: 3,
      round_start_time: startTime,
      round_length_seconds: 300,
      grace_period_seconds: 200,
    });

    engine.setVaultState(vault);
    engine.setMemberPayment(1, 'Alice', true);
    engine.setMemberPayment(1, 'Bob', false);
    engine.setMemberPayment(1, 'Charlie', false);

    engine.start();

    setTimeout(() => {
      engine.stop();
      const state = engine.getState();
      expect(state.defaultsDetected).toBeGreaterThanOrEqual(2);
      done();
    }, 300);
  });

  it('does not process inactive vaults', (done) => {
    const engine = new KeeperEngine(createTestConfig());
    const vault = createTestVault({
      members_paid_current_round: 3,
      state: 'Paused' as any,
    });

    engine.setVaultState(vault);
    engine.start();

    setTimeout(() => {
      engine.stop();
      const state = engine.getState();
      expect(state.roundsProcessed).toBe(0);
      done();
    }, 300);
  });

  it('marks circle as completed after final round', (done) => {
    const engine = new KeeperEngine(createTestConfig());
    const vault = createTestVault({
      members_paid_current_round: 3,
      member_count: 3,
      current_round: 3,
      total_rounds: 3,
    });

    engine.setVaultState(vault);
    engine.start();

    setTimeout(() => {
      engine.stop();
      const state = engine.getState();
      expect(state.roundsProcessed).toBeGreaterThanOrEqual(1);
      done();
    }, 300);
  });
});

function httpGetJson(port: number, path: string): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path }, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode || 0, body: JSON.parse(raw) });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

describe('Keeper Bootstrap: config parsing, health server, and gracefulShutdown', () => {
  it('parses valid environment configuration and falls back on missing or invalid values', () => {
    const defaults = parseKeeperConfig({});
    expect(defaults).toEqual({
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      vaultAddress: '',
      rpcUrl: DEFAULT_SOROBAN_RPC_URL,
    });

    const invalidEnv = parseKeeperConfig({
      POLL_INTERVAL_MS: 'not-a-number',
      CONTRIBUTION_VAULT_ADDRESS: '   ',
      SOROBAN_RPC_URL: '   ',
    });
    expect(invalidEnv.pollIntervalMs).toBe(DEFAULT_POLL_INTERVAL_MS);
    expect(invalidEnv.vaultAddress).toBe('');
    expect(invalidEnv.rpcUrl).toBe(DEFAULT_SOROBAN_RPC_URL);

    const negativeEnv = parseKeeperConfig({ POLL_INTERVAL_MS: '-500' });
    expect(negativeEnv.pollIntervalMs).toBe(DEFAULT_POLL_INTERVAL_MS);

    const customEnv = parseKeeperConfig({
      POLL_INTERVAL_MS: '15000',
      CONTRIBUTION_VAULT_ADDRESS: 'CVAULT123',
      SOROBAN_RPC_URL: 'http://localhost:8000/rpc',
    });
    expect(customEnv).toEqual({
      pollIntervalMs: 15000,
      vaultAddress: 'CVAULT123',
      rpcUrl: 'http://localhost:8000/rpc',
    });

    expect(parseHealthPort({})).toBe(0);
    expect(parseHealthPort({ KEEPER_HEALTH_PORT: 'abc' })).toBe(0);
    expect(parseHealthPort({ KEEPER_HEALTH_PORT: '-1' })).toBe(0);
    expect(parseHealthPort({ KEEPER_HEALTH_PORT: '70000' })).toBe(0);
    expect(parseHealthPort({ KEEPER_HEALTH_PORT: '8081' })).toBe(8081);
  });

  it('serves 200 on /healthz with engine state and 404 on unknown routes', async () => {
    const engine = new KeeperEngine(createTestConfig());
    const server = startHealthServer(0, engine);

    await new Promise<void>((resolve) => {
      if (server.listening) resolve();
      else server.once('listening', () => resolve());
    });

    try {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      expect(port).toBeGreaterThan(0);

      const healthRes = await httpGetJson(port, '/healthz');
      expect(healthRes.statusCode).toBe(200);
      expect(healthRes.body).toMatchObject({
        status: 'healthy',
        isRunning: false,
        roundsProcessed: 0,
        defaultsDetected: 0,
        payoutsTriggered: 0,
        errors: 0,
      });

      const notFoundRes = await httpGetJson(port, '/unknown');
      expect(notFoundRes.statusCode).toBe(404);
      expect(notFoundRes.body).toEqual({ error: 'Not found' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('stops the engine interval, closes the health server, and exits cleanly on gracefulShutdown', async () => {
    const engine = new KeeperEngine(createTestConfig());
    engine.start();
    expect(engine.getState().isRunning).toBe(true);

    const server = startHealthServer(0, engine);
    await new Promise<void>((resolve) => {
      if (server.listening) resolve();
      else server.once('listening', () => resolve());
    });

    const closeSpy = jest.spyOn(server, 'close');
    const exitMock = jest.fn();

    gracefulShutdown(engine, server, exitMock as unknown as (code: number) => never);

    expect(engine.getState().isRunning).toBe(false);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(exitMock).toHaveBeenCalledWith(0);
  });
});
