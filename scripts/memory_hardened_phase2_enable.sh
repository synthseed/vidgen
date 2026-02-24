#!/usr/bin/env bash
set -euo pipefail

ROOT="${OPENCLAW_WORKSPACE:-/data/repos/vidgen}"

ensure_cron() {
  local name="$1"
  local schedule="$2"
  local message="$3"
  local match="${4:-$name}"

  if openclaw cron list | grep -q "$match"; then
    echo "cron exists: $name"
    return 0
  fi

  openclaw cron add --name "$name" --cron "$schedule" --announce --channel last --message "$message"
  echo "cron added: $name"
}

ensure_cron \
  "hardened-memory:observer" \
  "*/15 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=0 node scripts/memory_hardened_observer.js && node scripts/memory_schema_validate.js. Reply NO_REPLY if successful; alert on error." \
  "hardened-memory:observer"

ensure_cron \
  "hardened-memory:reflector" \
  "0 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=0 node scripts/memory_hardened_reflector.js && node scripts/memory_schema_validate.js memory/hardened/compact.jsonl. Reply NO_REPLY if successful; alert on error." \
  "hardened-memory:refle"

ensure_cron \
  "hardened-memory:recovery" \
  "*/20 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=0 node scripts/memory_hardened_recovery.js && node scripts/memory_schema_validate.js. Reply NO_REPLY if successful; alert on error." \
  "hardened-memory:recovery"

ensure_cron \
  "hardened-memory:dream-cycle" \
  "0 3 * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} HARDENED_MEMORY_SHADOW=0 DREAM_MODEL=openai/gpt-5.2 DREAM_READ_ONLY=1 node scripts/memory_hardened_dream_cycle.js && node scripts/memory_schema_validate.js. Reply NO_REPLY if successful; alert on error." \
  "hardened-memory:dream"

ensure_cron \
  "hardened-memory:dashboard" \
  "30 * * * *" \
  "Run OPENCLAW_WORKSPACE=${ROOT} node scripts/memory_hardened_dashboard.js. If recommendation says eligible to switch DREAM_READ_ONLY=0, alert with exact instruction: set DREAM_READ_ONLY=0 for hardened-memory:dream-cycle after reliability_guardian and human approval. Otherwise reply NO_REPLY." \
  "hardened-memory:dash"

echo "Phase 2/3 cron wiring complete"
openclaw cron list
