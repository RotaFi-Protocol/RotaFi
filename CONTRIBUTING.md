# Contributing to RotaFi

Thank you for your interest in contributing to RotaFi — trustless rotating savings on Stellar.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Project Structure](#project-structure)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Opening a PR](#opening-a-pr)
- [Issue Labels](#issue-labels)
- [Code Style](#code-style)

---

## Prerequisites

- Node.js v22+
- Rust 1.79+ with `wasm32v1-none` target: `rustup target add wasm32v1-none`
- Stellar CLI: `cargo install --locked stellar-cli --features opt`
- Freighter wallet extension (for frontend testing)

---

## Local Setup

```bash
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd RotaFi
```

**Contracts**
```bash
cd contract
cargo test
cargo build --target wasm32v1-none --release
```

**Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
# Runs on http://localhost:3001
```

**Keeper**
```bash
cd keeper
cp .env.example .env   # add KEEPER_SECRET (funded testnet keypair)
npm install
npm start
```

**Frontend**
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Runs on http://localhost:3000
```

**Docs**
```bash
cd docs
npm install
npm run dev
# Runs on http://localhost:4321
```

---

## Project Structure

```
contract/     Soroban smart contracts (Rust) — 4 crates
backend/      REST API (Express + TypeScript)
keeper/       Background executor bot (Node.js + TypeScript)
frontend/     Web UI (Next.js 14 + TypeScript + Tailwind)
docs/         Documentation site (Astro Starlight)
.github/      CI workflows and issue/PR templates
```

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Bug fix | `fix/<short-description>` | `fix/keeper-retry-logic` |
| New feature | `feat/<short-description>` | `feat/circle-dashboard` |
| Documentation | `docs/<short-description>` | `docs/api-reference` |
| Contract work | `contract/<short-description>` | `contract/bid-engine-tests` |
| Chore | `chore/<short-description>` | `chore/update-deps` |

---

## Commit Messages

Follow conventional commits:

```
<type>: <short description>

Types: feat, fix, docs, chore, refactor, test, ci
```

Examples:
- `feat: add circle member count to dashboard`
- `fix: keeper retry on RPC timeout`
- `docs: add API reference for /api/circles`
- `contract: add test for collateral slash on missed round`

---

## Opening a PR

1. Fork the repo and create a branch from `master`
2. Make your changes, ensure CI passes locally
3. Open a PR against `RotaFi-Protocol/RotaFi` → `master`
4. Fill in the PR template completely
5. Link the issue it closes with `Closes #<issue-number>`
6. Maintainers aim to review within 48 hours

---

## Issue Labels

| Label | Meaning |
|---|---|
| `good-first-issue` | Suitable for new contributors |
| `contract` | Soroban/Rust contract work |
| `backend` | Express API work |
| `keeper` | Keeper bot work |
| `frontend` | Next.js UI work |
| `docs` | Documentation work |
| `bug` | Something is broken |
| `enhancement` | New feature or improvement |

Pick up any issue labelled `good-first-issue` to get started.

---

## Code Style

- **Rust**: run `cargo fmt` and `cargo clippy` before committing
- **TypeScript**: run `npm run lint` in the relevant directory
- No unnecessary comments — code should be self-explanatory
- No `any` types in TypeScript — use `unknown` and narrow
- All new contract functions must have at least one unit test
