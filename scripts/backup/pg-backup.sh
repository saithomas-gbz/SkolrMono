#!/usr/bin/env bash
# Sauvegarde chiffrée de la base PostgreSQL de SkolrMono (#194).
#
#   BACKUP_ENCRYPTION_KEY=... PGPASSWORD=... scripts/backup/pg-backup.sh
#
# Produit dans $BACKUP_DIR :
#   skolr-<db>-<horodatage UTC>.dump.enc          dump `pg_dump -Fc` chiffré AES-256
#   skolr-<db>-<horodatage UTC>.dump.enc.sha256   empreinte de l'archive chiffrée
#
# Puis purge les archives de plus de $BACKUP_RETENTION_DAYS jours.
# Voir docs/ops/backup-restore.md (RPO/RTO, runbook, restauration).

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

require_encryption_key
require_password

mkdir -p "$BACKUP_DIR"
[[ -w "$BACKUP_DIR" ]] || die "$BACKUP_DIR n'est pas accessible en écriture."

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
archive="$BACKUP_DIR/${ARCHIVE_PREFIX}${timestamp}${ARCHIVE_SUFFIX}"
partial="$archive.part"

# Une archive tronquée est pire qu'une archive absente : elle donnerait
# l'illusion d'une sauvegarde. On écrit donc dans .part, et on ne publie le nom
# définitif qu'une fois pg_dump ET openssl sortis en succès (set -o pipefail).
cleanup_partial() { rm -f "$partial"; }
trap cleanup_partial EXIT

log "Sauvegarde de $PGDATABASE depuis $PGHOST:$PGPORT vers $archive"
started_at="$(date +%s)"

# -Fc : format custom, restaurable table par table et déjà compressé.
# --no-owner / --no-privileges : l'archive se restaure sur un cluster neuf dont
# les rôles n'ont pas les mêmes noms qu'en production.
pg_dump --format=custom --no-owner --no-privileges | encrypt_stream >"$partial"

mv "$partial" "$archive"
trap - EXIT

( cd "$BACKUP_DIR" && sha256sum "$(basename "$archive")" >"$(basename "$archive").sha256" )

size="$(du -h "$archive" | cut -f1)"
log "Sauvegarde terminée en $(( $(date +%s) - started_at ))s ($size)"

log "Purge des archives de plus de $BACKUP_RETENTION_DAYS jours"
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name "${ARCHIVE_PREFIX}*${ARCHIVE_SUFFIX}" -o -name "${ARCHIVE_PREFIX}*${ARCHIVE_SUFFIX}.sha256" \) \
  -mtime "+$BACKUP_RETENTION_DAYS" -print -delete

retained="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${ARCHIVE_PREFIX}*${ARCHIVE_SUFFIX}" | wc -l)"
log "$retained archive(s) conservée(s) dans $BACKUP_DIR"

# Métriques pour le collecteur textfile de node-exporter (#218). Écrites en
# toute fin de script, donc seulement en cas de succès complet : c'est
# l'horodatage de la dernière sauvegarde *réussie* que l'alerte surveille, pas
# celui de la dernière tentative.
metrics_dir="$BACKUP_DIR/metrics"
mkdir -p "$metrics_dir"
cat >"$metrics_dir/skolr_backup.prom.tmp" <<EOF
# HELP skolr_backup_last_success_timestamp_seconds Horodatage Unix de la dernière sauvegarde réussie.
# TYPE skolr_backup_last_success_timestamp_seconds gauge
skolr_backup_last_success_timestamp_seconds $(date +%s)
# HELP skolr_backup_last_duration_seconds Durée de la dernière sauvegarde réussie.
# TYPE skolr_backup_last_duration_seconds gauge
skolr_backup_last_duration_seconds $(( $(date +%s) - started_at ))
# HELP skolr_backup_last_size_bytes Taille de la dernière archive produite.
# TYPE skolr_backup_last_size_bytes gauge
skolr_backup_last_size_bytes $(stat -c %s "$archive")
# HELP skolr_backup_archives_total Nombre d'archives conservées après purge.
# TYPE skolr_backup_archives_total gauge
skolr_backup_archives_total $retained
EOF
# Renommage atomique : node-exporter peut lire le répertoire à tout instant, il
# ne doit jamais tomber sur un fichier à moitié écrit (et il ignore le .tmp).
mv "$metrics_dir/skolr_backup.prom.tmp" "$metrics_dir/skolr_backup.prom"
