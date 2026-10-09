#!/usr/bin/env bash
#
# Health check for the Stellar Quickstart (Soroban sandbox) container.
#
# The Quickstart image bundles curl and jq. This probe sends a JSON-RPC
# getHealth request to the local Stellar RPC endpoint and exits non-zero
# until the sandbox reports a healthy status.
set -euo pipefail

RPC_URL="${SOROBAN_HEALTHCHECK_URL:-http://localhost:8000/rpc}"

response="$(curl -fsS -X POST "$RPC_URL" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null || true)"

if [ -z "$response" ]; then
  echo "soroban: rpc not reachable at ${RPC_URL}"
  exit 1
fi

status="$(echo "$response" | jq -r '.result.status // empty' 2>/dev/null || true)"

if [ "$status" != "healthy" ]; then
  echo "soroban: not healthy yet (${response})"
  exit 1
fi

echo "soroban: healthy"
