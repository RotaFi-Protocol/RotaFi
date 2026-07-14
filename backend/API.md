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
| token_address | string | USDC token contract address |

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
| token_address | string | USDC token contract address |

### `POST /api/v1/contributions/payout`

Release payout to a winner (simulated — returns tx params).

**Rate limit:** 10 req/min

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| winner_address | string | Winner's Stellar address |
| token_address | string | USDC token contract address |

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
