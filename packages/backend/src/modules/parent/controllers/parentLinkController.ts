import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import type { ParentLinkType } from '../../../generated/prisma/client';

type ListLinksQuery = { parentId?: string; studentId?: string };
type CreateLinkBody = {
  parentId: string;
  studentId: string;
  linkType?: ParentLinkType;
  isPrimary?: boolean;
};
type DeleteLinkParams = { id: string };

export async function listLinks(req: FastifyRequest<{ Querystring: ListLinksQuery }>, reply: FastifyReply) {
  const { parentId, studentId } = req.query;
  const links = await db.parentStudent.findMany({
    where: { ...(parentId && { parentId }), ...(studentId && { studentId }) },
    orderBy: { createdAt: 'desc' },
  });
  return reply.send({ data: links });
}

export async function createLink(req: FastifyRequest<{ Body: CreateLinkBody }>, reply: FastifyReply) {
  const { parentId, studentId, linkType, isPrimary } = req.body;

  const existing = await db.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (existing) return reply.status(409).send({ error: 'Link already exists' });

  const link = await db.parentStudent.create({
    data: { parentId, studentId, linkType: linkType ?? 'LEGAL_GUARDIAN', isPrimary: isPrimary ?? false },
  });
  return reply.status(201).send(link);
}

export async function deleteLink(req: FastifyRequest<{ Params: DeleteLinkParams }>, reply: FastifyReply) {
  const existing = await db.parentStudent.findUnique({ where: { id: req.params.id } });
  if (!existing) return reply.status(404).send({ error: 'Link not found' });
  await db.parentStudent.delete({ where: { id: req.params.id } });
  return reply.status(204).send();
}
