---
title: Reputation Registry
description: Cross-circle on-chain reputation scoring.
---

The `reputation-registry` contract maintains a portable, cross-circle reputation score for every member. Other contracts write to it when defaults or completions occur, and any circle can read a member's history.

## Public Functions

### `record_join(member: Address)`

Records that a member has joined a new circle. Increments their `circles_joined` counter.

### `record_completion(member: Address, circle_id: u32)`

Records a successful circle completion. Increments `circles_completed`.

### `record_default(member: Address, circle_id: u32, slashed_amount: i128)`

Records a default event, including the amount slashed from collateral. Increments `defaults` and `total_slashed`.

### `get_score(member: Address) -> Option<ReputationScore>`

Returns the full reputation score for a member:
- `circles_joined` — total circles participated in
- `circles_completed` — successfully completed
- `defaults` — times defaulted
- `total_slashed` — cumulative amount slashed

### `get_rating(member: Address) -> u32`

Returns a 0-100 reputation rating. New members start at 100.

- **100** — perfect record, or new member
- **0** — all defaults, no completions

Formula: `(circles_completed * 100) / (circles_completed + defaults)`
