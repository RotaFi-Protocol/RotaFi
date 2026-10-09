---
title: Bid Engine
description: Sealed-bid auction contract for auction-style circles.
---

The `bid-engine` contract implements sealed-bid auction logic for circles configured with the `SealedBidAuction` payout method.

## How It Works

1. The organizer opens an auction for a specific round with a fixed member roster and commit/reveal deadlines
2. Members commit a hiding digest of their discount (discount in basis points)
3. Once every member has committed (or the commit deadline passes), members reveal their discount
4. The highest revealed discount wins — they get the pot minus the discount
5. The winning discount is redistributed pro-rata to the other members

Bids are **sealed**: during the commit phase only
`sha256(contract || member || round || discount_bps || nonce)` is stored, so no
bidder can read the field and outbid it. See the
[Bid Engine Abuse Threat Model](/security/bid-engine-abuse-threat-model) for the
rationale (frontrunning, round-boundary sniping, Sybil bidding).

## Public Functions

### `start_auction(config: AuctionConfig, members: Vec<Address>, round: u32)`

Opens a new auction for the given round.

| Parameter | Description |
|-----------|-------------|
| circle_id | The circle this auction belongs to |
| organizer | Address that must authorize the call, and the only one that can open the auction |
| member_cap | Total members in the circle |
| min_discount_bps | Reserve — minimum acceptable discount |
| max_discount_bps | Maximum allowed discount bid |
| commit_deadline | Timestamp after which no further commitments are accepted |
| reveal_deadline | Timestamp after which the auction can be resolved |

`members` is the circle roster; only these addresses may bid. `round` must be
strictly greater than the last resolved round.

### `commit_bid(member: Address, commitment: BytesN<32>, round: u32)`

Commits to a sealed bid. `commitment` must be
`sha256(contract || member || round || discount_bps || nonce)`.

**Requires:** `member.require_auth()`, roster membership, round match, open commit phase.

### `reveal_bid(member: Address, discount_bps: u32, nonce: BytesN<32>, round: u32)`

Reveals a previously committed bid. The contract recomputes the digest and
rejects any opening that does not match.

**Requires:** `member.require_auth()`, open reveal phase, discount within `[min_discount_bps, max_discount_bps]`.

### `resolve_auction() -> BidResult`

Resolves the auction when every commit has been revealed or the reveal deadline
has passed:
- Finds the highest discount bid (winner); ties break to the smallest address
- Calculates pro-rata discount per non-winner member from the stored `member_cap`
- Clears all bids and commitments for the next round
- Closes the auction and records the round for replay protection

Permissionless — any address may settle, but only after the reveal window.

### `get_state() -> BidState`

Returns `Open` or `Closed`.

### `get_phase() -> AuctionPhase`

Returns `Commit`, `Reveal` or `Closed`.

### `get_auction() -> Option<Auction>`

Returns the full stored auction (config, round, roster, commit/reveal counts).

### `get_last_resolved_round() -> u32`

Returns the round of the last resolved auction.

### `get_bid(member: Address) -> Option<Bid>`

Returns a member's revealed bid. Returns `None` while the bid is still sealed.

### `get_commitment(member: Address) -> Option<BytesN<32>>`

Returns a member's sealed commitment.

### `get_all_bids() -> Vec<Bid>`

Returns all revealed bids in the current auction.