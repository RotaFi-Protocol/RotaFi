import { test, expect } from '@playwright/test';
import { connectWallet } from './helpers';

test.describe('browse circles', () => {
  test('requires a wallet before showing the circle grid', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Connect your wallet')).toBeVisible();
    await expect(page.getByTestId('circle-grid')).toHaveCount(0);
  });

  test('lists all circles once connected', async ({ page }) => {
    await connectWallet(page);

    await expect(page.getByTestId('circle-grid')).toBeVisible();
    for (const id of [1, 2, 3, 4]) {
      await expect(page.getByTestId(`circle-card-${id}`)).toBeVisible();
    }
  });

  test('filters circles by currency', async ({ page }) => {
    await connectWallet(page);

    await page.getByTestId('currency-filter').selectOption('EURC');
    await expect(page.getByTestId('circle-card-2')).toBeVisible();
    await expect(page.getByTestId('circle-card-1')).toHaveCount(0);

    await page.getByTestId('currency-filter').selectOption('USDC');
    await expect(page.getByTestId('circle-card-1')).toBeVisible();
    await expect(page.getByTestId('circle-card-2')).toHaveCount(0);
  });
});