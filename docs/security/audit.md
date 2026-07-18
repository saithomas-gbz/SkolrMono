# Audit de sécurité — passe de durcissement (#144)

> Rapport **avant / après** d'une passe de durcissement de bout en bout du backend Skolr, réalisée pour la soutenance RNCP 39583. Chaque risque est tracé : constat → sévérité → correctif → statut.

| Champ | Valeur |
|-------|--------|
| Périmètre | Backend Fastify (monolithe modulaire), configuration applicative |
| Version | 1.0.0 |
| Date | 2026-07-18 |
| Méthode | Revue de code ciblée (`/security-review` + inventaire manuel), vérification live (curl), tests automatisés |
| Hors scope | Pentest externe complet (cité en perspective), sécurité infrastructure/réseau |

---

## Synthèse

| # | Risque | Sévérité | Avant | Après |
|---|--------|----------|-------|-------|
| R1 | Absence de rate-limiting (brute-force / DoS applicatif) | Élevée | ❌ Aucune limite | ✅ Global + limites resserrées sur `/auth/*` |
| R2 | Absence d'en-têtes de sécurité HTTP | Moyenne | ❌ Aucun | ✅ helmet (CSP, HSTS, nosniff, frameguard) |
| R3 | CORS permissif (`origin: true`) | Moyenne | ❌ Reflet de toute origine | ✅ Allowlist par env |
| R4 | Gardes d'auth n'interrompant pas la requête | Élevée | ❌ Handler exécuté malgré l'échec d'auth | ✅ Interruption réelle (`deny` + hijack), tous domaines |
| R5 | Routes admin de gestion de comptes non gardées | Élevée | ❌ `POST`/`DELETE /auth/users*` sans garde | ✅ `requireAdmin` |
| R6 | Énumération anonyme des comptes | Moyenne | ❌ `GET /auth/users*` sans garde | ✅ `requireAuth` |
| R7 | Gestion des secrets | — | ✅ Déjà conforme | ✅ Vérifié (aucun secret commité) |
| R8 | Validation des entrées | — | ✅ Schémas Fastify présents | ✅ Vérifié sur les écritures |

---

## Détail des correctifs

### R1 — Rate-limiting
**Constat** : aucune limite de débit ; les endpoints d'authentification (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`) étaient exposés au brute-force et à l'abus.
**Correctif** : `@fastify/rate-limit` enregistré globalement (défaut 300 req/min/IP) + limites resserrées par route via `config.rateLimit` : login 30/min, register 10/min, reset 5/min. Toutes surchargeables par env (`RATE_LIMIT_*`).
**Vérifié** : au-delà du seuil → `429 Too Many Requests` (constaté en live et par test automatisé).
**Note déploiement** : derrière un reverse proxy, activer `trustProxy` et transmettre l'IP client réelle, sinon toutes les requêtes partagent l'IP du proxy.

### R2 — En-têtes de sécurité
**Constat** : aucune en-tête de sécurité HTTP.
**Correctif** : `@fastify/helmet` — `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options`, etc. La CSP autorise l'inline strictement nécessaire à Swagger UI (`/docs`) et verrouille le reste sur `'self'`.
**Vérifié** : en-têtes présents sur les réponses (constaté en live et par test automatisé).

### R3 — CORS
**Constat** : `origin: true` reflétait n'importe quelle origine avec `credentials: true`.
**Correctif** : allowlist explicite depuis `CORS_ORIGINS` (défaut : origines de dev du frontend).
**Vérifié** : origine non autorisée → pas d'en-tête `Access-Control-Allow-Origin` ; origine autorisée → en-tête présent.

