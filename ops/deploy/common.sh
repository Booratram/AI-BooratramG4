#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${DEPLOY_STATE_DIR:-${REPO_ROOT}/.deploy-state}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.prod.yml}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
BACKEND_HEALTH_URL="${DEPLOY_BACKEND_HEALTH_URL:-http://127.0.0.1:3003/api/health}"
FRONTEND_HEALTH_URL="${DEPLOY_FRONTEND_HEALTH_URL:-http://127.0.0.1:8080}"
HEALTH_TIMEOUT_SECONDS="${DEPLOY_HEALTH_TIMEOUT_SECONDS:-120}"

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

read_state() {
  local name="$1"
  local path="${STATE_DIR}/${name}"
  if [[ -f "${path}" ]]; then
    tr -d '\r\n' < "${path}"
  fi
}

write_state() {
  local name="$1"
  local value="$2"
  mkdir -p "${STATE_DIR}"
  printf '%s\n' "${value}" > "${STATE_DIR}/${name}"
}

delete_state() {
  local name="$1"
  rm -f "${STATE_DIR}/${name}"
}

prepare_repo() {
  ensure_command git
  ensure_command docker
  ensure_command curl

  cd "${REPO_ROOT}"
  git fetch origin --tags
}

resolve_target_sha() {
  local target="${1:-}"
  if [[ -n "${target}" ]]; then
    git rev-parse "${target}^{commit}"
    return
  fi

  git rev-parse "origin/${DEPLOY_BRANCH}^{commit}"
}

checkout_sha() {
  local sha="$1"
  log "Checking out ${sha}"
  git checkout --force --detach "${sha}"
}

compose_prod() {
  docker compose -f "${COMPOSE_FILE}" "$@"
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))

  while (( SECONDS < deadline )); do
    if curl --fail --silent --show-error "${url}" >/dev/null; then
      log "${name} is healthy: ${url}"
      return 0
    fi
    sleep 3
  done

  return 1
}

deploy_compose() {
  local sha="$1"
  checkout_sha "${sha}"
  log 'Building production images'
  compose_prod build
  log 'Starting production stack'
  compose_prod up -d --remove-orphans
}

verify_release() {
  log 'Waiting for backend healthcheck'
  wait_for_http 'backend' "${BACKEND_HEALTH_URL}" || return 1
  log 'Waiting for frontend healthcheck'
  wait_for_http 'frontend' "${FRONTEND_HEALTH_URL}" || return 1
}

mark_success() {
  local sha="$1"
  local previous="${2:-}"

  write_state current.sha "${sha}"
  write_state last_success.sha "${sha}"
  if [[ -n "${previous}" ]]; then
    write_state previous.sha "${previous}"
  fi
  delete_state last_failed.sha
}

mark_failure() {
  local sha="$1"
  write_state last_failed.sha "${sha}"
}

rollback_release() {
  local sha="$1"
  local previous_current
  previous_current="$(read_state current.sha)"

  log "Rolling back to ${sha}"
  deploy_compose "${sha}"
  verify_release || fail "Rollback healthcheck failed for ${sha}"
  mark_success "${sha}" "${previous_current}"
  write_state last_rollback.sha "${sha}"
}