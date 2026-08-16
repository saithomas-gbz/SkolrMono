# Supervision de la production

Ce que la production mesure, ce qui déclenche une alerte, et la conduite à tenir quand elle
se déclenche. Complète [backup-restore.md](backup-restore.md) : la supervision détecte
l'incident, la sauvegarde permet d'en sortir. Sans la première, le RTO d'1 h annoncé dans la
seconde ne veut rien dire — on ne répare pas ce qu'on n'a pas vu tomber.

## 1. Les trois sources, et pourquoi trois

| Source | Répond à la question | Portée |
|--------|----------------------|--------|
| **Sentry** | *Pourquoi* ça casse — trace, pile, requête fautive | Exceptions backend et frontend |
| **Prometheus** | *Combien* et *depuis quand* — volume, latence, tendance | Backend, hôte, PostgreSQL, sauvegardes |
| **Grafana** | *À quoi ça ressemble* — corrélation visuelle | Lecture des séries Prometheus |

Les deux premières ne sont pas redondantes : Sentry voit une exception isolée sans savoir si
elle touche 1 ou 10 000 requêtes ; Prometheus voit un taux de 5xx qui monte sans savoir de
quelle exception il s'agit. Un incident se diagnostique en passant de l'un à l'autre.

## 2. Métriques applicatives

Le backend expose ses métriques au format Prometheus, produites par
[`packages/backend/src/shared/metrics.ts`](../../packages/backend/src/shared/metrics.ts).

| Métrique | Type | Usage |
|----------|------|-------|
| `skolr_http_request_duration_seconds` | histogramme (`method`, `route`, `status_code`) | Latence, trafic et taux d'erreur — les trois se dérivent de cette seule métrique |
| `process_*`, `nodejs_*` | jauges/compteurs | CPU, mémoire, descripteurs, retard de la boucle d'événements |
| `pg_*` | via `postgres-exporter` | Connexions, transactions, taille des bases |
| `node_*` | via `node-exporter` | CPU, mémoire, disque de l'hôte |
| `skolr_backup_*` | via le collecteur textfile | Horodatage, durée et taille de la dernière sauvegarde réussie |

Un seul histogramme HTTP suffit : `_count` donne le trafic, la ventilation par `status_code`
donne le taux d'erreur, les buckets donnent les quantiles. Un compteur séparé ferait doublon.

### Deux points de conception

**Le label `route` est la route déclarée, pas le chemin appelé.** `/grade/grades/:id`, jamais
`/grade/grades/42`. Sans cette normalisation, chaque identifiant créerait une série
temporelle : la cardinalité exploserait, et n'importe qui pourrait saturer la mémoire de
Prometheus en appelant des URL aléatoires. Les requêtes ne correspondant à aucune route sont
regroupées sous `<no-route>`.

**Les métriques ne sont pas sur le port applicatif.** Elles décrivent la surface d'API, les
volumes de trafic et l'état mémoire du processus — ce n'est pas de la donnée publique. Elles
sont servies par un serveur HTTP distinct sur `METRICS_PORT` (9464), que les fichiers compose
ne publient **pas** sur l'hôte : seul Prometheus, depuis le réseau Docker, l'atteint.

Le code écoute sur `127.0.0.1` par défaut (`METRICS_HOST`). Sur une machine nue, `0.0.0.0`
exposerait les métriques sur toutes les interfaces, publique comprise s'il n'y a pas de
pare-feu. Les fichiers compose passent explicitement `METRICS_HOST=0.0.0.0`, parce qu'en
conteneur l'isolation vient du namespace réseau et non du bind. Même parti que `TRUST_PROXY` :
sûr par défaut, élargi seulement là où le contexte le justifie.

## 3. Accès aux interfaces

| Interface | Exposition | Accès |
|-----------|------------|-------|
| Grafana | Port `${GRAFANA_PORT}` publié | Navigateur, authentification obligatoire |
| Prometheus | Lié à `127.0.0.1:9090` sur le serveur | Tunnel SSH : `ssh -L 9090:127.0.0.1:9090 <serveur>` |
| `/metrics` du backend | Réseau Docker uniquement | `docker exec prometheus wget -qO- http://backend:9464/metrics` |

