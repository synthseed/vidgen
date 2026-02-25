#!/usr/bin/env bash
set -euo pipefail

ROOT="/data/repos/vidgen"
PORT="8090"
HOST_URL="https://srv1406887.tail1b780d.ts.net"
LOG_FILE="/tmp/vidgen-memory-dashboard.log"
PID_FILE="/tmp/vidgen-memory-dashboard.pid"

cd "$ROOT"

# Refresh dashboard JSON
OPENCLAW_WORKSPACE="$ROOT" node scripts/memory_hardened_dashboard.js >/dev/null

# Start/restart lightweight static server (no systemd required)
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  sleep 1
fi
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >"$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1

# Validate local server
if ! curl -fsS "http://127.0.0.1:${PORT}/dashboard/memory-dashboard.html" >/dev/null; then
  echo "❌ Local dashboard server failed to start. Check: $LOG_FILE"
  exit 1
fi

echo "✅ Local dashboard is running"
echo "Local URL: http://127.0.0.1:${PORT}/dashboard/memory-dashboard.html"

# Try to publish via tailscale serve if available
if command -v tailscale >/dev/null 2>&1; then
  if tailscale status >/dev/null 2>&1; then
    tailscale serve --bg /memory-dashboard "http://127.0.0.1:${PORT}/dashboard/memory-dashboard.html" || true
    tailscale serve --bg /memory-dashboard-data "http://127.0.0.1:${PORT}/memory/hardened/dashboard.json" || true
    echo "✅ Tailscale routes attempted"
    echo "Open: ${HOST_URL}/memory-dashboard"
    echo "Raw JSON: ${HOST_URL}/memory-dashboard-data"
  else
    echo "⚠️ tailscale installed but not connected in this shell context"
    echo "Run this on the HOST where tailscale is active to publish routes."
  fi
else
  echo "⚠️ tailscale CLI not found in this environment"
  echo "Run this script on the HOST (not container shell) to publish ${HOST_URL}/memory-dashboard"
fi
