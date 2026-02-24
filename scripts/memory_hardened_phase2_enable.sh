#!/usr/bin/env bash
set -euo pipefail

ROOT="${OPENCLAW_WORKSPACE:-/data/repos/vidgen}"

ensure_cron() {
  local name="$1"
  local schedule="$2"
  local message="$3"

  if openclaw cron list | grep -q "$name"; then
    echo "cron exists: $name"
    return 0
  fi

  openclaw cron add --name "$name" --cron "$schedule" --announce --channel last --message "$message"
  echo "cron added: $name"
}

ensure_cron \
  "hardened-memory:observer" \
  "*/15 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=1 node scripts/memory_hardened_observer.js && node scripts/memory_schema_validate.js. Reply NO_REPLY if successful; alert on error."

ensure_cron \
  "hardened-memory:reflector" \
  "0 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=1 node scripts/memory_hardened_reflector.js && node scripts/memory_schema_validate.js memory/hardened/compact.jsonl. Reply NO_REPLY if successful; alert on error."

ensure_cron \
  "hardened-memory:recovery" \
  "*/20 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=1 node scripts/memory_hardened_recovery.js && node scripts/memory_schema_validate.js. Reply NO_REPLY if successful; alert on error."

echo "Phase 2 cron wiring complete"
openclaw cron list
