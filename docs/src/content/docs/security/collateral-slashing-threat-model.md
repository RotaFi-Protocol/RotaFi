---
title: Collateral Slashing Threat Model
description: Security assumptions, economic incentives, griefing and collusion analysis for RotaFi's collateral slashing mechanism.
---

This document is the security rationale for RotaFi's **collateral slashing**
mechanism. It describes what the mechanism is supposed to guarantee, the
assumptions it relies on, the ways those assumptions can be violated
(griefing, collusion, and adverse selection), and the mitigations available to
the protocol.

It is written for contract reviewers, integrators, and circle organizers. It is
not a substitute for the repository [Security Policy](https://github.com/RotaFi-Protocol/RotaFi/blob/master/SECURITY.md)
or an independent audit.

> **Scope.** Everything below concerns the `ContributionVault` collateral
> accounting (`join_vault`, `contribute`, `slash_default`, `release_payout`,
> `release_lottery_payout`) and the policies in `ProtocolConfig` that bound it.
> The sealed-bid auction ([Bid Engine](/contracts/bid-engine)) and
> lottery randomness ([Contribution Vault](/contracts/contribution-vault#lottery-randomness))
> are treated as adjacent systems and only referenced where they change the
> slashing incentives.

## System model

### What collateral is meant to do

A ROSCA pays one member the whole pot each round. A member who receives early
has a strong incentive to stop paying, because their remaining obligations
exceed the value of a future payout they now hold. **Collateral is the
mechanism that makes that defection unprofitable**: every member locks
`min_collateral` in the vault at `join_vault`, and `slash_default` confiscates
a portion of it when they miss a contribution.

Collateral is therefore not a fee or a yield source. It is a **performance
bond**, and its only job is to make the expected cost of defaulting exceed the
expected gain.

### In-scope assets

| Asset | Where it lives | At risk from slashing |
|---|---|---|
| Member collateral (`min_collateral`) | `ContributionVault` balance, tracked per member in `MemberInfo.collateral_staked` | Yes — this is what is slashed |
| Round contributions (`contribution_per_member`) | `ContributionVault` balance, tracked in `ROUND_PAYMENTS` | Indirectly — default reduces the pot |
| Payout pot | Transferred out to the round winner | Indirectly — underpayment if members default |
| Reputation score | `ReputationRegistry` (`defaults`, `total_slashed`) | Intended to be, but see assumptions |

### Actors

| Actor | Capability | Honest? |
|---|---|---|
| **Member** | Joins, contributes, commits/reveals randomness, is slashable | Rational or Byzantine |
| **Defaulter** | A member who has not paid after the grace period | Rational adversary by assumption |
| **Keeper** | Permissionless off-chain watcher that detects defaults and submits slashes | Untrusted — must not be able to harm honest members |
| **Organizer** | Creates circles via `CircleFactory`; controls parameters within protocol bounds | Possibly adversarial |
| **Multisig owners** | Govern `ProtocolConfig` (`slash_bps`, collateral bounds, upgrades) | Trusted-set assumption (`k`-of-`n`) |
| **Stellar validators** | Order and finalize ledgers; influence ledger-derived entropy | Byzantine up to Stellar's consensus assumptions |

### Trust boundaries

1. **Vault ↔ member.** The vault trusts only `member.require_auth()` and the
   token transfer succeeding. A member cannot move another member's collateral.
2. **Vault ↔ keeper.** The keeper is untrusted. `slash_default` has **no
   caller authentication** (see [`slash_default` in the source][src-slash]), so
   *any* address can trigger a slash — and any address can also front-run or
   spam it. Enforcement must be safe *against its own caller*, not because the
   caller is trusted.
3. **Vault ↔ ProtocolConfig.** The vault currently hard-codes no link to the
   multisig slash rate; `slash_percent` arrives as a caller argument. The
   protocol bounds in `ProtocolConfig` are advisory unless the vault reads and
   enforces them.
4. **Protocol ↔ ledger.** Ledger sequence, timestamp and network id feed the
   lottery seed; validators are trusted not to adversarially reorder or
   manipulate close times for profit.

[src-slash]: https://github.com/RotaFi-Protocol/RotaFi/blob/master/contract/contribution-vault/src/lib.rs

## Collateral lifecycle

The vault moves through `Setup → Active → Completed` (with `Paused` reserved).
Collateral is only accepted during `Setup` and only mutated during `Active`.

| Step | Function | Collateral effect | Round effect |
|---|---|---|---|
| Join | `join_vault` | `+min_collateral` transferred in, stored in `MemberInfo.collateral_staked` | Vault auto-activates when `member_count == member_cap` |
| Contribute | `contribute` | None | Marks `(round, member)` paid, increments `members_paid_current_round` |
| Advance (happy) | `release_payout` / `release_lottery_payout` | None | Increments `current_round` once all paid or grace expires |
| Default | `slash_default` | `collateral_staked -= collateral_staked * slash_percent / 100`; `rounds_missed += 1` | **No advancement** — stays on the same round |

### The slashing state machine

```
                    all paid
   Active round N ───────────────► round N+1
        │
        │ round_length + grace_period elapse, member unpaid
        ▼
   slash_default(member, p)          (repeatable until the round advances)
        │  requires: !has_paid(member, round N)
        │            grace_ended == true
        ▼
   collateral_staked -= stake * p / 100
   rounds_missed += 1
```

Two properties fall directly out of this design and drive the rest of the
analysis:

1. **Enforcement is permissionless.** `slash_default` authenticates nothing
   about its caller. This is deliberate — it prevents an organizer from
   censoring enforcement — but it also means the *parameters and frequency* of
   a slash are attacker-controllable.
2. **A slash does not end the round.** Advancing the round (which clears the
   "unpaid" condition) is a separate call, so the default condition can persist
   across many `slash_default` calls.

## Security assumptions

The mechanism is only sound if the following hold. Each assumption lists
whether the current contract *enforces* it, *assumes* it (no on-chain check),
or *intends* it (dependency not yet wired up).

| ID | Assumption | Status |
|---|---|---|
| **A1** | Collateral is at least large enough to make defaulting unprofitable over the remaining rounds. | Assumed — `min_collateral` is set per circle and only bounded by `ProtocolConfig` if the factory checks it; the vault does not enforce an obligation-coverage relationship |
| **A2** | `slash_percent` is at most the governance-approved `slash_bps` and never exceeds 100. | Assumed — `slash_default` takes `slash_percent` as a raw caller argument with no bound |
| **A3** | A member can be slashed at most once per round, and only for the current round. | Violated by design — repeated `slash_default` calls compound while the round stays open |
| **A4** | Slashed collateral is redistributed to honest members or retained as compensation. | Not implemented — slashing only decrements accounting; tokens are not moved or paid out |
| **A5** | Remaining collateral is returned to members at completion. | Not implemented — there is no exit/withdraw path for `collateral_staked` |
| **A6** | `slash_default` records to `ReputationRegistry.record_default`. | Not wired — no cross-contract call exists in the vault |
| **A7** | The token used is a well-behaved Stellar asset (no transfer fees, no rebasing, `transfer` reverts on failure). | Assumed — any circle token is accepted as a parameter |
| **A8** | Ledger timestamps advance monotonically and can't be manipulated enough to bypass or accelerate the grace period. | Assumed — relies on Stellar core |
| **A9** | The `ProtocolConfig` multisig is honest and a majority cannot be coerced; upgrade authority is not compromised. | Assumed — `k`-of-`n` trust |
| **A10** | Member eligibility (`is_active && !has_received_pot`) is the correct set for both payout and slashing. | Enforced for payout; **not applied to slashing** — `slash_default` does not check `is_active` or `has_received_pot` |

Assumptions **A3–A6** and **A10** are the load-bearing gaps: they are areas
where the intended guarantee is stronger than what the code currently proves.
They are analysed as attack classes in the sections that follow and revisited
in [Residual risks](#residual-risks).

<!-- END -->
