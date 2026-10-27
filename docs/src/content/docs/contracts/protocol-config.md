---
title: Protocol Config
description: Multisig-governed protocol parameter bounds, token whitelist, and WASM upgrade control.
---

The `protocol-config` contract holds the protocol-wide, multisig-controlled parameters for RotaFi. Other contracts (`circle-factory`, `contribution-vault`, and the keeper bot) consult these bounds and rates so that individual circles remain inside the protocol's risk envelope.

## Data Types & Constants

### `ProtocolParams`

| Field | Type | Description |
|-------|------|-------------|
| `min_member_cap` | `u32` | Minimum members a circle may configure (floor: `MIN_MEMBER_CAP_FLOOR = 2`) |
| `max_member_cap` | `u32` | Maximum members a circle may configure (`>= min_member_cap`) |
| `min_collateral` | `i128` | Minimum collateral stake (in stroops of the circle token, `>= 0`) |
| `max_collateral` | `i128` | Maximum collateral stake (`>= min_collateral`) |
| `fee_bps` | `u32` | Protocol fee charged on payouts in basis points (max: `MAX_FEE_BPS = 1_000` / 10%) |
| `slash_bps` | `u32` | Default collateral slash in basis points (max: `MAX_SLASH_BPS = 10_000` / 100%) |

### `MultisigConfig`

| Field | Type | Description |
|-------|------|-------------|
| `owners` | `Vec<Address>` | Active multisig owner addresses |
| `threshold` | `u32` | Number of distinct owner approvals required (`1 <= threshold <= owners.len()`) |

### `TokenInfo`

| Field | Type | Description |
|-------|------|-------------|
| `address` | `Address` | Stellar Asset Contract (SAC) or SEP-41 token address |
| `symbol` | `Symbol` | Short asset ticker symbol (non-empty) |
| `decimals` | `u32` | Token decimal precision (max: `MAX_TOKEN_DECIMALS = 18`) |

## Initialization & Read Functions

### `initialize(owners: Vec<Address>, threshold: u32, params: ProtocolParams)`

Initializes the protocol configuration with the initial multisig owner set, signing threshold, and starting `ProtocolParams`.

**Panics if:** already initialized, `owners` is empty, `threshold == 0` or `threshold > owners.len()`, or `params` fails validation (`require_valid()`).

### `get_params() -> ProtocolParams`

Returns the full active `ProtocolParams` struct.

### `get_fee_bps() -> u32` / `get_slash_bps() -> u32`

Convenience getters returning `fee_bps` or `slash_bps` in basis points (`10_000` = 100%).

### `check_member_cap(member_cap: u32) -> bool`

Returns `true` when `member_cap` lies within `[min_member_cap, max_member_cap]`.

### `check_collateral(collateral: i128) -> bool`

Returns `true` when `collateral` lies within `[min_collateral, max_collateral]`.

### `get_multisig() -> MultisigConfig`

Returns the active `owners` list and `threshold`. Individual helpers `get_owners() -> Vec<Address>`, `get_threshold() -> u32`, and `is_owner(who: Address) -> bool` are also exposed.

### `is_token_supported(token: Address) -> bool`

Returns `true` if `token` is whitelisted for circle denomination.

### `get_token_info(token: Address) -> Option<TokenInfo>` / `get_supported_tokens() -> Vec<TokenInfo>`

Returns metadata for a single whitelisted token or all whitelisted tokens.

## Multisig-Gated Governance Functions

Every mutating call takes `approvers: Vec<Address>` and verifies via `require_multisig` that at least `threshold` distinct registered owners have authorized the invocation (`approver.require_auth()`). Duplicate addresses in `approvers` are ignored.

### Parameter Updates

- `update_params(approvers: Vec<Address>, new_params: ProtocolParams)` — Replaces the entire `ProtocolParams` struct after validating bounds.
- `set_fee_bps(approvers: Vec<Address>, fee_bps: u32)` — Updates `fee_bps` (`<= 1_000`).
- `set_slash_bps(approvers: Vec<Address>, slash_bps: u32)` — Updates `slash_bps` (`<= 10_000`).
- `set_member_cap_bounds(approvers: Vec<Address>, min_member_cap: u32, max_member_cap: u32)` — Updates allowed circle size bounds.
- `set_collateral_bounds(approvers: Vec<Address>, min_collateral: i128, max_collateral: i128)` — Updates allowed collateral bounds.

### Multisig Membership & Threshold

- `add_owner(approvers: Vec<Address>, new_owner: Address)` — Adds a new multisig owner (panics if already an owner).
- `remove_owner(approvers: Vec<Address>, owner: Address)` — Removes an existing owner (panics if not an owner or if removal would drop `owners.len()` below `threshold`).
- `set_threshold(approvers: Vec<Address>, new_threshold: u32)` — Updates the required approval count (`1 <= new_threshold <= owners.len()`).

### Token Whitelist & Contract Upgrades

- `add_supported_token(approvers: Vec<Address>, token: Address, symbol: Symbol, decimals: u32)` — Whitelists a Stellar Asset Contract or custom token (`decimals <= 18`).
- `remove_supported_token(approvers: Vec<Address>, token: Address)` — Removes a whitelisted token.
- `upgrade(approvers: Vec<Address>, new_wasm_hash: BytesN<32>)` — Upgrades the contract WASM implementation in place via `env.deployer().update_current_contract_wasm(new_wasm_hash)`.

## Events

| Topic | Payload | Description |
|-------|---------|-------------|
| `cfg_init` | `(threshold, owners)` | Emitted when `initialize` succeeds |
| `cfg_upd` | `(approvers, new_params)` | Emitted on full parameter replacement |
| `fee_set` | `(approvers, fee_bps)` | Emitted when protocol fee is updated |
| `slsh_set` | `(approvers, slash_bps)` | Emitted when default slash rate is updated |
| `cap_set` | `(approvers, min_member_cap, max_member_cap)` | Emitted when member-cap bounds change |
| `col_set` | `(approvers, min_collateral, max_collateral)` | Emitted when collateral bounds change |
| `own_add` / `own_rem` | `(approvers, owner)` | Emitted when a multisig owner is added or removed |
| `thr_set` | `(approvers, new_threshold)` | Emitted when signing threshold changes |
| `tok_add` | `(token, symbol, decimals)` | Emitted when a token is whitelisted |
| `tok_rem` | `(token,)` | Emitted when a token is removed from the whitelist |
| `upgrade` | `(approvers, new_wasm_hash)` | Emitted on WASM upgrade |
