#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/docker/openclaw-jnqf/data/repos/vidgen}"
SERVICE_NAME="${SERVICE_NAME:-vidgen-openclaw-autosync.service}"
STATE_FILE="${STATE_FILE:-/tmp/vidgen-openclaw-autosync.state}"
BRANCH="${BRANCH:-dev}"
LOG_LINES="${LOG_LINES:-80}"
STRICT_EXIT="${STRICT_EXIT:-0}"

print_kv() {
  printf "%-22s %s\n" "$1" "$2"
}

safe_show() {
  local property="$1"
  systemctl show "$SERVICE_NAME" -p "$property" --value 2>/dev/null || echo "unknown"
}

main() {
  if ! cd "$REPO_DIR" 2>/dev/null; then
    echo "error: cannot access REPO_DIR=$REPO_DIR" >&2
    exit 1
  fi

  local repo_head origin_head dirty_count dirty_status
  local state_ts state_sha
  local result exec_status exec_code active sub unit_file
  local health notes

  repo_head="$(git rev-parse HEAD 2>/dev/null || echo "unknown")"
  origin_head="unknown"
  if git fetch --quiet origin "$BRANCH" >/dev/null 2>&1; then
    origin_head="$(git rev-parse "origin/${BRANCH}" 2>/dev/null || echo "unknown")"
  fi

  dirty_count="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  dirty_status="clean"
  if [[ "$dirty_count" != "0" ]]; then
    dirty_status="dirty(${dirty_count})"
  fi

  state_ts="none"
  state_sha="none"
  if [[ -f "$STATE_FILE" ]]; then
    read -r state_ts state_sha < "$STATE_FILE" || true
    state_ts="${state_ts:-none}"
    state_sha="${state_sha:-none}"
  fi

  result="$(safe_show Result)"
  exec_status="$(safe_show ExecMainStatus)"
  exec_code="$(safe_show ExecMainCode)"
  active="$(safe_show ActiveState)"
  sub="$(safe_show SubState)"
  unit_file="$(safe_show UnitFileState)"

  health="OK"
  notes=()

  if [[ "$state_sha" == "none" ]]; then
    health="WARN"
    notes+=("state file missing")
  fi

  if [[ "$state_sha" != "none" && "$repo_head" != "$state_sha" ]]; then
    if [[ "$health" == "OK" ]]; then
      health="WARN"
    fi
    notes+=("state commit differs from repo HEAD")
  fi

  if [[ "$dirty_status" != "clean" ]]; then
    if [[ "$health" == "OK" ]]; then
      health="WARN"
    fi
    notes+=("repo has local changes")
  fi

  if [[ "$result" != "success" && "$result" != "unknown" && "$result" != "none" ]]; then
    health="FAIL"
    notes+=("last service result=${result}")
  fi

  echo "=== vidgen autosync status ==="
  print_kv "timestamp_utc" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  print_kv "repo_dir" "$REPO_DIR"
  print_kv "branch" "$BRANCH"
  print_kv "repo_head" "$repo_head"
  print_kv "origin_head" "$origin_head"
  print_kv "repo_status" "$dirty_status"
  print_kv "state_file" "$STATE_FILE"
  print_kv "state_time" "$state_ts"
  print_kv "state_commit" "$state_sha"
  print_kv "service_name" "$SERVICE_NAME"
  print_kv "service_result" "$result"
  print_kv "service_exec" "${exec_code}/${exec_status}"
  print_kv "service_active" "${active}/${sub}"
  print_kv "service_enabled" "$unit_file"
  print_kv "health" "$health"
  if [[ "${#notes[@]}" -gt 0 ]]; then
    print_kv "notes" "$(IFS='; '; echo "${notes[*]}")"
  fi

  echo
  echo "--- recent logs (${LOG_LINES}) ---"
  journalctl -u "$SERVICE_NAME" -n "$LOG_LINES" --no-pager || true

  if [[ "$STRICT_EXIT" != "1" ]]; then
    exit 0
  fi

  case "$health" in
    OK) exit 0 ;;
    WARN) exit 2 ;;
    FAIL) exit 1 ;;
    *) exit 1 ;;
  esac
}

main "$@"

