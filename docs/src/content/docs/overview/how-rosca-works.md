---
title: How ROSCA Works
description: Understanding the mechanics of rotating savings and credit associations.
---

A ROSCA (Rotating Savings and Credit Association) is a group savings mechanism where members contribute a fixed amount periodically, and one member receives the full pool each period.

## Core Mechanics

1. **Formation** — N members agree on a contribution amount, round frequency (e.g., weekly), and number of rounds (equal to N)
2. **Contribution** — Each round, every member contributes their share to the common pot
3. **Payout** — One member receives the full pot (N × contribution amount)
4. **Rotation** — This repeats until every member has received the pot exactly once

## Example: 5 Members, $100 Weekly

| Round | Pot Size | Recipient | Alice Pays | Bob Pays | Total per Member |
|-------|----------|-----------|------------|----------|------------------|
| 1 | $500 | Alice | $100 | $100 | 5 × $100 = $500 |
| 2 | $500 | Bob | $100 | $100 | $500 total |
| 3 | $500 | Charlie | $100 | $100 | $500 total |
| 4 | $500 | Diana | $100 | $100 | $500 total |
| 5 | $500 | Eve | $100 | $100 | $500 total |

Each member contributes $500 total and receives exactly $500 back — a zero-interest, trust-based savings mechanism.

## Payout Order Methods

RotaFi supports three methods for determining who receives the pot each round:

### Lottery
Random selection among members who haven't yet received the pot, using verifiable on-chain randomness.

### Sealed-Bid Auction
Members bid a discount they're willing to accept. The highest discount wins — they get the pot minus the discount, and the discount is redistributed pro-rata to other members as bonus interest.

### Priority-Based
The organizer or a voting mechanism ranks members by need. Useful for community-governed circles.

## Why Blockchain?

On Stellar, every transaction is transparent and immutable. Smart contracts enforce the rules programmatically — no organizer can abscond with funds, and defaults are permanently recorded.
