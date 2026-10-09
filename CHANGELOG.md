# Changelog

All notable changes to RotaFi are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

#### Contracts
- **Multi-token support** — circles are no longer USDC-only: `CircleConfig` records a `token_address` per circle, the `ContributionVault` uses its configured token (rejecting any mismatched asset) and exposes `get_token_address`, and `ProtocolConfig` gains a multisig-governed supported-token registry (`add_supported_token`, `remove_supported_token`, `is_token_supported`, `get_token_info`, `get_supported_tokens`) for XLM, USDC, EURC, or custom Stellar assets
- Commit-reveal sealed bids in `BidEngine`: `submit_bid`/`resolve_auction(member_cap)` replaced by `commit_bid`/`reveal_bid`/`resolve_auction()` so discounts stay hidden until the commit phase closes and are bound to `sha256(contract ‖ member ‖ round ‖ discount ‖ nonce)`
- Round, roster and deadline binding in `BidEngine`: auctions are tied to a single round (`round > LAST_ROUND`), restricted to an explicit member roster, and bounded by `commit_deadline`/`reveal_deadline` with a minimum reveal window
- Deterministic `BidEngine` resolution: highest revealed discount wins with ties broken to the lexicographically smallest address, a `min_discount_bps` reserve, stored-`member_cap` pro-rata split, and permissionless time-boxed settling that tolerates partial reveals
- Organizer authorization and parameter validation in `BidEngine.start_auction` so a third party cannot race the legitimate auction configuration (threat vectors F1–F8 in the new threat model)
- Verifiable commit-reveal lottery randomness in `ContributionVault` — members commit sealed secrets per round, reveal them after all commitments close, and the pot is drawn from a seed mixing the openings with ledger sequence, close time and network id (`commit_randomness`, `reveal_randomness`, `release_lottery_payout`)
- Partial-reveal fallback after the reveal window expires so funds can never be locked by a non-revealing member
- Lottery introspection views (`get_round_randomness`, `get_commitment`, `get_reveal`, `get_round_seed`, `preview_lottery_winner`) for off-chain draw verification

#### Keeper
- Dependency-free commit-reveal helpers reproducing the on-chain digest, seed derivation, strkey-aware address ordering and winner index (`src/randomness.ts`)
- `determinePayoutRecipient` now derives the verifiable lottery winner from the round's openings and ledger entropy instead of returning a placeholder

#### Backend
- **Tokens API** — new `GET /api/v1/tokens` endpoint and `supportedTokens` config advertise the assets available for circles (USDC, EURC, XLM by default, each overridable by env); circle creation accepts `token_symbol`/`token_address` and the API surfaces `token_address`/`token_symbol` on circles
- Soroban RPC client (`src/services/sorobanRpc.ts`) with read-only contract simulation, typed `ContractCallError` and health checks
- `ChainReader` for reading `get_circle`, `circle_count`, `get_vault`, `get_score` and `get_rating` from the deployed testnet contracts
- Optional live reads from Soroban testnet via `SOROBAN_LIVE_READS=true`
- Integration test suite (`npm run test:integration`) calling the deployed `get_circle`, `get_vault_state` and `get_reputation_rating` contracts over real testnet RPC
- `Backend Integration Tests` workflow running the suite on PRs, master pushes, a daily schedule and manual dispatch

#### Frontend
- **Circle lifecycle UI** — joined circles expose per-round contribute actions, payout release with a recorded payout history, a completion state after the final round, and dashboard progress on the circle detail and dashboard pages
- Testnet contract configuration module (`lib/contracts.ts`) defaulting to the canonical Stellar testnet deployment, plus an opt-in live on-chain vault reader (`lib/soroban.ts`, gated on `NEXT_PUBLIC_USE_LIVE_CONTRACTS=true`)
- Persistent circle lifecycle store (`lib/lifecycle.ts`) with a deterministic per-round winner rotation and localStorage persistence

#### Testing (Frontend E2E)
- **Playwright E2E suite** covering wallet connect → browse circles → join circle → contribute each round → payout → circle completion, running against the testnet contract configuration (mock Freighter wallet fixture and a deterministic lifecycle simulation by default; live testnet reads opt-in via `E2E_LIVE_TESTNET=1`)
- `Test Frontend E2E` GitHub Actions workflow installing Chromium and reporting Playwright results on PRs and master
- Shared wallet/testnet fixtures, lifecycle helpers, and an `e2e/README.md` reference for the testnet defaults

