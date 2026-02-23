#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_NAME="vps_autosync_openclaw"

REPO_DIR="${REPO_DIR:-/docker/openclaw-jnqf/data/repos/vidgen}"
PROJECT_DIR="${PROJECT_DIR:-/docker/openclaw-jnqf}"
BRANCH="${BRANCH:-dev}"
OPENCLAW_SERVICE="${OPENCLAW_SERVICE:-openclaw}"
OPENCLAW_HOME="${OPENCLAW_HOME:-/data/.openclaw}"
LOCK_FILE="${LOCK_FILE:-/tmp/vidgen-openclaw-autosync.lock}"
SLEEP_AFTER_RESTART="${SLEEP_AFTER_RESTART:-5}"
STATE_FILE="${STATE_FILE:-/tmp/vidgen-openclaw-autosync.state}"
WORKTREE_BASE="${WORKTREE_BASE:-/tmp/vidgen-autosync-worktrees}"
RUNTIME_BACKUP="${RUNTIME_BACKUP:-${OPENCLAW_HOME}/openclaw.json.autosync-prev}"
WHATSAPP_ALERT_ENABLED="${WHATSAPP_ALERT_ENABLED:-0}"
WHATSAPP_ALERT_CHANNEL="${WHATSAPP_ALERT_CHANNEL:-whatsapp}"
WHATSAPP_ALERT_TARGET="${WHATSAPP_ALERT_TARGET:-}"
WHATSAPP_ALERT_ACCOUNT="${WHATSAPP_ALERT_ACCOUNT:-}"
WHATSAPP_ALERT_PREFIX="${WHATSAPP_ALERT_PREFIX:-[vidgen-autosync]}"
WHATSAPP_ALERT_MIN_INTERVAL_SEC="${WHATSAPP_ALERT_MIN_INTERVAL_SEC:-900}"
WHATSAPP_ALERT_STATE_FILE="${WHATSAPP_ALERT_STATE_FILE:-/tmp/vidgen-openclaw-alert.state}"

TARGET_COMMIT=""
DEPLOYED_COMMIT=""

log() {
  printf "%s [%s] %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SCRIPT_NAME" "$*"
}

now_epoch() {
  date +%s
}

should_send_alert() {
  if [[ "$WHATSAPP_ALERT_ENABLED" != "1" ]]; then
    return 1
  fi
  if [[ -z "$WHATSAPP_ALERT_TARGET" ]]; then
    return 1
  fi
  if [[ ! -f "$WHATSAPP_ALERT_STATE_FILE" ]]; then
    return 0
  fi

  local last_epoch current_epoch delta
  last_epoch="$(cat "$WHATSAPP_ALERT_STATE_FILE" 2>/dev/null || true)"
  if [[ -z "$last_epoch" ]]; then
    return 0
  fi
  current_epoch="$(now_epoch)"
  delta=$((current_epoch - last_epoch))
  if (( delta >= WHATSAPP_ALERT_MIN_INTERVAL_SEC )); then
    return 0
  fi
  return 1
}

mark_alert_sent() {
  now_epoch >"$WHATSAPP_ALERT_STATE_FILE" 2>/dev/null || true
}

send_whatsapp_alert() {
  local status="$1"
  local reason="$2"

  if ! should_send_alert; then
    return 0
  fi

  local host_name run_time message
  host_name="$(hostname -s 2>/dev/null || hostname)"
  run_time="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  message="${WHATSAPP_ALERT_PREFIX} ${status}
host=${host_name}
branch=${BRANCH}
target_commit=${TARGET_COMMIT:-n/a}
deployed_commit=${DEPLOYED_COMMIT:-n/a}
time=${run_time}
reason=${reason}"

  local cmd=(docker compose exec -T "$OPENCLAW_SERVICE" openclaw message send \
    --channel "$WHATSAPP_ALERT_CHANNEL" \
    --target "$WHATSAPP_ALERT_TARGET" \
    --message "$message")

  if [[ -n "$WHATSAPP_ALERT_ACCOUNT" ]]; then
    cmd+=(--account "$WHATSAPP_ALERT_ACCOUNT")
  fi

  if ! cd "$PROJECT_DIR" 2>/dev/null; then
    log "warning: cannot enter PROJECT_DIR for whatsapp alert: $PROJECT_DIR"
    return 0
  fi
  if "${cmd[@]}" >/dev/null 2>&1; then
    mark_alert_sent
    log "whatsapp alert sent (${status})"
  else
    log "warning: failed to send whatsapp alert"
  fi
}

fail() {
  local reason="$1"
  log "$reason"
  send_whatsapp_alert "FAIL" "$reason"
  exit 1
}

on_error() {
  local line="$1"
  local cmd="$2"
  local code="$3"
  local reason
  reason="unexpected error (exit=${code}, line=${line}, cmd=${cmd})"
  log "$reason"
  send_whatsapp_alert "FAIL" "$reason"
  exit "$code"
}

trap 'on_error "$LINENO" "$BASH_COMMAND" "$?"' ERR

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "missing required command: $1"
  fi
}

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    if ! flock -n 9; then
      log "another sync is already running; exiting"
      exit 0
    fi
    return
  fi

  if ! mkdir "${LOCK_FILE}.d" 2>/dev/null; then
    log "another sync is already running; exiting"
    exit 0
  fi
  trap 'rmdir "${LOCK_FILE}.d" >/dev/null 2>&1 || true' EXIT
}

