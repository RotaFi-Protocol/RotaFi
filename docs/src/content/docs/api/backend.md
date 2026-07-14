---
title: Backend API
description: REST API reference for reading contract state and preparing transactions.
---

The RotaFi Backend API wraps Soroban contract reads and prepares write transactions for client-side signing.

Base URL: `http://localhost:3000` (development) or your deployed Render URL.

## Endpoints

### Circles

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/circles` | List all circles |
| GET | `/api/v1/circles/:id` | Get circle by ID |
| POST | `/api/v1/circles` | Create a circle (returns tx params) |
| POST | `/api/v1/circles/:id/join` | Join a circle (returns tx params) |

### Contributions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/contributions/vault` | Get vault state |
| GET | `/api/v1/contributions/vault/member/:address` | Get member info |
| GET | `/api/v1/contributions/vault/has-paid/:round/:address` | Check payment status |
| GET | `/api/v1/contributions/vault/all-paid` | Check if all paid |
| POST | `/api/v1/contributions/contribute` | Contribute (returns tx params) |
| POST | `/api/v1/contributions/payout` | Release payout (returns tx params) |

### Reputation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/reputation/score/:address` | Get full reputation score |
| GET | `/api/v1/reputation/rating/:address` | Get 0-100 rating |

### Bids

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/bids/state` | Get auction state |
| GET | `/api/v1/bids` | Get all bids |
| GET | `/api/v1/bids/:address` | Get member's bid |
| POST | `/api/v1/bids/submit` | Submit bid (returns tx params) |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/healthz` | Health check with contract addresses |

## Rate Limits

- General endpoints: 100 requests per minute
- Write endpoints (POST): 10 requests per minute
