# Changelog

Toutes les évolutions notables de ce projet sont documentées ici.

Le format s'appuie sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

## [1.0.0] - 2026-07-13

Première version publiée de l'application Skolr (backend Fastify + frontend Nuxt),
distribuée sous forme d'images Docker sur GHCR.

### Added
- Backend (Fastify / Prisma / PostgreSQL) : authentification, OAuth Google, email
  transactionnel, billing Stripe, stockage de pièces jointes (S3/MinIO), observabilité Sentry.
- Frontend (Nuxt / PrimeVue) : interface d'administration et espaces utilisateurs.
- Carnet de notes et devoirs (assignments).
- Gestion des présences (attendance roster).
- Détection des sessions expirées / tokens invalides avec redirection vers la connexion.
- Pipeline de release : publication des images `skolr-backend` et `skolr-frontend`
  sur GHCR et création automatique de la GitHub Release sur tag `vX.Y.Z`.

[Unreleased]: https://github.com/saithomas-gbz/SkolrMono/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/saithomas-gbz/SkolrMono/releases/tag/v1.0.0
