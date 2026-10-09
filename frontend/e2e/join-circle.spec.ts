import { test, expect } from '@playwright/test';
import { connectWallet, joinCircleFromBrowse } from './helpers';

test.describe('join circle', () => {
  test('joins a circle from the browse grid', async ({ page }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);

    await expect(page.getByTestId('contribute')).toBeVisible();
    await expect(page.getByTestId('current-round')).toHaveText('1 / 5');
    await expect(page.getByTestId('circle-status')).toHaveText('Active');
  });

  test('joined circle appears on the dashboard', async ({ page }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);

    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-circle-1')).toBeVisible();
    await expect(page.getByTestId('dashboard-status')).toHaveText('Active');
    await expect(page.getByTestId('dashboard-round')).toHaveText('1 / 5');
  });
});