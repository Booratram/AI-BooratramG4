#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

prepare_repo

TARGET_SHA="$(resolve_target_sha "${1:-${DEPLOY_TARGET_SHA:-}}")"
PREVIOUS_SHA="$(read_state current.sha)"
if [[ -z "${PREVIOUS_SHA}" ]]; then
  PREVIOUS_SHA="$(git rev-parse HEAD)"
fi

write_state last_attempt.sha "${TARGET_SHA}"
log "Deploy target: ${TARGET_SHA}"

if [[ "${PREVIOUS_SHA}" == "${TARGET_SHA}" ]]; then
  log 'Target SHA already deployed; rebuilding stack to ensure configuration is current'
fi

if deploy_compose "${TARGET_SHA}" && verify_release; then
  mark_success "${TARGET_SHA}" "${PREVIOUS_SHA}"
  log "Deployment successful: ${TARGET_SHA}"
  exit 0
fi

mark_failure "${TARGET_SHA}"
log "Deployment failed for ${TARGET_SHA}"

if [[ "${DEPLOY_AUTO_ROLLBACK:-true}" == 'true' ]] && [[ -n "${PREVIOUS_SHA}" ]] && [[ "${PREVIOUS_SHA}" != "${TARGET_SHA}" ]]; then
  log "Attempting automatic rollback to ${PREVIOUS_SHA}"
  rollback_release "${PREVIOUS_SHA}"
  fail "Deployment failed and automatic rollback restored ${PREVIOUS_SHA}"
fi

fail 'Deployment failed; rollback was not executed'