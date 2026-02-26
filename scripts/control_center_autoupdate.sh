#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/docker/openclaw-jnqf/data/repos/vidgen}"
APP_DIR="${APP_DIR:-${REPO_DIR}/apps/control-center}"
BRANCH="${BRANCH:-dev}"
SERVICE_NAME="${SERVICE_NAME:-vidgen-control-center.service}"
RUN_AS_USER="${RUN_AS_USER:-clawuser}"
DIST_DIR="${DIST_DIR:-.next}"

log() {
  printf "%s [control-center-autoupdate] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

cd "$REPO_DIR"

CURRENT_SHA="$(git rev-parse HEAD)"

git fetch origin "$BRANCH" >/dev/null
TARGET_SHA="$(git rev-parse "origin/${BRANCH}")"

if [[ "$CURRENT_SHA" == "$TARGET_SHA" ]]; then
  log "already up to date at ${CURRENT_SHA}"
  exit 0
fi

log "updating ${CURRENT_SHA} -> ${TARGET_SHA}"
git checkout "$BRANCH" >/dev/null
git pull --ff-only origin "$BRANCH" >/dev/null

cd "$APP_DIR"

sudo -u "$RUN_AS_USER" npm ci --no-audit --no-fund >/dev/null
sudo -u "$RUN_AS_USER" env CONTROL_CENTER_DIST_DIR="$DIST_DIR" npm run build >/dev/null

sudo systemctl restart "$SERVICE_NAME"

if ! curl -fsS "http://127.0.0.1:3210/control-center/api/healthz" >/dev/null; then
  log "health check failed after restart"
  exit 1
fi

NEW_SHA="$(git -C "$REPO_DIR" rev-parse HEAD)"
log "update complete at ${NEW_SHA}"
