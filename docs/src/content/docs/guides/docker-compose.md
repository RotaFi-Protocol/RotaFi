---
title: Docker Compose
description: Run the full RotaFi stack — sandbox, backend, keeper, and frontend — with one command.
---

The repository ships a `docker-compose.yml` that starts every RotaFi component
locally, including a Stellar Quickstart node that exposes a Soroban RPC sandbox.
Use it when you want a reproducible environment without installing Rust, the
Stellar CLI, or Node.js on your host.

## Prerequisites

- Docker Engine 24+ with the Compose v2 plugin (`docker compose`), or Docker Desktop.

No other tooling is required — the contracts, backend, keeper, and frontend all
build and run inside containers.

## Quick start

```bash
git clone https://github.com/RotaFi-Protocol/RotaFi.git
cd RotaFi

cp docker/.env.example .env
docker compose up --build
```

Once the health checks pass, the following endpoints are available:

| Service | URL | Notes |
|---|---|---|
| Frontend | http://localhost:3001 | Next.js dev server |
| Backend | http://localhost:3000/healthz | REST API health probe |
| Soroban RPC | http://localhost:8000/rpc | Stellar Quickstart sandbox |
| Horizon | http://localhost:8000 | Local network Horizon |

You can also drive the stack with the included `Makefile`:

```bash
make up        # build + start in the background
make ps        # show status and health
make logs      # tail logs
make down      # stop the stack
```

## Services

| Service | Image / build | Port | Health check |
|---|---|---|---|
| `soroban` | `stellar/quickstart:testing` | `8000` | JSON-RPC `getHealth` returns `healthy` |
| `backend` | `backend/Dockerfile` (`development`) | `3000` | `GET /healthz` returns `200` |
| `keeper` | `keeper/Dockerfile` (`development`) | `3002` (internal) | `GET /healthz` on the keeper health server |
| `frontend` | `frontend/Dockerfile` (`development`) | `3001` | root document returns `200` |

The `backend`, `keeper`, and `frontend` services wait for the sandbox to report
healthy before starting (`depends_on: condition: service_healthy`), and the
frontend waits for the backend.

### Hot reload

Each application service bind-mounts its source directory into the container:

- `./backend` → `/app`
- `./keeper` → `/app`
- `./frontend` → `/app`

`node_modules` (and the frontend's `.next` cache) live in named volumes so the
host bind mount does not shadow the dependencies installed in the image. Editing
a source file on the host triggers the same watcher you would get with a local
`npm run dev`.

## Deploying contracts to the sandbox

The `soroban` service starts an empty local network. To compile the Soroban
contracts and deploy them to it, run the optional `contracts` profile:

```bash
docker compose --profile contracts run --rm contracts
# or: make contracts
```

This builds all four contracts with the official `stellar/stellar-cli` image and
writes the resulting contract IDs to `docker/generated/deployed.env`. The
backend, keeper, and frontend mount that directory and load the addresses on the
next start:

```bash
docker compose up --detach --force-recreate backend keeper frontend
```

## Configuration

All settings are optional and default sensibly; override them in `.env` (copied
from `docker/.env.example`). Common knobs:

| Variable | Default | Purpose |
|---|---|---|
| `SOROBAN_PORT` | `8000` | Host port for the sandbox (RPC + Horizon) |
| `BACKEND_PORT` | `3000` | Host port for the REST API |
| `FRONTEND_PORT` | `3001` | Host port for the web UI |
| `POLL_INTERVAL_MS` | `30000` | Keeper polling interval |
| `QUICKSTART_TAG` | `testing` | Pin the Stellar Quickstart image tag |
| `STELLAR_CLI_TAG` | `latest` | Pin the Stellar CLI image tag |

## Verifying the sandbox

```bash
curl --location http://localhost:8000/rpc \
  --header 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

A healthy sandbox responds with `{"result":{"status":"healthy", ...}}`.

## Troubleshooting

- **First boot is slow.** The sandbox initialises a fresh ledger, Horizon, and
  the Soroban RPC; the health check allows up to ten minutes (`retries: 60`).
- **Port already in use.** Change `SOROBAN_PORT`, `BACKEND_PORT`, or
  `FRONTEND_PORT` in `.env` and re-run `docker compose up`.
- **Reset the sandbox.** Contract state and ledger data persist in the
  `rotafi_soroban-data` volume. Run `make clean` (or
  `docker compose down --volumes`) to start from a clean network.
