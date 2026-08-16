#!/usr/bin/env bash
# Restauration d'une archive produite par pg-backup.sh (#194).
#
#   scripts/backup/pg-restore.sh --check --latest        # test à blanc (base jetable)
#   scripts/backup/pg-restore.sh --latest --yes          # restauration réelle
#   scripts/backup/pg-restore.sh /backups/skolr-....dump.enc
#
# Le mode --check restaure dans une base temporaire `<db>_restore_check`, y
# lance scripts/backup/row-census.sql puis supprime la base : il valide une
# archive sans toucher à la production. C'est ce mode qui doit tourner
# périodiquement — une sauvegarde jamais restaurée n'est pas une sauvegarde.
#
# Voir docs/ops/backup-restore.md (RPO/RTO, runbook).

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/common.sh"

archive=""
mode="restore"
assume_yes=0

usage() {
  cat >&2 <<'EOF'
Usage: pg-restore.sh [--check] [--yes] (--latest | <archive.dump.enc>)

  --check    Restaure dans une base jetable et affiche le recensement, sans
             toucher à la base cible.
  --yes      N'exige pas de confirmation interactive (restauration réelle).
  --latest   Prend l'archive la plus récente de $BACKUP_DIR.
EOF
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) mode="check" ;;
    --yes) assume_yes=1 ;;
    --latest) archive="$(latest_archive)" ;;
    -h | --help) usage ;;
    -*) die "Option inconnue: $1" ;;
    *) archive="$1" ;;
  esac
  shift
done

[[ -n "$archive" ]] || usage
[[ -f "$archive" ]] || die "Archive introuvable: $archive"

require_encryption_key
require_password

if [[ -f "$archive.sha256" ]]; then
  log "Vérification de l'empreinte SHA-256"
  ( cd "$(dirname "$archive")" && sha256sum -c "$(basename "$archive").sha256" >/dev/null ) ||
    die "Empreinte invalide: $archive est corrompue ou tronquée."
else
  log "AVERTISSEMENT: pas de fichier .sha256 à côté de $archive, intégrité non vérifiée."
fi

psql_admin() { psql --dbname postgres --quiet --no-psqlrc "$@"; }

if [[ "$mode" == "check" ]]; then
  target="${PGDATABASE}_restore_check"
  log "Test de restauration de $(basename "$archive") dans la base jetable $target"
  drop_target() { psql_admin -c "DROP DATABASE IF EXISTS \"$target\";" >/dev/null; }
  drop_target
  trap drop_target EXIT
  psql_admin -c "CREATE DATABASE \"$target\";" >/dev/null
else
  target="$PGDATABASE"
  log "Restauration de $(basename "$archive") dans la base $target sur $PGHOST:$PGPORT"
  log "Les objets existants de $target seront supprimés puis recréés."
  if [[ "$assume_yes" -eq 0 ]]; then
    read -r -p "Confirmer la restauration dans '$target' ? (tapez oui) " answer
    [[ "$answer" == "oui" ]] || die "Restauration annulée."
  fi
fi

started_at="$(date +%s)"

# L'archive n'est jamais déchiffrée sur disque : openssl écrit dans le tube et
# pg_restore lit stdin. --clean --if-exists rend la restauration rejouable sur
# une base déjà peuplée ; --no-owner / --no-privileges évitent d'exiger les
# rôles de la production sur le cluster cible.
set +e
decrypt_stream <"$archive" |
  pg_restore --dbname "$target" --clean --if-exists --no-owner --no-privileges --exit-on-error
status=("${PIPESTATUS[@]}")
set -e
[[ "${status[0]}" -eq 0 ]] || die "Déchiffrement impossible (BACKUP_ENCRYPTION_KEY incorrecte ?)."
[[ "${status[1]}" -eq 0 ]] || die "pg_restore a échoué sur $target."

duration=$(( $(date +%s) - started_at ))
log "Restauration terminée en ${duration}s"

log "Recensement de $target (à comparer à la base source) :"
psql --dbname "$target" --no-psqlrc -f "$script_dir/row-census.sql"

if [[ "$mode" == "check" ]]; then
  log "Base jetable $target supprimée. Archive validée."
fi
