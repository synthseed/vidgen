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
VERIFY_REQUIRE_GATEWAY="${VERIFY_REQUIRE_GATEWAY:-0}"
VERIFY_LOG_ERROR_PATTERN="${VERIFY_LOG_ERROR_PATTERN:-Config invalid|EACCES: permission denied}"
WHATSAPP_ALERT_ENABLED="${WHATSAPP_ALERT_ENABLED:-0}"
WHATSAPP_ALERT_CHANNEL="${WHATSAPP_ALERT_CHANNEL:-whatsapp}"
WHATSAPP_ALERT_TARGET="${WHATSAPP_ALERT_TARGET:-}"
WHATSAPP_ALERT_ACCOUNT="${WHATSAPP_ALERT_ACCOUNT:-}"
WHATSAPP_ALERT_PREFIX="${WHATSAPP_ALERT_PREFIX:-[vidgen-autosync]}"
WHATSAPP_ALERT_MIN_INTERVAL_SEC="${WHATSAPP_ALERT_MIN_INTERVAL_SEC:-900}"
WHATSAPP_ALERT_STATE_FILE="${WHATSAPP_ALERT_STATE_FILE:-/tmp/vidgen-openclaw-alert.state}"
DIRTY_REPO_STRATEGY="${DIRTY_REPO_STRATEGY:-stash}"
DIRTY_REPO_STASH_MESSAGE="${DIRTY_REPO_STASH_MESSAGE:-[vidgen-autosync] auto-stash before deploy}"
DIRTY_REPO_BACKUP_PREFIX="${DIRTY_REPO_BACKUP_PREFIX:-autosync-backup}"
TELEGRAM_ALERT_ENABLED="${TELEGRAM_ALERT_ENABLED:-0}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
TELEGRAM_ALERT_PREFIX="${TELEGRAM_ALERT_PREFIX:-[vidgen-autosync]}"
TELEGRAM_ALERT_MIN_INTERVAL_SEC="${TELEGRAM_ALERT_MIN_INTERVAL_SEC:-900}"
TELEGRAM_ALERT_STATE_FILE="${TELEGRAM_ALERT_STATE_FILE:-/tmp/vidgen-openclaw-telegram-alert.state}"

pick_writable_dir() {
  local candidate
  for candidate in "$@"; do
    [[ -n "$candidate" ]] || continue
    if mkdir -p "$candidate" >/dev/null 2>&1 && [[ -d "$candidate" && -w "$candidate" ]]; then
      printf "%s\n" "$candidate"
      return 0
    fi
  done
  return 1
}

resolve_writable_file_path() {
  local requested="$1"
  local fallback_dir="$2"
  local fallback_name="$3"
  local requested_dir
  requested_dir="$(dirname "$requested")"
  if mkdir -p "$requested_dir" >/dev/null 2>&1 && [[ -w "$requested_dir" ]]; then
    printf "%s\n" "$requested"
    return 0
  fi
  mkdir -p "$fallback_dir" >/dev/null 2>&1 || return 1
  printf "%s/%s\n" "$fallback_dir" "$fallback_name"
}

resolve_writable_dir_path() {
  local requested="$1"
  local fallback_dir="$2"
  if mkdir -p "$requested" >/dev/null 2>&1 && [[ -w "$requested" ]]; then
    printf "%s\n" "$requested"
    return 0
  fi
  mkdir -p "$fallback_dir" >/dev/null 2>&1 || return 1
  printf "%s\n" "$fallback_dir"
}

initialize_runtime_paths() {
  local fallback_root
  fallback_root="$(pick_writable_dir "${TMPDIR:-}" "/tmp" "/var/tmp" "${HOME:-}/.cache/vidgen-autosync" "${REPO_DIR}/.tmp")" \
    || fail "unable to find a writable temporary directory for autosync"

  LOCK_FILE="$(resolve_writable_file_path "$LOCK_FILE" "$fallback_root" "vidgen-openclaw-autosync.lock")" \
    || fail "unable to resolve writable lock file path"
  STATE_FILE="$(resolve_writable_file_path "$STATE_FILE" "$fallback_root" "vidgen-openclaw-autosync.state")" \
    || fail "unable to resolve writable state file path"
  WHATSAPP_ALERT_STATE_FILE="$(resolve_writable_file_path "$WHATSAPP_ALERT_STATE_FILE" "$fallback_root" "vidgen-openclaw-alert.state")" \
    || fail "unable to resolve writable WhatsApp alert state path"
  TELEGRAM_ALERT_STATE_FILE="$(resolve_writable_file_path "$TELEGRAM_ALERT_STATE_FILE" "$fallback_root" "vidgen-openclaw-telegram-alert.state")" \
    || fail "unable to resolve writable Telegram alert state path"
  WORKTREE_BASE="$(resolve_writable_dir_path "$WORKTREE_BASE" "$fallback_root/vidgen-autosync-worktrees")" \
    || fail "unable to resolve writable worktree base path"

  log "autosync temp paths lock=${LOCK_FILE} state=${STATE_FILE} worktrees=${WORKTREE_BASE}"
}

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

