import type { FastifyInstance } from 'fastify';
import { listLinks, createLink, deleteLink } from '../controllers/parentLinkController';
import { parentLinkSchema } from '../schemas/parentOpenApi';
import { requireAdminOrStaff } from '../lib/authGuard';
import type { ParentLinkType } from '../generated/prisma/client';

export default async function parentLinkRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { parentId?: string; studentId?: string } }>(
    '/parent/links',
    { schema: { ...parentLinkSchema.list, tags: ['parent'] }, preHandler: requireAdminOrStaff },
    listLinks,
  );
  app.post<{ Body: { parentId: string; studentId: string; linkType?: ParentLinkType; isPrimary?: boolean } }>(
    '/parent/links',
    { schema: { ...parentLinkSchema.create, tags: ['parent'] }, preHandler: requireAdminOrStaff },
    createLink,
  );
  app.delete<{ Params: { id: string } }>(
    '/parent/links/:id',
    { schema: { ...parentLinkSchema.delete, tags: ['parent'] }, preHandler: requireAdminOrStaff },
    deleteLink,
  );
}
