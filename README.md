<p align="center">
  <img src="docs/assets/rotafi-logo-lockup.svg" alt="RotaFi" width="300" />
</p>

<p align="center">
  <strong>Trustless rotating savings and credit associations (ROSCA / chit funds) on Stellar Soroban.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" /></a>
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
| Circle Factory | Stellar Testnet | — | `pending` |
| Contribution Vault | Stellar Testnet | — | `pending` |
| Reputation Registry | Stellar Testnet | — | `pending` |
| Bid Engine | Stellar Testnet | — | `pending` |
| Backend API | — | — | `pending` |
| Keeper Bot | — | — | `pending` |
| Frontend | — | — | `pending` |
| Documentation | — | — | `pending` |

---

## Quick Start

> Coming soon — check back after Phase 1-2 for full setup instructions.

```bash
# Clone the repo
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd rotafi

# Build contracts (coming soon)
# cargo build

# Run backend (coming soon)
# npm start
```

---

## License

MIT © RotaFi Contributors
