---
title: Collateral Slashing Threat Model
description: Security assumptions, economic incentives, griefing and collusion analysis for RotaFi's collateral slashing mechanism.
---

This document is the security rationale for RotaFi's **collateral slashing**
mechanism. It describes what the mechanism is supposed to guarantee, the
assumptions it relies on, the ways those assumptions can be violated
(griefing, collusion, and adverse selection), and the mitigations available to
the protocol.

It is written for contract reviewers, integrators, and circle organizers. It is
not a substitute for the repository [Security Policy](https://github.com/RotaFi-Protocol/RotaFi/blob/master/SECURITY.md)
or an independent audit.

> **Scope.** Everything below concerns the `ContributionVault` collateral
> accounting (`join_vault`, `contribute`, `slash_default`, `release_payout`,
> `release_lottery_payout`) and the policies in `ProtocolConfig` that bound it.
> The sealed-bid auction ([Bid Engine](/contracts/bid-engine)) and
> lottery randomness ([Contribution Vault](/contracts/contribution-vault#lottery-randomness))
> are treated as adjacent systems and only referenced where they change the
> slashing incentives.

<!-- END -->
