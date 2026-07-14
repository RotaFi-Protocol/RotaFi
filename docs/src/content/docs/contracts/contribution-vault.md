---
title: Contribution Vault
description: Per-circle escrow contract for managing contributions and payouts.
---

The `contribution-vault` contract manages the lifecycle of a single ROSCA circle — member joining, contributions, payouts, and default handling.

## Public Functions

### `initialize(config: VaultConfig)`

Initializes a new vault for a circle. Must be called once per circle.

### `join_vault(member: Address, usdc_token: Address)`

Allows a member to join by staking `min_collateral` USDC. When all slots are filled, the vault auto-activates.

**Requires:** `member.require_auth()`

### `contribute(member: Address, usdc_token: Address)`

Submit a contribution for the current round. Prevents double-payment and non-member contributions.

**Requires:** `member.require_auth()`

### `release_payout(winner: Address, usdc_token: Address)`

Releases the full pot (member_count × contribution) to the winner. Can only be called when all members have paid or the grace period has expired.

**Panics if:** winner has already received the pot, or conditions not met.

### `slash_default(defaulter: Address, slash_percent: u32) -> i128`

Slashes a percentage of the defaulter's collateral. Can only be called after grace period expires for members who haven't paid.

Returns the slashed amount.

### `get_vault() -> Vault`

Returns current vault metadata (round, state, member count, etc.).

### `get_member(member: Address) -> Option<MemberInfo>`

Returns member info including collateral, rounds missed, and pot status.

### `has_paid(round: u32, member: Address) -> bool`

Checks if a member paid for a specific round.
