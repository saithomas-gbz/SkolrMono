# Skolr — Contexte du projet

## Présentation générale

Skolr est une plateforme de gestion scolaire moderne, développée en solo dans le cadre du titre RNCP 39583 Expert en Développement Logiciel. Elle vise à centraliser et digitaliser la gestion administrative et pédagogique des établissements scolaires.

## Problématique

Les établissements pilotes utilisent des outils disparates (Excel, logiciels obsolètes, communications papier), engendrant inefficacités, erreurs et manque de transparence. Il n'existe pas de système intégré, moderne et sécurisé capable de répondre aux besoins croissants des établissements.

## Objectifs

- Centraliser les données scolaires dans une plateforme unique, accessible et sécurisée
- Réduire de 50% le temps consacré aux tâches administratives manuelles
- Atteindre 80% d'adoption parmi les utilisateurs à 12 mois (50% à 6 mois, 90% à 24 mois)
- Garantir la conformité RGPD et la sécurité des données

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Bun |
| Backend | TypeScript · Fastify · Prisma (monolithe modulaire) |
| Base de données | PostgreSQL (une base unique, multi-schema) |
| Frontend | Nuxt · PrimeVue |
| Infra | Docker · CI/CD |
| Auth | OAuth Google · JWT · RBAC |
| Communication | Bus d'événements in-process (EventEmitter) |
| IA | Serveur MCP |

## Architecture

Architecture **monolithe modulaire** (#114) : un seul backend Fastify déployable, une seule base PostgreSQL multi-schema. Chaque domaine métier est un **plugin Fastify** monté sous son préfixe (`/auth`, `/class`, `/grade`…), ce qui conserve le contrat d'API historique (le frontend est inchangé). L'ancien découpage (8 microservices + API Gateway + RabbitMQ, une base par service) a été fusionné : le gateway est absorbé (les préfixes deviennent les points de montage), et la communication inter-domaines passe d'appels HTTP / d'un exchange RabbitMQ à des **appels de fonction intra-process** et un **bus d'événements in-process**.

### Modules (`packages/backend/src/modules/<domaine>`)

| Module | Préfixe | Responsabilité |
|--------|---------|----------------|
| `auth` | `/auth` | Authentification, OAuth, JWT, RBAC, invitations, reset mot de passe |
| `class` | `/class` | Gestion des classes, élèves, enseignants |
| `grade` | `/grade` | Notes, devoirs, évaluations, cours, matières |
| `planning` | `/planning` | Emplois du temps, sessions, absences, justificatifs |
| `message` | `/message` | Conversations, messagerie interne, pièces jointes |
| `notification` | `/notification` | Notifications (consommateurs d'événements) |
| `parent` | `/parent` | Liaison parent ↔ élève |
| `billing` | `/billing` | Établissements, abonnements Stripe |

Le `frontend` (Nuxt + PrimeVue, SSR/SSG) reste un package séparé et dialogue avec le backend via son proxy `/api/*`.

### Communication inter-domaines

- **Synchrone** → appels de fonction intra-process (ex. `class/service.ts`, `auth/service.ts`) via les `lib/*ServiceClient.ts` (signatures conservées).
- **Asynchrone** → bus d'événements in-process (`src/shared/events`), mêmes clés de routage que l'ancien exchange RabbitMQ.

#### Exemples d'événements (bus in-process)

| Producteur | Événement | Consommateur |
|-----------|-----------|-------------|
| `auth` | `user.created` | `notification` |
| `planning` | `absence.*` | `notification` |
| `message` | `message.received` | `notification` |
| `class` | `student.enrolled` | `notification` |
| `billing` | `billing.*` | `notification` |

## Modèle de données

Une seule base PostgreSQL, **multi-schema** : chaque domaine possède son schéma (`auth`, `class`, `grade`, `planning`, `message`, `notification`, `billing`, `parent`), déclaré dans un `schema.prisma` consolidé (`packages/backend/prisma/schema.prisma`). Les copies locales historiques (ex. User/Class/Course du domaine grade) sont conservées mais renommées (`GradeUser`/`GradeClass`/`GradeCourse`) pour éviter les collisions entre schémas.

### Schémas et modèles principaux

| Schéma | Modèles principaux |
|--------|--------------------|
| `auth` | `User`, `Account`, `InvitationToken`, `PasswordResetToken` |
| `class` | `Class`, `ClassTeacher`, `ClassStudent`, `Course` |
| `grade` | `Grade`, `Assignment`, `GradeCourse`, `Subject`, `Topic`, `GradeUser`, `GradeClass` |
| `planning` | `Session`, `Absence`, `AbsenceJustification`, `JustificationDocument` |
| `message` | `Conversation`, `ConversationParticipant`, `Message`, `MessageRead`, `MessageAttachment` |
| `notification` | `Notification` |
| `billing` | `Establishment`, `EstablishmentMember`, `Subscription`, `StripeWebhookEvent` |
| `parent` | `ParentStudent` |

## Méthodologie

- **Agile / Scrum** — sprints de 2 semaines
- **Durée** — 5 mois · 20 semaines
- **Équipe** — 1 développeur (solo)

### Phases de développement

| Phase | Durée |
|-------|-------|
| Cadrage & architecture | 2 sem |
| Auth + API Gateway | 2 sem |
| Services Élèves & Classes | 3 sem |
| Services Notes & Absences | 3 sem |
| Messagerie & Notifications | 2 sem |
| Frontend (Nuxt + PrimeVue) | 3 sem |
| Tests & intégration | 2 sem |
| Recette & déploiement | 3 sem |

## Contraintes

- Conformité **RGPD** intégrée dès la conception (DPO impliqué)
- Coordination rigoureuse entre les services
- Hébergement éco-responsable (OVH, Infomaniak)

## Acteurs clés

| Acteur | Rôle |
|--------|------|
| Développeurs | Conception, développement, maintenance |
| Architectes (CTO) | Choix techniques, revues d'architecture |
| Établissements pilotes | Tests, feedback, validation |
| DPO | Conformité RGPD |
| Enseignants | Utilisateurs finaux, retours UX |
| Parents d'élèves | Utilisateurs finaux, suivi des enfants |

## Risques principaux

| Risque | Criticité | Plan d'action |
|--------|-----------|---------------|
| Cyberattaque / fuite de données | Critique | Pentests, TLS, audit RGPD |
| Retard de livraison | Critique | Agile, jalons hebdomadaires |
| Mauvaise adoption (< 80%) | Critique | Suivi 50% → 80% → 90% |
| Non-conformité RGPD | Majeur | DPO dès la conception |
| Défaillance fournisseur externe | Majeur | Contrats SLA, backup |