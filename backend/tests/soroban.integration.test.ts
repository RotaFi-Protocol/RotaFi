import { ContractCallError } from '../src/services/sorobanRpc';
import {
  DEPLOYER_ADDRESS,
  TESTNET_ADDRESSES,
  integrationDescribe,
  testnetClient,
  testnetReader,
} from './helpers/testnet';

integrationDescribe('Soroban testnet RPC connectivity', () => {
  it('reports a healthy network with a recent ledger', async () => {
    const health = await testnetClient().getHealth();

    expect(health.status).toBe('healthy');
    expect(health.latestLedger).toBeGreaterThan(0);
    expect(health.oldestLedger).toBeGreaterThan(0);
  });
});

integrationDescribe('get_circle (Circle Factory)', () => {
  it('reads the circle count from the deployed factory', async () => {
    const count = await testnetReader().getCircleCount();

    expect(Number.isInteger(count)).toBe(true);
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it('returns null for a circle id that does not exist', async () => {
    const circle = await testnetReader().getCircle(999999);

    expect(circle).toBeNull();
  });

  it('returns a circle when one exists', async () => {
    const reader = testnetReader();
    const count = await reader.getCircleCount();

    if (count === 0) {
      // Fresh deployment has no circles; get_circle still round-trips.
      expect(await reader.getCircle(1)).toBeNull();
      return;
    }

    const circle = await reader.getCircle(1);
    expect(circle).not.toBeNull();
    expect(circle!.id).toBe(1);
    expect(typeof circle!.organizer).toBe('string');
    expect(circle!.organizer.length).toBeGreaterThan(0);
    expect(circle!.config.member_cap).toBeGreaterThanOrEqual(2);
    expect(Number(circle!.config.contribution_amount)).toBeGreaterThan(0);
  });
});

integrationDescribe('get_vault_state (Contribution Vault)', () => {
  it('reads the vault state or reports it as uninitialised', async () => {
    const result = await testnetReader().tryGetVaultState();

    if (result.ok) {
      expect(['Setup', 'Active', 'Paused', 'Completed']).toContain(result.value.state);
      expect(result.value.config.member_cap).toBeGreaterThanOrEqual(2);
      expect(result.value.current_round).toBeGreaterThanOrEqual(0);
      expect(Number(result.value.config.contribution_per_member)).toBeGreaterThan(0);
      return;
    }

    // The published vault has not been initialised, so `get_vault` traps.
    expect(result.error).toBeInstanceOf(ContractCallError);
    expect(result.error.method).toBe('get_vault');
    expect(result.error.contractId).toBe(TESTNET_ADDRESSES.contributionVault);
    expect(result.error.message).toMatch(/get_vault/);
  });

  it('throws a typed ContractCallError instead of a raw host error', async () => {
    const result = await testnetReader().tryGetVaultState();
    if (result.ok) return;

    await expect(testnetReader().getVaultState()).rejects.toBeInstanceOf(ContractCallError);
  });
});

integrationDescribe('get_reputation_rating (Reputation Registry)', () => {
  const ANOTHER_ADDRESS = 'GDMIKKBWWCY355LJUHUDGFTO43AU74RUTSXUIZMAXVLRLEYN3OUR3PYV';

  it('returns 100 for a member with no recorded history', async () => {
    const rating = await testnetReader().getReputationRating(DEPLOYER_ADDRESS);

    expect(Number.isInteger(rating)).toBe(true);
    expect(rating).toBe(100);
  });

  it('keeps the rating within the 0-100 contract range', async () => {
    const reader = testnetReader();

    for (const address of [DEPLOYER_ADDRESS, ANOTHER_ADDRESS]) {
      const rating = await reader.getReputationRating(address);
      expect(rating).toBeGreaterThanOrEqual(0);
      expect(rating).toBeLessThanOrEqual(100);
    }
  });

  it('returns no score record for a member that has never joined', async () => {
    const score = await testnetReader().getReputationScore(ANOTHER_ADDRESS);

    // Either no record, or a well-formed record with zeroed counters.
    if (score !== null) {
      expect(score.address).toBe(ANOTHER_ADDRESS);
      expect(score.circles_joined).toBe(0);
      expect(score.circles_completed).toBe(0);
    }
  });
});
