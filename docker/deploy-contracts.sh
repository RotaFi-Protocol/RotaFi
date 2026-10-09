#!/usr/bin/env bash
#
# Build the RotaFi Soroban contracts and deploy them to the local sandbox.
#
# Runs inside the stellar/stellar-cli image (see the `contracts` service in
# docker-compose.yml). The resulting contract IDs are written to
# $DEPLOYMENTS_FILE so the backend, keeper and frontend can pick them up via
# docker/with-deployments.sh.
set -euo pipefail

RPC_URL="${STELLAR_RPC_URL:-http://soroban:8000/rpc}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Standalone Network ; February 2017}"
NETWORK_NAME="${STELLAR_NETWORK_NAME:-rotafi-local}"
IDENTITY="${STELLAR_IDENTITY:-rotafi-deployer}"
DEPLOYMENTS_FILE="${DEPLOYMENTS_FILE:-/deployments/deployed.env}"
WASM_DIR="target/wasm32v1-none/release"

echo "==> Configuring network '${NETWORK_NAME}' (${RPC_URL})"
stellar network add "${NETWORK_NAME}" \
  --rpc-url "${RPC_URL}" \
  --network-passphrase "${PASSPHRASE}" \
  --overwrite

echo "==> Preparing identity '${IDENTITY}'"
if ! stellar keys address "${IDENTITY}" >/dev/null 2>&1; then
  stellar keys generate "${IDENTITY}"
fi
stellar keys fund "${IDENTITY}" --network "${NETWORK_NAME}" >/dev/null 2>&1 || true

echo "==> Building contracts"
stellar contract build --locked

mkdir -p "$(dirname "${DEPLOYMENTS_FILE}")"
: > "${DEPLOYMENTS_FILE}"

declare -A CRATES=(
  [CIRCLE_FACTORY_ADDRESS]=circle_factory
  [CONTRIBUTION_VAULT_ADDRESS]=contribution_vault
  [REPUTATION_REGISTRY_ADDRESS]=reputation_registry
  [BID_ENGINE_ADDRESS]=bid_engine
)

for var in CIRCLE_FACTORY_ADDRESS CONTRIBUTION_VAULT_ADDRESS REPUTATION_REGISTRY_ADDRESS BID_ENGINE_ADDRESS; do
  crate="${CRATES[$var]}"
  wasm="${WASM_DIR}/${crate}.wasm"

  if [ ! -f "${wasm}" ]; then
    echo "!! missing wasm: ${wasm}" >&2
    exit 1
  fi

  echo "==> Deploying ${crate}"
  contract_id="$(stellar contract deploy \
    --wasm "${wasm}" \
    --source "${IDENTITY}" \
    --network "${NETWORK_NAME}" | tail -n 1)"

  echo "${var}=${contract_id}" >> "${DEPLOYMENTS_FILE}"
  echo "NEXT_PUBLIC_${var}=${contract_id}" >> "${DEPLOYMENTS_FILE}"
  echo "    ${var}=${contract_id}"
done

echo
echo "==> Contract IDs written to ${DEPLOYMENTS_FILE}"
cat "${DEPLOYMENTS_FILE}"
