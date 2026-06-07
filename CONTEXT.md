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
| Backend | TypeScript · Fastify · Prisma |
| Base de données | PostgreSQL (une BDD par service) |
| Frontend | Nuxt · PrimeVue |
| Infra | Docker · CI/CD |
| Auth | OAuth Google · JWT · RBAC |
| Communication | API Gateway · Kafka (message broker) · Redis (cache/sessions) |
| IA | Serveur MCP |

## Architecture

Architecture **microservices** avec une API Gateway centralisée comme point d'entrée unique. Chaque service est indépendant, conteneurisé via Docker, avec sa propre base de données PostgreSQL.

### Services

| Service | Responsabilité | BDD |
|---------|---------------|-----|
| `auth-service` | Authentification, OAuth, JWT, RBAC, sessions Redis | PostgreSQL Users |
| `class-service` | Gestion des classes, élèves, enseignants | PostgreSQL Class |
| `planning-service` | Emplois du temps, absences, alertes | PostgreSQL Planning |
| `grade-service` | Notes, bulletins, évaluations, cours | PostgreSQL Grades |
| `message-service` | Conversations, messagerie interne | PostgreSQL Messages |
| `notification-service` | Notifications email, SMS, push | — |
| `parent-service` | Liaison parent ↔ élève | — |
| `frontend` | Interface Nuxt + PrimeVue (SSR/SSG) | — |
| `mcp-server` | Serveur MCP pour fonctionnalités IA | — |

### Communication inter-services

- **Synchrone** → API Gateway (REST)
- **Asynchrone** → Kafka (événements inter-services)

#### Exemples d'événements Kafka

| Producteur | Événement | Consommateur |
|-----------|-----------|-------------|
| `auth-service` | `user.created` | `notification-service` |
| `planning-service` | `absence.detected` | `notification-service` |
| `message-service` | `message.received` | `notification-service` |
| `class-service` | `student.enrolled` | `auth-service` |

## Modèle de données (DBML)

Chaque service dispose de ses propres tables. Les données partagées entre services sont **dupliquées localement** (pattern de copie locale) pour garantir l'indépendance et éviter les appels cross-service synchrones.

### Services et tables

| Service | Tables principales |
|---------|-------------------|
| `auth-service` | `users_auth`, `accounts` |
| `class-service` | `classes`, `class_teachers`, `class_students` |
| `grade-service` | `grades`, `courses`, `users_grade`, `classes_grade` |
| `planning-service` | `absences`, `users_absence`, `classes_absence` |
| `message-service` | `messages`, `conversations`, `conversation_participants`, `users_message` |
| `notification-service` | `notifications`, `users_notification` |
| `parent-service` | `parent_students`, `users_parent` |

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