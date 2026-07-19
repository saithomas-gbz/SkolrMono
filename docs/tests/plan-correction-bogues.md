# Plan de correction des bogues (#159)

> Anomalies détectées au cours du projet, analysées et corrigées — sélection représentative, produite pour la soutenance RNCP 39583 (compétence C2.3.2). Même format que `docs/security/audit.md` : constat → analyse → correctif → statut. Les anomalies de sécurité (R1-R8) sont déjà traitées dans ce document dédié et ne sont pas dupliquées ici.

| Champ | Valeur |
|-------|--------|
| Périmètre | Backend Fastify, frontend Nuxt, infrastructure Docker |
| Version | 1.0.0 |
| Date | 2026-07-19 |
| Méthode | Sélection de 6 anomalies représentatives parmi les 41 commits `fix(...)` de l'historique git, couvrant sécurité applicative, cohérence de données, concurrence frontend, résilience UI et infrastructure |
| Hors scope | Anomalies de sécurité réseau/en-têtes (voir `docs/security/audit.md`, R1-R8) |

---

## Processus de traitement

Chaque anomalie suit le même circuit, outillé par le repo plutôt que documenté séparément à chaque fois :

1. **Détection** — recette manuelle, exécution de la suite de tests, ou revue de code.
2. **Consignation** — issue GitHub via `.github/ISSUE_TEMPLATE/bug.md` (description, étapes de reproduction, comportement attendu vs observé, environnement).
3. **Correction** — PR liée à l'issue (`fixes #N`), section `## Testing` obligatoire (`pr-validation.yml` bloque toute PR qui ne référence pas d'issue ou n'a pas cette section).
4. **Vérification** — test automatisé ajouté ou étendu pour figer le comportement corrigé (évite la régression).

---

## Synthèse

| # | Anomalie | Catégorie | Sévérité | Commit |
|---|----------|-----------|----------|--------|
| B1 | Fuite de données inter-classes sur les statistiques d'un devoir | Autorisation | Élevée | `fa9d566` |
| B2 | Nombre de notes notées incohérent avec la moyenne calculée | Cohérence de données | Moyenne | `b853fa2` |
| B3 | Race condition sur la page détail d'un devoir | Concurrence frontend | Moyenne | `0d8bc99` |
| B4 | Widget de moyenne de classe perdant les données déjà chargées | Résilience UI | Faible | `03d6bee` |
| B5 | Image Docker backend cassée au seed | Infrastructure | Élevée | `27dfffb` |
| B6 | Sessions expirées non détectées côté client | Sécurité fonctionnelle | Moyenne | `a01247c` |

---

## Détail des anomalies

### B1 — Fuite de données inter-classes (`getAssignmentStats`)
**Constat** : `getAssignmentStats` ne vérifiait aucune propriété (ownership), contrairement à `getClassStats` du même module — n'importe quel `TEACHER` authentifié pouvait consulter les statistiques d'un devoir appartenant à une classe qu'il n'enseigne pas.
**Analyse** : incohérence entre deux endpoints du même contrôleur (`getClassStats` avait la vérification, `getAssignmentStats` ne l'avait pas) — un oubli lors de l'ajout du second endpoint, non détecté car aucun test ne couvrait le cas d'un enseignant hors périmètre. Un 404 manquant sur devoir inexistant a été détecté et corrigé dans le même correctif.
**Correctif** : ajout du contrôle d'ownership (l'enseignant doit être rattaché à la classe du devoir) et du `404` sur devoir inexistant.
**Vérifié** : test unitaire dédié figeant le `403` pour un enseignant hors périmètre et le `404` pour un devoir inexistant.

### B2 — Incohérence `gradedCount` / moyenne (`getClassStats`)
**Constat** : `byCourse[].gradedCount` comptait toute note au statut `GRADED`, y compris celles avec `value=null`, alors que le calcul de la moyenne les excluait déjà — le nombre affiché ne correspondait pas aux notes réellement utilisées dans la moyenne.
**Analyse** : `createGrade`/`updateGrade` n'imposent pas l'invariant "note notée ⇒ valeur non nulle" (contrairement à `batchUpdateGrades`), ce qui rendait l'état `GRADED` + `value=null` possible en base sans qu'aucun filtre ne l'exclue de façon cohérente entre les deux calculs.
**Correctif** : alignement du filtre de `gradedCount` sur celui de la moyenne (exclusion des `value=null`).
**Vérifié** : test unitaire couvrant le cas `GRADED` avec `value=null`.

