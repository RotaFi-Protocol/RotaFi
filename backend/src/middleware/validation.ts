import { z } from 'zod';

export const createCircleSchema = z.object({
  contribution_amount: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  round_length_seconds: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  member_cap: z.number().int().min(2, 'Must have at least 2 members'),
  payout_method: z.number().int().min(0).max(2, 'Must be 0 (Lottery), 1 (Auction), or 2 (Priority)'),
  min_collateral: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  grace_period_seconds: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  // Token the circle is denominated in. Defaults to USDC when omitted.
  token_symbol: z
    .string()
    .min(1, 'Token symbol is required')
    .max(12, 'Token symbol is too long')
    .optional(),
  token_address: z.string().min(1, 'Token address is required').optional(),
});

export const joinCircleSchema = z.object({
  member_address: z.string().min(1, 'Member address is required'),
  circle_id: z.number().int().min(1, 'Circle ID is required'),
  token_address: z.string().min(1, 'Token address is required'),
});

export const contributeSchema = z.object({
  member_address: z.string().min(1, 'Member address is required'),
  token_address: z.string().min(1, 'Token address is required'),
});

export const submitBidSchema = z.object({
  member_address: z.string().min(1, 'Member address is required'),
  discount_bps: z.number().int().min(0).max(10000, 'Must be 0-10000 basis points'),
  round: z.number().int().min(1, 'Round must be >= 1'),
});

export const releasePayoutSchema = z.object({
  winner_address: z.string().min(1, 'Winner address is required'),
  token_address: z.string().min(1, 'Token address is required'),
});

export const reputationQuerySchema = z.object({
  member_address: z.string().min(1, 'Member address is required'),
});

const stellarAccount = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Must be a valid Stellar account address (G...)');

const assetCode = z
  .string()
  .min(1, 'Asset code is required')
  .max(12, 'Asset code is too long')
  .regex(/^[A-Za-z0-9]+$/, 'Asset code must be alphanumeric');

export const anchorAuthChallengeSchema = z.object({
  account: stellarAccount,
});

export const anchorAuthSubmitSchema = z.object({
  transaction: z.string().min(1, 'Signed challenge transaction is required'),
});

export const anchorDepositSchema = z.object({
  asset_code: assetCode,
  account: stellarAccount,
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number').optional(),
  memo: z.string().max(64, 'Memo is too long').optional(),
  lang: z.string().max(8, 'Language code is too long').optional(),
});

export const anchorWithdrawSchema = z.object({
  asset_code: assetCode,
  account: stellarAccount,
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a positive number').optional(),
  // Destination (bank account / cash pickup) is usually collected by the
  // anchor's interactive KYC UI, but may be supplied up-front.
  dest: z.string().max(256, 'Destination is too long').optional(),
  memo: z.string().max(64, 'Memo is too long').optional(),
  lang: z.string().max(8, 'Language code is too long').optional(),
});

export const anchorTransactionParamsSchema = z.object({
  id: z.string().min(1, 'Transaction id is required'),
});
