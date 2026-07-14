---
title: Deploying Contracts
description: How to build and deploy contracts to Stellar Testnet.
---

## Build

```bash
cd contract
cargo build --target wasm32v1-none --release
```

Compiled WASM files are in `contract/target/wasm32v1-none/release/`:
- `circle_factory.wasm`
- `contribution_vault.wasm`
- `reputation_registry.wasm`
- `bid_engine.wasm`

## Deploy

First, generate a funded testnet account:

```bash
soroban keys generate my-deployer
soroban keys address my-deployer
# Fund via https://friendbot.stellar.org?addr=<YOUR_ADDRESS>
```

Then deploy each contract:

```bash
soroban contract deploy \
  --wasm target/wasm32v1-none/release/circle_factory.wasm \
  --source my-deployer \
  --network testnet

soroban contract deploy \
  --wasm target/wasm32v1-none/release/contribution_vault.wasm \
  --source my-deployer \
  --network testnet \
  --inclusion-fee 10000

soroban contract deploy \
  --wasm target/wasm32v1-none/release/reputation_registry.wasm \
  --source my-deployer \
  --network testnet

soroban contract deploy \
  --wasm target/wasm32v1-none/release/bid_engine.wasm \
  --source my-deployer \
  --network testnet
```

## Verify

Check your contracts on [Stellar Expert](https://stellar.expert/explorer/testnet) by searching for the contract IDs returned by the deploy commands.

Update `.env` files in `backend/` and `keeper/` with your contract addresses.