### R4 — Interruption des gardes d'authentification
**Constat** : les préhandlers d'auth faisaient `return reply.status(401).send(...)` sans `await`. En hook asynchrone Fastify, **le handler de route s'exécutait malgré tout** (requête non interrompue) — surcoût et risque d'effets de bord avec un contexte non authentifié.
**Correctif** : un helper partagé `deny(reply, status, error)` fait `await reply.status(status).send({ error })`. Le `await` est la clé : dans un hook asynchrone Fastify, il garantit l'interruption réelle du cycle (le handler ne s'exécute pas) tout en passant par le pipeline normal `onSend` — les réponses d'erreur conservent donc leurs en-têtes de sécurité et de rate-limiting. Appliqué à la garde partagée (`shared/jwt/authGuard`, déjà corrigée avec #145) **et aux 5 gardes de domaine** (class, grade, planning, billing, parent).
**Vérifié** : le handler ne s'exécute plus sur échec d'auth (tests unitaires des gardes + intégration).

### R5 — Routes admin de gestion de comptes
**Constat** : `POST /auth/users` (création) et `DELETE /auth/users/:id` / `DELETE /auth/users` (suppression) n'avaient **aucun préhandler** — n'importe qui pouvait créer/supprimer des comptes. (De plus, l'ancien hard-delete plantait sur la FK `Account` — corrigé par #145.)
**Correctif** : nouvelle garde `requireAdmin` (ADMIN / PLATFORM_ADMIN) appliquée à ces routes.
**Vérifié** : sans token → 401 ; token non-admin → 403 ; token admin → 201/200.

### R6 — Énumération anonyme des comptes
**Constat** : `GET /auth/users` et `GET /auth/users/:id` étaient accessibles sans authentification (énumération d'emails/identités).
**Correctif** : `requireAuth` sur ces routes de lecture.
**Vérifié** : sans token → 401 ; token authentifié → 200.

### R7 — Gestion des secrets
**Constat / vérification** : `.env` est **gitignore** et **non suivi** par git ; `.env.example` ne contient que des placeholders (aucune valeur réelle) ; `STRIPE_SECRET_KEY` / `GOOGLE_CLIENT_SECRET` vides (pas de clé live secrète commitée) ; secrets injectés par variables d'environnement. Les nouvelles variables de durcissement sont documentées dans `.env.example`.
**Statut** : conforme.
**Recommandation** : utiliser des **clés Stripe restreintes** en test/prod, et un `JWT_SECRET` fort généré aléatoirement.

### R8 — Validation des entrées
**Constat / vérification** : les endpoints d'écriture (auth, class, grade, planning, message, billing, parent) déclarent des **schémas JSON Fastify** (mêmes objets que la doc OpenAPI) qui valident `body`/`params`/`querystring` en amont des contrôleurs.
**Statut** : conforme.

---

## RBAC — spot-check (tous domaines)

| Domaine | Mécanisme d'auth | Constat |
|---------|------------------|---------|
| `auth` | gardes partagées (`requireAuth`, `requireAdmin`, `requireSelfOrAdmin`) | Lacunes create/delete/list **corrigées** (R5, R6) |
| `class` | `requireAuth` / `requireStaff` (préhandlers) | Conforme |
| `grade` | `requireAuth` / `requireStaff` / `requireSelfOrStaff` | Conforme |
| `planning` | `requireAuth` / `requireStaff` | Conforme |
| `billing` | `requireEstablishmentAdmin` / `requirePlatformAdmin` | Conforme |
| `message` / `notification` | vérification JWT **dans le contrôleur** (401 si absent) | Fonctionnel ; harmonisation en préhandler recommandée (dette technique, non bloquant) |

---

## Perspectives (hors scope de cette passe)

- **Pentest externe** complet (OWASP ASVS / ZAP) avant mise en production.
- **Refresh tokens** / rotation et révocation de JWT (actuellement JWT court, 1 h, sans révocation).
- **`trustProxy`** + en-têtes `X-Forwarded-*` en production pour un rate-limiting par IP réelle.
- Harmoniser l'auth de `message`/`notification` en préhandlers (cohérence, testabilité).
- Journalisation de sécurité / détection d'anomalies (tentatives de connexion, 429).

---

## Vérification

- Tests backend : `NODE_ENV=test bun test src` → **tout vert** (dont tests dédiés rate-limit 429, en-têtes helmet, garde `requireAdmin`).
- Vérification live (`curl`) : en-têtes de sécurité présents, CORS restreint, `429` au-delà du seuil de login, matrice RBAC (401/403/200/201) conforme.
