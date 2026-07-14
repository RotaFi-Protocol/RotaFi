<p align="center">
  <img src="docs/assets/rotafi-logo-lockup.svg" alt="RotaFi" width="300" />
</p>

<p align="center">
  <strong>Trustless rotating savings and credit associations (ROSCA / chit funds) on Stellar Soroban.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
  <a href="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-contracts.yml"><img src="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-contracts.yml/badge.svg" alt="Contracts CI" /></a>
  <a href="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-backend.yml"><img src="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-backend.yml/badge.svg" alt="Backend CI" /></a>
  <a href="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-keeper.yml"><img src="https://github.com/RotaFi-Protocol/RotaFi/actions/workflows/test-keeper.yml/badge.svg" alt="Keeper CI" /></a>
</p>

---

## What is RotaFi?

RotaFi brings the centuries-old practice of **ROSCA** (Rotating Savings and Credit Associations) — also known as chit funds, tandas, or susu — to the Stellar blockchain. It enables trustless, transparent, and automated savings circles where members contribute regularly and take turns receiving the full pot.

### How It Works

1. **Create or join a circle** — An organizer sets contribution amount, round duration, member cap, and payout method.
2. **Contribute each round** — Members deposit their share of USDC each round into the circle's vault.
3. **Receive the pot** — Each round, one member receives the full pooled contribution.
4. **Repeat until complete** — Every member receives the pot exactly once, then the circle closes.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    RotaFi                        │
├──────────────┬──────────────┬───────────────────┤
│  Soroban     │   Backend    │     Frontend       │
│  Contracts   │  (Express)   │    (Next.js)       │
├──────────────┼──────────────┼───────────────────┤
│ circle-      │ REST API     │ Circle browser     │
│ factory      │ wrapping     │ & dashboard        │
│              │ contracts    │                    │
│ contribution-│              │ Wallet             │
│ vault        │ Keeper Bot   │ integration        │
│              │              │ (Freighter/xBull/  │
│ reputation-  │ Round        │ Rabet)             │
│ registry     │ advancement  │                    │
│              │ & slashing   │ Bid submission UI   │
│ bid-engine   │ automation   │                    │
└──────────────┴──────────────┴───────────────────┘
```

---

## Deployed Services

| Service | Network | Address / URL | Status |
|---------|---------|---------------|--------|
| Circle Factory | Stellar Testnet | `CC2XL...BHDSX6` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6) |
| Contribution Vault | Stellar Testnet | `CBIHU...QHL4MO` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO) |
| Reputation Registry | Stellar Testnet | `CDVS7...6AXJTUC` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC) |
| Bid Engine | Stellar Testnet | `CD3OE...OXNDM6P` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P) |
| Backend API | Render | `rotafi.onrender.com` | [View health →](https://rotafi.onrender.com/healthz) |
| Keeper Bot | — | — | [Deployment tracking → #31](https://github.com/RotaFi-Protocol/RotaFi/issues/31) |
| Frontend | — | — | [Deployment tracking → #31](https://github.com/RotaFi-Protocol/RotaFi/issues/31) |
| Documentation | — | — | [Deployment tracking → #31](https://github.com/RotaFi-Protocol/RotaFi/issues/31) |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd rotafi

# Build contracts
cd contract
cargo build --target wasm32v1-none --release

# Run tests
cargo test

# Deploy to testnet (see contract/DEPLOYED_ADDRESSES.md for current addresses)
soroban contract deploy \
  --wasm target/wasm32v1-none/release/circle_factory.wasm \
  --source rotafi-deployer \
  --network testnet
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, PR conventions, and test commands.
Browse our [issue tracker](https://github.com/RotaFi-Protocol/RotaFi/issues) for good first issues.

---

## License

MIT © RotaFi Contributors
