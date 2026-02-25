#!/usr/bin/env bash
set -euo pipefail

BASE_PATH="${CONTROL_CENTER_BASE_PATH:-/control-center}"
PORT="${PORT:-3210}"
HOST="${HOST:-127.0.0.1}"

curl -fsS "http://${HOST}:${PORT}${BASE_PATH}" >/dev/null
curl -fsS "http://${HOST}:${PORT}${BASE_PATH}/api/healthz" >/dev/null
curl -fsS "http://${HOST}:${PORT}${BASE_PATH}/api/overview" >/dev/null

echo "smoke_basepath: ok (${BASE_PATH})"
