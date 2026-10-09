# RotaFi Frontend — E2E Tests (Playwright)

End-to-end tests for the frontend running against the **Stellar testnet**
configuration. They cover the full ROSCA lifecycle:

1. Wallet connect (mock Freighter)
2. Browse circles + currency filter
3. Join a circle
4. Contribute each round
5. Release payouts
6. Circle completion
7. Full lifecycle in one pass

## Running

```bash
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e            # headless, both desktop and mobile projects
npm run test:e2e:ui         # interactive UI mode
npm run test:e2e:headed     # visible headed run
npx playwright test --project=chromium
```

The Playwright web server boots `next dev` with the **testnet** defaults from
`.env.example` (Soroban RPC `https://soroban-testnet.stellar.org`, the
`Test SDF Network ; September 2015` passphrase, and the canonical testnet
contract addresses). The `testnet-config.spec.ts` suite asserts those defaults.

## Wallet strategy

The real Freighter extension cannot be automated headlessly. Tests inject a
`window.freighterApi` stub (see `e2e/fixtures/wallet.ts`) with a fixed test
public key and auto-signing transactions, so wallet-gated flows run
deterministically in CI.

## Lifecycle simulation vs live testnet

By default the runs use a deterministic in-browser lifecycle simulation so the
full contribute → payout → completion path is **repeatable**. Contract reads
against the deployed testnet vaults are available through
`src/lib/soroban.ts` (`fetchOnChainVault`, gated on
`NEXT_PUBLIC_USE_LIVE_CONTRACTS=true`).

For an opt-in run that points the app at a real testnet RPC and requires
deployed state to be present:

```bash
E2E_LIVE_TESTNET=1 npm run test:e2e
```

Override any endpoint/address via the standard `NEXT_PUBLIC_*` env vars (see
`.env.example`); see also `frontend/.env.e2e.example`.

## Reference config

| Key | Testnet default |
|---|---|
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` |
| `NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS` | `CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6` |
| `NEXT_PUBLIC_CONTRIBUTION_VAULT_ADDRESS` | `CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO` |
| `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` | `CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC` |
| `NEXT_PUBLIC_BID_ENGINE_ADDRESS` | `CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P` |