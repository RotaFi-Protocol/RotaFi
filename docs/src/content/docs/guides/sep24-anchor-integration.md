---
title: Fiat On/Off Ramps (SEP-24 Anchors)
description: Fund contributions with fiat and cash out received pots through a SEP-24 anchor.
---

RotaFi integrates with [Stellar Ecosystem Proposal 24 (SEP-24)](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
anchors so that members can:

- **Fund contributions from fiat** — buy Stellar assets (USDC, EURC, …) with a
  bank transfer or card through the anchor's interactive deposit flow.
- **Cash out received pots** — redeem the pot you win back to your bank or
  cash network through the anchor's interactive withdrawal flow.

The protocol ships with an anchor proxy on the backend and a wallet-integrated
UI on the frontend. By default the whole stack talks to the SDF **test anchor**
(`testanchor.stellar.org`), which implements SEP-24 + SEP-10 on the Stellar
testnet.

## How it works

```
Wallet (browser)                 RotaFi backend              SEP-24 anchor
        |  /api/v1/anchors/info        |                          |
        |----------------------------->|  resolve stellar.toml     |
        |                              |-------------------------->|
        |                              |  GET /info                |
        |<-----------------------------|---------------------------|
        |  /api/v1/anchors/auth/challenge  |                      |
        |  (SEP-10, signs with Freighter)  -> POST /auth -> JWT   |
        |  /api/v1/anchors/deposit  (Bearer JWT)                  |
        |-----------------------------|  POST /transactions/       |
        |                              |      deposit/interactive  |
        |<------------ interactive url |-------------------------->|
        |  opens popup, completes KYC/payment                     |
        |  /api/v1/anchors/transactions/:id  (poll)               |
        |-----------------------------|  GET /transaction?id=     |
        |<-------------- completed    |<--------------------------|
```

1. The frontend calls `GET /api/v1/anchors/info` to learn which assets the
   anchor supports for deposit/withdraw and whether SEP-10 sign-in is required.
2. If the anchor requires SEP-10, the connected wallet signs a challenge and
   receives a JWT.
3. `POST /api/v1/anchors/deposit` (or `/withdraw`) starts an interactive
   transfer. The anchor returns a URL the browser opens in a popup.
4. While the user completes the anchor's KYC/payment flow, the UI polls
   `GET /api/v1/anchors/transactions/:id` until the transfer is `completed`
   (or failed).

## Funding a contribution from fiat

On the **Dashboard** or a **circle page**, when a round is open for
contribution you'll see **Fund &lt;asset&gt; via fiat** next to the regular
*Contribute* button. Clicking it:

1. Requests a SEP-24 deposit pre-filled with the circle's contribution amount.
2. Opens the anchor's interactive window (card/bank payment, KYC if needed).
3. When the anchor reports `completed`, the contribution is recorded for the
   round automatically.

## Cashing out a received pot

After a payout round assigns you the pot, a **Cash out pot** button appears.
It starts a SEP-24 withdrawal pre-filled with the pot amount. The anchor's
interactive UI collects your bank/cash-pickup destination and sweeps the
assets to fiat.

## Standalone page

The **Fund** page in the nav (`/anchor`) provides a full transfer panel for
any supported asset: pick the currency, enter an amount, run a deposit or
withdrawal, and review your recent transfers. Transfer history is stored
locally in your browser.

## API endpoints

See the [Backend API](/api/backend) reference for the full anchor surface:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/anchors/info` | Anchor capabilities, SEP-10 requirement, per-asset limits |
| `GET /api/v1/anchors/assets/:code` | Per-asset metadata (fees, limits) |
| `GET /api/v1/anchors/auth/challenge` | SEP-10 challenge to sign with the wallet |
| `POST /api/v1/anchors/auth` | Exchange signed challenge for a JWT |
| `POST /api/v1/anchors/deposit` | Start an interactive deposit |
| `POST /api/v1/anchors/withdraw` | Start an interactive withdrawal |
| `GET /api/v1/anchors/transactions/:id` | Poll transfer status |

## Configuration

The anchor is configured with environment variables (see
`backend/.env.example` and `docker/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `ANCHOR_HOME_DOMAIN` | `testanchor.stellar.org` | Anchor home domain; its `stellar.toml` is resolved automatically |
| `ANCHOR_TRANSFER_SERVER_URL` | *(empty)* | Optional explicit SEP-6 transfer server override |
| `ANCHOR_TRANSFER_SERVER_SEP24_URL` | *(empty)* | Optional explicit SEP-24 transfer server override |
| `ANCHOR_DEFAULT_ASSET` | `USDC` | Default asset selected in the UI |
| `ANCHOR_TIMEOUT_MS` | `20000` | Pass-through timeout for anchor requests |
| `ANCHOR_POLL_INTERVAL_MS` | `5000` | Frontend transaction polling interval |

For mainnet, point `ANCHOR_HOME_DOMAIN` at a production anchor (for example a
licensed money transmitter such as Anchorage, Coinbase or a SEP-24 provider
approved for your jurisdiction) and set `ANCHOR_DEFAULT_ASSET` to its primary
asset.

## Security notes

- JWT tokens from SEP-10 are held in the browser's memory only and never
  persisted to storage.
- The interactive transfer URL must be opened in a popup; if your browser
  blocks it, the UI provides a direct link to finish the transfer.
- Anchor transactions are independent of on-chain smart-contract operations:
  a deposit funds your wallet, after which you still submit the on-chain
  contribution; a withdrawal redeems your wallet balance to fiat.