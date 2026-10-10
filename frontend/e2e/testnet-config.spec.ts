import { test, expect } from '@playwright/test';
import { TESTNET } from './fixtures/testnet';
import { NETWORK, TESTNET_PASSPHRASE } from '../src/lib/contracts';

test.describe('testnet contract configuration', () => {
  test('frontend resolves to the canonical Stellar testnet', () => {
    expect(NETWORK.passphrase).toBe(TESTNET_PASSPHRASE);
    expect(NETWORK.rpcUrl).toBe(TESTNET.rpcUrl);
  });

  test('frontend points at deployed testnet contract addresses', () => {
    expect(NETWORK.contracts.circleFactory).toBe(TESTNET.contracts.circleFactory);
    expect(NETWORK.contracts.contributionVault).toBe(
      TESTNET.contracts.contributionVault,
    );
    expect(NETWORK.contracts.reputationRegistry).toBe(
      TESTNET.contracts.reputationRegistry,
    );
    expect(NETWORK.contracts.bidEngine).toBe(TESTNET.contracts.bidEngine);
  });
});