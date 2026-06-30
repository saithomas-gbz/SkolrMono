import type { FastifyPluginAsync } from 'fastify';
import authModule, { authOpenApiTags } from './auth';
import classModule, { classOpenApiTags } from './class';
import billingModule, { billingOpenApiTags } from './billing';
import gradeModule, { gradeOpenApiTags } from './grade';
import planningModule, { planningOpenApiTags } from './planning';
import messageModule, { messageOpenApiTags } from './message';
import parentModule, { parentOpenApiTags } from './parent';
import notificationModule, { notificationOpenApiTags } from './notification';

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
export const modules: AppModule[] = [
  { prefix: '/auth', plugin: authModule, openApiTags: authOpenApiTags },
  { prefix: '/class', plugin: classModule, openApiTags: classOpenApiTags },
  { prefix: '/billing', plugin: billingModule, openApiTags: billingOpenApiTags },
  { prefix: '/grade', plugin: gradeModule, openApiTags: gradeOpenApiTags },
  { prefix: '/planning', plugin: planningModule, openApiTags: planningOpenApiTags },
  { prefix: '/message', plugin: messageModule, openApiTags: messageOpenApiTags },
  { prefix: '/parent', plugin: parentModule, openApiTags: parentOpenApiTags },
  { prefix: '/notification', plugin: notificationModule, openApiTags: notificationOpenApiTags },
];
