<p align="center">
  <img src="docs/assets/rotafi-logo-lockup.svg" alt="RotaFi" width="360" />
</p>

<p align="center">
  <strong>Trustless rotating savings and credit associations on Stellar Soroban.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License" /></a>
  <a href="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-contracts.yml"><img src="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-contracts.yml/badge.svg" alt="Contracts" /></a>
  <a href="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-backend.yml"><img src="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-backend.yml/badge.svg" alt="Backend" /></a>
  <a href="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-keeper.yml"><img src="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-keeper.yml/badge.svg" alt="Keeper" /></a>
</p>

---

RotaFi brings **ROSCA** (Rotating Savings and Credit Associations) — also known as chit funds, tandas, or susu — to Stellar. Smart contracts replace social trust with collateral staking, automated payouts, and on-chain reputation tracking.

### How it works

1. **Create a circle** — Set contribution amount, round duration, member cap, and payout method
2. **Members join** — Each posts a refundable USDC collateral stake
3. **Contribute each round** — Members deposit their share; the keeper bot tracks payments
4. **One member gets the pot** — The full pooled amount is released each round
5. **Repeat until complete** — Every member receives the pot exactly once

---

## Live

| Service | Link |
|---------|------|
| Frontend | [rota-fi.vercel.app](https://rota-fi.vercel.app/) |
| Backend API | [rotafi.onrender.com](https://rotafi.onrender.com/healthz) |
| Documentation | [rotafi-protocol.github.io/RotaFi](https://rotafi-protocol.github.io/RotaFi/) |

### Contracts (Stellar Testnet)

| Contract | Address |
|----------|---------|
| Circle Factory | [`CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6`](https://stellar.expert/explorer/testnet/contract/CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6) |
| Contribution Vault | [`CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO`](https://stellar.expert/explorer/testnet/contract/CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO) |
| Reputation Registry | [`CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC`](https://stellar.expert/explorer/testnet/contract/CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC) |
| Bid Engine | [`CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P`](https://stellar.expert/explorer/testnet/contract/CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P) |

---

## Project Structure

```
contract/     Soroban smart contracts (Rust)    — 4 crates, 48 unit tests
backend/      REST API (Express + TypeScript)    — validation, rate limiting, 23 tests
keeper/       Background bot (Node.js)           — round advancement, slashing, 15 tests
frontend/     Web UI (Next.js + TypeScript)      — circle browser, dashboard, wallet connect
docs/         Documentation (Astro Starlight)    — protocol overview, API reference, guides
```

---

## Quick Start

```bash
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd rotafi

# Contracts
cd contract && cargo test && cargo build --target wasm32v1-none --release

# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev

# Docs
cd docs && npm install && npm run dev
```

---

## License

MIT © RotaFi Contributors
