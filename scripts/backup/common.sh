#!/usr/bin/env bash
# Fonctions et configuration partagées par les scripts de sauvegarde (#194).
# Sourcé, jamais exécuté directement.

set -euo pipefail

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-skolr}"
export PGHOST PGPORT PGUSER PGDATABASE

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Préfixe commun à toutes les archives : sert au tri (`--latest`) et à la purge.
ARCHIVE_PREFIX="${PGDATABASE}-"
ARCHIVE_SUFFIX=".dump.enc"

log() {
  printf '%s [backup] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

die() {
  printf '%s [backup] ERREUR: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >&2
  exit 1
}

# La clé de chiffrement n'est jamais passée en argument de commande (elle serait
# visible dans `ps`) : openssl la lit dans l'environnement via `-pass env:`.
require_encryption_key() {
  [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]] ||
    die "BACKUP_ENCRYPTION_KEY est requis (voir .env.example et docs/ops/backup-restore.md)."
  export BACKUP_ENCRYPTION_KEY
}

require_password() {
  [[ -n "${PGPASSWORD:-}" ]] || die "PGPASSWORD est requis pour joindre $PGUSER@$PGHOST:$PGPORT."
  export PGPASSWORD
}

# AES-256-CBC + dérivation PBKDF2 : la passphrase brute n'est jamais utilisée
# telle quelle comme clé, et chaque archive a son propre sel.
openssl_args=(enc -aes-256-cbc -md sha512 -pbkdf2 -iter 300000 -salt -pass env:BACKUP_ENCRYPTION_KEY)

encrypt_stream() { openssl "${openssl_args[@]}"; }
decrypt_stream() { openssl "${openssl_args[@]}" -d; }

latest_archive() {
  local newest
  newest="$(find "$BACKUP_DIR" -maxdepth 1 -type f \
    -name "${ARCHIVE_PREFIX}*${ARCHIVE_SUFFIX}" -print 2>/dev/null | sort | tail -n 1)"
  [[ -n "$newest" ]] || die "Aucune archive ${ARCHIVE_PREFIX}*${ARCHIVE_SUFFIX} dans $BACKUP_DIR."
  printf '%s\n' "$newest"
}
