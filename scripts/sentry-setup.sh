#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SENTRY_DIR="${SENTRY_DIR:-$ROOT_DIR/infra/sentry/self-hosted}"
SENTRY_OVERRIDE="$ROOT_DIR/infra/sentry/docker-compose.override.yml"
SENTRY_PROJECT_NAME="${SENTRY_PROJECT_NAME:-skolr-sentry}"
SENTRY_VERSION="${SENTRY_VERSION:-}"

dc_sentry() {
  docker compose \
    --project-name "$SENTRY_PROJECT_NAME" \
    --project-directory "$SENTRY_DIR" \
    -f "$SENTRY_DIR/docker-compose.yml" \
    -f "$SENTRY_OVERRIDE" \
    "$@"
}

echo "SkolrMono: Sentry self-hosted setup"
echo "  Répertoire: $SENTRY_DIR"
echo "  Prérequis: Docker, ~16 Go RAM, ~20 Go disque libre"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "Erreur: docker introuvable." >&2
  exit 1
fi

if [[ ! -d "$SENTRY_DIR/.git" ]]; then
  echo "▶ Clone getsentry/self-hosted…"
  mkdir -p "$(dirname "$SENTRY_DIR")"
  git clone https://github.com/getsentry/self-hosted.git "$SENTRY_DIR"
fi

cd "$SENTRY_DIR"

if [[ -n "$SENTRY_VERSION" ]]; then
  echo "▶ Checkout $SENTRY_VERSION…"
  git fetch --tags origin
  git checkout "$SENTRY_VERSION"
else
  LATEST_TAG="$(git describe --tags "$(git rev-list --tags --max-count=1)")"
  echo "▶ Checkout dernière release ($LATEST_TAG)…"
  git fetch --tags origin
  git checkout "$LATEST_TAG"
fi

echo "▶ Réseau skolr_network (créé si la stack Skolr n’a pas encore tourné)…"
docker network inspect skolr_network >/dev/null 2>&1 || docker network create skolr_network

echo "▶ Installation Sentry (images, migrations — peut prendre 10–20 min)…"
./install.sh \
  --skip-user-creation \
  --no-report-self-hosted-issues \
  --skip-commit-check

SENTRY_ADMIN_EMAIL="${SENTRY_ADMIN_EMAIL:-admin@skolr.local}"
SENTRY_ADMIN_PASSWORD="${SENTRY_ADMIN_PASSWORD:-admin}"

echo "▶ Démarrage Sentry…"
dc_sentry up -d --wait

echo "▶ Création du compte admin ($SENTRY_ADMIN_EMAIL)…"
dc_sentry exec -T web sentry createuser \
  --email "$SENTRY_ADMIN_EMAIL" \
  --password "$SENTRY_ADMIN_PASSWORD" \
  --superuser \
  --no-input 2>/dev/null || echo "  (compte admin déjà existant ou création manuelle requise)"

SENTRY_PORT="${SENTRY_PORT:-9000}"
echo ""
echo "✓ Sentry self-hosted prêt."
echo "  UI:      http://localhost:${SENTRY_PORT}"
echo "  Login:   $SENTRY_ADMIN_EMAIL / $SENTRY_ADMIN_PASSWORD"
echo ""
echo "Prochaines étapes:"
echo "  1. Ouvrir l’UI et créer une organisation + un projet par service"
echo "  2. Copier les DSN dans .env à la racine :"
echo "     - Backend (conteneurs): http://<key>@skolr_sentry_nginx:80/<project_id>"
echo "     - Frontend (navigateur): http://<key>@localhost:${SENTRY_PORT}/<project_id>"
echo "  3. Relancer la stack Skolr: docker compose up -d"
echo ""
echo "Commandes utiles:"
echo "  bun run sentry:up    — démarrer Sentry"
echo "  bun run sentry:down  — arrêter Sentry"
