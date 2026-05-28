# SkolrMono

SkolrMono est un monorepo contenant plusieurs services pour une application éducative. Ce dépôt utilise une architecture modulaire pour organiser les différents services et bibliothèques.

## Structure du Projet

```
SkolrMono/
├── packages/
│   ├── auth-service/      # Service d'authentification
│   └── gateway/           # Passerelle API
├── docker-compose.yml     # Configuration Docker pour le développement
├── docker-compose.dev.yml # Configuration Docker pour la production
└── readme.md              # Documentation principale
```

## Services

### auth-service

Le service d'authentification gère l'authentification des utilisateurs, la gestion des sessions et les autorisations. Il est construit avec Node.js et utilise Prisma pour l'accès à la base de données.

**Fonctionnalités principales :**
- Inscription et connexion des utilisateurs
- Gestion des sessions
- Autorisations basées sur les rôles
- Intégration avec Prisma pour la gestion des données

**Technologies :**
- Bun
- TypeScript
- Prisma
- Fastify

### gateway

La passerelle API agit comme un point d'entrée unique pour tous les services. Elle gère le routage des requêtes vers les services appropriés et peut inclure des fonctionnalités transversales comme l'authentification, la journalisation et la limitation de débit.

**Fonctionnalités principales :**
- Routage des requêtes
- Agrégation des services
- Middleware pour l'authentification et la journalisation

**Technologies :**
- Node.js
- TypeScript

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
   Cette commande démarre les conteneurs Postgres, applique les migrations Prisma sur `auth-service`, `class-service` et `grade-service`, puis exécute les seeds. Si Postgres tourne déjà et que les migrations sont à jour, vous pouvez ne lancer que les seeds :
   ```bash
   bun run seed:dev
   ```
   Pour ne seed qu’un service : `bun run seed:dev --only=auth-service` (idem pour `class-service`, `grade-service`).

## Données de développement (comptes de test)

Les seeds créent des comptes et des données de démo **uniquement pour le développement local**. Les mots de passe sont en clair dans le code source — ne jamais réutiliser ce schéma en production.

### Comptes utilisateurs (auth-service)

Ces comptes sont créés ou mis à jour de façon idempotente par `packages/auth-service/prisma/seed.ts` (emails `@skolr.local`).

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `dev.admin@skolr.local` | `dev-admin-123` | ADMIN |
| `dev.user@skolr.local` | `dev-user-123` | USER |
| `dev.teacher@skolr.local` | `dev-teacher-123` | TEACHER |
| `dev.student@skolr.local` | `dev-student-123` | USER |

Les identifiants UUID sont stables entre services (voir `scripts/seed/dev-users.ts`) pour que `class-service` et `grade-service` puissent référencer les mêmes utilisateurs.

### Données associées (class-service, grade-service)

Après `bun run seed:dev` :

- **Classes** : `CM2-A` (primaire), `6ème Sciences` (collège), avec affectations enseignants / élèves.
- **Notes** : élèves `dev.student` (CM2-A + 6ème Sciences) et `dev.user` (CM2-A), alignées sur les inscriptions class-service (pas de note pour les profs).

### Se connecter (exemple)

Avec la gateway sur le port par défaut `3001` et les services locaux démarrés :

```bash
curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev.user@skolr.local","password":"dev-user-123"}'
```

Connexion directe au auth-service (sans préfixe `/auth`) :

```bash
curl -s -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dev.user@skolr.local","password":"dev-user-123"}'
```

Le script `packages/gateway/scripts/seed-dev.ts` (appelé à la fin de `bun run seed:dev`) affiche aussi ces identifiants et des exemples `curl` dans le terminal.

### Scripts utiles (base de données)

| Commande | Description |
|----------|-------------|
| `bun run db:run:stack` | Postgres (Docker) → migrations → seeds complets |
| `bun run db:run:stack --no-docker` | Migrations + seeds (Postgres déjà démarré) |
| `bun run db:run:stack --no-seed` | Postgres + migrations uniquement |
| `bun run seed:dev` | Seeds uniquement (auth → class → grade → rappel gateway) |
| `bun run db:migrate:dev` | Appliquer les migrations sans seed |

## Développement

### Structure des Packages

Chaque package dans le dossier `packages/` est un service ou une bibliothèque indépendante. Chaque package a son propre fichier `package.json` et peut être développé et testé indépendamment.

### Scripts Utiles

- **Installer les dépendances de tous les packages :**
  ```bash
  bun run install:all
  ```

- **Construire tous les packages :**
  ```bash
  bun run build:all
  ```

- **Démarrer tous les services en mode développement :**
  ```bash
  bun run dev
  ```

- **Données de test (comptes, classes, notes) :** voir [Données de développement](#données-de-développement-comptes-de-test) — `bun run db:run:stack` ou `bun run seed:dev`.

## Tests

Pour exécuter les tests de tous les packages :

```bash
bun test
```

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
