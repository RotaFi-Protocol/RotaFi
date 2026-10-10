import type { Page } from '@playwright/test';

export const TEST_PUBLIC_KEY =
  'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47';

export const TEST_WALLET = {
  provider: 'freighter',
  publicKey: TEST_PUBLIC_KEY,
} as const;

interface MockFreighterOptions {
  publicKey?: string;
}

/**
 * Injects a mock Freighter browser-extension API before the app scripts run.
 *
 * The real extension cannot be automated headlessly, so E2E tests stub the
 * `window.freighterApi` surface the frontend uses (`isConnected`,
 * `getPublicKey`, `signTransaction`). Transaction signing resolves to the
 * input envelope so wallet-gated flows proceed without user interaction.
 */
export async function mockFreighter(
  page: Page,
  options: MockFreighterOptions = {},
): Promise<{ publicKey: string }> {
  const publicKey = options.publicKey ?? TEST_PUBLIC_KEY;
  await page.addInitScript(
    ({ pk }) => {
      const freighterApi = {
        isConnected: async () => true,
        getPublicKey: async () => pk,
        getNetwork: async () => 'TESTNET',
        signTransaction: async (xdr: string) => xdr,
        signAuthEntry: async (xdr: string) => xdr,
      };
      Object.defineProperty(window, 'freighterApi', {
        value: freighterApi,
        writable: true,
        configurable: true,
      });
    },
    { pk: publicKey },
  );
  return { publicKey };
}