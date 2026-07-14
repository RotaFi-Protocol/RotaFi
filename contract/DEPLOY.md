# Deploying RotaFi Contracts

## Prerequisites

- Rust 1.82+ with `wasm32-unknown-unknown` target
- Soroban CLI 25.1.0+
- A funded Stellar Testnet account

```bash
# Add the wasm target
rustup target add wasm32-unknown-unknown

# Install Soroban CLI
cargo install soroban-cli
```

## Build

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

Compiled WASM files are in `contract/target/wasm32-unknown-unknown/release/`.

## Deploy to Testnet

```bash
# Set identity
soroban config identity generate testnet-deployer
soroban config identity fund testnet-deployer --network testnet

# Deploy each contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/circle_factory.wasm \
  --source testnet-deployer \
  --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contribution_vault.wasm \
  --source testnet-deployer \
  --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/reputation_registry.wasm \
  --source testnet-deployer \
  --network testnet

soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/bid_engine.wasm \
  --source testnet-deployer \
  --network testnet
```

Each deploy command outputs a contract ID. Save these for README and
`DEPLOYED_ADDRESSES.md`.

## Interact

```bash
# Initialize a circle factory
soroban contract invoke \
  --id <circle-factory-id> \
  --source testnet-deployer \
  --network testnet \
  -- create_circle \
  --config '{"contribution_amount":"100000000","round_length_seconds":"604800","member_cap":5,"payout_method":0,"min_collateral":"50000000","grace_period_seconds":"86400"}'

# Query a circle
soroban contract invoke \
  --id <circle-factory-id> \
  --source testnet-deployer \
  --network testnet \
  -- get_circle \
  --circle_id 1
```

## Run Tests

```bash
cargo test
```

All four contract crates compile and pass tests with `cargo test`.
