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

## Auction lifecycle

A single auction moves through `Commit → Reveal → Closed`. The phase is not
stored on every transition; it is **derived** from the number of commitments and
the ledger clock, so a stalled commit phase can never lock the auction open.

| Step | Function | Effect | Phase after |
|---|---|---|---|
| Open | `start_auction(config, members, round)` | Organizer-bound, roster-bound, round-bound auction created; `BIDS`/`COMMITS` cleared | `Commit` |
| Commit | `commit_bid(member, commitment, round)` | Stores a hiding commitment; increments `commit_count` | `Commit` (or `Reveal` when all committed) |
| Reveal | `reveal_bid(member, discount_bps, nonce, round)` | Verifies the opening against the commitment; stores a plaintext `Bid` | `Reveal` |
| Resolve | `resolve_auction()` | Picks the max revealed discount, tie-break by smallest address, clears state, records `LAST_ROUND` | `Closed` |

### The phase state machine

```
                       all committed            every commit revealed
    ┌──────────┐   OR commit_deadline passed   ┌──────────┐   OR reveal_deadline passed
    │  Commit  │ ────────────────────────────► │  Reveal  │ ───────────────────────────► Closed
    └──────────┘                               └──────────┘
         ▲                                            │
         │ start_auction (round > LAST_ROUND)         │ reveal_bid
         │                                            │ (opening checked against commitment)
    ┌──────────┐                                      │
    │  Closed  │ ◄────────────────────────────────────┘  resolve_auction
    └──────────┘
```

Two properties fall directly out of this design and drive the rest of the
analysis:

1. **Bids are hidden until commits close.** During `Commit`, only the digest is
   stored; `get_all_bids` is empty and `get_bid` returns `None`. The discount is
   unreadable until the reveal phase opens, which happens only once every member
   has committed or the commit deadline passes.
2. **Resolution is time-boxed and permissionless.** Any address may settle the
   auction, but only after every commit has been revealed or the reveal deadline
   has passed, so no caller can time the settle to a sniper.

## Abuse vectors

An abuse vector is a way for an adversary to gain the pot, or to deny a fair
auction, at the expense of honest bidders. Each vector below states the naive
behaviour that enabled it, the consequence, and the mitigation that is now
enforced.

### F1. Frontrunning sealed bids

**Naive behaviour.** The previous `submit_bid(member, discount_bps, round)`
wrote the discount straight into the persistent `BIDS` map, and `get_all_bids()`
returned every entry while the auction was still open. A bidder — or any
observer — could therefore:

- read the current highest discount and submit `highest + 1` (or the maximum)
  in the very next ledger, or
- wait until the field was visible and then choose whether and how much to bid.

Because the "sealed" bid was plaintext, the private-value auction collapsed into
an open one, and only the bidder willing to submit last at the maximum discount
could reliably win. Honest bidders who revealed their true value first were
systematically beaten.

**Consequence.** The winner is not the member who values the pot most, but the
member who best exploits timing — the classic *frontrunning* failure. The
redistributed discount (`discount_per_member`) is also affected because it is
derived from the winning (manipulated) discount.

**Mitigation.** `commit_bid` stores only
`sha256(contract ‖ member ‖ round ‖ discount_bps ‖ nonce)` during the commit
phase. The discount stays hidden until the reveal phase opens, and the digest is
binding, so a member cannot change their discount after seeing the openings.
This makes transaction ordering profitable-neutral: an adversary who copies a
broadcast opening still cannot know the field before their own commitment is
fixed.

**Test.** `test_sealed_bids_are_hidden_until_reveal` asserts `get_all_bids()` is
empty and `get_bid` is `None` while commitments exist.

### F2. Bid sniping at round boundaries

**Naive behaviour.** `start_auction(config, round)` ignored its `round` argument
(beyond an event), stored no auction-level round, and set no deadline.
`submit_bid` took the round from the caller and stored it per-bid. As a result:

- a bid could be accepted at *any* time — there was no commit deadline and no
  bid deadline, so the "auction" could be sniped in the same ledger that the
  keeper tried to settle;
- a bid submitted for round `N` while a round `N+1` auction was already open
  could be carried across round boundaries, and an already-resolved round could
  be bid into again.

**Consequence.** Round transitions are exactly when a ROSCA pot moves to its new
owner, so a sniper who fires into the boundary ledger can capture the pot with
zero price discovery. Stale or mis-labelled bids add confusion and enable replay
of a previously observed winning strategy.

