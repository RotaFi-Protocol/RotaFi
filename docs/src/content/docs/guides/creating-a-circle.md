---
title: Creating a Circle
description: Step-by-step guide to creating your first ROSCA circle on RotaFi.
---

## Steps

### 1. Connect Your Wallet

Open the RotaFi frontend and connect your **Freighter**, **xBull**, or **Rabet** wallet. Make sure your wallet is on the Stellar Testnet and has testnet USDC.

### 2. Fund Your Wallet

Get testnet XLM from [Friendbot](https://friendbot.stellar.org) and testnet USDC from the Stellar testnet faucet.

### 3. Create a Circle

Navigate to the Circle Browser and click "Create Circle". Configure:

- **Contribution Amount** — how much each member contributes per round (in USDC)
- **Round Length** — e.g., 604800 seconds (1 week)
- **Member Cap** — max number of members (at least 2)
- **Payout Method** — Lottery, Auction, or Priority
- **Collateral** — the stake each member must post (slashed on default)
- **Grace Period** — extra time after round end before default is processed

### 4. Invite Members

Share your circle ID with potential members. They'll need to:

1. Connect their wallet
2. Navigate to your circle
3. Click "Join Circle" and sign the transaction
4. This transfers their collateral to the vault

### 5. Run the Circle

Once the member cap is reached:
- The vault auto-activates
- Members contribute each round
- The keeper bot advances rounds and triggers payouts
- Each member receives the pot exactly once

### 6. Complete

After the final round, the circle is marked `Completed`. All members get their collateral back (minus any slashes for defaults).
