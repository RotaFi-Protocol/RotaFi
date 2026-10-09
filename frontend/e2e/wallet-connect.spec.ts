import { test, expect } from '@playwright/test';
import { mockFreighter, TEST_PUBLIC_KEY } from './fixtures/wallet';

test.describe('wallet connect', () => {
  test('connects a Freighter wallet and shows the account address', async ({
    page,
  }) => {
    await mockFreighter(page);
    await page.goto('/');

    await expect(
      page.getByTestId('connect-freighter'),
    ).toBeVisible();
    await page.getByTestId('connect-freighter').click();

    await expect(page.getByTestId('wallet-address')).toHaveText(
      `${TEST_PUBLIC_KEY.slice(0, 4)}...${TEST_PUBLIC_KEY.slice(-4)}`,
    );
    await expect(page.getByTestId('wallet-provider')).toHaveText('freighter');
  });

  test('connection persists across page navigation', async ({ page }) => {
    await mockFreighter(page);
    await page.goto('/');
    await page.getByTestId('connect-freighter').click();
    await expect(page.getByTestId('wallet-address')).toBeVisible();

    await page.goto('/dashboard');
    await expect(page.getByTestId('wallet-address')).toBeVisible();
  });

  test('disconnect returns to the provider buttons', async ({ page }) => {
    await mockFreighter(page);
    await page.goto('/');
    await page.getByTestId('connect-freighter').click();
    await expect(page.getByTestId('wallet-address')).toBeVisible();

    await page.getByTestId('wallet-disconnect').click();

    await expect(page.getByTestId('connect-freighter')).toBeVisible();
    await expect(page.getByTestId('wallet-address')).toHaveCount(0);
  });
});