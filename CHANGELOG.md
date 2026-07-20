# Changelog

Toutes les évolutions notables de ce projet sont documentées ici.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

## [1.0.0] - 2026-07-20

Première version publiée de l'application Skolr (backend Fastify + frontend Nuxt),
distribuée sous forme d'images Docker sur GHCR.

### Added
- Backend (Fastify / Prisma / PostgreSQL) : authentification, OAuth Google, email
  transactionnel, billing Stripe, stockage de pièces jointes (S3/MinIO), observabilité Sentry.
- Frontend (Nuxt / PrimeVue) : interface d'administration et espaces utilisateurs.
- Nouveau shell applicatif (rail de navigation + barre du haut), design tokens
  « Modernist » et preset PrimeVue associé.
- Carnet de notes et devoirs (assignments), restylés (KPI + accordéon).
- Emploi du temps : restylage complet, filtrage par rôle (RBAC serveur + UX).
- Dashboard enseignant (vue synthétique classes/activité du jour) et dashboard admin.
- Gestion des présences, restructurée en roster par session.
- Accès parent au bulletin de son propre enfant.
- Authentification par jeton d'accès JWT court (15 min) et jeton de
  rafraîchissement opaque, tracé côté serveur, à rotation à chaque usage et
  révocable (détection de réutilisation → révocation de toute la chaîne en
  cas de vol).
- RGPD : export des données personnelles et droit à l'effacement, opérationnels
  de bout en bout (API + UI).
- Accessibilité : référentiel RGAA 4.1 (sous-ensemble documenté) et actions
  concrètes (navigation clavier, contrastes, lien d'évitement, langue de page,
  état de navigation actif).
- Détection des sessions expirées / tokens invalides avec redirection vers la
  connexion (proactive et réactive, avec rafraîchissement silencieux).
- Pipeline de release : publication des images `skolr-backend` et `skolr-frontend`
  sur GHCR et création automatique de la GitHub Release sur tag `vX.Y.Z`.
- Documentation RNCP 39583 (Bloc 2) : architecture (C4 + diagrammes de
  séquence + ADR), cahier de recettes, plan de correction des bogues, guide
  utilisateur, stratégie et couverture de tests, schéma de base de données.

### Changed
- message/notification : authentification harmonisée via des préhandlers
  partagés (au lieu d'une vérification JWT manuelle dupliquée par contrôleur).
- Emploi du temps : filtres UX simplifiés.

### Security
- Passe de durcissement complète : rate-limiting global et resserré sur
  l'authentification, en-têtes de sécurité HTTP, CORS restreint par
  allowlist, interruption réelle des gardes d'authentification, routes
  d'administration de comptes sécurisées, énumération anonyme des comptes
  bloquée, journalisation structurée des événements de sécurité,
  `trustProxy` explicitement configurable (désactivé par défaut).

### Fixed
- Image Docker backend : dossier `scripts/seed/` manquant du contexte de build.
- Isolation des tests `grade` (fuite globale d'un mock d'événements partagé).
- Variable d'environnement manquante pour le WebSocket dans `.env.example`.

[Unreleased]: https://github.com/saithomas-gbz/SkolrMono/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/saithomas-gbz/SkolrMono/releases/tag/v1.0.0
