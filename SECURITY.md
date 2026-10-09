# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

RotaFi's contracts hold real user funds on Stellar. If you discover a vulnerability in any contract, the backend, or the keeper bot, please report it privately so we can fix it before public disclosure.

### How to Report

Open a [GitHub Security Advisory](https://github.com/RotaFi-Protocol/RotaFi/security/advisories/new) in this repository.

Include:
- The affected component (CircleFactory / ContributionVault / ReputationRegistry / BidEngine / Backend / Keeper)
- Steps to reproduce
- Proof of concept (transaction hash, code snippet, or test case)
- Your assessment of impact and severity

### Response Time

We aim to acknowledge reports within **48 hours** and provide a fix timeline within **7 days** for critical issues.

### Safe Harbor

We will not take legal action against researchers who report vulnerabilities in good faith, follow this disclosure policy, and do not exploit the vulnerability beyond what is necessary to demonstrate it.

## Scope

**In scope**

- Soroban smart contracts
- Keeper bot (unauthorized fund movement)
- Backend API (authentication bypass, injection)

For the current security assumptions, economic incentives, griefing vectors and
collusion model of the collateral-slashing mechanism, see the
[Collateral Slashing Threat Model](docs/src/content/docs/security/collateral-slashing-threat-model.md)
and the published [docs site](https://rotafi-protocol.github.io/RotaFi/security/collateral-slashing-threat-model/).

For the frontrunning, round-boundary sniping and Sybil analysis of the sealed-bid
auction, and the commit-reveal mitigations now enforced on-chain, see the
[Bid Engine Abuse Threat Model](docs/src/content/docs/security/bid-engine-abuse-threat-model.md)
and the published [docs site](https://rotafi-protocol.github.io/RotaFi/security/bid-engine-abuse-threat-model/).

**Out of scope**

- Social engineering attacks
- DoS attacks on public endpoints
- Frontend UI issues with no security impact
