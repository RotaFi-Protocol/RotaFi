title: "[Frontend] Add live ledger clock to navbar"
labels: frontend,good-first-issue

## Task

Add a small live display of the current Stellar testnet ledger number in the navbar.

## Spec

- Polls Soroban RPC every 10 seconds
- Shows: `Ledger 12,345,678` in monospace muted font
- Cleans up interval on unmount
- Falls back to `—` on RPC error

## Files

`frontend/src/components/shared/LedgerClock.tsx` (create)
`frontend/src/components/layout/Navbar.tsx` (add component)
