#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/docker/openclaw-jnqf/data/repos/vidgen}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SERVICE_NAME="vidgen-openclaw-autosync.service"
TIMER_NAME="vidgen-openclaw-autosync.timer"
ENABLE_TIMER="${ENABLE_TIMER:-0}"
ENV_TARGET="${ENV_TARGET:-/etc/default/vidgen-openclaw-autosync}"

SRC_SERVICE="${REPO_DIR}/ops/systemd/${SERVICE_NAME}"
SRC_TIMER="${REPO_DIR}/ops/systemd/${TIMER_NAME}"
SRC_ENV_EXAMPLE="${REPO_DIR}/ops/systemd/vidgen-openclaw-autosync.env.example"

if [[ ! -f "${SRC_SERVICE}" ]]; then
  echo "missing service file: ${SRC_SERVICE}" >&2
  exit 1
fi

if [[ ! -f "${SRC_TIMER}" ]]; then
  echo "missing timer file: ${SRC_TIMER}" >&2
  exit 1
fi

if [[ ! -f "${SRC_ENV_EXAMPLE}" ]]; then
  echo "missing env example file: ${SRC_ENV_EXAMPLE}" >&2
  exit 1
fi

install -m 0644 "${SRC_SERVICE}" "${SYSTEMD_DIR}/${SERVICE_NAME}"
install -m 0644 "${SRC_TIMER}" "${SYSTEMD_DIR}/${TIMER_NAME}"

if [[ ! -f "${ENV_TARGET}" ]]; then
  install -m 0600 "${SRC_ENV_EXAMPLE}" "${ENV_TARGET}"
  echo "installed env template: ${ENV_TARGET}"
  echo "edit ${ENV_TARGET} to set DIRTY_REPO_STRATEGY=stash and optional Telegram/WhatsApp alerts."
fi

systemctl daemon-reload
if [[ "${ENABLE_TIMER}" == "1" ]]; then
  systemctl enable --now "${TIMER_NAME}"
  echo "installed ${SERVICE_NAME} and enabled ${TIMER_NAME}"
  systemctl status "${TIMER_NAME}" --no-pager
else
  systemctl disable --now "${TIMER_NAME}" >/dev/null 2>&1 || true
  echo "installed ${SERVICE_NAME}. timer not enabled (event-driven mode)."
  echo "to enable fallback polling timer: ENABLE_TIMER=1 bash ${REPO_DIR}/scripts/install_vps_autosync_systemd.sh"
fi