run_repo_checks_at() {
  local dir="$1"
  log "running repository checks in ${dir}"
  cd "$dir"
  node scripts/openclaw_topology_check.js
  node scripts/check_knowledge_base.js
  node scripts/doc_gardener.js
  node scripts/security_preflight.js --strict
  node scripts/pipeline_orchestrator_dry_run.js >/dev/null
}

prepare_runtime_backup() {
  log "capturing runtime config backup"
  cd "$PROJECT_DIR"
  docker compose exec -T "$OPENCLAW_SERVICE" \
    sh -lc "cp \"$OPENCLAW_HOME/openclaw.json\" \"$RUNTIME_BACKUP\""
}

run_runtime_apply() {
  log "applying topology and templates to runtime"
  cd "$PROJECT_DIR"

  docker compose exec -T "$OPENCLAW_SERVICE" \
    node /data/repos/vidgen/scripts/openclaw_apply_repo_topology.js \
      --runtime-config "$OPENCLAW_HOME/openclaw.json" \
      --repo-config /data/repos/vidgen/openclaw/openclaw.json

  docker compose exec -T "$OPENCLAW_SERVICE" \
    node /data/repos/vidgen/scripts/openclaw_sync_agent_templates.js \
      --openclaw-home "$OPENCLAW_HOME"
}

run_runtime_verify() {
  log "restarting $OPENCLAW_SERVICE and verifying health"
  cd "$PROJECT_DIR"

  docker compose restart "$OPENCLAW_SERVICE" >/dev/null
  sleep "$SLEEP_AFTER_RESTART"

  docker compose exec -T "$OPENCLAW_SERVICE" openclaw doctor >/dev/null
  docker compose exec -T "$OPENCLAW_SERVICE" openclaw models status --agent main --check >/dev/null

  if docker compose logs --since 2m "$OPENCLAW_SERVICE" \
    | grep -Eiq "Config invalid|pairing required|gateway connect failed|EACCES: permission denied"; then
    log "runtime verification failed due to error signatures in logs"
    return 1
  fi
}

rollback_runtime_config() {
  log "restoring runtime config from backup"
  cd "$PROJECT_DIR"
  docker compose exec -T "$OPENCLAW_SERVICE" \
    sh -lc "cp \"$RUNTIME_BACKUP\" \"$OPENCLAW_HOME/openclaw.json\""
  docker compose restart "$OPENCLAW_SERVICE" >/dev/null
  sleep "$SLEEP_AFTER_RESTART"
}

run_candidate_checks() {
  local commit="$1"
  local worktree_dir="${WORKTREE_BASE}/${commit}"
  mkdir -p "$WORKTREE_BASE"

  cd "$REPO_DIR"
  if [[ -d "$worktree_dir" ]]; then
    git worktree remove --force "$worktree_dir" >/dev/null 2>&1 || true
  fi
  git worktree add --detach "$worktree_dir" "$commit" >/dev/null
  trap 'git -C "$REPO_DIR" worktree remove --force "$worktree_dir" >/dev/null 2>&1 || true' RETURN
  run_repo_checks_at "$worktree_dir"
  git -C "$REPO_DIR" worktree remove --force "$worktree_dir" >/dev/null 2>&1 || true
  trap - RETURN
}

read_last_success() {
  if [[ ! -f "$STATE_FILE" ]]; then
    echo ""
    return
  fi
  awk 'NF>=2 {print $2}' "$STATE_FILE" | tail -n1
}

mark_success() {
  local commit="$1"
  printf "%s %s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$commit" > "$STATE_FILE"
}

deploy_current_repo() {
  DEPLOYED_COMMIT="$(git -C "$REPO_DIR" rev-parse HEAD)"
  prepare_runtime_backup
  run_runtime_apply
  run_runtime_verify
  mark_success "$DEPLOYED_COMMIT"
  log "sync complete on commit ${DEPLOYED_COMMIT}"
}

main() {
  require_cmd git
  require_cmd node
  require_cmd docker
  acquire_lock

  cd "$REPO_DIR"
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    fail "REPO_DIR is not a git repository: $REPO_DIR"
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    fail "repository has local changes; refusing auto-sync"
  fi

  local_current="$(git rev-parse HEAD)"
  last_success="$(read_last_success)"
  log "current commit: ${local_current}"
  log "last successful deployed commit: ${last_success:-none}"

  git fetch origin "$BRANCH" >/dev/null
  TARGET_COMMIT="$(git rev-parse "origin/${BRANCH}")"

  if [[ "$local_current" != "$TARGET_COMMIT" ]]; then
    log "new commit detected on ${BRANCH}: ${TARGET_COMMIT}"
    run_candidate_checks "$TARGET_COMMIT"
    git checkout "$BRANCH" >/dev/null
    git pull --ff-only origin "$BRANCH" >/dev/null
    local_current="$(git rev-parse HEAD)"
    log "pulled commit: ${local_current}"
  else
    log "repository already at latest commit on ${BRANCH}"
  fi

  if [[ "$last_success" == "$local_current" ]]; then
    log "commit ${local_current} is already deployed and healthy"
    exit 0
  fi

  if ! deploy_current_repo; then
    log "deployment failed; attempting runtime config restore"
    rollback_runtime_config || true
    fail "deployment failed and runtime config restore attempted"
  fi
}

main "$@"