should_send_telegram_alert() {
  if [[ "$TELEGRAM_ALERT_ENABLED" != "1" ]]; then
    return 1
  fi
  if [[ -z "$TELEGRAM_BOT_TOKEN" || -z "$TELEGRAM_CHAT_ID" ]]; then
    return 1
  fi
  if [[ ! -f "$TELEGRAM_ALERT_STATE_FILE" ]]; then
    return 0
  fi

  local last_epoch current_epoch delta
  last_epoch="$(cat "$TELEGRAM_ALERT_STATE_FILE" 2>/dev/null || true)"
  if [[ -z "$last_epoch" ]]; then
    return 0
  fi
  current_epoch="$(now_epoch)"
  delta=$((current_epoch - last_epoch))
  if (( delta >= TELEGRAM_ALERT_MIN_INTERVAL_SEC )); then
    return 0
  fi
  return 1
}

mark_telegram_alert_sent() {
  now_epoch >"$TELEGRAM_ALERT_STATE_FILE" 2>/dev/null || true
}

send_telegram_alert() {
  local status="$1"
  local reason="$2"

  if ! should_send_telegram_alert; then
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    log "warning: failed to send telegram alert: curl not installed"
    return 0
  fi

  local host_name run_time message response
  host_name="$(hostname -s 2>/dev/null || hostname)"
  run_time="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  message="${TELEGRAM_ALERT_PREFIX} ${status}
host=${host_name}
branch=${BRANCH}
target_commit=${TARGET_COMMIT:-n/a}
deployed_commit=${DEPLOYED_COMMIT:-n/a}
time=${run_time}
reason=${reason}"

  response=$(curl -sS --max-time 20 \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${message}" \
    --data-urlencode "disable_web_page_preview=true" 2>&1) || {
    log "warning: failed to send telegram alert: ${response//$'\n'/ | }"
    return 0
  }

  if echo "$response" | grep -q '"ok":true'; then
    mark_telegram_alert_sent
    log "telegram alert sent (${status})"
    return 0
  fi

  log "warning: failed to send telegram alert: ${response//$'\n'/ | }"
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

  if ! cd "$PROJECT_DIR" 2>/dev/null; then
    log "warning: cannot enter PROJECT_DIR for whatsapp alert: $PROJECT_DIR"
    return 0
  fi

  local alert_output
  if alert_output=$(docker compose exec -T \
    -e OC_ALERT_CHANNEL="$WHATSAPP_ALERT_CHANNEL" \
    -e OC_ALERT_ACCOUNT="$WHATSAPP_ALERT_ACCOUNT" \
    -e OC_ALERT_TARGET="$WHATSAPP_ALERT_TARGET" \
    -e OC_ALERT_MESSAGE="$message" \
    "$OPENCLAW_SERVICE" sh -lc '
      set +e

      GW_TOKEN=$(node -e "const fs=require(\"fs\");let token=\"\";try{const cfg=JSON.parse(fs.readFileSync(\"/data/.openclaw/openclaw.json\",\"utf8\"));token=(cfg.gateway&&cfg.gateway.auth&&cfg.gateway.auth.token)||\"\";}catch(_){ }process.stdout.write(token);")

      send_with_account() {
        openclaw message send \
          --channel "$OC_ALERT_CHANNEL" \
          --account "$OC_ALERT_ACCOUNT" \
          --target "$OC_ALERT_TARGET" \
          --message "$OC_ALERT_MESSAGE"
      }

      send_with_account_token_flag() {
        openclaw --token "$GW_TOKEN" message send \
          --channel "$OC_ALERT_CHANNEL" \
          --account "$OC_ALERT_ACCOUNT" \
          --target "$OC_ALERT_TARGET" \
          --message "$OC_ALERT_MESSAGE"
      }

      send_with_account_token_env() {
        OPENCLAW_GATEWAY_TOKEN="$GW_TOKEN" openclaw message send \
          --channel "$OC_ALERT_CHANNEL" \
          --account "$OC_ALERT_ACCOUNT" \
          --target "$OC_ALERT_TARGET" \
          --message "$OC_ALERT_MESSAGE"
      }

      send_without_account() {
        openclaw message send \
          --channel "$OC_ALERT_CHANNEL" \
          --target "$OC_ALERT_TARGET" \
          --message "$OC_ALERT_MESSAGE"
      }

      send_without_account_token_flag() {
        openclaw --token "$GW_TOKEN" message send \
          --channel "$OC_ALERT_CHANNEL" \
          --target "$OC_ALERT_TARGET" \
          --message "$OC_ALERT_MESSAGE"
      }

      send_without_account_token_env() {
        OPENCLAW_GATEWAY_TOKEN="$GW_TOKEN" openclaw message send \
          --channel "$OC_ALERT_CHANNEL" \
          --target "$OC_ALERT_TARGET" \
          --message "$OC_ALERT_MESSAGE"
      }

      if [ -n "$OC_ALERT_ACCOUNT" ]; then
        OUT=$(send_with_account 2>&1)
        CODE=$?
        if [ "$CODE" -eq 0 ]; then
          printf "%s\n" "$OUT"
          exit 0
        fi

        if [ -n "$GW_TOKEN" ]; then
          OUT=$(send_with_account_token_flag 2>&1)
          CODE=$?
          if [ "$CODE" -eq 0 ]; then
            printf "%s\n" "$OUT"
            exit 0
          fi

          OUT=$(send_with_account_token_env 2>&1)
          CODE=$?
          if [ "$CODE" -eq 0 ]; then
            printf "%s\n" "$OUT"
            exit 0
          fi
        fi
      fi

      OUT=$(send_without_account 2>&1)
      CODE=$?
      if [ "$CODE" -ne 0 ] && [ -n "$GW_TOKEN" ]; then
        OUT=$(send_without_account_token_flag 2>&1)
        CODE=$?
      fi
      if [ "$CODE" -ne 0 ] && [ -n "$GW_TOKEN" ]; then
        OUT=$(send_without_account_token_env 2>&1)
        CODE=$?
      fi
      printf "%s\n" "$OUT" >&2
      exit "$CODE"
    ' 2>&1); then
    mark_alert_sent
    log "whatsapp alert sent (${status})"
  else
    log "warning: failed to send whatsapp alert: ${alert_output//$'\n'/ | }"
  fi
}

fail() {
  local reason="$1"
  log "$reason"
  send_whatsapp_alert "FAIL" "$reason"
  send_telegram_alert "FAIL" "$reason"
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
  send_telegram_alert "FAIL" "$reason"
  exit "$code"
}

trap 'on_error "$LINENO" "$BASH_COMMAND" "$?"' ERR

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "missing required command: $1"
  fi
}

