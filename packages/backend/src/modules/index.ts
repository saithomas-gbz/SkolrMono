import type { FastifyPluginAsync } from 'fastify';

/**
 * Un module métier du monolithe : un plugin Fastify monté sous son préfixe
 * (ex. `/auth`, `/class`). Le préfixe conserve le contrat d'API historique du
 * gateway, si bien que le frontend reste inchangé.
 */
export interface AppModule {
  prefix: string;
  plugin: FastifyPluginAsync;
  /** Tag OpenAPI + description, agrégés dans la doc Swagger unifiée. */
  openApiTags?: { name: string; description: string }[];
}

/**
 * Registre des modules montés par `app.ts`. Rempli au fur et à mesure de la
 * migration domaine par domaine (auth, class, grade, ...).
 */
export const modules: AppModule[] = [];
