#!/bin/sh
#
# Source contract addresses produced by the optional `contracts` service before
# executing the wrapped command. Falls back to the environment provided by
# docker-compose when no deployments have been generated yet.
set -eu

DEPLOYMENTS_FILE="${DEPLOYMENTS_FILE:-/deployments/deployed.env}"

if [ -f "${DEPLOYMENTS_FILE}" ]; then
  echo "loading contract addresses from ${DEPLOYMENTS_FILE}"
  set -a
  # shellcheck disable=SC1090
  . "${DEPLOYMENTS_FILE}"
  set +a
fi

exec "$@"
