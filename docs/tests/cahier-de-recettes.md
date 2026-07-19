# Cahier de recettes (#157)

> Scénarios de recette — fonctionnels, structurels et sécurité — avec résultat attendu et résultat obtenu, produit pour la soutenance RNCP 39583 (compétence C2.3.1). Consolide `docs/tests/strategy.md`, `docs/security/audit.md` et les specs `packages/e2e/tests/` dans un format lisible côté jury, sans dupliquer leur contenu technique.

| Champ | Valeur |
|-------|--------|
| Périmètre | Parcours utilisateur par rôle, matrices d'accès, scénarios de sécurité — backend Fastify + frontend Nuxt |
| Version | 1.0.0 |
| Date | 2026-07-19 |
| Méthode | Exécution réelle de la suite Playwright (`packages/e2e`) et des tests unitaires backend (`bun:test`) ; chaque ligne correspond à un ou plusieurs tests automatisés existants, cités par fichier |
| Hors scope | Tests de charge, pentest externe (voir `docs/security/audit.md`), tests unitaires frontend (aucun en CI actuellement) |

---

## Scénarios fonctionnels — parcours par rôle

| # | Scénario | Étapes | Résultat attendu | Résultat obtenu | Statut |
|---|----------|--------|-------------------|------------------|--------|
| F1 | Administrateur : dashboard → gestion des utilisateurs | Connexion admin → widget "Absences par jour" visible → navigation `/admin/users` | Table des comptes visible, au moins le compte admin listé | Conforme (`admin-walkthrough.spec.ts`) | ✅ |
| F2 | Élève : consultation du carnet de notes | Connexion élève (compte avec notes réelles) → `/grades/my-grades` | Titre "Mes notes", KPI "Moyenne générale" affiché (pas d'état vide) | Conforme (`student-walkthrough.spec.ts`) | ✅ |
| F3 | Parent : fiche enfant → absences | Connexion parent → carte enfant "Mes enfants" sur le dashboard → bouton "Voir les absences" | Redirection `/parent/absences`, contenu "Absences" visible | Conforme (`parent-walkthrough.spec.ts`) | ✅ |
| F4 | Enseignant : moyenne de classe → détail statistiques | Connexion enseignant → widget "Moyenne de classe" → `/statistics` | Graphiques "Moyenne par matière" et "Distribution des notes" affichés avec données | Conforme (`statistics-walkthrough.spec.ts`) | ✅ |
| F5 | Redirection post-connexion vers le dashboard dédié au rôle | Connexion successive ADMIN / TEACHER / USER / PARENT | Redirection respective vers `/admin`, `/teacher`, `/student`, `/parent` | Conforme, 4/4 rôles (`dashboard.spec.ts`) | ✅ |
| F6 | Dashboard enseignant : widgets de synthèse | Connexion enseignant → `/teacher` | "Sessions du jour", "Absences non justifiées", "Devoirs récents", "Moyenne de classe" visibles | Conforme (`dashboard.spec.ts`) | ✅ |

## Scénarios fonctionnels — fonctionnalités transverses

| # | Scénario | Étapes | Résultat attendu | Résultat obtenu | Statut |
|---|----------|--------|-------------------|------------------|--------|
| F7 | Messagerie : conversation de démonstration | Connexion élève (participant seedé) → `/messages` | Titre "Messages", conversation seedée visible | Conforme (`messaging.spec.ts`) | ✅ |
| F8 | Cloche de notifications | Utilisateur authentifié → clic sur la cloche | Panneau "Notifications" s'ouvre | Conforme (`notifications.spec.ts`) | ✅ |
| F9 | Emploi du temps : filtres par rôle + deep-links | Enseignant → dropdown "Mode d'affichage" ("Mes matières" / classe) ; Admin → filtre professeur ; URLs `?classId=`/`?teacherId=` | Séances affichées et surlignées (`is-mine`) pour l'enseignant ; filtres corrects par rôle ; état reflété au chargement depuis l'URL | Conforme (`planning-walkthrough.spec.ts`) | ✅ |
| F10 | Téléchargement du bulletin PDF | Élève avec notes → `/grades/my-grades` → bouton "Télécharger le bulletin PDF" | Bouton masqué (rôle non-USER, chargement, aucune note) ; téléchargement réussi (`bulletin.pdf`, en-tête `%PDF`) ; toast d'erreur si l'API échoue | Conforme, y compris cas limite élève sans note GRADED (`bulletin-ui.spec.ts`) | ✅ |

---

## Scénarios structurels — gardes de route et matrices d'accès

| # | Scénario | Étapes | Résultat attendu | Résultat obtenu | Statut |
|---|----------|--------|-------------------|------------------|--------|
| S1 | Visiteur non authentifié | Accès direct à `/dashboard` sans session | Redirection `/auth/login` | Conforme (`auth.spec.ts`) | ✅ |
| S2 | Garde "guest" | Utilisateur connecté → tentative de retour sur `/auth/login` | Reste hors de `/auth/login` | Conforme (`auth.spec.ts`) | ✅ |
| S3 | Déconnexion | Clic avatar → "Déconnexion" → nouvelle tentative sur `/dashboard` | Retour au login, accès aux pages protégées perdu | Conforme (`auth.spec.ts`) | ✅ |
| S4 | `/statistics` réservé ADMIN/TEACHER/STAFF | Accès `/statistics` en TEACHER, ADMIN, USER, PARENT | TEACHER/ADMIN accèdent ; USER/PARENT redirigés vers leur dashboard | Conforme, 4/4 cas (`statistics.spec.ts`) | ✅ |
| S5 | Matrice d'accès au bulletin (`GET /grade/users/:id/bulletin`) | Sans token ; élève → bulletin d'un autre élève ; parent → bulletin de son enfant ; staff → utilisateur inexistant ; élève → son propre bulletin ; staff → bulletin d'un élève | 401 / 403 / 403 / 404 / 200 (PDF) / 200 (PDF) respectivement | Conforme — le cas "parent → bulletin de son enfant" retourne 403 : **limitation fonctionnelle connue et volontairement figée par un test** (`PARENT` hors `STAFF_ROLES`), à corriger si le besoin métier l'exige (`bulletin-api.spec.ts`) | ⚠️ Conforme au comportement actuel, gap documenté |
| S6 | Session expirée / token invalide | Token avec `exp` passé ; cookie de session retiré ; token non expiré mais signature invalide | Éjection proactive vers `/auth/login` (2 premiers cas) ; éjection réactive + toast "Session expirée" (3ᵉ cas, rejet backend) | Conforme (`session-expiry.spec.ts`) — flake connu en exécution parallèle, voir "Vérification" | ✅ |

---

## Scénarios sécurité

Repris de `docs/security/audit.md` (passe de durcissement #144) et complétés par les scénarios RGPD, réexprimés ici en forme de recette.

| # | Scénario | Étapes | Résultat attendu | Résultat obtenu | Statut |
|---|----------|--------|-------------------|------------------|--------|
| Sec1 | Rate-limiting sur l'authentification | Dépasser 30 requêtes/min sur `/auth/login` | `429 Too Many Requests` | Conforme (constaté en live + test automatisé) | ✅ |
| Sec2 | En-têtes de sécurité HTTP | Requête sur n'importe quelle route | CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options` présents | Conforme | ✅ |
| Sec3 | CORS restreint | Requête depuis une origine hors allowlist vs. origine autorisée | Pas d'en-tête `Access-Control-Allow-Origin` vs. en-tête présent | Conforme | ✅ |
| Sec4 | Interruption réelle des gardes d'authentification | Requête échouant l'auth sur une route protégée (tous domaines) | Le handler de route ne s'exécute pas ; réponse d'erreur avec en-têtes de sécurité/rate-limit conservés | Conforme (tests unitaires des 6 gardes + intégration) | ✅ |
| Sec5 | Routes admin de gestion de comptes protégées | `POST`/`DELETE /auth/users*` sans token, avec token non-admin, avec token admin | 401 / 403 / 201-200 | Conforme | ✅ |
| Sec6 | Énumération anonyme des comptes bloquée | `GET /auth/users*` sans token vs. avec token | 401 vs. 200 | Conforme | ✅ |
| Sec7 | RGPD — droit d'accès (export) | `GET /auth/me/export` sans token, puis avec token | 401 sans token ; 200 avec token, JSON téléchargeable agrégeant profil + notes, mot de passe exclu de l'export | Conforme (`rgpd.spec.ts`, API + UI bouton profil) | ✅ |
| Sec8 | RGPD — droit à l'effacement | Inscription d'un compte jetable → `DELETE /auth/me` → tentative de reconnexion | Compte anonymisé (200) ; reconnexion bloquée (401) | Conforme (`rgpd.spec.ts`) | ✅ |

---

## Résultats globaux (exécution réelle)

| Étage | Fichiers | Tests | Résultat |
|-------|----------|-------|----------|
| Unitaire backend (`bun:test`) | 49 | 394 | 0 échec — couverture 82,47 % fonctions / 86,91 % lignes |
| e2e (Playwright, séquentiel) | 14 | 41 | 0 échec en exécution séquentielle |

Détail des chiffres et de la méthode : `docs/tests/strategy.md`. Détail des correctifs de sécurité : `docs/security/audit.md`.

---

## Perspectives (hors scope de cette passe)

- Formaliser une correction du gap S5 (accès parent au bulletin de son enfant) si le besoin métier est confirmé.
- Étendre les scénarios de recette aux parcours mutants (invitation d'utilisateur, dépôt de justificatif d'absence — voir `docs/tests/strategy.md` § Perspectives).
- Résoudre le flake connu du parallélisme e2e vs. rate-limiting (`rgpd.spec.ts`/`session-expiry.spec.ts` en exécution parallèle).
- Ajouter des scénarios de recette côté frontend une fois un socle de tests unitaires frontend en place (issue #158).

---

## Vérification

- `cd packages/backend && NODE_ENV=test bun run test:coverage` → 394 tests, 0 échec.
- `cd packages/e2e && bunx playwright test --workers=1` → suite complète verte en exécution séquentielle.
- Limitation connue : en exécution parallèle (4 workers, défaut CI), `rgpd.spec.ts` et `session-expiry.spec.ts` peuvent échouer de façon intermittente (rate-limiting + comptes de démo partagés entre workers) — non reproductible en séquentiel, non lié à la logique testée elle-même (voir `docs/tests/strategy.md`).
