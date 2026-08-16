# Sauvegarde et restauration PostgreSQL

Stratégie de reprise des **données** de SkolrMono. Le rollback de **schéma** (migrations
Prisma) est un sujet distinct, encore manuel et suivi dans #168 ; ce document couvre ce qui se
passe quand ce sont les données elles-mêmes qui sont perdues : suppression accidentelle,
corruption applicative, perte du volume Docker, perte du serveur.

## 1. Objectifs de reprise

| Objectif | Cible | Ce qui la détermine |
|----------|-------|---------------------|
| **RPO** (perte de données maximale acceptée) | **24 h** | `BACKUP_INTERVAL_SECONDS` (86400 s par défaut) : au pire, l'incident survient juste avant la sauvegarde suivante. |
| **RTO** (délai de remise en service) | **1 h** | Détection de l'incident + décision + restauration. La restauration elle-même est la partie courte. |

Ces cibles correspondent à un établissement scolaire : perdre les saisies d'une journée est
coûteux mais rattrapable (les notes et les absences sont ressaisissables), tandis qu'une
indisponibilité de plusieurs heures bloque la vie scolaire.

**Pour descendre le RPO sous 24 h**, deux leviers, par ordre de coût croissant :

1. baisser `BACKUP_INTERVAL_SECONDS` (ex. `3600` pour un RPO d'1 h) — la sauvegarde est un
   `pg_dump` complet, le coût croît donc avec la taille de la base ;
2. passer à l'archivage WAL / réplication en continu (PITR), qui amène le RPO à quelques
   secondes. Non mis en place ici : voir [limites](#6-limites-connues).

## 2. Périmètre

Sauvegardé :

- **La base PostgreSQL complète** — tous les schémas du monolithe modulaire (`auth`,
  `class`, `grade`, `planning`, `message`, `notification`, `parent`, `billing`, `public`),
  y compris la table des migrations Prisma.

Non sauvegardé, et il faut le savoir avant l'incident :

- **Les pièces jointes de la messagerie** stockées dans MinIO (volume `minio_data`). Une
  restauration de la base rétablit les **métadonnées** des pièces jointes, pas les fichiers.
  La sauvegarde du bucket S3 reste à traiter.
- Les données de Sentry et de Prometheus/Grafana (observabilité, reconstructibles).

## 3. Mécanisme

Le service `db-backup` de `docker-compose.release.yml` exécute
[`scripts/backup/backup-loop.sh`](../../scripts/backup/backup-loop.sh) : une sauvegarde au
démarrage, puis une toutes les `BACKUP_INTERVAL_SECONDS`.

| Aspect | Choix |
|--------|-------|
| Outil | `pg_dump --format=custom` (restauration sélective possible, compression intégrée) |
| Chiffrement | `openssl enc -aes-256-cbc -pbkdf2 -iter 300000 -salt`, passphrase `BACKUP_ENCRYPTION_KEY` |
| Intégrité | Un `.sha256` par archive, vérifié avant toute restauration |
| Nommage | `<db>-<horodatage UTC>.dump.enc` — le tri alphabétique est le tri chronologique |
| Rétention | `BACKUP_RETENTION_DAYS` jours (14 par défaut), purge à chaque exécution |
| Destination | Volume Docker `backup_data`, monté sur `/backups` |

Deux points de conception qui comptent en exploitation :

- **Écriture atomique.** L'archive est écrite sous `.part` et renommée seulement si
  `pg_dump` *et* `openssl` sortent en succès. Une archive tronquée qui porterait un nom
  définitif serait pire qu'une archive absente : elle donnerait l'illusion d'une sauvegarde.
- **Un échec n'arrête pas le service.** L'erreur est journalisée
  (`docker logs skolr_db_backup`) et la sauvegarde suivante est tentée normalement. Sinon un
  incident transitoire sur Postgres supprimerait durablement *toutes* les sauvegardes
  suivantes.

### La clé de chiffrement

`BACKUP_ENCRYPTION_KEY` n'a pas de valeur par défaut : la stack de release refuse de démarrer
sans elle. Elle se génère une fois :

```bash
openssl rand -base64 48
```

**Elle doit être conservée ailleurs que sur le serveur sauvegardé** (gestionnaire de secrets,
coffre-fort de l'établissement). Une clé stockée à côté des archives ne protège de rien en cas
de vol du serveur, et une clé perdue rend l'intégralité des archives irrécupérable — il n'y a
pas de mécanisme de récupération.

### Copie hors site

Le volume `backup_data` vit sur le même hôte que `postgres_data` : il protège d'une
suppression de données, **pas** de la perte du serveur. La copie hors site est une étape à
part entière de l'exploitation :

```bash
docker run --rm -v skolrmono_backup_data:/backups:ro -v "$PWD/hors-site:/out" \
  alpine sh -c 'cp -a /backups/. /out/'
```

Les archives étant déjà chiffrées, la destination n'a pas besoin d'être de confiance.

## 4. Runbook — restauration après incident

Les scripts tournent dans un conteneur `postgres:15` branché sur `skolr_network` ; c'est la
forme utilisée ci-dessous pour ne dépendre d'aucun outil installé sur l'hôte.

```bash
# Raccourci réutilisé dans toutes les étapes
backup() {
  docker run --rm -it --network skolr_network \
    -e PGHOST=postgres -e PGUSER="$POSTGRES_USER" -e PGPASSWORD="$POSTGRES_PASSWORD" \
    -e PGDATABASE="$POSTGRES_DB" -e BACKUP_DIR=/backups \
    -e BACKUP_ENCRYPTION_KEY="$BACKUP_ENCRYPTION_KEY" \
    -v "$PWD/scripts/backup:/opt/backup:ro" -v skolrmono_backup_data:/backups \
    postgres:15 "$@"
}
```

1. **Constater et arrêter l'écriture.** Couper l'application pour ne pas empiler des écritures
   sur une base incohérente, et pour que la restauration ne se heurte pas à des connexions
   actives :

   ```bash
   docker compose -f docker-compose.release.yml stop backend frontend db-backup
   ```

2. **Choisir l'archive.** La plus récente est celle qu'on veut sauf si l'incident est une
   corruption ancienne — dans ce cas remonter avant la corruption :

   ```bash
   docker run --rm -v skolrmono_backup_data:/backups:ro alpine ls -lh /backups
   ```

3. **Valider l'archive avant de toucher à la production.** Le mode `--check` restaure dans une
   base jetable `<db>_restore_check`, affiche le recensement, puis supprime cette base :

   ```bash
   backup /opt/backup/pg-restore.sh --check --latest
   ```

   Si cette étape échoue, ne pas restaurer : passer à l'archive précédente. Une archive qui ne
   se restaure pas dans une base jetable ne se restaurera pas mieux en production.

4. **Restaurer.** Le script demande une confirmation explicite (`oui`), car la restauration
   supprime puis recrée les objets de la base cible :

   ```bash
   backup /opt/backup/pg-restore.sh --latest
   ```

5. **Vérifier.** Le script affiche le recensement de la base restaurée. Le comparer à celui de
   l'archive validée à l'étape 3 : mêmes nombres de tables et de lignes.

6. **Redémarrer et contrôler.**

   ```bash
   docker compose -f docker-compose.release.yml up -d
   docker compose -f docker-compose.release.yml ps   # tous healthy
   ```

   Puis une connexion applicative réelle et un écran de données (carnet de notes, planning).

7. **Consigner.** Date, archive utilisée, volume de données perdu (écart entre l'horodatage de
   l'archive et celui de l'incident), durée totale. C'est ce relevé qui permet de vérifier que
   le RPO et le RTO annoncés tiennent.

## 5. Test de restauration périodique

Une sauvegarde qui n'a jamais été restaurée n'est pas une sauvegarde. Le mode `--check` est
fait pour tourner **au moins une fois par mois** sans risque pour la production :

```bash
backup /opt/backup/pg-restore.sh --check --latest
```

Il vérifie l'empreinte SHA-256, le déchiffrement, la validité de l'archive `pg_dump`, et
affiche le recensement de la base reconstruite.

### Journal des tests

| Date | Scénario | Résultat |
|------|----------|----------|
| 2026-08-16 | `--check` sur archive du jour | 35 tables / 919 lignes, identique à la source |
| 2026-08-16 | Archive corrompue (1 octet modifié) | Rejetée à la vérification SHA-256, aucune restauration lancée |
| 2026-08-16 | `BACKUP_ENCRYPTION_KEY` erronée | Échec au déchiffrement, base jetable supprimée, base cible intacte |
| 2026-08-16 | Perte réelle : `DROP SCHEMA grade CASCADE` (35 → 27 tables, 919 → 789 lignes) puis restauration | Base rétablie à 35 tables / 919 lignes en 2 s |

La restauration mesurée à 2 s porte sur un jeu de développement (archive de 104 Ko). Elle
montre que la procédure est correcte, **pas** que le RTO d'1 h est tenu sur un volume de
production : ce chiffre est à re-mesurer sur des données réelles. À cette échelle, le RTO est
de toute façon dominé par la détection et la décision humaines, pas par `pg_restore`.

## 6. Limites connues

| Limite | Conséquence | Piste |
|--------|-------------|-------|
| Pas de PITR (archivage WAL) | RPO plancher = intervalle de sauvegarde | `archive_command` + `pgBackRest` ou WAL-G |
| Archives sur le même hôte que la base | Perte du serveur = perte des sauvegardes | Copie hors site (§3), à automatiser |
| Bucket MinIO non sauvegardé | Pièces jointes de la messagerie non récupérables | `mc mirror` vers un stockage distant |
| Test de restauration déclenché à la main | Dérive possible entre deux tests | Planifier `--check` (cron mensuel, ou job CI sur environnement dédié) |
| Conteneur `db-backup` exécuté en root | Archives appartenant à root dans le volume | Acceptable tant que le volume n'est pas partagé ; à revoir si le stockage devient mutualisé |

## 7. Utilisation hors stack de release

En développement, les scripts s'utilisent directement contre le Postgres local, sans le
service `db-backup` :

```bash
BACKUP_DIR=./backups PGHOST=localhost PGPASSWORD=postgres \
  BACKUP_ENCRYPTION_KEY=dev-only scripts/backup/pg-backup.sh

BACKUP_DIR=./backups PGHOST=localhost PGPASSWORD=postgres \
  BACKUP_ENCRYPTION_KEY=dev-only scripts/backup/pg-restore.sh --check --latest
```

Ils exigent `pg_dump` / `pg_restore` **15** et `openssl` sur la machine ; à défaut, passer par
un conteneur `postgres:15` comme dans le runbook.
