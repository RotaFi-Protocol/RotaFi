import { expect, type Page } from '@playwright/test';
import { mockFreighter, TEST_PUBLIC_KEY } from './fixtures/wallet';

/** Connects the mock Freighter wallet on the home page. */
export async function connectWallet(page: Page): Promise<void> {
  await mockFreighter(page);
  await page.goto('/');
  await page.getByTestId('connect-freighter').click();
  await expect(page.getByTestId('wallet-address')).toHaveText(
    `${TEST_PUBLIC_KEY.slice(0, 4)}...${TEST_PUBLIC_KEY.slice(-4)}`,
  );
}

/** Joins the given circle from the browse page and waits on its detail page. */
export async function joinCircleFromBrowse(
  page: Page,
  circleId: number,
): Promise<void> {
  await page.getByTestId(`join-circle-${circleId}`).click();
  await page.waitForURL(`**/circles/${circleId}`);
  await page.getByTestId('join-circle').click();
  await expect(page.getByTestId('circle-status')).toHaveText('Active');
  await expect(page.getByTestId('current-round')).toHaveText('1 / 5');
}

/** Contributes for the current round and releases the payout. */
export async function contributeAndPayout(page: Page): Promise<void> {
  await page.getByTestId('contribute').click();
  await expect(page.getByTestId('members-paid')).toHaveText('5 / 5');
  await page.getByTestId('release-payout').click();
}

/** Drives a joined circle through every round and asserts completion. */
export async function completeCircle(page: Page, roundCount = 5): Promise<void> {
  for (let round = 1; round <= roundCount; round += 1) {
    await contributeAndPayout(page);
    if (round < roundCount) {
      await expect(page.getByTestId('current-round')).toHaveText(
        `${round + 1} / ${roundCount}`,
      );
      await expect(page.getByTestId('members-paid')).toHaveText('0 / 5');
    }
  }
  await expect(page.getByTestId('circle-status')).toHaveText('Completed');
  await expect(page.getByTestId('completion-banner')).toBeVisible();
  await expect(page.getByTestId('round-history')).toBeVisible();
  await expect(page.getByTestId(`round-${roundCount}`)).toBeVisible();
}