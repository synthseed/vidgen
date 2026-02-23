#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/docker/openclaw-jnqf/data/repos/vidgen}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SERVICE_NAME="vidgen-openclaw-autosync.service"
TIMER_NAME="vidgen-openclaw-autosync.timer"

SRC_SERVICE="${REPO_DIR}/ops/systemd/${SERVICE_NAME}"
SRC_TIMER="${REPO_DIR}/ops/systemd/${TIMER_NAME}"

if [[ ! -f "${SRC_SERVICE}" ]]; then
  echo "missing service file: ${SRC_SERVICE}" >&2
  exit 1
fi

if [[ ! -f "${SRC_TIMER}" ]]; then
  echo "missing timer file: ${SRC_TIMER}" >&2
  exit 1
fi

install -m 0644 "${SRC_SERVICE}" "${SYSTEMD_DIR}/${SERVICE_NAME}"
install -m 0644 "${SRC_TIMER}" "${SYSTEMD_DIR}/${TIMER_NAME}"

systemctl daemon-reload
systemctl enable --now "${TIMER_NAME}"

echo "installed ${SERVICE_NAME} and ${TIMER_NAME}"
systemctl status "${TIMER_NAME}" --no-pager

