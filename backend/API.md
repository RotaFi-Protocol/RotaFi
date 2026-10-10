# RotaFi API Documentation

Base URL: `http://localhost:3000`

## Authentication

This API returns read-only data via Soroban RPC simulation. Write operations
return transaction parameters that the client must sign and submit.

---

## Health

### `GET /healthz`

Returns service health and contract addresses.

**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2026-07-14T18:00:00.000Z",
  "environment": "development",
  "contracts": {
    "circleFactory": "CC2XL...BHDSX6",
    "contributionVault": "CBIHU...QHL4MO",
    "reputationRegistry": "CDVS7...6AXJTUC",
    "bidEngine": "CD3OE...OXNDM6P"
  }
}
```

---

## Circles

### `GET /api/v1/circles`

List all created circles.

**Response 200:**
```json
{
  "total": 5,
  "circles": [
    {
      "id": 1,
      "organizer": "CC2XL...BHDSX6",
      "member_cap": 5,
      "payout_method": 0,
      "contribution_amount": "100000000",
      "active": false
    }
  ]
}
```

### `GET /api/v1/circles/:id`

Get a specific circle by ID.

**Response 200:** Circle object
**Response 404:** Circle not found

### `POST /api/v1/circles`

Create a new circle (simulated — returns tx params for signing).

**Rate limit:** 10 req/min

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| contribution_amount | string | Amount in stroops (e.g. "100000000") |
| round_length_seconds | string | Round duration in seconds |
| member_cap | number | Max members (min 2) |
| payout_method | number | 0=Lottery, 1=Auction, 2=Priority |
| min_collateral | string | Minimum collateral in stroops |
| grace_period_seconds | string | Grace period in seconds |
| token_symbol | string | Optional. Circle currency (USDC, EURC, XLM, ...). Defaults to USDC |
| token_address | string | Optional. Explicit Stellar asset contract address (overrides token_symbol) |

**Response 201:**
```json
{
  "id": 1,
  "message": "Circle creation simulated. Submit signed transaction to deploy.",
  "circle": { ... },
  "tx_params": {
    "contract": "CC2XL...BHDSX6",
    "method": "create_circle",
    "args": { ... }
  }
}
```

### `POST /api/v1/circles/:id/join`

Join a circle (simulated — returns tx params for signing).

**Rate limit:** 10 req/min

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| member_address | string | Stellar account address |
| token_address | string | Token contract address matching the circle's currency |

**Response 200:** Transaction params for `join_vault`

---

## Contributions

### `GET /api/v1/contributions/vault`

Get current vault state.

### `GET /api/v1/contributions/vault/member/:address`

Get member info for a specific address.

### `GET /api/v1/contributions/vault/has-paid/:round/:address`

Check if a member paid for a specific round.

**Response 200:**
```json
{
  "round": 1,
  "member": "G...",
  "has_paid": true
}
```

### `GET /api/v1/contributions/vault/all-paid`

Check if all members paid for the current round.

### `POST /api/v1/contributions/contribute`

Submit a contribution (simulated — returns tx params).

**Rate limit:** 10 req/min

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| member_address | string | Member's Stellar address |
| token_address | string | Token contract address matching the circle's currency |

### `POST /api/v1/contributions/payout`

Release payout to a winner (simulated — returns tx params).

**Rate limit:** 10 req/min

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| winner_address | string | Winner's Stellar address |
| token_address | string | Token contract address matching the circle's currency |

---

## Tokens

### `GET /api/v1/tokens`

List the currencies the protocol currently supports for circles.

**Response 200:**
```json
{
  "total": 3,
  "tokens": [
    {
      "symbol": "USDC",
      "name": "USD Coin",
      "address": "CBUSYNQ...GZ2IUNF",
      "decimals": 7
    },
    {
      "symbol": "EURC",
      "name": "Euro Coin",
      "address": "CDDCKBV...RGS5JD",
      "decimals": 7
    },
    {
      "symbol": "XLM",
      "name": "Stellar Lumens",
      "address": "CDLZFC3...HHGCYSC",
      "decimals": 7
    }
  ]
}
```

---

## Anchors (SEP-24)

The backend acts as a server-side proxy to a [SEP-24](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
anchor so wallets can **fund contributions from fiat** (deposit) and **cash
out received pots** (withdraw). It resolves the anchor's `stellar.toml`,
starts interactive transfers, and polls their status.

By default the API targets the SDF test anchor (`testanchor.stellar.org`).
Configure `ANCHOR_HOME_DOMAIN`, `ANCHOR_TRANSFER_SERVER_SEP24_URL` and
`ANCHOR_DEFAULT_ASSET` to point at a production anchor.

> The test anchor requires SEP-10 authentication. When it does, the
> `Authorization: Bearer <jwt>` header must be supplied on deposit/withdraw
> calls. Get a JWT via `/auth/challenge` → wallet signs → `/auth`.

### `GET /api/v1/anchors/info`

Discover the anchor's SEP-24 server, SEP-10 endpoint and per-asset limits.

**Response 200:**
```json
{
  "home_domain": "testanchor.stellar.org",
  "transfer_server": "https://testanchor.stellar.org/sep24",
  "network_passphrase": "Test SDF Network ; September 2015",
  "web_auth_endpoint": "https://testanchor.stellar.org/auth",
  "auth_required": true,
  "default_asset": "USDC",
  "assets": [
    {
      "code": "USDC",
      "deposit": { "enabled": true, "min_amount": 1, "max_amount": 10 },
      "withdraw": { "enabled": true, "min_amount": 1, "max_amount": 10 }
    }
  ]
}
```

### `GET /api/v1/anchors/assets/:code`

Per-asset metadata (min/max amount, fees, whether deposit/withdraw are enabled).

### `GET /api/v1/anchors/auth/challenge?account=G...`

Fetch a SEP-10 challenge transaction for the connected wallet to sign.

**Response 200:**
```json
{
  "transaction": "AAAAAgAAA...",
  "network_passphrase": "Test SDF Network ; September 2015",
  "web_auth_endpoint": "https://testanchor.stellar.org/auth"
}
```

### `POST /api/v1/anchors/auth`

Exchange a signed challenge transaction for a JWT.

**Rate limit:** 10 req/min

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| transaction | string | Base64 XDR of the signed SEP-10 challenge |

**Response 200:** `{ "token": "eyJ..." }`

### `POST /api/v1/anchors/deposit`

Start an interactive fiat on-ramp. Returns the popup URL the user opens to
complete KYC/payment; the anchor then delivers the asset to `account`.

**Rate limit:** 10 req/min · **Headers:** `Authorization: Bearer <jwt>` (optional)

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| asset_code | string | Asset to receive (e.g. `USDC`) |
| account | string | Stellar account to receive the asset |
| amount | string | Optional fiat amount to pre-fill |
| memo | string | Optional memo |
| lang | string | Optional language code |

**Response 202:**
```json
{
  "id": "8d0f...",
  "url": "https://testanchor.stellar.org/sep24/interactive?token=...",
  "asset_code": "USDC",
  "account": "G...",
  "status": "incomplete"
}
```

**Response 401:** `{ "error": "SEP-10 authentication required" }`

### `POST /api/v1/anchors/withdraw`

Start an interactive fiat off-ramp to cash out a received pot. The anchor's
interactive UI collects the bank/cash destination unless `dest` is provided.

**Rate limit:** 10 req/min · **Headers:** `Authorization: Bearer <jwt>` (optional)

**Request Body:**

| Field | Type | Description |
|-------|------|-------------|
| asset_code | string | Asset to redeem (e.g. `USDC`) |
| account | string | Stellar account sending the asset |
| amount | string | Optional amount to withdraw |
| dest | string | Optional destination account (bank/cash pickup) |
| memo | string | Optional memo |
| lang | string | Optional language code |

**Response 202:** Same shape as `/deposit`.

### `GET /api/v1/anchors/transactions/:id`

Poll the status of a transfer. `terminal` is true once the transfer can no
longer change; `succeeded` is true only when the status is `completed`.

**Response 200:**
```json
{
  "id": "8d0f...",
  "status": "completed",
  "amount_in": "5",
  "amount_out": "4.9",
  "stellar_transaction_id": "abc...",
  "terminal": true,
  "succeeded": true
}
```

SEP-24 statuses include `incomplete`, `pending_user_transfer_start`,
`pending_anchor`, `pending_stellar`, `pending_external`, `completed`,
`refunded`, `expired`, `error`, `no_market`, `too_small` and `too_large`.

---

## Reputation

### `GET /api/v1/reputation/score/:address`

Get full reputation score for an address.

**Response 200:**
```json
{
  "address": "G...",
  "circles_joined": 3,
  "circles_completed": 2,
  "defaults": 1,
  "total_slashed": "50000000",
  "last_updated": 1234567890
}
```

### `GET /api/v1/reputation/rating/:address`

Get 0-100 reputation rating.

**Response 200:**
```json
{
  "address": "G...",
  "rating": 67
}
```

---

## Bids

### `GET /api/v1/bids/state`

Get current auction state (Open/Closed).

### `GET /api/v1/bids`

Get all bids for the current auction.

### `GET /api/v1/bids/:address`

Get a specific member's bid.

### `POST /api/v1/bids/submit`

Submit a sealed bid (simulated — returns tx params).

**Rate limit:** 10 req/min

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| member_address | string | Member's Stellar address |
| discount_bps | number | Discount in basis points (0-10000) |
| round | number | Auction round number |

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "message": "Technical details (when available)"
}
```

