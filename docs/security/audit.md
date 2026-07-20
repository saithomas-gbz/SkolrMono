# Audit de sécurité — passe de durcissement (#144)

> Rapport **avant / après** d'une passe de durcissement de bout en bout du backend Skolr, réalisée pour la soutenance RNCP 39583. Chaque risque est tracé : constat → sévérité → correctif → statut.

| Champ | Valeur |
|-------|--------|
| Périmètre | Backend Fastify (monolithe modulaire), configuration applicative |
| Version | 1.0.0 |
| Date | 2026-07-18, complété le 2026-07-20 (R9), le 2026-07-20 (R10, R11) |
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
| R9 | Absence de journalisation des événements de sécurité | Moyenne | ❌ Aucun log applicatif dédié (seulement le log HTTP générique Fastify) | ✅ Logs structurés sur connexion, inscription, effacement RGPD |
| R10 | JWT non révocable, durée de vie longue (1 h) | Élevée | ❌ Un jeton volé restait valable jusqu'à expiration, sans moyen de le révoquer | ✅ Jeton d'accès court (15 min) + jeton de rafraîchissement tracé en base, à rotation et révocable |
| R11 | `trustProxy` désactivable en production derrière un reverse proxy | Moyenne | ❌ Pas de configuration explicite (IP réelle non lisible derrière un proxy) | ✅ `TRUST_PROXY` (env, défaut `false`) — lit `X-Forwarded-For` uniquement si activé explicitement |

---

## Détail des correctifs

### R1 — Rate-limiting
**Constat** : aucune limite de débit ; les endpoints d'authentification (`/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`) étaient exposés au brute-force et à l'abus.
**Correctif** : `@fastify/rate-limit` enregistré globalement (défaut 300 req/min/IP) + limites resserrées par route via `config.rateLimit` : login 30/min, register 10/min, reset 5/min. Toutes surchargeables par env (`RATE_LIMIT_*`).
**Vérifié** : au-delà du seuil → `429 Too Many Requests` (constaté en live et par test automatisé).
**Note déploiement** : derrière un reverse proxy, activer `trustProxy` et transmettre l'IP client réelle, sinon toutes les requêtes partagent l'IP du proxy — voir R11.

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

### R9 — Journalisation des événements de sécurité
**Constat** : au-delà du log HTTP générique de Fastify (une ligne par requête, sans distinction des événements sensibles), aucun log applicatif dédié n'existait pour les actions de sécurité (connexion réussie/échouée, inscription, effacement RGPD) — impossible de reconstituer un historique de connexions ou de détecter un pattern de force brute sans parser le log HTTP brut.
**Correctif** : logs structurés (Pino, via `request.log`) ajoutés aux points de contrôle sensibles du module `auth` : `auth.login.success` (info), `auth.login.failed` (warn, sans le mot de passe), `auth.register.success` (info), `auth.register.duplicate` (warn), `auth.rgpd.account_anonymized` (info).
**Vérifié** : capturé en conditions réelles (stack Docker, `docker logs skolr_backend`) :
```json
{"level":30,"time":1784542300414,"userId":"11111111-...-104","email":"dev.user@skolr.local","msg":"auth.login.success"}
{"level":40,"time":1784542326123,"email":"dev.user@skolr.local","msg":"auth.login.failed"}
{"level":30,"time":1784542337599,"userId":"501dd392-...","email":"audit.test...@skolr.local","msg":"auth.register.success"}
{"level":30,"time":1784542337677,"userId":"501dd392-...","msg":"auth.rgpd.account_anonymized"}
```
`level: 40` (warn) sur les échecs de connexion permet un filtrage direct pour la détection de force brute, en complément du rate-limiting (R1).

