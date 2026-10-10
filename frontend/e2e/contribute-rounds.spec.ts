import { test, expect } from '@playwright/test';
import { connectWallet, joinCircleFromBrowse, contributeAndPayout } from './helpers';

test.describe('contribute each round', () => {
  test('contribute unlocks the payout for the current round', async ({
    page,
  }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);

    await expect(page.getByTestId('release-payout')).toHaveCount(0);
    await page.getByTestId('contribute').click();

    await expect(page.getByTestId('members-paid')).toHaveText('5 / 5');
    await expect(page.getByTestId('release-payout')).toBeVisible();
    await expect(page.getByTestId('contribute')).toHaveCount(0);
  });

  test('contributes across multiple rounds', async ({ page }) => {
    await connectWallet(page);
    await joinCircleFromBrowse(page, 1);

    await contributeAndPayout(page);
    await expect(page.getByTestId('current-round')).toHaveText('2 / 5');
    await expect(page.getByTestId('members-paid')).toHaveText('0 / 5');
    await expect(page.getByTestId('contribute')).toBeVisible();

    await contributeAndPayout(page);
    await expect(page.getByTestId('current-round')).toHaveText('3 / 5');
  });
});