**Mitigation.** The auction is now bound to a single `round`:

- `start_auction` rejects any round not strictly greater than `LAST_ROUND` (the
  last resolved round), so a past auction can never be replayed or re-opened.
- `commit_bid`/`reveal_bid` reject a `round` argument that does not match the
  open auction.
- `commit_deadline` closes the commit phase and `reveal_deadline` closes the
  reveal phase; after the reveal deadline, `resolve_auction` succeeds even with
  a partial reveal set, so there is no window in which a late bid can still
  win.

**Tests.** `test_stale_round_rejected`, `test_next_round_accepted`,
`test_commit_wrong_round_rejected`, `test_resolve_before_deadline_with_partial_reveals_rejected`
and `test_resolve_after_deadline_with_partial_reveals_succeeds`.

### F3. Sybil and non-member bidding

**Naive behaviour.** `submit_bid` authenticated the caller but never checked
whether they belonged to the circle. Any address that paid the gas could bid.
An attacker controlling many addresses could:

- guarantee that *some* controlled address bids the maximum discount, so an
  adversarial set can always capture the pot,
- probe the auction with many low offers to infer behaviour without cost, and
- in a plaintext auction, use each extra address as an independent frontrunning
  attempt.

**Consequence.** The auction is not restricted to the people who actually
contribute to the pot. A non-member can win an early pot and walk away with no
standing in the circle, and one physical person can dominate the field with
fresh addresses.

**Mitigation.** `start_auction` is given an explicit `members` roster and
stores it on-chain; `commit_bid`/`reveal_bid` require the caller to be on that
roster (`Only circle members may bid`). One bid per member is enforced by both
the commit map and the reveal map. Because the roster is the eligibility gate,
Sybil addresses that are not on it cannot bid at all — the auction becomes an
enrollment problem, not an auction problem.

**Tests.** `test_non_member_commit_rejected`, `test_sybil_address_rejected`,
`test_duplicate_commit_rejected`, `test_duplicate_reveal_rejected`.

### F4. Auction-configuration frontrunning

**Naive behaviour.** `start_auction` was fully permissionless. A third party
could race the legitimate organizer and open the auction first with
attacker-chosen parameters — for example an oversized `max_discount_bps` or a
member set of the attacker's choosing — and there was nothing to distinguish
the attacker's auction from the real one.

**Consequence.** An attacker controls the auction that governs a real pot, which
subsumes every other vector in this document: a fake roster (F3), an unbounded
discount cap, and a deadline set to now.

**Mitigation.** `AuctionConfig.organizer` must authorize
(`config.organizer.require_auth()`), the roster length must equal `member_cap`,
and the config is validated on-chain (`member_cap ≥ 2`, `min ≤ max`, `max ≤
100%`, and a minimum reveal window). A raced auction therefore requires the
organizer's own key.

### F5. Round replay and stale bids

**Naive behaviour.** `BIDS` was cleared only by `resolve_auction`, and there was
no record of which round had been settled. If an auction was never resolved,
bids could leak into the next round; a resolved-round auction could be re-opened.

**Mitigation.** `start_auction` clears both `BIDS` and `COMMITS` and requires
`round > LAST_ROUND`; `resolve_auction` records `LAST_ROUND` and clears both
maps. Re-opening a past round, or carrying bids across rounds, is impossible.
**Test.** `test_bids_cleared_after_resolution`.

### F6. Non-deterministic winner selection

**Naive behaviour.** The original resolution iterated the `BIDS` map and kept a
bid only on a *strict* increase in discount. With equal discounts the first
encountered entry won, and `Map` iteration order is not a caller-independent
order — the winner of a tie was effectively whichever entry the VM happened to
return.

**Consequence.** In a tie the result is arbitrary and possibly exploitable by
ordering, violating the determinism that members need to verify a fair auction.

**Mitigation.** `resolve_auction` breaks ties in favour of the lexicographically
smallest member address (`bid.member < current`), a rule that depends only on
the bids, never on storage order. **Test:** `test_resolve_deterministic_tie_break`.

### F7. Reserve bypass and degenerate winners

**Naive behaviour.** Any `discount_bps ≥ 0` was accepted, there was no reserve,
and zero bids made `resolve_auction` fail with a discouraged `unwrap`. A
bidder could win with a 0% "discount" (no value to anybody) or the auction
could fail to produce any result at all.

