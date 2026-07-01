# SkolrMono

SkolrMono est un monorepo pour une application éducative. Le backend est un **monolithe modulaire** (#114) : un seul service Fastify où chaque domaine métier est un plugin monté sous son préfixe (`/auth`, `/class`, `/grade`…), sur une base PostgreSQL unique multi-schema. Le frontend Nuxt reste un package séparé.

## Structure du Projet

```
SkolrMono/
├── packages/
│   ├── backend/           # Monolithe modulaire (Fastify + Prisma, tous les domaines)
│   │   └── src/modules/   #   auth, class, grade, planning, message, notification, parent, billing
│   └── frontend/          # Interface Nuxt + PrimeVue
├── scripts/               # Orchestration DB (migrate/seed) + fixtures de dev partagées
├── docker-compose.yml     # Stack complète (backend, postgres, minio, monitoring, frontend)
├── docker-compose.dev.yml # Variante dev minimale (backend + postgres)
└── readme.md              # Documentation principale
```

## Backend (monolithe modulaire)

`packages/backend` héberge tous les domaines métier sous forme de plugins Fastify. Chaque module vit dans `src/modules/<domaine>` et est monté sous son préfixe, ce qui conserve le contrat d'API historique (le frontend est inchangé).

**Domaines / préfixes :** `auth` (`/auth`), `class` (`/class`), `grade` (`/grade`), `planning` (`/planning`), `message` (`/message`), `notification` (`/notification`), `parent` (`/parent`), `billing` (`/billing`).

**Communication intra-process :** appels de fonction directs (`lib/*ServiceClient.ts`) pour le synchrone, bus d'événements in-process (`src/shared/events`) pour l'asynchrone — mêmes clés de routage que l'ancien exchange RabbitMQ.

**Technologies :** Bun · TypeScript · Fastify · Prisma (multi-schema) · PostgreSQL.

Documentation OpenAPI unifiée : `http://localhost:3001/docs` (tous les endpoints préfixés) une fois le backend démarré.

## Configuration et Installation

### Prérequis

- Bun (version 1.0 ou supérieure)
- Docker (pour l'environnement de développement)
- Docker Compose

### Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/votre-utilisateur/SkolrMono.git
   cd SkolrMono
   ```

2. Installer les dépendances :
   ```bash
   bun install
   ```

3. Configurer les variables d'environnement :
   - Copier les fichiers `.env.example` dans chaque service et les renommer en `.env`.
   - Remplir les variables d'environnement nécessaires.

4. Démarrer les services avec Docker :
   ```bash
   docker compose up -d
   ```

Pour un environnement de développement, utilisez :
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

5. Initialiser les bases (PostgreSQL, migrations, seeds de dev) :
   ```bash
   bun run db:run:stack
   ```
   Cette commande démarre le conteneur Postgres, applique les migrations Prisma sur la base unique multi-schema, puis exécute le seed consolidé. Si Postgres tourne déjà et que les migrations sont à jour, vous pouvez ne lancer que le seed :
   ```bash
   bun run seed:dev
   ```

## Données de développement (comptes de test)

Les seeds créent des comptes et des données de démo **uniquement pour le développement local**. Les mots de passe sont en clair dans le code source — ne jamais réutiliser ce schéma en production.

### Comptes utilisateurs

Ces comptes sont créés ou mis à jour de façon idempotente par le seed consolidé `packages/backend/prisma/seed.ts` (emails `@skolr.local`).

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `dev.admin@skolr.local` | `dev-admin-123` | ADMIN |
| `dev.user@skolr.local` | `dev-user-123` | USER |
| `dev.teacher@skolr.local` | `dev-teacher-123` | TEACHER |
| `dev.student@skolr.local` | `dev-student-123` | USER |
| `platform.admin@skolr.local` | `dev-platform-123` | PLATFORM_ADMIN |

Les identifiants UUID sont stables (voir `scripts/seed/dev-users.ts`, la source de vérité partagée par tous les domaines).

### Données associées

Après `bun run seed:dev`, le seed remplit tous les schémas dans une même transaction logique :

- **Classes** : `CM2-A` (primaire), `6ème Sciences` (collège), avec affectations enseignants / élèves.
- **Notes** : devoirs et notes alignés sur les inscriptions (pas de note pour les profs).
- **Planning** : emploi du temps 2025-2026, absences et justificatifs de démonstration.
- **Messagerie** : une conversation de démonstration (avec un message non lu côté élève).
- **Billing** : établissement « Collège Skolr Demo » avec abonnement STARTER.

### Se connecter (exemple)

Avec le backend sur le port par défaut `3001` :

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev.user@skolr.local","password":"dev-user-123"}'
```

### Scripts utiles (base de données)

| Commande | Description |
|----------|-------------|
| `bun run db:run:stack` | Postgres (Docker) → migrations → seed complet |
| `bun run db:run:stack --no-docker` | Migrations + seed (Postgres déjà démarré) |
| `bun run db:run:stack --no-seed` | Postgres + migrations uniquement |
| `bun run seed:dev` | Seed uniquement (base unique multi-schema) |
| `bun run db:migrate:dev` | Appliquer les migrations sans seed |

## Développement

### Packages

Le monorepo Bun contient deux packages : `backend` (monolithe modulaire) et `frontend` (Nuxt). Chacun a son `package.json` et se développe indépendamment.

### Scripts Utiles

- **Installer les dépendances :**
  ```bash
  bun install
  ```

- **Backend en mode développement (watch) :**
  ```bash
  cd packages/backend && bun run dev      # http://localhost:3001
  ```

- **Frontend en mode développement :**
  ```bash
  cd packages/frontend && bun run dev     # http://localhost:8000
  ```

- **Qualité (racine) :** `bun run lint` (ESLint) · `bun run knip` (code mort / deps inutilisées).

- **Données de test (comptes, classes, notes) :** voir [Données de développement](#données-de-développement-comptes-de-test) — `bun run db:run:stack` ou `bun run seed:dev`.

## Tests

Tests unitaires du backend (tous les modules, base mockée en `NODE_ENV=test`) :

```bash
cd packages/backend && bun test src
```

Tests E2E frontend (Playwright) : voir `packages/e2e`.

## Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes pour contribuer :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commitez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Contact

Pour toute question ou suggestion, veuillez ouvrir une issue sur GitHub.
