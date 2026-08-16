#!/usr/bin/env bash
# Point d'entrée du service `db-backup` de docker-compose.release.yml (#194).
#
# L'image postgres ne fournit pas de cron ; la planification est donc une simple
# boucle : sauvegarde, puis attente de $BACKUP_INTERVAL_SECONDS. C'est ce qui
# fixe le RPO (24 h par défaut) — voir docs/ops/backup-restore.md.
#
# Une sauvegarde en échec n'arrête pas le service : elle est journalisée
# (`docker logs skolr_db_backup`) et la suivante est retentée à l'intervalle
# normal. Sinon un incident transitoire sur Postgres supprimerait durablement
# toute sauvegarde ultérieure.

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$script_dir/common.sh"

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"

require_encryption_key
require_password

log "Service de sauvegarde démarré (intervalle ${BACKUP_INTERVAL_SECONDS}s, rétention ${BACKUP_RETENTION_DAYS}j)"

# `sleep` en tâche de fond + `wait` : sans ça, un `docker compose down` attendrait
# la fin du sleep (jusqu'à 24 h) avant que le conteneur ne reçoive le SIGKILL.
trap 'log "Arrêt demandé, sortie du service de sauvegarde"; exit 0' TERM INT

while true; do
  "$script_dir/pg-backup.sh" ||
    log "AVERTISSEMENT: la sauvegarde a échoué, nouvelle tentative dans ${BACKUP_INTERVAL_SECONDS}s"
  sleep "$BACKUP_INTERVAL_SECONDS" &
  wait $!
done