ensure_git_safe_directory() {
  git config --global --add safe.directory "$REPO_DIR" >/dev/null 2>&1 || true
}

acquire_lock() {
  local lock_dir
  lock_dir="$(dirname "$LOCK_FILE")"
  mkdir -p "$lock_dir" >/dev/null 2>&1 || fail "cannot create lock directory: $lock_dir"

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
  node scripts/autonomy_preflight.js --mode vps
}

handle_dirty_repo() {
  local dirty
  dirty="$(git status --porcelain || true)"
  if [[ -z "$dirty" ]]; then
    return 0
  fi

  case "$DIRTY_REPO_STRATEGY" in
    fail)
      fail "repository has local changes; refusing auto-sync"
      ;;
    stash)
      local stamp stash_label
      stamp="$(date -u +%Y%m%dT%H%M%SZ)"
      stash_label="${DIRTY_REPO_STASH_MESSAGE} ${stamp}"
      if git stash push --include-untracked --message "$stash_label" >/dev/null; then
        log "repository had local changes; stashed before deploy (${stash_label})"
        return 0
      fi
      fail "failed to stash local changes before auto-sync"
      ;;
    reset)
      local stamp backup_branch
      stamp="$(date -u +%Y%m%dT%H%M%SZ)"
      backup_branch="${DIRTY_REPO_BACKUP_PREFIX}-${stamp}"
      git branch "$backup_branch" >/dev/null 2>&1 || true
      git reset --hard HEAD >/dev/null # security:allow optional reset strategy
      git clean -fd >/dev/null
      log "repository had local changes; reset worktree (backup branch: ${backup_branch})"
      ;;
    *)
      fail "invalid DIRTY_REPO_STRATEGY=${DIRTY_REPO_STRATEGY}; expected fail|stash|reset"
      ;;
  esac
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
      --repo-config /data/repos/vidgen/openclaw/openclaw.json || return 1

  docker compose exec -T "$OPENCLAW_SERVICE" \
    node /data/repos/vidgen/scripts/openclaw_sync_agent_templates.js \
      --openclaw-home "$OPENCLAW_HOME" || return 1
}

