# RotaFi Roadmap

---

## v0.1.0 — Initial Protocol Release ✅ (October 2026)

- CircleFactory, ContributionVault, ReputationRegistry, BidEngine contracts on testnet
- Keeper bot for automated round advancement and collateral slashing
- REST backend API (Express + TypeScript)
- Next.js frontend with Freighter wallet integration
- Astro Starlight documentation site
- GitHub Actions CI/CD for all components

---

## v0.2.0 — Reputation & Governance (Q4 2026)

- [ ] **Reputation-gated circles** — minimum on-chain reputation score required to join
- [ ] **Reputation decay** — scores decay over time if a member stops participating
- [ ] **Circle governance** — members vote to eject a defaulting member and redistribute their collateral
- [x] **Multi-token support** — circles can be denominated in XLM, USDC, EURC, or custom Stellar tokens
- [ ] **Circle templates** — pre-configured circle types (weekly micro, monthly standard, annual large)
- [ ] **Mobile-responsive frontend overhaul**
- [ ] **Keeper decentralization** — support community keepers with on-chain keeper registry

---

## v0.3.0 — DeFi Integrations (Q1 2027)

- [ ] **Yield on idle collateral** — route locked collateral to a Stellar lending protocol while waiting for payout round
- [ ] **Cross-circle reputation** — reputation score portable across multiple circles
- [x] **Anchor integration** — allow members to fund circles via Stellar anchors (SEP-24) from fiat on-ramps
- [ ] **Circle NFT receipts** — mint an NFT on each completed circle as a proof-of-participation credential
- [ ] **TypeScript SDK** — embed RotaFi circles into third-party dApps
- [ ] **Mainnet deployment** — full audit + mainnet contract addresses

---

## Known Limitations (Current)

- Testnet only — no mainnet deployment yet
- Keeper is centralized — single operator, not yet decentralized
- No yield on locked collateral during waiting rounds
- BidEngine is optional and not yet surfaced in the frontend UI
