# Deployed Contract Addresses (Stellar Testnet)

| Contract | Address | Stellar Expert |
|----------|---------|---------------|
| Circle Factory | `CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6` | [View](https://stellar.expert/explorer/testnet/contract/CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6) |
| Contribution Vault | `CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO` | [View](https://stellar.expert/explorer/testnet/contract/CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO) |
| Reputation Registry | `CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC` | [View](https://stellar.expert/explorer/testnet/contract/CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC) |
| Bid Engine | `CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P` | [View](https://stellar.expert/explorer/testnet/contract/CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P) |

## Deployer

- Identity: `rotafi-deployer`
- Address: `GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47`

## Deploy Commands

```bash
soroban contract deploy \
  --wasm contract/target/wasm32v1-none/release/circle_factory.wasm \
  --source rotafi-deployer \
  --network testnet

soroban contract deploy \
  --wasm contract/target/wasm32v1-none/release/contribution_vault.wasm \
  --source rotafi-deployer \
  --network testnet \
  --inclusion-fee 10000

soroban contract deploy \
  --wasm contract/target/wasm32v1-none/release/reputation_registry.wasm \
  --source rotafi-deployer \
  --network testnet

soroban contract deploy \
  --wasm contract/target/wasm32v1-none/release/bid_engine.wasm \
  --source rotafi-deployer \
  --network testnet
```
