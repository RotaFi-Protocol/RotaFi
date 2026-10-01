title: "[Docs] Write ContributionVault contract reference page"
labels: docs,good-first-issue

## Task

Write the Astro Starlight documentation page for ContributionVault.

## Page should cover

- Purpose (1 paragraph)
- Function reference table: name, parameters, returns, errors
- Code example calling `deposit()` via Stellar SDK
- Notes on collateral slashing logic

## Acceptance Criteria

- Renders at `/contracts/contribution-vault` in docs site
- All function signatures accurate (check `contract/contribution-vault/src/lib.rs`)

## Files

`docs/src/content/docs/contracts/contribution-vault.mdx`
