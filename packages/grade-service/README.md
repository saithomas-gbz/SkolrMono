# grade-service

Service de notes (Prisma + PostgreSQL). Dépendances gérées par le **monorepo** à la racine.

```bash
# Depuis la racine du repo uniquement
bun install
bun run db:run:stack   # postgres-grade + migrations (quand configuré)
```

```bash
cd packages/grade-service
bun run prisma:migrate
bun run dev
```

Ne pas lancer `bun install` dans ce dossier : cela crée un `node_modules` local inutile.
