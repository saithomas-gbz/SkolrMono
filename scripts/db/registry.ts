/**
 * DB-backed services in dependency order (auth before class).
 * Add a new service here when it gets Prisma + docker postgres.
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
    packageDir: 'auth-service',
    composeService: 'postgres',
    defaultDatabaseUrl:
      'postgresql://postgres:postgres@localhost:5432/skolr_auth?schema=public',
    migrateScript: 'db:migrate:deploy',
    seedScript: 'db:seed',
  },
  {
    packageDir: 'class-service',
    composeService: 'postgres-class',
    defaultDatabaseUrl:
      'postgresql://postgres:postgres@localhost:5433/skolr_class?schema=public',
    migrateScript: 'db:migrate:deploy',
    seedScript: 'db:seed',
  },
  {
    packageDir: 'grade-service',
    composeService: 'postgres-grade',
    defaultDatabaseUrl:
      'postgresql://postgres:postgres@localhost:5434/skolr_grade?schema=public',
    migrateScript: 'db:migrate:deploy',
    seedScript: 'db:seed',
  },
];

export const COMPOSE_DB_SERVICES = [
  ...new Set(DB_SERVICES.map((s) => s.composeService)),
];
