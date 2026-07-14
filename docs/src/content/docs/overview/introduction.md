---
title: What is RotaFi?
description: Trustless rotating savings and credit associations on Stellar Soroban.
---

RotaFi brings the centuries-old practice of **ROSCA** (Rotating Savings and Credit Associations) — also known as chit funds, tandas, or susu — to the Stellar blockchain.

## The Problem

Traditional ROSCAs rely entirely on trust among members. If a member defaults after receiving the pot, the remaining members lose their contributions with no recourse. This trust requirement limits ROSCAs to tight-knit communities and prevents them from scaling.

## The Solution

RotaFi replaces social trust with **smart contract guarantees** on Stellar Soroban:

- **Collateral staking** — every member posts a refundable USDC stake on joining
- **Automated payouts** — the pot is released only when conditions are met, not when an organizer decides
- **Reputation tracking** — defaults are recorded on-chain, creating a portable score visible to all circles
- **Verifiable randomness** — for lottery-style circles, payout order is determined by on-chain randomness

## Key Features

| Feature | Description |
|---------|-------------|
| Circle Creation | Configure contribution amount, round length, member cap, and payout method |
| USDC Contributions | All payments in Stellar USDC via Soroban's token interface |
| Multi-method Payout | Lottery, sealed-bid auction, or priority-based payout order |
| Default Protection | Collateral slashing and on-chain reputation marks for missed payments |
| Keeper Automation | Background bot advances rounds and triggers payouts automatically |
