import { test, expect } from '@playwright/test';
import { connectWallet, joinCircleFromBrowse, contributeAndPayout } from './helpers';

test.describe('payout', () => {
  test('releases the pot to the round winner', async ({ page }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);

    await contributeAndPayout(page);

    await expect(page.getByTestId('received-pot')).toBeVisible();
    await expect(page.getByTestId('round-1')).toBeVisible();
    await expect(page.getByTestId('round-1')).toContainText('You');
    await expect(page.getByTestId('round-1')).toContainText('50.00 EURC');
  });

  test('records payout history for each completed round', async ({
    page,
  }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);

    await contributeAndPayout(page);
    await contributeAndPayout(page);

    await expect(page.getByTestId('round-1')).toBeVisible();
    await expect(page.getByTestId('round-2')).toBeVisible();
    await expect(page.getByTestId('round-1')).toContainText('50.00 EURC');
    await expect(page.getByTestId('round-2')).toContainText('50.00 EURC');
  });
});