wait_for_openclaw_container_ready() {
  local max_attempts="${1:-20}"
  local sleep_sec="${2:-2}"
  local attempt

  for ((attempt = 1; attempt <= max_attempts; attempt += 1)); do
    if docker compose exec -T "$OPENCLAW_SERVICE" sh -lc "true" >/dev/null 2>&1; then
      log "openclaw container is ready (attempt ${attempt}/${max_attempts})"
      return 0
    fi
    sleep "$sleep_sec"
  done

  log "openclaw container did not become ready within ${max_attempts} attempts"
  return 1
}

run_optional_gateway_check() {
  local label="$1"
  shift
  local output

  if output=$(docker compose exec -T "$OPENCLAW_SERVICE" "$@" 2>&1); then
    log "gateway check passed: ${label}"
    return 0
  fi

  log "gateway check failed: ${label}: ${output//$'\n'/ | }"
  return 1
}

run_runtime_file_check() {
  local output
  if output=$(docker compose exec -T "$OPENCLAW_SERVICE" \
    node -e "const fs=require('fs');const p='${OPENCLAW_HOME}/openclaw.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));if(!j.agents||!Array.isArray(j.agents.list)||j.agents.list.length===0){throw new Error('agents.list missing or empty')}if(!j.agents.list.some((a)=>a&&a.id==='main')){throw new Error('main agent missing')}console.log('ok');" 2>&1); then
    log "runtime file check passed"
    return 0
  fi

  log "runtime file check failed: ${output//$'\n'/ | }"
  return 1
}

run_runtime_verify() {
  log "restarting $OPENCLAW_SERVICE and verifying health"
  cd "$PROJECT_DIR"

  docker compose restart "$OPENCLAW_SERVICE" >/dev/null || return 1
  sleep "$SLEEP_AFTER_RESTART" || return 1
  wait_for_openclaw_container_ready 20 2 || return 1

  run_runtime_file_check || return 1
  if [[ "$VERIFY_REQUIRE_GATEWAY" == "1" ]]; then
    run_optional_gateway_check "openclaw doctor" openclaw doctor || return 1
    run_optional_gateway_check "openclaw models status --agent main --check" openclaw models status --agent main --check || return 1
  else
    log "gateway checks disabled (VERIFY_REQUIRE_GATEWAY=0)"
  fi

  if [[ -n "$VERIFY_LOG_ERROR_PATTERN" ]] && docker compose logs --since 2m "$OPENCLAW_SERVICE" \
    | grep -Eiq "$VERIFY_LOG_ERROR_PATTERN"; then
    log "runtime verification failed due to error signatures in logs"
    return 1
  fi
}

rollback_runtime_config() {
  log "restoring runtime config from backup"
  cd "$PROJECT_DIR"
  wait_for_openclaw_container_ready 20 2 || true
  docker compose exec -T "$OPENCLAW_SERVICE" \
    sh -lc "cp \"$RUNTIME_BACKUP\" \"$OPENCLAW_HOME/openclaw.json\"" || return 1
  docker compose restart "$OPENCLAW_SERVICE" >/dev/null || return 1
  sleep "$SLEEP_AFTER_RESTART" || return 1
  wait_for_openclaw_container_ready 20 2 || return 1
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
  trap 'cd "$REPO_DIR" >/dev/null 2>&1 || true; git -C "$REPO_DIR" worktree remove --force "$worktree_dir" >/dev/null 2>&1 || true' RETURN
  run_repo_checks_at "$worktree_dir"
  cd "$REPO_DIR"
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
  prepare_runtime_backup || return 1
  run_runtime_apply || return 1
  run_runtime_verify || return 1
  mark_success "$DEPLOYED_COMMIT"
  log "sync complete on commit ${DEPLOYED_COMMIT}"
}

main() {
  require_cmd git
  require_cmd node
  require_cmd docker
  initialize_runtime_paths
  acquire_lock
  ensure_git_safe_directory

  cd "$REPO_DIR"
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    fail "REPO_DIR is not a git repository: $REPO_DIR"
  fi

  handle_dirty_repo

  local_current="$(git rev-parse HEAD)"
  last_success="$(read_last_success)"
  log "current commit: ${local_current}"
  log "last successful deployed commit: ${last_success:-none}"

  git fetch origin "$BRANCH" >/dev/null
  TARGET_COMMIT="$(git rev-parse "origin/${BRANCH}")"

  if [[ "$local_current" != "$TARGET_COMMIT" ]]; then
    log "new commit detected on ${BRANCH}: ${TARGET_COMMIT}"
    run_candidate_checks "$TARGET_COMMIT"
    cd "$REPO_DIR"
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
