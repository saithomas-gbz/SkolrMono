/**
 * Base de données du monolithe modulaire (#114) : un seul backend, une seule
 * base Postgres multi-schema. Historiquement un tableau (un service = une base) ;
 * conservé sous forme de tableau à une entrée pour ne pas réécrire les scripts
 * d'orchestration (migrate/seed/run-stack).
 */
export type DbService = {
  packageDir: string;
  /** docker-compose service name */
  composeService: string;
  defaultDatabaseUrl: string;
  migrateScript: 'db:migrate:deploy';
  seedScript?: 'db:seed';
};

export const DB_SERVICES: DbService[] = [
  {
    packageDir: 'backend',
    composeService: 'postgres',
    defaultDatabaseUrl:
      'postgresql://postgres:postgres@localhost:5432/skolr?schema=public',
    migrateScript: 'db:migrate:deploy',
    seedScript: 'db:seed',
  },
];

export const COMPOSE_DB_SERVICES = [
  ...new Set(DB_SERVICES.map((s) => s.composeService)),
];
