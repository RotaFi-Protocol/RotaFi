# ProtocolConfig — Governance / Config Contract

`protocol-config` is RotaFi's on-chain governance and configuration
contract. It owns the protocol-wide parameters that every other contract
reads, and exposes them through a single, upgradeable, multisig-controlled
entry point.

## What it controls

| Parameter | Description |
|-----------|-------------|
| `min_member_cap` | Minimum members a circle may configure |
| `max_member_cap` | Maximum members a circle may configure |
| `min_collateral` | Minimum collateral a circle may require |
| `max_collateral` | Maximum collateral a circle may require |
| `fee_bps` | Protocol fee charged on payouts (basis points, max 1000) |
| `slash_bps` | Default collateral slash (basis points, max 10000) |

Other contracts call `check_member_cap` and `check_collateral` (or read
`get_params`) to enforce these bounds at circle creation time, while the
keeper and vault use `get_fee_bps` / `get_slash_bps` for protocol fees and
slashing.

## Upgradeable by multisig

Initially the protocol is governed by a multisig: a set of owner addresses
with a `threshold` of required signatures. Every mutating entrypoint takes a
`Vec<Address>` of approvers and only executes once at least `threshold`
distinct owners have authorized the call.

- `update_params` — replace the whole parameter set
- `set_fee_bps` / `set_slash_bps` — adjust rates
- `set_member_cap_bounds` / `set_collateral_bounds` — adjust bounds
- `add_owner` / `remove_owner` / `set_threshold` — manage the multisig
- `upgrade` — swap the contract WASM (again, only with multisig approval)

## Quick start

```bash
# Build
cargo build --target wasm32v1-none --release

# Unit tests
cargo test -p protocol-config
```

## Deploy

1. Deploy the WASM: `soroban contract deploy --wasm <protocol_config.wasm>`
2. Call `initialize` with the initial owner set, threshold, and params.