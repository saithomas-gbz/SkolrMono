import type { FastifyInstance } from 'fastify';
import { getChildren, getChildById, getParentIds } from '../controllers/parentController';
import { parentSchema } from '../schemas/parentOpenApi';
import { requireAdminOrStaff, requireParentOrStaff } from '../lib/authGuard';

/**
 * Aucune de ces trois routes ne déclarait de `preHandler` (#241). L'application
 * ne pose pas de hook d'authentification global : deux d'entre elles étaient donc
 * joignables sans jeton. Héritage de l'époque microservices, où elles n'étaient
 * pas exposées publiquement — depuis #114 les appels internes passent par
 * `parent/service.ts`, en intra-process.
 */
export default async function parentRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { parentId?: string } }>(
    '/children',
    { schema: { ...parentSchema.getChildren, tags: ['parent'] }, preHandler: requireParentOrStaff },
    getChildren,
  );
  app.get<{ Params: { studentId: string } }>(
    '/children/:studentId',
    { schema: { ...parentSchema.getChildById, tags: ['parent'] }, preHandler: requireParentOrStaff },
    getChildById,
  );
  // Recherche inverse « parents de cet enfant » : reconstitue le graphe des
  // responsables légaux, donc réservée à l'administration.
  app.get<{ Querystring: { studentId?: string } }>(
    '/parents',
    { schema: { ...parentSchema.getParentIds, tags: ['parent'] }, preHandler: requireAdminOrStaff },
    getParentIds,
  );
}
