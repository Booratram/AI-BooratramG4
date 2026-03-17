#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

prepare_repo

TARGET_SHA="${1:-${DEPLOY_TARGET_SHA:-}}"
if [[ -z "${TARGET_SHA}" ]]; then
  TARGET_SHA="$(read_state previous.sha)"
fi

if [[ -z "${TARGET_SHA}" ]]; then
  fail 'Rollback target is missing; pass a SHA or ensure previous.sha exists in .deploy-state'
fi

TARGET_SHA="$(resolve_target_sha "${TARGET_SHA}")"
rollback_release "${TARGET_SHA}"
log "Rollback successful: ${TARGET_SHA}"