#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SENTRY_DIR="${SENTRY_DIR:-$ROOT_DIR/infra/sentry/self-hosted}"
SENTRY_OVERRIDE="$ROOT_DIR/infra/sentry/docker-compose.override.yml"
SENTRY_PROJECT_NAME="${SENTRY_PROJECT_NAME:-skolr-sentry}"

if [[ ! -d "$SENTRY_DIR" ]]; then
  echo "Sentry n’est pas installé." >&2
  exit 1
fi

docker compose \
  --project-name "$SENTRY_PROJECT_NAME" \
  --project-directory "$SENTRY_DIR" \
  -f "$SENTRY_DIR/docker-compose.yml" \
  -f "$SENTRY_OVERRIDE" \
  down

echo "✓ Sentry arrêté."
