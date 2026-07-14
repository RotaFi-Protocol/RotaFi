# Contributing to RotaFi

Thanks for your interest in contributing! RotaFi is a community-driven protocol for trustless ROSCA/chit funds on Stellar.

## Getting Started

### Prerequisites

- **Rust** 1.82+ with `wasm32v1-none` target
- **Soroban CLI** 25.1.0+
- **Node.js** 20+
- **Git**

### Setup

```bash
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd rotafi
```

### Component Setup

Each component has its own setup:

```bash
# Contracts
cd contract
cargo test

# Backend
cd backend
npm install
npm test

# Keeper
cd keeper
npm install
npm test

# Frontend
cd frontend
npm install
npm run build

# Docs
cd docs
npm install
npm run build
```

## Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feat/my-feature`
3. **Make changes** and write tests
4. **Run tests** for the component(s) you changed
5. **Commit** with conventional commit messages:
   - `feat(scope): description` — new feature
   - `fix(scope): description` — bug fix
   - `docs(scope): description` — documentation
   - `chore(scope): description` — maintenance
   - `ci: description` — CI/CD changes
6. **Push** your branch and open a Pull Request against `master`

## Pull Request Conventions

- PR title should match the conventional commit format
- Link any related issues in the PR description
- If your PR closes an issue, include `Closes #N`
- Ensure all CI checks pass before requesting review

## Test Commands

| Component | Command |
|-----------|---------|
| Contracts | `cd contract && cargo test` |
| Backend | `cd backend && npm test` |
| Keeper | `cd keeper && npm test` |
| Frontend | `cd frontend && npm run build` |
| Docs | `cd docs && npm run build` |

## Issue Labels

Issues are labeled by complexity for Wave Program contributors:

| Label | Description |
|-------|-------------|
| `complexity/light` | Small, self-contained tasks suitable for first-time contributors |
| `complexity/medium` | Moderate scope, may touch multiple files |
| `complexity/heavy` | Large features requiring significant design and testing |
| `good-first-issue` | Especially approachable for new contributors |

## Code Style

- **Rust:** Follow standard conventions. Doc comments (`///`) on all public functions.
- **TypeScript:** Strict mode enabled. No `any` unless unavoidable.
- **All:** Prefer explicit error handling. No silent failures.

## Questions?

Open a [GitHub Discussion](https://github.com/RotaFi-Protocol/RotaFi/discussions) or ask in an issue.