**Mitigation.** `min_discount_bps` sets a reserve and `max_discount_bps` a
ceiling, both checked on reveal; `resolve_auction` requires at least one valid
bid (`No valid bids to resolve`). **Tests:**
`test_discount_below_reserve_rejected`, `test_discount_above_max_rejected`,
`test_max_discount_above_denominator_rejected`,
`test_resolve_with_no_valid_bids_rejected`.

### F8. Reveal-lock griefing

**Naive behaviour (hypothetical plaintext version).** A member could last-second
withhold their bid, or in any commit-reveal auction refuse to reveal, to stall
the payout and frustrate the round.

**Consequence.** A single non-cooperating bidder blocks the pot.

**Mitigation.** Resolution is permitted once every commit has been revealed *or*
the reveal deadline passes, so a withheld reveal (or a completely empty commit
phase) costs the auction its liveness only until `reveal_deadline` — never
forever. **Tests:** `test_resolve_after_deadline_with_partial_reveals_succeeds`,
`test_resolve_with_no_valid_bids_rejected`.

## Security assumptions

The mechanism is only sound if the following hold. Each assumption lists whether
the current contract *enforces* it, *assumes* it (no on-chain check), or
*intends* it (dependency not yet wired up).

| ID | Assumption | Status |
|---|---|---|
| **A1** | The `members` roster passed to `start_auction` is the real circle membership. | Assumed — the roster is sourced from the caller party; see O1 |
| **A2** | A member keeps their `nonce` secret until the reveal phase. | Assumed — a leaked nonce reveals that member's discount early, but never past the committed digest |
| **A3** | Ledger timestamps advance monotonically and can't be shifted enough to bypass the commit/reveal deadlines. | Assumed — relies on Stellar core |
| **A4** | The `organizer` key is held honestly and only used to open legitimate auctions. | Assumed — `k`-of-`n` style personal key custody |
| **A5** | A commitment binds `(contract, member, round, discount, nonce)` and cannot be replayed elsewhere. | Enforced — `bid_commitment_digest` mixes all five fields |
| **A6** | A member can reveal at most one bid, and only the discounts in `[min, max]` are valid. | Enforced — duplicate reveals and out-of-range discounts are rejected |
| **A7** | Only roster members bid, and each member accounts for at most one bid. | Enforced — roster check plus per-member maps |
| **A8** | The auction resolves exactly once, for the round it was opened for, after a bounded window. | Enforced — `LAST_ROUND`, round binding, and the reveal deadline |

