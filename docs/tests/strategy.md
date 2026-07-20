# Stratégie de tests — backend + e2e (#146)

> État des lieux et stratégie de test du monolithe Skolr, produit pour la soutenance RNCP 39583 : couverture backend chiffrée, un parcours e2e « happy path » par rôle, et ce qui est volontairement mocké (ou non) à chaque étage.

| Champ | Valeur |
|-------|--------|
| Périmètre | Backend Fastify (tests unitaires `bun:test`), parcours e2e Playwright (`packages/e2e`) |
| Version | 1.0.0 |
| Date | 2026-07-19 |
| Méthode | Exécution réelle de `bun run test:coverage` et de la suite Playwright complète, revue des specs existantes, ajout ciblé sur les trous de couverture évidents |
| Hors scope | Tests unitaires frontend (aucun en CI actuellement — voir Perspectives), tests de charge, pentest (voir `docs/security/audit.md`) |

---

## Pyramide de tests

```
        e2e (Playwright)         14 specs, ~43 tests — 1 parcours "happy path" par rôle
      ─────────────────────
   tests unitaires (bun:test)     53 fichiers, 409 tests — logique métier par module
```

Deux étages, volontairement : pas de couche d'intégration séparée (ex. tests de contrat entre modules avec une vraie base éphémère mais sans navigateur). Le monolithe modulaire partage un seul process et une seule base Postgres multi-schema ; les tests unitaires couvrent la logique de chaque module en isolation (Prisma mocké), et les tests e2e couvrent les parcours utilisateur de bout en bout contre une vraie stack (Postgres + backend + frontend). Ce choix est documenté ici comme délibéré, pas comme un angle mort.

---

## Portée unitaire (backend)

**Chiffres réels** (`NODE_ENV=test bun run test:coverage`, `packages/backend`) :

| Indicateur | Valeur |
|---|---|
| Fichiers de test | 53 |
| Tests | 409 (0 échec) |
| Couverture fonctions | 82.92 % |
| Couverture lignes | 87.33 % |
| Seuil CI | Non bloquant pour l'instant (voir ci-dessous) |

### Ce qui est mocké, et pourquoi

- **Base de données** : `src/shared/db.ts` remplace `db` par un stub `{}` quand `NODE_ENV === 'test'` (commentaire dans le code : *« Replaced by mocks in unit tests »*). Aucun test unitaire ne touche une vraie base — chaque fichier de test mocke Prisma finement via `mock.module('.../shared/db', () => ({ default: { ... } }))` (et `mock.module('.../generated/prisma/client', ...)` quand le contrôleur instancie directement `PrismaClient`). Objectif : tests rapides et déterministes, sans dépendance à Postgres.
- **Piège `mock.module` process-global** : chez Bun, `mock.module` remplace le module pour **tout le process de test**, pas seulement le fichier courant. Plusieurs fichiers (ex. `gradeController.test.ts`) réancrent donc explicitement leurs mocks (`shared/events`, `classServiceClient`, …) pour ne pas dépendre de l'ordre de chargement des fichiers de la suite — un mock voisin qui répond différemment peut sinon casser des assertions apparemment sans rapport.

### Trous comblés dans cette itération (issue #146)

Priorité donnée aux fichiers réellement non couverts (vérifié par une exécution de `--coverage`, pas seulement par absence de fichier `*.test.ts` — plusieurs fichiers sans test dédié étaient déjà exercés indirectement via les tests de contrôleurs, ex. `auth/lib/rgpdService.ts` déjà à 100 %/100 % avant cette itération) :

| Fichier | Avant | Après | Test ajouté |
|---|---|---|---|
| `grade/controllers/bulletinController.ts` | 0 % / 4 % | 100 % / 100 % | `grade/__tests__/bulletinController.test.ts` |
| `grade/controllers/topicController.ts` | 0 % / 10 % | 100 % / 100 % | `grade/__tests__/topicController.test.ts` |
| `auth/service.ts` | 50 % / 70 % | 100 % / 100 % | `auth/__tests__/service.test.ts` |
| `grade/service.ts` (branche RGPD non exercée) | 100 % / 69 % | 100 % / 100 % | `grade/__tests__/service.test.ts` |

`bulletinController.ts` (génération de bulletins PDF, 203 lignes) était le plus gros fichier non testé du backend — jusqu'ici uniquement exercé indirectement via les specs e2e `bulletin-api.spec.ts`/`bulletin-ui.spec.ts`, sans isolation unitaire.

### Décision différée : tests de routes

La couverture au niveau routes (enregistrement Fastify) est déjà incohérente avant #146 (1/4 fichiers de routes testés côté auth, 1/7 côté grade) — ce n'est pas une convention établie. Décision explicite pour cette itération : ne pas l'étendre (« trous évidents », pas couverture exhaustive). À trancher en équipe si la convention doit devenir obligatoire.

---

## Portée e2e (Playwright)

Contrairement aux tests unitaires, **la base n'est pas mockée** : la suite tourne contre une vraie stack (Postgres + MinIO + backend, démarrés via `docker compose`, migrés et seedés via `bun run db:run:stack`). C'est un choix délibéré et complémentaire à l'étage unitaire : les tests e2e valident l'intégration réelle (auth, routing, appels API réseau, rendu Vue), pas la logique métier isolée.

