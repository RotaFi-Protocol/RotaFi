# Changelog

All notable changes to RotaFi will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Soroban smart contracts: Circle Factory, Contribution Vault, Reputation Registry, Bid Engine
- Express backend REST API with input validation and rate limiting
- Keeper bot for automated round advancement and default detection
- Next.js frontend with wallet integration (Freighter, xBull, Rabet)
- Astro Starlight documentation site
- MIT license
- CONTRIBUTING.md with setup instructions and PR conventions
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)

## [0.1.0] - 2026-07-14

### Added
- Initial repository scaffolding with README, logo, and license
- Circle Factory contract: create circles with configurable params
- Contribution Vault contract: escrow, contributions, payouts, default handling
- Reputation Registry contract: cross-circle on-chain reputation scores
- Bid Engine contract: sealed-bid auction logic
- All 4 contracts deployed to Stellar Testnet
- Backend REST API: circle, contribution, reputation, and bid endpoints
- Keeper bot: poll-based round advancement and default detection
- Next.js frontend: circle browser, dashboard, bids, reputation pages
- Documentation site: protocol overview, contract API, guides