Assumptions **A1–A4** are trust placed in things outside the auction contract
itself (enrollment, off-chain secret custody, the ledger clock, and the
organizer's key). They are analysed as residual risks in
[Residual risks](#residual-risks). Assumptions **A5–A8** are load-bearing and
fully enforced by the hardened contract — frontrunning, sniping and Sybil
bidding all attack exactly these enforced invariants.

## Mitigations

All mitigations below are **implemented and tested** in the current contract
(there is no backlog item to enable them). They map one-to-one to the vectors
above.

| # | Mitigation | Vector closed | Enforced at |
|---|---|---|---|
| **M1** | Commit-reveal sealed bids: only a digest is stored until commits close; reveals checked against the digest | F1 | `commit_bid`, `reveal_bid` |
| **M2** | Round binding: bids carry the open auction's round and are otherwise rejected | F2, F5 | `start_auction`, `commit_bid`, `reveal_bid` |
| **M3** | Monotonic rounds: `round > LAST_ROUND`, recorded on resolve | F2, F5 | `start_auction`, `resolve_auction` |
| **M4** | Deadlines: `commit_deadline` and `reveal_deadline`, with a minimum reveal window | F2, F8 | `AuctionConfig.require_valid`, phase derivation |
| **M5** | Roster gating: only listed members may commit/reveal; one bid per member | F3 | `is_member`, per-member maps |
| **M6** | Organizer authorization and on-chain parameter validation | F4 | `AuctionConfig.require_valid`, `organizer.require_auth()` |
| **M7** | Deterministic tie-break by lexicographically smallest address | F6 | `resolve_auction` |
| **M8** | Reserve (`min_discount_bps`) and ceiling (`max_discount_bps`) with valid-bid requirement | F7 | `reveal_bid`, `resolve_auction` |
| **M9** | Permissionless, time-boxed resolution with partial-reveal fallback | F8 | `resolve_auction` |

M1 is the core control and deserves emphasis. The combination of *hiding* until
the commit phase closes and *binding* once it does is what turns a plaintext
"sealed" auction into a true one: the discount of member *A* is unknowable by
member *B* before B's commitment, and unalterable after the openings appear. A
sniper armed with perfect transaction-ordering freedom (the strongest assumption
Stellar's consensus tolerates) gains nothing, because there is no intermediate
state in which a higher bid can be fabricated from observed one.

M5 is what makes Sybil bidding moot at the contract layer: the set of eligible
addresses is fixed at `start_auction`. Combined with M1 it also stops Sybil
*observation* — a Sybil gains no informational edge by creating addresses,
because the field is opaque to them just as it is to everyone else until the
commit phase closes.

## Threat matrix

| ID | Threat | Attacker | Likelihood | Impact | Assumption violated | Mitigation |
|---|---|---|---|---|---|---|
| F1 | Frontrunning sealed bids | Any bidder / observer | High | Auction lost to timing, not value | A5 | M1 |
| F2 | Bid sniping at round boundaries | Any bidder | High | Pot captured at zero price discovery | A8 | M2, M3, M4 |
| F3 | Sybil / non-member bidding | Attacker with many addresses | Medium | Non-members win, field dominated | A7 | M5 |
| F4 | Auction-configuration frontrunning | Third party | Medium | Attacker-controlled auction | A4 | M6 |
| F5 | Round replay / stale bids | Any bidder | Low | Replayed rounds and old strategies | A8 | M2, M3 |
| F6 | Non-deterministic tie-break | Any bidder | Low | Arbitrary, unordered winner | A8 | M7 |
| F7 | Reserve bypass / degenerate winner | Any bidder | Low | 0-value win or failed resolution | A6 | M8 |
| F8 | Reveal-lock griefing | Any roster member | Low | Payout stall | A8 | M4, M9 |

F1 and F2 are the dominant threats the issue asks about, and they are the
highest-likelihood rows in the matrix: they require only one rational bidder,
no key compromise, and no collusion. They are the rows whose named mitigations
(M1 commit-reveal, M4 deadlines) are the heart of the hardening.

No currently-shipped control fully closes the *enrollment* problem (A1/O1): an
organizer who assembles a roster entirely of their own addresses can still
poison it, but that is a membership problem, not an auction problem, and is the
subject of the collateral-slashing model and reputation registry.

## Residual risks and open questions

Even with the hardened contract, the following are accepted or unresolved:

- **O1 — Roster is trusted input.** `start_auction` trusts the caller-supplied
  `members` list. There is no on-chain proof that an address is a distinct human
  contributor, so Sybil resistance ultimately depends on enrollment (`A1`). A
  malicious organizer who seeds the roster with controlled addresses can front
  the auction with a coalition; this is the same organizer-fronted defaulting
  concern documented in the collateral-slashing model.
- **O2 — Nonce secrecy is off-chain.** If a member shares their `nonce`, their
  discount is knowable ahead of reveal. The cost is bounded: they still cannot
  bid outside `[min_discount_bps, max_discount_bps]`, and the commitment
  prevents altering the discount. Nonetheless, nonce hygiene should be
  emphasised to members and wallets.
- **O3 — Timestamp trust (A3).** Commit and reveal deadlines rely on ledger
  timestamps. A validator-coordinated shift could shorten or extend a window;
  this is bounded by Stellar consensus and accepted.
- **O4 — Organizer liveness.** Only `config.organizer` can open an auction.
  If the organizer is unavailable, the round's auction cannot start and the
  keeper cannot settle that round. A future permissionless-start fallback is a
  candidate hardening.
- **O5 — Aggressive discounts.** A member may bid the full `max_discount_bps`
  (the 100% ceiling with no upper governance bound). The winner then receives
  almost none of the pot and the redistribution is large. There is no deposit
  or penalty for "bid and then default" beyond the collateral story in the
  vault model.
- **O6 — No on-chain bad-bidder marking.** Abusive patterns (e.g. an organizer
  that consistently fills rosters with controlled addresses) produce no
  on-chain signal. Cross-circle reputation for auction-related misbehaviour
  remains off-chain for now.

Decisions that need a governance call before these are closed: whether the max
discount should become a per-circle governed control (O5), whether
permissionless auction start should replace organizer-only start (O4), and
whether auction-misbehaviour metrics should feed `ReputationRegistry` (O6).
