import { z } from 'zod';

export const createCircleSchema = z.object({
  contribution_amount: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  round_length_seconds: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  member_cap: z.number().int().min(2, 'Must have at least 2 members'),
  payout_method: z.number().int().min(0).max(2, 'Must be 0 (Lottery), 1 (Auction), or 2 (Priority)'),
  min_collateral: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
  grace_period_seconds: z.string().regex(/^\d+$/, 'Must be a positive integer string'),
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
