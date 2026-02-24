#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-/data/repos/vidgen}"
SESSIONS_DIR="${SESSIONS_DIR:-/data/.openclaw/agents/main/sessions}"
THRESHOLD="${HARDENED_WATCHER_THRESHOLD:-40}"
COOLDOWN="${HARDENED_WATCHER_COOLDOWN_SECS:-300}"
STAMP_FILE="${WORKSPACE}/memory/hardened/.watcher-last-run"

mkdir -p "${WORKSPACE}/memory/hardened"

last_count=0
last_run=0
[ -f "$STAMP_FILE" ] && last_run="$(cat "$STAMP_FILE" 2>/dev/null || echo 0)"

while true; do
  if [ ! -d "$SESSIONS_DIR" ]; then
    sleep 10
    continue
  fi

  count=$(find "$SESSIONS_DIR" -maxdepth 1 -type f -name '*.jsonl' | wc -l | tr -d ' ')
  now=$(date +%s)

  if [ "$count" -ge "$THRESHOLD" ] && [ $((now-last_run)) -ge "$COOLDOWN" ]; then
    OPENCLAW_WORKSPACE="$WORKSPACE" HARDENED_MEMORY_SHADOW=0 node "$WORKSPACE/scripts/memory_hardened_observer.js" || true
    OPENCLAW_WORKSPACE="$WORKSPACE" node "$WORKSPACE/scripts/memory_schema_validate.js" || true
    echo "$now" > "$STAMP_FILE"
    last_run="$now"
  fi

  last_count="$count"
  sleep 30
done