Prometheus n'a **aucune authentification** : le publier exposerait toutes les métriques et son
API d'administration. D'où la liaison à la boucle locale. Grafana, lui, est l'interface
destinée aux humains — il est publié, et `GF_SECURITY_ADMIN_PASSWORD` n'a donc pas de valeur
par défaut dans la stack de release, au même titre que les autres secrets.

Tableaux de bord provisionnés (`grafana/provisioning/dashboards/`) :

- **Skolr - Backend applicatif** — disponibilité, taux d'erreur, latence par quantile, routes
  les plus lentes, santé du processus, âge de la dernière sauvegarde.
- **Skolr - PostgreSQL Overview** — état de la base.

## 4. Alertes et conduite à tenir

Règles dans [`prometheus/alerts.yml`](../../prometheus/alerts.yml). Chaque règle porte une
annotation `runbook` : une alerte sans conduite à tenir finit ignorée.

| Alerte | Condition | Sévérité | Conduite à tenir |
|--------|-----------|----------|------------------|
| `BackendIndisponible` | `up{job="backend"} == 0` pendant 2 min | critique | `ps` puis `logs backend`. Redémarrage en boucle : vérifier `DATABASE_URL` et l'accès à Postgres. |
| `PostgresIndisponible` | `pg_up == 0` pendant 2 min | critique | Vérifier le conteneur et l'espace disque. **Ne pas restaurer** avant d'avoir écarté une panne de service : une restauration écrase des données peut-être intactes. |
| `TauxErreurServeurEleve` | > 5 % de 5xx pendant 5 min | majeure | Ventiler par `route`, puis croiser avec Sentry pour la trace. |
| `LatenceDegradee` | p95 > 1 s pendant 10 min | mineure | Comparer au lag de boucle d'événements et aux métriques Postgres. Latence haute **sans** lag pointe la base. |
| `SauvegardeEnRetard` | dernière réussite > 26 h, pendant 15 min | majeure | `docker logs skolr_db_backup`. Tant qu'elle est active, le RPO de 24 h n'est plus tenu. |
| `MetriquesSauvegardeAbsentes` | métrique absente pendant 1 h | majeure | Vérifier db-backup et la lecture de `/backups/metrics` par node-exporter. |
| `EspaceDisqueFaible` | < 10 % libre pendant 10 min | majeure | Le disque plein arrête Postgres **et** les sauvegardes ensemble. |

Le seuil de 26 h pour `SauvegardeEnRetard` laisse volontairement du jeu au-delà des 24 h
d'intervalle : sans cette marge, un simple décalage de quelques minutes entre deux exécutions
déclencherait une fausse alerte quotidienne. Une alerte qui crie à tort finit désactivée.

`MetriquesSauvegardeAbsentes` existe parce que `SauvegardeEnRetard` ne peut pas se déclencher
si la métrique n'est jamais publiée : l'absence de signal ne doit pas passer pour un bon
signal.

### Ce qui reste à faire

**Il n'y a pas encore de notification.** Les alertes s'évaluent et s'affichent dans Prometheus
(`/alerts`) et Grafana, mais rien ne les pousse vers un humain : ni Alertmanager, ni e-mail, ni
webhook. La détection est donc automatisée, l'acheminement non — quelqu'un doit regarder. C'est
la limite principale du dispositif actuel, et la première brique à ajouter (Alertmanager avec
un récepteur SMTP, les variables `SMTP_*` existant déjà pour l'e-mail transactionnel).

## 5. Vérifier que la supervision fonctionne

Une supervision qu'on ne teste pas se dégrade en silence, exactement comme une sauvegarde.

```bash
# Les cibles sont-elles toutes scrutées ?
curl -s localhost:9090/api/v1/targets | grep -o '"health":"[a-z]*"' | sort | uniq -c

# Les règles d'alerte sont-elles chargées ?
curl -s localhost:9090/api/v1/rules | grep -o '"name":"[A-Za-z]*"'

# Les métriques applicatives remontent-elles ?
curl -s 'localhost:9090/api/v1/query?query=skolr_http_request_duration_seconds_count' | head -c 300
```

Pour vérifier qu'une alerte se déclenche réellement, arrêter le backend
(`docker compose -f docker-compose.release.yml stop backend`) et attendre 2 min :
`BackendIndisponible` doit passer en `firing` dans `/alerts`.
