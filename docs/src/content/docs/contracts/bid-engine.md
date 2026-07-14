---
title: Bid Engine
description: Sealed-bid auction contract for auction-style circles.
---

The `bid-engine` contract implements sealed-bid auction logic for circles configured with the `SealedBidAuction` payout method.

## How It Works

1. An auction is started for a specific round
2. Members submit sealed bids (discount in basis points)
3. The highest discount wins — they get the pot minus the discount
4. The winning discount is redistributed pro-rata to other members

## Public Functions

### `start_auction(config: AuctionConfig, round: u32)`

Opens a new auction for the given round.

| Parameter | Description |
|-----------|-------------|
| circle_id | The circle this auction belongs to |
| member_cap | Total members in the circle |
| max_discount_bps | Maximum allowed discount bid |

### `submit_bid(member: Address, discount_bps: u32, round: u32)`

Places a sealed bid. Higher discount = more willing to receive pot early = likely winner.

**Requires:** `member.require_auth()`

### `resolve_auction(member_cap: u32) -> BidResult`

Resolves the auction:
- Finds the highest discount bid (winner)
- Calculates pro-rata discount per non-winner member
- Clears all bids for the next round
- Closes the auction

### `get_state() -> BidState`

Returns `Open` or `Closed`.

### `get_bid(member: Address) -> Option<Bid>`

Returns a specific member's bid.

### `get_all_bids() -> Vec<Bid>`

Returns all bids in the current auction.
