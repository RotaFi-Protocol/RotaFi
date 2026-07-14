---
title: Keeper Bot
description: Automated round advancement and default detection service.
---

The Keeper Bot is a background worker that monitors active circles and automates round lifecycles.

## Responsibilities

1. **Poll active vaults** — checks vault state at a configurable interval
2. **Advance rounds** — when all members have paid, triggers payout
3. **Detect defaults** — identifies members who missed contributions
4. **Apply slashes** — after grace period expires, slashes defaulter collateral
5. **Complete circles** — marks circles as completed after final round

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `POLL_INTERVAL_MS` | 30000 | Polling interval in milliseconds |
| `SOROBAN_RPC_URL` | testnet URL | Soroban RPC endpoint |
| `CONTRIBUTION_VAULT_ADDRESS` | — | Vault contract address |

## Logging

The keeper uses structured logging with **correlation IDs** per circle per round:

```
circle-{circleId}-round-{roundNumber}
```

This allows tracing a full round's lifecycle — from polling to default detection to payout — in logs.

## Running

```bash
cd keeper
npm install
npm run build
npm start
```
