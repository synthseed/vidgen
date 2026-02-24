#!/usr/bin/env bash
set -euo pipefail
cd "${OPENCLAW_WORKSPACE:-/data/repos/vidgen}"

echo "== Hardened Memory Dashboard =="
node scripts/memory_hardened_dashboard.js

echo
echo "== Cron Health (hardened-memory) =="
openclaw cron list | grep "hardened-memory" || true

echo
echo "== Latest Dream Log =="
LATEST="$(find memory/hardened/dream-logs -maxdepth 1 -type f -name 'dream-*.md' 2>/dev/null | sort | tail -n 1 || true)"
if [ -n "$LATEST" ]; then
  echo "$LATEST"
  sed -n '1,40p' "$LATEST"
else
  echo "No dream log files yet"
fi
