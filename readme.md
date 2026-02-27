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
- Node.js
- TypeScript
- Prisma
- Express

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

- Node.js (version 16 ou supérieure)
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
   npm install
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

## Développement

### Structure des Packages

Chaque package dans le dossier `packages/` est un service ou une bibliothèque indépendante. Chaque package a son propre fichier `package.json` et peut être développé et testé indépendamment.

### Scripts Utiles

- **Installer les dépendances de tous les packages :**
  ```bash
  npm run install:all
  ```

- **Construire tous les packages :**
  ```bash
  npm run build:all
  ```

- **Démarrer tous les services en mode développement :**
  ```bash
  npm run dev
  ```

## Tests

Pour exécuter les tests de tous les packages :

```bash
npm test
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
