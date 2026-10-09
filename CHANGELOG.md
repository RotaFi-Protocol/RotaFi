# Changelog

All notable changes to RotaFi are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

#### Contracts
- Verifiable commit-reveal lottery randomness in `ContributionVault` — members commit sealed secrets per round, reveal them after all commitments close, and the pot is drawn from a seed mixing the openings with ledger sequence, close time and network id (`commit_randomness`, `reveal_randomness`, `release_lottery_payout`)
- Partial-reveal fallback after the reveal window expires so funds can never be locked by a non-revealing member
- Lottery introspection views (`get_round_randomness`, `get_commitment`, `get_reveal`, `get_round_seed`, `preview_lottery_winner`) for off-chain draw verification

#### Keeper
- Dependency-free commit-reveal helpers reproducing the on-chain digest, seed derivation, strkey-aware address ordering and winner index (`src/randomness.ts`)
- `determinePayoutRecipient` now derives the verifiable lottery winner from the round's openings and ledger entropy instead of returning a placeholder

#### Backend
- Soroban RPC client (`src/services/sorobanRpc.ts`) with read-only contract simulation, typed `ContractCallError` and health checks
- `ChainReader` for reading `get_circle`, `circle_count`, `get_vault`, `get_score` and `get_rating` from the deployed testnet contracts
- Optional live reads from Soroban testnet via `SOROBAN_LIVE_READS=true`
- Integration test suite (`npm run test:integration`) calling the deployed `get_circle`, `get_vault_state` and `get_reputation_rating` contracts over real testnet RPC
- `Backend Integration Tests` workflow running the suite on PRs, master pushes, a daily schedule and manual dispatch

#### Local development (Docker Compose)
- `docker-compose.yml` running the Stellar Quickstart Soroban sandbox, backend, keeper, and frontend together
- Health checks for every service and source bind mounts for hot reload
- Optional `contracts` profile that builds and deploys the Soroban contracts to the local sandbox
- Development Dockerfiles for the backend, keeper, and frontend
- Optional keeper HTTP health endpoint (`KEEPER_HEALTH_PORT`)
- `Makefile` shortcuts and `docker/.env.example` for the local stack

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
