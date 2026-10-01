title: "[Contract] Emit CollateralSlash event in ContributionVault"
labels: contract

## Task

When a member misses a contribution and their collateral is slashed, emit a Soroban event so the keeper and indexers can track it off-chain.

## Acceptance Criteria

- `env.events().publish()` called on every slash with fields: `circle_id`, `member`, `amount_slashed`, `ledger`
- Unit test verifying event is emitted

## Files

`contract/contribution-vault/src/lib.rs`