### B3 — Race condition sur `assignments/[id]`
**Constat** : `id.value` était relu après un `await` au lieu d'être capturé une fois au début de `load()` — une navigation vers un autre devoir pendant le chargement pouvait associer la grille de notes d'un devoir aux statistiques d'un autre.
**Analyse** : pattern async classique en Vue (`ref` réactif relu après une opération asynchrone au lieu d'être snapshotté) — non détecté en usage normal (navigation lente rare en dev), mais reproductible en changeant rapidement de devoir sur une connexion lente.
**Correctif** : capture de l'`id` en variable locale au début de `load()`, résultats obsolètes ignorés si l'`id` courant a changé entre-temps.
**Vérifié** : relecture manuelle + non-régression confirmée par la suite e2e existante sur cette page.

### B4 — Widget "Moyenne de classe" perdant les données partielles
**Constat** : `Promise.all` faisait échouer l'affichage de tout le widget si une seule classe sur plusieurs échouait à charger, y compris quand les autres classes avaient déjà répondu avec succès.
**Analyse** : `Promise.all` échoue globalement au premier rejet — comportement inadapté à un widget agrégeant plusieurs sources indépendantes où une erreur partielle ne doit pas invalider les données déjà disponibles.
**Correctif** : passage à `Promise.allSettled`, erreur affichée seulement si **aucune** classe n'a pu être chargée.
**Vérifié** : couvert par `statistics-walkthrough.spec.ts` (parcours enseignant, widget visible avec données).

### B5 — Image Docker backend cassée au seed
**Constat** : `bunx prisma db seed` échouait avec `Cannot find module` dans un conteneur reconstruit — `prisma/seed.ts` importe les fixtures partagées depuis `../../../scripts/seed/dev-users`, mais le `Dockerfile` ne copiait que `packages/backend/`, sans le dossier racine `scripts/`.
**Analyse** : dépendance inter-packages (`packages/backend` → `scripts/` racine) non reflétée dans le contexte de build Docker — fonctionnait en local (monorepo complet sur disque) mais pas dans l'image construite en CI/release.
**Correctif** : ajout de `COPY scripts/seed/ ./scripts/seed/` dans le `Dockerfile` backend.
**Vérifié** : seed exécuté avec succès dans l'image reconstruite (utilisé depuis par `e2e.yml`, qui seed la stack Docker à chaque run).

### B6 — Sessions expirées non détectées côté client
**Constat** : un token expiré ou invalidé côté backend n'était pas détecté proactivement par le frontend — l'utilisateur restait sur une page protégée avec des appels API échouant silencieusement en 401/403.
**Analyse** : deux mécanismes manquaient : une vérification proactive du claim `exp` avant navigation (gardes de route), et une réaction réactive aux 401/403 renvoyés par le backend (nettoyage de session + redirection).
**Correctif** : `isLoggedIn` décode désormais le claim `exp` et les gardes de route (`middleware/auth.ts`, `guest.ts`) redirigent avant tout appel réseau (proactif) ; un intercepteur `onResponseError` de `useApi` capte les 401/403, nettoie la session et redirige vers `/auth/login?expired=1` (réactif).
**Vérifié** : `session-expiry.spec.ts` (3 tests : token expiré, cookie retiré, token à signature invalide) — voir `docs/tests/cahier-de-recettes.md` (S6).

---

## Perspectives (hors scope de cette passe)

- Étendre la sélection à d'autres commits `fix(...)` de l'historique (41 au total) si le jury demande davantage d'exemples.
- Automatiser un rapprochement anomalie ↔ test de non-régression (actuellement vérifié manuellement dossier par dossier).

---

## Vérification

- Anomalies choisies vérifiables directement dans l'historique git : `git show <commit>` pour chacune des 6 référencées ci-dessus.
- B1, B2 : couverts par des tests unitaires backend (inclus dans les 394 tests, voir `docs/tests/strategy.md`).
- B4, B6 : couverts par la suite e2e (voir `docs/tests/cahier-de-recettes.md`).
