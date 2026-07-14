import { KeeperEngine } from '../src/engine';
import { KeeperConfig, VaultState } from '../src/types';
import { checkRoundAdvancement, findDefaulters, determineSlashActions, isCircleComplete } from '../src/watchers';

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
