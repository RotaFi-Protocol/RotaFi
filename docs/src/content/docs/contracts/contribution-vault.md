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

> Lottery circles should **not** use this — see the [Lottery Randomness](#lottery-randomness) section below.

### `commit_randomness(member: Address, commitment: BytesN<32>)`

Submits a sealed commitment for the current round's lottery draw. The commitment must be `sha256(contract || member || round || secret)`.

**Requires:** `member.require_auth()`. Members who already received the pot are ineligible.

### `reveal_randomness(member: Address, secret: BytesN<32>)`

Opens the previously committed secret once every eligible member has committed. The contract recomputes the digest and rejects any secret that does not match.

**Requires:** `member.require_auth()`, reveal phase open.

### `release_lottery_payout(usdc_token: Address)`

Draws the lottery winner from the round's openings mixed with ledger data and releases the pot. The caller cannot choose or influence the winner.

Can be called once every eligible member has revealed, or after the reveal window expires (members who haven't revealed fall back to their still-binding commitments, so the pot can never be locked).

### `get_round_randomness() -> Option<RoundRandomness>`

Returns the current round's commit/reveal phase, counts and reveal deadline.

### `get_commitment(round: u32, member: Address) -> Option<BytesN<32>>`

Returns the stored commitment for a member and round.

### `get_reveal(round: u32, member: Address) -> Option<BytesN<32>>`

Returns the revealed secret for a member and round.

### `get_round_seed(round: u32) -> Option<BytesN<32>>`

Returns the finalised draw seed for a completed round.

### `preview_lottery_winner() -> Option<Address>`

Computes the winner the current openings would produce, without paying out. Useful for off-chain verification.

### `slash_default(defaulter: Address, slash_percent: u32) -> i128`

Slashes a percentage of the defaulter's collateral. Can only be called after grace period expires for members who haven't paid.

Returns the slashed amount.

### `get_vault() -> Vault`

Returns current vault metadata (round, state, member count, etc.).

### `get_member(member: Address) -> Option<MemberInfo>`

Returns member info including collateral, rounds missed, and pot status.

### `has_paid(round: u32, member: Address) -> bool`

Checks if a member paid for a specific round.

## Lottery Randomness

Stellar does not expose a trustless, verifiable randomness beacon inside
Soroban. `env.prng()` is seeded from public ledger data and is under validator
influence, so it is deliberately **not** used as the lottery source.

Instead, lottery circles use a **commit-reveal** scheme:

1. Each eligible member picks a random 32-byte secret off-chain and commits to
   `sha256(contract || member || round || secret)` via `commit_randomness`.
   Commitments are stored immutably; once committed, a member cannot change
   their value without knowing they will be rejected at reveal time.
2. When every eligible member has committed, the reveal phase opens. Each
   member calls `reveal_randomness`, and the contract verifies the digest —
   so a member cannot adapt their secret after seeing everyone else's.
3. The final seed is `sha256(openings... || ledger_sequence || close_time ||
   network_id)`. The ledger fields cannot be known until the draw transaction's
   ledger closes, and both the seed and the chosen winner are emitted as events.

The winner index is derived deterministically from the seed over the
address-sorted eligible member list, so anyone can recompute and verify the
outcome from public data.