HTTP status codes: `400` (validation), `404` (not found), `429` (rate limit), `500` (server error).

---

## Live reads

Read endpoints are served from an in-memory cache by default. Set
`SOROBAN_LIVE_READS=true` to read directly from the deployed testnet
contracts via Soroban RPC simulation. The addresses default to the
deployments listed in `contract/DEPLOYED_ADDRESSES.md` and can be
overridden with `CIRCLE_FACTORY_ADDRESS`, `CONTRIBUTION_VAULT_ADDRESS`,
`REPUTATION_REGISTRY_ADDRESS` and `BID_ENGINE_ADDRESS`.

| Reader | Contract method |
|--------|-----------------|
| `GET /api/v1/circles/:id` | `get_circle` |
| `GET /api/v1/circles` | `circle_count` |
| `GET /api/v1/contributions/vault` | `get_vault` |
| `GET /api/v1/reputation/score/:address` | `get_score` |
| `GET /api/v1/reputation/rating/:address` | `get_rating` |

---

## Testing

```bash
# Unit tests (no network access)
npm test

# Integration tests against Stellar testnet
npm run test:integration
```

The integration suite lives in `tests/soroban.integration.test.ts` and
calls the deployed `get_circle`, `get_vault` and `get_rating` contract
methods over real Soroban RPC. It is enabled by `RUN_INTEGRATION_TESTS=true`
(set by the npm script) and skipped otherwise.

