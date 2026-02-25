#!/usr/bin/env bash
set -euo pipefail

UNIT_DIR="/etc/systemd/system"
ENV_FILE="/etc/default/vidgen-control-center"
REPO_ROOT="/docker/openclaw-jnqf/data/repos/vidgen"

if [[ ! -d "$REPO_ROOT" ]]; then
  echo "Repo root not found: $REPO_ROOT"
  exit 1
fi

sudo install -m 0644 "$REPO_ROOT/ops/systemd/vidgen-control-center.service" "$UNIT_DIR/vidgen-control-center.service"
sudo install -m 0644 "$REPO_ROOT/ops/systemd/vidgen-control-center-ingest.service" "$UNIT_DIR/vidgen-control-center-ingest.service"
sudo install -m 0644 "$REPO_ROOT/ops/systemd/vidgen-control-center-ingest.timer" "$UNIT_DIR/vidgen-control-center-ingest.timer"

if [[ ! -f "$ENV_FILE" ]]; then
  sudo install -m 0640 "$REPO_ROOT/ops/systemd/vidgen-control-center.env.example" "$ENV_FILE"
fi

sudo systemctl daemon-reload
sudo systemctl enable --now vidgen-control-center.service
sudo systemctl enable --now vidgen-control-center-ingest.timer

echo "Installed and started:"
sudo systemctl --no-pager --full status vidgen-control-center.service | sed -n '1,12p'
sudo systemctl --no-pager --full status vidgen-control-center-ingest.timer | sed -n '1,12p'
