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

<!-- END -->
