import { test, expect, type Page } from '@playwright/test';
import { mockFreighter } from './fixtures/wallet';

/**
 * SEP-24 anchor UI E2E.
 *
 * The backend anchor proxy is stubbed at the network layer so the flow runs
 * without an anchor or the RotaFi backend. `window.open` is neutralised so the
 * interactive popup never interferes with headless runs; the UI falls back to
 * an inline "open manually" link.
 */

const ANCHOR_INFO = {
  home_domain: 'testanchor.stellar.org',
  transfer_server: 'https://testanchor.stellar.org/sep24',
  network_passphrase: 'Test SDF Network ; September 2015',
  web_auth_endpoint: 'https://testanchor.stellar.org/auth',
  auth_required: true,
  default_asset: 'USDC',
  assets: [
    {
      code: 'USDC',
      deposit: { enabled: true, min_amount: 1, max_amount: 10 },
      withdraw: { enabled: true, min_amount: 1, max_amount: 10 },
    },
  ],
};

const CHALLENGE = {
  transaction: 'AAAAAgAAAABchallenge',
  network_passphrase: 'Test SDF Network ; September 2015',
  web_auth_endpoint: 'https://testanchor.stellar.org/auth',
};

async function mockAnchor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.open = (() => null) as unknown as typeof window.open;
  });

  await page.route('**/api/v1/anchors/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/info')) {
      return route.fulfill({ json: ANCHOR_INFO });
    }
    if (path.endsWith('/auth/challenge')) {
      return route.fulfill({ json: CHALLENGE });
    }
    if (path.endsWith('/auth')) {
      return route.fulfill({ json: { token: 'test-jwt' } });
    }
    if (path.endsWith('/deposit')) {
      return route.fulfill({
        status: 202,
        json: {
          id: 'dep-1',
          url: 'https://testanchor.stellar.org/sep24/interactive?token=dep',
          asset_code: 'USDC',
          account: 'GBHV...',
          status: 'incomplete',
        },
      });
    }
    if (path.endsWith('/withdraw')) {
      return route.fulfill({
        status: 202,
        json: {
          id: 'wd-1',
          url: 'https://testanchor.stellar.org/sep24/interactive?token=wd',
          asset_code: 'USDC',
          account: 'GBHV...',
          status: 'incomplete',
        },
      });
    }
    if (path.includes('/transactions/')) {
      return route.fulfill({
        json: {
          id: 'dep-1',
          status: 'completed',
          amount_in: '5',
          amount_out: '4.9',
          terminal: true,
          succeeded: true,
        },
      });
    }
    return route.continue();
  });
}

async function connectWalletOnAnchor(page: Page): Promise<void> {
  await mockFreighter(page);
  await page.goto('/anchor');
  await page.getByTestId('connect-freighter').click();
  await expect(page.getByTestId('anchor-home-domain')).toHaveText('testanchor.stellar.org');
}

test.describe('SEP-24 anchor UI', () => {
  test('loads anchor capabilities and shows the default asset', async ({ page }) => {
    await mockAnchor(page);
    await connectWalletOnAnchor(page);
    await expect(page.getByTestId('anchor-asset')).toHaveValue('USDC');
    await expect(page.getByTestId('anchor-limits')).toContainText('USDC');
  });

  test('funds a contribution via a SEP-24 deposit', async ({ page }) => {
    await mockAnchor(page);
    await connectWalletOnAnchor(page);
    await page.getByTestId('anchor-amount').fill('5');
    await page.getByTestId('anchor-deposit').click();
    await expect(page.getByTestId('anchor-status')).toHaveText('Transfer completed', {
      timeout: 15000,
    });
    await expect(page.getByTestId('anchor-history')).toBeVisible();
  });

  test('cashes out via a SEP-24 withdrawal', async ({ page }) => {
    await mockAnchor(page);
    await connectWalletOnAnchor(page);
    await page.getByTestId('anchor-withdraw').click();
    await expect(page.getByTestId('anchor-status')).toHaveText('Transfer completed', {
      timeout: 15000,
    });
  });
});