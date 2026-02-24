#!/usr/bin/env bash
set -euo pipefail

ROOT="/data/repos/vidgen"
PORT="8090"
HOST_URL="https://srv1406887.tail1b780d.ts.net"
SERVICE_NAME="vidgen-memory-dashboard"

cd "$ROOT"

# Ensure dashboard JSON is fresh
OPENCLAW_WORKSPACE="$ROOT" node scripts/memory_hardened_dashboard.js >/dev/null

if command -v systemctl >/dev/null 2>&1; then
  sudo tee /etc/systemd/system/${SERVICE_NAME}.service >/dev/null <<EOF
[Unit]
Description=Vidgen Hardened Memory Dashboard Static Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${ROOT}
ExecStart=/usr/bin/python3 -m http.server ${PORT} --bind 127.0.0.1
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable --now ${SERVICE_NAME}
else
  nohup python3 -m http.server ${PORT} --bind 127.0.0.1 >/tmp/${SERVICE_NAME}.log 2>&1 &
fi

# Expose dashboard path through existing tailnet hostname
if command -v tailscale >/dev/null 2>&1; then
  sudo tailscale serve --bg /memory-dashboard http://127.0.0.1:${PORT}/dashboard/memory-dashboard.html
  sudo tailscale serve --bg /memory-dashboard-data http://127.0.0.1:${PORT}/memory/hardened/dashboard.json
fi

echo "✅ One-click dashboard setup complete"
echo "Open: ${HOST_URL}/memory-dashboard"
echo "Raw JSON: ${HOST_URL}/memory-dashboard-data"
echo "If first load fails, wait 5-10s then refresh."
