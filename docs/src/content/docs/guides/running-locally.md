---
title: Running Locally
description: How to run all RotaFi components on your local machine.
---

## Prerequisites

- **Rust** 1.82+ with `wasm32v1-none` target
- **Soroban CLI** 25.1.0+
- **Node.js** 20+
- **Git**

## Setup

```bash
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd rotafi
```

### 1. Contracts

```bash
cd contract
cargo test        # Run 48 contract tests
cargo build --target wasm32v1-none --release
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev       # Starts on port 3000
npm test          # Run API tests
```

### 3. Keeper

```bash
cd keeper
cp .env.example .env
npm install
npm run dev       # Starts polling loop
npm test          # Run keeper tests
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev       # Starts on port 3001
npm run build     # Production build
```

### 5. Documentation

```bash
cd docs
npm install
npm run dev       # Starts Starlight docs site
```

## Testing Everything

```bash
# Contracts
cd contract && cargo test

# Backend
cd backend && npm test

# Keeper
cd keeper && npm test

# Frontend
cd frontend && npm run build
```

All tests should pass with zero failures.