### Les 4 parcours « happy path » par rôle (issue #146)

| Rôle | Spec | Login → action clé |
|---|---|---|
| Enseignant | `statistics-walkthrough.spec.ts` | Consulter la moyenne de classe sur le dashboard → détail des statistiques par matière |
| Élève | `student-walkthrough.spec.ts` | Consulter son carnet de notes (`/grades/my-grades`), avec un compte ayant de vraies notes (persona `user`, pas la persona tout-ABSENT `student`) |
| Administrateur | `admin-walkthrough.spec.ts` | Consulter le dashboard (widget assiduité) → liste des utilisateurs (`/admin/users`) |
| Parent | `parent-walkthrough.spec.ts` | Consulter la fiche enfant sur le dashboard → absences de cet enfant (`/parent/absences`) |

Ces 4 specs sont volontairement en lecture seule (aucune mutation) pour rester rapides et sans effet de bord sur les données seedées.

### Autres specs (complémentaires, pas le parcours canonique par rôle)

`auth.spec.ts`, `bulletin-api.spec.ts`, `bulletin-ui.spec.ts`, `dashboard.spec.ts`, `messaging.spec.ts`, `notifications.spec.ts`, `planning-walkthrough.spec.ts`, `rgpd.spec.ts`, `session-expiry.spec.ts`, `statistics.spec.ts` — matrices de contrôle d'accès, cas d'erreur, et fonctionnalités transverses (RGPD, expiration de session, messagerie).

**Chiffres réels** (suite complète, `bunx playwright test`) : 14 fichiers de specs, 43 tests, tous verts en exécution séquentielle (`--workers=1`).

### Limitation connue : parallélisme vs. rate-limiting

En exécution parallèle (4 workers, défaut CI), `rgpd.spec.ts` et `session-expiry.spec.ts` échouent de façon intermittente (login qui n'aboutit jamais, reste sur `/auth/login`) — non reproductible en exécution séquentielle. Cause probable : le rate-limiting introduit par la passe de durcissement sécurité (#144, `docs/security/audit.md` R1 — 30 req/min sur `/auth/login`) combiné à plusieurs workers qui réutilisent les mêmes comptes de démo en peu de temps. Non lié aux changements de #146 (reproductible sur `main` avant cette itération). À investiguer séparément : soit desserrer la limite en environnement e2e, soit isoler les comptes par worker.

---

## CI

- **`backend.yml`** : `bun run test:coverage` (au lieu de `bun test src`) + upload de l'artefact `backend-coverage` (7 jours de rétention, format `lcov` + résumé texte dans les logs). Non bloquant pour l'instant — voir seuil ci-dessous.
- **`e2e.yml`** : déjà en place, exécute la suite Playwright complète contre la stack Docker seedée et publie l'artefact `playwright-report`. Aucune modification nécessaire pour #146 — les 3 nouvelles specs + la spec renommée sont ramassées automatiquement (glob sur `packages/e2e/tests/`).

Les deux workflows sont déclenchés indépendamment (filtres de chemin différents) : une PR touchant backend et e2e déclenche les deux, mais il n'existe pas de gate unifiée au-delà des règles de protection de branche.

### Seuil de couverture

Pas de seuil bloquant (`coverageThreshold`) pour cette itération : une partie significative du backend était à 0 % avant les correctifs ci-dessus (`bulletinController.ts` notamment), fixer un seuil global élevé aurait soit cassé la CI immédiatement, soit poussé à écrire des tests de faible valeur juste pour l'atteindre. La CI reporte désormais la couverture réelle à chaque run (artefact + log) ; un seuil plancher (régression, pas aspiration) est une suite logique une fois quelques runs de référence accumulés.

---

## Perspectives (hors scope de #146)

- **Tests unitaires frontend** : aucun en CI actuellement (`frontend.yaml` ne fait que build + vérification i18n + build Docker).
- **Seuil de couverture bloquant** : à fixer après quelques runs CI réels (voir ci-dessus).
- **Tests de routes systématiques** : convention à trancher en équipe (actuellement incohérente, voir plus haut).
- **Parcours e2e mutants pour admin/parent** : « inviter un utilisateur » (admin, `/admin/users`) et « déposer une justification d'absence » (parent, `/parent/justifications`) sont des extensions naturelles des 2 nouveaux parcours, non retenues ici pour rester non-mutantes et rapides.
- **Flake parallélisme e2e vs. rate-limiting** (voir ci-dessus) : à investiguer indépendamment de #146.

---

## Vérification

- `cd packages/backend && NODE_ENV=test bun run test:coverage` → **409 tests, 0 échec**, couverture globale **82.92 % fonctions / 87.33 % lignes** (53 fichiers de test).
- `cd packages/e2e && bunx playwright test --workers=1` → **43 tests, 0 échec** sur 14 fichiers de specs, dont les 4 parcours par rôle exigés par #146.
- `cd packages/e2e && bunx playwright test admin-walkthrough parent-walkthrough student-walkthrough statistics-walkthrough` (parallèle, 4 workers) → **4 tests, 0 échec**.
