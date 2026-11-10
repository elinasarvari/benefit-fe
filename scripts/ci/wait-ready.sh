#!/usr/bin/env bash
# Waits until the API reports ready and the web preview answers. Usage: wait-ready.sh [timeout-seconds]
set -euo pipefail

TIMEOUT="${1:-120}"
API="${API_BASE_URL:-http://localhost:8000}"
WEB="${E2E_BASE_URL:-http://localhost:5173}"

wait_for() {
  local url="$1" deadline=$((SECONDS + TIMEOUT))
  until curl -fsS --max-time 5 -o /dev/null "$url"; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "Timed out waiting for $url" >&2
      exit 1
    fi
    sleep 2
  done
  echo "ready: $url"
}

wait_for "$API/api/v1/health"
wait_for "$API/api/v1/ready"
wait_for "$WEB/"
