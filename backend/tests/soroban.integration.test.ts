import { integrationDescribe, testnetClient, testnetReader } from './helpers/testnet';

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
