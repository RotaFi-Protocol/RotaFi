import { test, expect } from '@playwright/test';
import {
  connectWallet,
  joinCircleFromBrowse,
  completeCircle,
} from './helpers';

test.describe('full circle lifecycle', () => {
  test('wallet connect → browse → join → contribute → payout → completion', async ({
    page,
  }) => {
    await connectWallet(page);

    await expect(page.getByTestId('circle-card-1')).toBeVisible();
    await joinCircleFromBrowse(page, 1);

    await completeCircle(page, 5);

    await expect(page.getByTestId('received-pot')).toBeVisible();
    await expect(page.getByTestId('round-history')).toBeVisible();
    await expect(page.getByTestId('round-5')).toBeVisible();
  });
});