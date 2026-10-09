---
title: Bid Engine Abuse Threat Model
description: Frontrunning, round-boundary sniping and Sybil analysis for RotaFi's sealed-bid auction, with the commit-reveal mitigations now enforced on-chain.
---

This document is the security rationale for RotaFi's **sealed-bid auction**.
It describes what the `BidEngine` contract is supposed to guarantee, the abuse
vectors a naive auction exposes — **frontrunning of sealed bids**, **bid sniping
at round boundaries**, and **Sybil bidding from many addresses** — and the
on-chain mitigations that are now implemented in
[`contract/bid-engine/src/lib.rs`](https://github.com/RotaFi-Protocol/RotaFi/blob/master/contract/bid-engine/src/lib.rs).

It is written for contract reviewers, integrators, and circle organizers. It is
not a substitute for the repository [Security Policy](https://github.com/RotaFi-Protocol/RotaFi/blob/master/SECURITY.md)
or an independent audit.

> **Scope.** Everything below concerns the auction mechanism exposed by
> `start_auction`, `commit_bid`, `reveal_bid`, `resolve_auction` and the
> bid-engine views. Payout accounting after the auction settles lives in the
> [Contribution Vault](/contracts/contribution-vault), and collateral that backs
> a member's solvency is analysed in the
> [Collateral Slashing Threat Model](/security/collateral-slashing-threat-model).

> **History.** An earlier revision of the contract stored each discount in
> cleartext and accepted a bid at any time. "Sealed" was only nominal: every bid
> was public through `get_all_bids` before resolution, and no deadline or round
> binding existed. This model documents why that design was exploitable and the
> commit-reveal auction that replaced it.

## System model

### What the auction is meant to guarantee

An auction-style ROSCA pays one member the pot each round. Instead of a fixed
rotation or a lottery, members compete for the *right to receive the pot early*
by bidding a **discount** in basis points: a member offering 500 is willing to
receive 5% less than the full pot in exchange for being paid now. The highest
discount wins, and the winning discount is redistributed pro-rata to the other
members as bonus interest on their contributions.

The mechanism only works if the competition is **fair and private**:

1. **Secrecy** — no bidder can learn the field before committing to their own
   discount.
2. **Commitment** — once committed, a discount cannot change when the field
   becomes visible.
3. **Finality** — bids stop at a known deadline and the winner is selected by a
   deterministic rule that no caller can influence.

### In-scope assets

| Asset | Where it lives | At risk from abuse |
|---|---|---|
| Bid secrecy | `COMMITS` map, `sha256(contract ‖ member ‖ round ‖ discount ‖ nonce)` | Yes — the primary target of frontrunning |
| Pot assignment | `BidResult.winner` consumed by the vault | Yes — an unfair winner steals an early pot |
| Redistributed discount | `BidResult.discount_per_member` | Indirectly — manipulated winner changes the split |
| Roster eligibility | `Auction.members` | Yes — the gate Sybil addresses try to bypass |

### Actors

| Actor | Capability | Honest? |
|---|---|---|
| **Roster member** | Commits, reveals, can win the auction | Rational or Byzantine |
| **Non-member / Sybil** | Controls many addresses but is not on the roster | Byzantine by assumption |
| **Organizer** | Opens the auction and sets parameters | Possibly adversarial |
| **Keeper** | Permissionlessly calls `resolve_auction` after the deadlines | Untrusted — resolution is safe against any caller |
| **Stellar validators** | Order transactions and finalise the ledger clock | Byzantine up to Stellar's consensus assumptions |

### Trust boundaries

1. **Auction ↔ member.** Only an address in `Auction.members` may bid, and a
   commitment is bound to `(contract, member, round, discount, nonce)`, so it
   cannot be replayed by another member or in another round.
2. **Auction ↔ clock.** The commit and reveal phases are bounded by ledger
   timestamps; this is the boundary that stops sniping at the close.
3. **Auction ↔ organizer.** `start_auction` requires `config.organizer` to
   authorize and validates every parameter on-chain; only the roster contents
   remain trusted input (see residual risk O1).
4. **Auction ↔ ledger ordering.** Validators decide transaction order. Commit-
   reveal is specifically designed so that ordering confers no advantage.
