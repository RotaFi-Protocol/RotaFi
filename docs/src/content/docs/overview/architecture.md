---
title: Architecture
description: System architecture and component overview.
---

RotaFi consists of four main layers:

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                    │
│  Circle Browser │ Dashboard │ Bids │ Reputation │ Wallet  │
├──────────────────────────────────────────────────────────┤
│                    Backend API (Express)                    │
│  REST endpoints │ Input validation │ Rate limiting         │
├──────────────────────────────────────────────────────────┤
│                     Keeper Bot (Node.js)                    │
│  Round advancement │ Default detection │ Payout triggers   │
├──────────────────────────────────────────────────────────┤
│                Soroban Contracts (Rust/WASM)                │
│  Circle Factory │ Vault │ Reputation │ Bid Engine          │
├──────────────────────────────────────────────────────────┤
│                    Stellar Network                          │
│            Soroban RPC │ Horizon │ Testnet                 │
└──────────────────────────────────────────────────────────┘
```

## Contract Architecture

### Circle Factory
Creates and manages circle instances. Stores circle metadata, enforces creation constraints (min 2 members, positive contributions), and emits events on creation.

### Contribution Vault
Per-circle escrow contract. Accepts USDC contributions, tracks per-round payment status, holds member collateral, and releases the pot to the winner once conditions are met.

### Reputation Registry
Shared, cross-circle reputation contract. Other contracts write default/completion events here. Any circle can read a member's history to make informed decisions about collateral requirements.

### Bid Engine
Handles sealed-bid auction logic. Members submit discount bids in basis points. On resolution, the highest discount wins and the discount is redistributed pro-rata.

## Data Flow

1. User connects wallet → Frontend
2. Frontend calls Backend API for contract reads
3. Backend simulates transactions via Soroban RPC
4. Write operations return transaction parameters
5. User signs and submits via wallet extension
6. Keeper bot polls vault state and advances rounds
