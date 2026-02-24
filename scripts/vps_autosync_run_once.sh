#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/docker/openclaw-jnqf/data/repos/vidgen}"
BRANCH="${BRANCH:-dev}"
SERVICE_NAME="${SERVICE_NAME:-vidgen-openclaw-autosync.service}"
STATUS_SCRIPT="${STATUS_SCRIPT:-/docker/openclaw-jnqf/data/repos/vidgen/scripts/vps_autosync_status.sh}"
PULL_FIRST="${PULL_FIRST:-1}"
RELOAD_SYSTEMD="${RELOAD_SYSTEMD:-1}"
LOG_LINES="${LOG_LINES:-80}"

usage() {
  cat <<EOF
Usage: bash scripts/vps_autosync_run_once.sh [--no-pull] [--no-reload] [--logs N]

Env overrides:
  REPO_DIR, BRANCH, SERVICE_NAME, STATUS_SCRIPT, PULL_FIRST, RELOAD_SYSTEMD, LOG_LINES
EOF
}

main() {
  local arg
  while [[ $# -gt 0 ]]; do
    arg="$1"
    case "$arg" in
      --no-pull)
        PULL_FIRST=0
        shift
        ;;
      --no-reload)
        RELOAD_SYSTEMD=0
        shift
        ;;
      --logs)
        LOG_LINES="${2:-$LOG_LINES}"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        echo "error: unknown argument: $arg" >&2
        usage
        exit 1
        ;;
    esac
  done

  cd "$REPO_DIR"

  if [[ "$PULL_FIRST" == "1" ]]; then
    git pull origin "$BRANCH"
  fi

  if [[ "$RELOAD_SYSTEMD" == "1" ]]; then
    systemctl daemon-reload
  fi

  systemctl start "$SERVICE_NAME" || true

  LOG_LINES="$LOG_LINES" bash "$STATUS_SCRIPT"
}

main "$@"