#### Local development (Docker Compose)
- `docker-compose.yml` running the Stellar Quickstart Soroban sandbox, backend, keeper, and frontend together
- Health checks for every service and source bind mounts for hot reload
- Optional `contracts` profile that builds and deploys the Soroban contracts to the local sandbox
- Development Dockerfiles for the backend, keeper, and frontend
- Optional keeper HTTP health endpoint (`KEEPER_HEALTH_PORT`)
- `Makefile` shortcuts and `docker/.env.example` for the local stack

#### Docs
- Bid engine abuse threat model covering sealed-bid frontrunning, round-boundary bid sniping and Sybil/non-member bidding, with abuse vectors F1–F8, security assumptions A1–A8, on-chain mitigations M1–M9, a threat matrix, residual risks O1–O6 and a hardening backlog, all mapped to the enforced commit-reveal auction (`docs/src/content/docs/security/bid-engine-abuse-threat-model.md`)
- Collateral slashing threat model covering security assumptions, economic incentives and default-profitability analysis, griefing attack vectors (repeat/unbounded slashing, late-payer front-running, stale-round slashing), collusion scenarios (winner-then-default, organizer-fronted defaulters, governance capture), mitigation strategies, a threat matrix, and a prioritized hardening backlog (`docs/src/content/docs/security/collateral-slashing-threat-model.md`)

### Changed

#### Frontend
- **Multi-currency display** — a supported-asset registry (`lib/assets.ts`), `AssetBadge` chips, decimals-aware `formatAssetAmount`, a currency filter on the circle browser, and currency labels across circle cards, circle detail, dashboard and reputation pages
- Mobile-responsive design pass across the circle browser grid, dashboard cards, bid submission, wallet connect and navigation, with adaptive single-column layouts, a sticky scrollable header and active-route highlighting
- Centralised responsive design tokens, reusable button/card/state primitives and `44px` minimum touch targets in `globals.css`
- Safe-area (`viewport-fit=cover`) insets, dvh sizing, reduced-motion support and explicit `iOS Safari`/`Chrome Android` browser targets
- Page headers, grids and long on-chain identifiers now reflow without horizontal overflow on small screens
- Wallet connection is restored from the saved provider on remount, so the connected state survives client-side page navigation

---

## [0.1.0] — 2026-10-01

### Added

#### Contracts (Soroban/Rust)
- `CircleFactory` — create and manage ROSCA circles with configurable member cap, contribution amount, and round duration
- `ContributionVault` — accept member USDC deposits per round, track payment status, slash collateral on missed contributions
- `ReputationRegistry` — on-chain reputation scoring per Stellar address, updated on each completed or missed round
- `BidEngine` — optional sealed-bid auction for payout order; members bid to receive the pot earlier in exchange for a yield discount
- 48 unit tests across all 4 contracts

#### Backend (Express + TypeScript)
- REST API with endpoints for circles, members, rounds, and reputation
- Input validation, rate limiting, structured logging with `pino`
- 23 integration tests
- Deployed on Render: `https://rotafi.onrender.com`

#### Keeper (Node.js + TypeScript)
- Automated round advancement — triggers next round when duration elapses
- Collateral slashing on missed contributions
- Exponential backoff retry on Soroban RPC errors
- 15 unit tests
- Deployed on Render as Background Worker

#### Frontend (Next.js 14 + TypeScript)
- Circle browser — view all active circles on testnet
- Dashboard — connect Freighter, view joined circles and contribution status
- Create circle flow — set parameters and deploy via contract invocation
- Deployed on Vercel: `https://rota-fi.vercel.app`

#### Docs (Astro Starlight)
- Protocol overview, how ROSCA works, contract reference
- API reference for all backend endpoints
- Self-hosting guide for the keeper
- Deployed on GitHub Pages: `https://rotafi-protocol.github.io/RotaFi`

#### Infrastructure
- GitHub Actions CI for all 5 components
- 4 contracts deployed to Stellar Testnet with verified addresses
- `render.yaml` for one-click Render deployment
- `FUNDING.json` for GrantFox / Stellar Wave Program

### Contracts (Testnet)

| Contract | Address |
|---|---|
| Circle Factory | `CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6` |
| Contribution Vault | `CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO` |
| Reputation Registry | `CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC` |
| Bid Engine | `CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P` |
