---
title: Circle Factory
description: Contract for creating and managing ROSCA circles.
---

The `circle-factory` contract is the entry point for creating new ROSCA circles on Stellar.

## Public Functions

### `create_circle(config: CircleConfig) -> u32`

Creates a new circle with the given configuration. Returns the circle ID.

| Parameter | Type | Description |
|-----------|------|-------------|
| contribution_amount | i128 | Amount per member per round (in stroops) |
| round_length_seconds | u64 | Duration of each round |
| member_cap | u32 | Maximum number of members (min 2) |
| payout_method | PayoutMethod | Lottery (0), SealedBidAuction (1), or PriorityBased (2) |
| min_collateral | i128 | Minimum collateral stake required |
| grace_period_seconds | u64 | Grace period after round ends |

**Panics if:** member_cap < 2, contribution_amount <= 0, round_length_seconds <= 0.

### `get_circle(circle_id: u32) -> Option<Circle>`

Returns the circle metadata for the given ID, or `None` if not found.

### `circle_count() -> u32`

Returns the total number of circles created.

### `activate_circle(circle_id: u32)`

Activates a circle (called by the contribution vault once setup is complete).

## Events

- `circle_cr` — emitted on circle creation with `(circle_id, organizer, config)`
