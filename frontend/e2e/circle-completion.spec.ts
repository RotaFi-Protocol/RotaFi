import { test, expect } from '@playwright/test';
import { connectWallet, joinCircleFromBrowse, completeCircle } from './helpers';

test.describe('circle completion', () => {
  test('marks the circle completed after the final payout', async ({
    page,
  }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);
    await completeCircle(page, 5);

    await expect(page.getByTestId('circle-status')).toHaveText('Completed');
    await expect(page.getByTestId('current-round')).toHaveText('5 / 5');
    await expect(page.getByTestId('completion-banner')).toBeVisible();
    await expect(page.getByTestId('contribute')).toHaveCount(0);
    await expect(page.getByTestId('release-payout')).toHaveCount(0);
  });

  test('dashboard reflects the completed circle', async ({ page }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);
    await completeCircle(page, 5);

    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard-completed')).toBeVisible();
    await expect(page.getByTestId('dashboard-status')).toHaveText('Completed');
    await expect(page.getByTestId('dashboard-round')).toHaveText('5 / 5');
    await expect(page.getByTestId('dashboard-progress')).toHaveText(
      '100% complete',
    );
  });
});