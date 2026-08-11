# Soutenance RNCP 39583 — trame de slides, script de démo, Q&A

> Support de préparation de la soutenance « Expert en développement logiciel » (RNCP 39583).
> Mapping vers les codes de compétences officiels (grille d'évaluation RNCP 39583, 4 blocs) réalisé — voir §2. Détail compétence par compétence pour les 4 compétences éliminatoires du Bloc 2, avec preuves fichier par fichier : voir `docs/security/accessibility.md`, `docs/tests/cahier-de-recettes.md`, `docs/tests/strategy.md` et `docs/architecture/architecture.md`.

---

## 1. Trame de slides

| # | Slide | Contenu clé | Durée cible |
|---|-------|-------------|-------------|
| 1 | Titre & contexte | Skolr, gestion scolaire, cadre RNCP 39583, dev solo | 1 min |
| 2 | Problématique | Outils disparates (Excel, papier), pas de système intégré/sécurisé ; objectifs (−50 % tâches admin, adoption, RGPD) | 2 min |
| 3 | Architecture (vue d'ensemble) | Monolithe modulaire Fastify + Nuxt + Postgres multi-schema ; C4 Contexte + Conteneurs | 3 min |
| 4 | Histoire d'architecture | Refacto microservices + RabbitMQ → monolithe modulaire (ADR-001/002) : *pourquoi*, conséquences | 3 min |
| 5 | Sécurité & RGPD | JWT + RBAC + bcrypt + TLS ; droits RGPD opérationnels (export / effacement), registre, DPO | 3 min |
| 6 | Tests & qualité | 409 tests backend + 43 e2e (Playwright), cahier de recettes, ESLint/Knip/Prettier/Husky, i18n:check | 2 min |
| 7 | CI/CD & déploiement | GitHub Actions (backend/frontend/e2e), Docker, migrations Prisma, hébergement UE éco-responsable | 2 min |
| 8 | Démo live | Parcours par rôle + focus RGPD (voir §3) | 6 min |
| 9 | Perspectives | Serveur MCP / IA, i18n (EN), extraction éventuelle d'un module, scalabilité | 2 min |
| 10 | Conclusion & questions | Bilan compétences, ouverture | 1 min |

**Total cible ≈ 25 min** (à ajuster après répétition — §4).

---

## 2. Mapping slides ↔ blocs de compétences RNCP 39583

*Mapping par thème vers les codes de compétences officiels (grille d'évaluation RNCP 39583).*

| Thème de compétence | Slides | Preuves dans le projet | Compétences RNCP |
|---------------------|--------|------------------------|-------------------|
| Analyse du besoin & conception / architecture | 2, 3, 4 | `docs/architecture/architecture.md` (C4, ADR-001/002), `CONTEXT.md` | Bloc 1 : C1.1.1, C1.1.2, C1.2.2, C1.3.2, C1.5, C1.6 · Bloc 2 : C2.2.1 |
| Développement & qualité logicielle | 6, 8 | Code TypeScript, 409 tests backend + 43 e2e, ESLint/Knip/Prettier, `docs/tests/strategy.md`, `docs/tests/cahier-de-recettes.md` | Bloc 2 : C2.1.2, C2.2.2, C2.3.1, C2.3.2 |
| Sécurité, accessibilité & conformité (RGPD) | 5 | JWT/RBAC, anonymisation RGPD (#145), registre, correctif authGuard, `docs/security/audit.md`, `docs/security/accessibility.md` | Bloc 2 : C2.2.3 |
| Déploiement, CI/CD & exploitation | 7 | GitHub Actions, Docker, migrations, monitoring Prometheus/Grafana/Sentry, `readme.md` | Bloc 2 : C2.1.1, C2.2.4, C2.4.1 · Bloc 4 : C4.1.1, C4.1.2 |
| Pilotage / méthode | 1, 9, 10 | Agile/Scrum, issues & PR liées, jalons, ADR ; détail : `docs/soutenance/bloc3-pilotage.md` | Bloc 3 : C3.2.1, C3.2.2, C3.3.1, C3.3.2, C3.4.1, C3.4.2 |

### Compétences éliminatoires du Bloc 2 — état des preuves

Les 4 compétences éliminatoires de "Concevoir et développer des applications logicielles" (grille d'évaluation, colonne "Eliminatoire" = OUI) sont les plus critiques pour la validation du bloc :

| Compétence | Preuve principale | Statut |
|---|---|---|
| C2.2.1 — Prototype logiciel | `docs/architecture/architecture.md`, code `packages/backend`/`packages/frontend` | ✅ Couvert |
| C2.2.2 — Harnais de tests unitaires | `docs/tests/strategy.md` (409 tests backend, 82,9 %/87,3 % couverture) | ✅ Couvert (frontend : voir #158) |
| C2.2.3 — Sécurité & accessibilité | `docs/security/audit.md` + `docs/security/accessibility.md` | ✅ Couvert (#156) |
| C2.3.1 — Cahier de recettes | `docs/tests/cahier-de-recettes.md` | ✅ Couvert (#157) |

---

## 3. Script de démo pas-à-pas

### 3.0 Pré-requis — état de base **déterministe** (ne pas démarrer sur une base fragile)

Avant la démo, **réinitialiser** la base sur des comptes connus :

```bash
# 1. Stack DB + services
./db-stack.sh                       # Postgres (et services de support)

# 2. Base propre + seed déterministe
cd packages/backend
bunx prisma migrate reset --force   # DROP + migrations + seed (comptes de démo)
# (ou, sans wipe complet : bunx prisma migrate deploy && bun run db:seed)

# 3. Démarrer backend + frontend
cd ../.. && bun run dev             # ou docker compose up
```

**Comptes de démonstration seedés** (source : `packages/backend/prisma/seed.ts`) :

| Rôle | Email | Mot de passe | Redirection après login |
|------|-------|--------------|-------------------------|
| Admin établissement | `dev.admin@skolr.local` | `dev-admin-123` | `/admin` |
| Enseignant | `dev.teacher@skolr.local` | `dev-teacher-123` | `/teacher` |
| Élève | `dev.student@skolr.local` | `dev-student-123` | `/student` |
| Parent | `parent.martin@skolr.local` | `dev-parent-123` | `/parent` |

> Ne jamais réutiliser ces identifiants hors démo. Le dashboard est un **redirecteur par rôle** (#97).

### 3.1 Parcours Admin (2 min)

1. Se connecter en **admin** → atterrissage `/admin`.
2. Gestion des classes / utilisateurs (invitations, rôles).
3. Vue facturation / établissement (abonnement Stripe).

### 3.2 Parcours Enseignant (1,5 min)

1. Se connecter en **enseignant** → `/teacher`.
2. Créer / consulter un **devoir**, saisir des **notes**.
3. Montrer une **absence** et sa **justification** (dépôt de document).

### 3.3 Parcours Élève / Parent (1,5 min)

1. Se connecter en **élève** → `/student` : consulter ses **notes**, télécharger son **bulletin**.
2. (Option) Se connecter en **parent** → `/parent` : suivi de l'enfant.
3. Montrer la **messagerie** et les **notifications**.

### 3.4 Focus RGPD — le différenciant (1,5 min)

1. Élève connecté → *Mon profil* → carte **« Mes données (RGPD) »**.
2. **Télécharger mes données** → montrer le JSON agrégé (auth, notes, absences, messages…), sans mot de passe.
3. **Supprimer mon compte** → dialogue de confirmation (« SUPPRIMER ») → déconnexion.
4. Tenter de se reconnecter avec le compte supprimé → **échec** (compte anonymisé).
5. (Argument jury) Les **notes restent** en base, anonymisées : intégrité + valeur institutionnelle préservées.

> ⚠️ La démo RGPD **supprime un compte** : la faire en **dernier**, ou sur un compte jetable créé à la volée, puis re-seeder avant toute reprise.

---

## 4. Répétition à blanc & chronométrage (à réaliser)

- [ ] Répétition complète n°1 — noter le temps réel par section ci-dessous.
- [ ] Ajuster la trame si dépassement (> 25 min visé).
- [ ] Répétition n°2 avec la démo live sur environnement propre.
- [ ] Vérifier le **plan B démo** (captures d'écran / vidéo courte) en cas de panne réseau/live.

| Section | Cible | Réel (rép. 1) | Réel (rép. 2) |
|---------|-------|---------------|---------------|
| Intro + problématique | 3 min | | |
| Architecture + ADR | 6 min | | |
| Sécurité/RGPD + tests + CI/CD | 7 min | | |
| Démo live | 6 min | | |
| Perspectives + conclusion | 3 min | | |
| **Total** | **25 min** | | |

---

## 5. Questions probables du jury & éléments de réponse

**RGPD — « anonymisation vs suppression ? »**
On applique une **anonymisation avec conservation** (soft-delete + scrub PII) plutôt qu'un hard-delete : cela **préserve l'intégrité référentielle** (aucune FK cross-schema vers l'utilisateur) et la **valeur institutionnelle** des notes, tout en effaçant l'identité à la source (`auth.User`, copie `grade.GradeUser`, email de facturation). Bases légales et durées : voir le **registre des traitements**. Limites assumées (fichiers externes, données comptables conservées 10 ans, contenu des messages pour les tiers) documentées.

**« Pourquoi un monolithe et pas des microservices ? »**
Voir **ADR-001** : sur un projet solo, les microservices ajoutaient un coût d'exploitation et de cohérence disproportionné, sans besoin réel de scalabilité indépendante. Le monolithe **modulaire** conserve des frontières nettes (plugins Fastify par domaine) et **permet d'extraire** un module en service plus tard si le besoin apparaît. Bénéfice concret : transactions ACID inter-domaines (utilisées par l'effacement RGPD).

**« Comment ça scale ? »**
Réplication **horizontale** du monolithe derrière un load balancer (stateless, JWT), **réplicas de lecture** PostgreSQL, cache, et en dernier recours **extraction** d'un module chaud en service dédié (les frontières et le `service.ts` le permettent). Le bus d'événements pourrait redevenir un vrai broker (RabbitMQ/Kafka) si nécessaire.

**« Sécurité ? »**
Authentification **JWT** (accès 15 min) + **jeton de rafraîchissement** tracé côté serveur, à rotation à chaque usage et révocable (détection de réutilisation → révocation de toute la chaîne en cas de vol), mots de passe **bcrypt**, **RBAC** par rôle via préhandlers, **TLS** en transit, secrets en variables d'environnement. Exemple de rigueur : un **correctif de garde d'authentification** (les préhandlers async ne bloquaient pas réellement le handler sans `await` sur `reply.send()`) livré avec la feature RGPD.

**« Et si un jeton est volé ? »**
Le jeton d'accès expire en 15 min (fenêtre d'exploitation réduite). Le jeton de rafraîchissement est à usage unique : le réutiliser (signe qu'une copie volée circule en parallèle de la session légitime) révoque immédiatement toute la chaîne de jetons actifs de l'utilisateur, forçant une reconnexion sur tous les appareils. Voir `docs/security/audit.md` R10.

**« Qualité / tests ? »**
**409 tests** backend (bun:test, mocks Prisma, 82,9 %/87,3 % de couverture) + **43 tests e2e Playwright** (parcours par rôle, RGPD), consolidés dans un **cahier de recettes** (`docs/tests/cahier-de-recettes.md`), **ESLint/Knip/Prettier/Husky** (dont un plugin d'accessibilité), vérification des clés **i18n**, CI GitHub Actions par package.

**« IA / MCP ? »**
Un **serveur MCP** est prévu pour exposer des capacités à des assistants IA (perspective) — cohérent avec l'écosystème et un axe de différenciation.

---

*Document destiné à la préparation de la soutenance RNCP 39583.*
