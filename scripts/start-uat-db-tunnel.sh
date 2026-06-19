#!/usr/bin/env bash
# UAT MySQL tunnel — same path as: jb → gg StgUat → mysqlu
# Playwright reads DB via 127.0.0.1:3307 (not your interactive mysql session).
#
# Setup once in .env (see .env.uat.example):
#   UAT_JUMPBOX_PASSWORD=<same password jb uses>
#   DB_USE_UAT=true
#   UAT_DB_HOST=127.0.0.1
#   UAT_DB_PORT=3307
#   UAT_DB_USER=root
#   UAT_DB_PASSWORD=uniware
#   UAT_DB_NAME=uniware
#
# Usage: npm run db:tunnel   (keep terminal open)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(UAT_|DB_USE_UAT)' "$ROOT_DIR/.env" | sed 's/\r$//')
  set +a
fi

LOCAL_PORT="${UAT_TUNNEL_LOCAL_PORT:-3307}"
JUMPBOX="${UAT_JUMPBOX:-jumpbox.unicommerce.com}"
STGUAT_HOST="${UAT_APP_HOST:-app1.stguat}"
SSH_USER="${UAT_SSH_USER:-apoorav.sharma01}"
MYSQL_REMOTE_HOST="${UAT_MYSQL_HOST:-127.0.0.1}"
MYSQL_REMOTE_PORT="${UAT_MYSQL_PORT:-3306}"

echo ""
echo "=== UAT DB tunnel (jb-style) ==="
echo "Local:  127.0.0.1:${LOCAL_PORT}  →  StgUat MySQL"
echo "Path:   ${SSH_USER}@${JUMPBOX} → ${SSH_USER}@${STGUAT_HOST}"
echo ""
echo "Keep this terminal open while running regression."
echo "Verify: npm run db:diagnose"
echo ""

SSH_BASE=(
  ssh
  -o ServerAliveInterval=60
  -o StrictHostKeyChecking=accept-new
  -J "${SSH_USER}@${JUMPBOX}"
  "${SSH_USER}@${STGUAT_HOST}"
  -L "127.0.0.1:${LOCAL_PORT}:${MYSQL_REMOTE_HOST}:${MYSQL_REMOTE_PORT}"
  -N
)

if [[ -n "${UAT_JUMPBOX_PASSWORD:-}" ]] && command -v sshpass >/dev/null 2>&1; then
  echo "Using sshpass (same auth style as jb alias)."
  export SSHPASS="${UAT_JUMPBOX_PASSWORD}"
  exec sshpass -e "${SSH_BASE[@]}"
fi

if [[ -n "${UAT_JUMPBOX_PASSWORD:-}" ]] && ! command -v sshpass >/dev/null 2>&1; then
  echo "UAT_JUMPBOX_PASSWORD is set but sshpass not found."
  echo "Install: brew install sshpass"
  echo "Or run without password (SSH keys)."
  exit 1
fi

echo "Tip: add UAT_JUMPBOX_PASSWORD to .env (same as jb) to skip password prompts."
exec "${SSH_BASE[@]}"