### R10 — Rotation et révocation des jetons (refresh tokens)
**Constat** : le JWT d'accès était le seul jeton émis, valable 1 h, **non révocable** avant expiration — un jeton volé (XSS, log exposé, device compromis) restait exploitable jusqu'à son terme sans qu'aucune action serveur ne puisse l'invalider.
**Correctif** :
- Jeton d'accès raccourci à **15 min** (`JWT_ACCESS_EXPIRES_IN`), stateless, inchangé sinon.
- Nouveau jeton de rafraîchissement **opaque** (`randomBytes(40)`, 320 bits d'entropie), tracé côté serveur dans `auth.RefreshToken` — **seul le hash SHA-256** est persisté, jamais la valeur brute.
- **Rotation à chaque usage** : `POST /auth/refresh` échange l'ancien jeton contre un nouveau (l'ancien est marqué `revokedAt` + `replacedByTokenHash`) et renvoie un nouveau jeton d'accès.
- **Détection de réutilisation (vol de jeton)** : si un jeton déjà révoqué (donc déjà échangé) est présenté à nouveau, c'est le signe qu'une copie volée est utilisée en parallèle de la session légitime — **tous** les jetons actifs de l'utilisateur sont alors révoqués (déconnexion forcée de toutes les sessions), pas seulement la requête refusée.
- `POST /auth/logout` révoque explicitement le jeton présenté (logout serveur, pas seulement client).
- L'effacement RGPD (`anonymizeUser`) supprime désormais aussi les lignes `RefreshToken` de l'utilisateur, en plus des jetons de réinitialisation de mot de passe déjà couverts.
**Vérifié** (backend `bun test src` : 409/409 ; vérification live `curl` sur la stack de dev) :
- Login → jeton d'accès `exp - iat = 900 s` (15 min) confirmé par décodage du JWT.
- `POST /auth/refresh` avec un jeton valide → nouveau couple (accès + rafraîchissement), ancien jeton marqué révoqué en base.
- Réutilisation de l'ancien jeton (déjà échangé) → `401`, **et** le nouveau jeton issu de la rotation devient lui aussi invalide (chaîne entière révoquée) — confirmé par une 2ᵉ tentative avec le jeton pourtant valide juste avant.
- `POST /auth/logout` → `200`, puis toute tentative de `refresh` avec ce même jeton → `401`.
- État final en base (`auth."RefreshToken"`) : les 3 jetons émis durant le test sont tous `revokedAt IS NOT NULL`, cohérent avec rotation + détection de vol + logout.

### R11 — Configuration `trustProxy`
**Constat** : sans configuration explicite, Fastify lit l'IP client directement depuis la connexion TCP — correct en dev, mais **faux derrière un reverse proxy** (toutes les requêtes partagent l'IP du proxy, ce qui fausse le rate-limiting par IP de R1) ; et l'activer par défaut serait dangereux hors de ce contexte (un client pourrait usurper son IP apparente via `X-Forwarded-For`).
**Correctif** : variable d'env `TRUST_PROXY` (défaut `false`) — `Fastify({ trustProxy: TRUST_PROXY })`. À positionner à `true` uniquement en production derrière un reverse proxy de confiance.
**Vérifié** : test dédié confirmant `trustProxy` désactivé par défaut, et qu'une instance Fastify avec `trustProxy: true` lit bien `request.ip` depuis `X-Forwarded-For`.

---

## RBAC — spot-check (tous domaines)

| Domaine | Mécanisme d'auth | Constat |
|---------|------------------|---------|
| `auth` | gardes partagées (`requireAuth`, `requireAdmin`, `requireSelfOrAdmin`) | Lacunes create/delete/list **corrigées** (R5, R6) |
| `class` | `requireAuth` / `requireStaff` (préhandlers) | Conforme |
| `grade` | `requireAuth` / `requireStaff` / `requireSelfOrStaff` | Conforme |
| `planning` | `requireAuth` / `requireStaff` | Conforme |
| `billing` | `requireEstablishmentAdmin` / `requirePlatformAdmin` | Conforme |
| `message` / `notification` | préhandler `requireAuth` partagé (`lib/authGuard.ts`) | Conforme — harmonisé avec les autres domaines (#169/#170, ex-dette technique) |

---

## Perspectives (hors scope de cette passe)

- **Pentest externe** complet (OWASP ASVS / ZAP) avant mise en production.
- Détection automatisée d'anomalies à partir des logs `auth.login.failed` (ex. alerte au-delà de N échecs/IP) — les logs existent (R9), la détection active reste à construire.
- Détection automatisée sur `auth.refresh.failed` (`reuse_detected`) — le signal existe (R10), pas encore d'alerting dédié.
- Étendre la journalisation de sécurité à d'autres domaines (`message`, `billing`) si des actions sensibles équivalentes y apparaissent.

---

## Vérification

- Tests backend : `NODE_ENV=test bun test src` → **409 tests, 0 échec** (dont tests dédiés rate-limit 429, en-têtes helmet, garde `requireAdmin`, rotation/révocation de jetons R10, `trustProxy` R11).
- Vérification live (`curl`) : en-têtes de sécurité présents, CORS restreint, `429` au-delà du seuil de login, matrice RBAC (401/403/200/201) conforme.
- R9 : logs capturés en conditions réelles via `docker logs skolr_backend` (connexion succès/échec, inscription, effacement RGPD) — voir §R9.
- R10 : cycle complet vérifié en live (dev, hors Docker) — login, rotation, réutilisation détectée + révocation en chaîne, logout, état final en base — voir §R10.
