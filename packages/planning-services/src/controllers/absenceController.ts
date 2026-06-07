import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import type { AbsenceRole } from '../generated/prisma/client';

type AbsenceFilters = {
  sessionId?: string;
  userId?: string;
  role?: AbsenceRole;
  justified?: boolean;
};

type CreateAbsenceBody = {
  sessionId: string;
  userId: string;
  role: AbsenceRole;
  justified?: boolean;
  reason?: string;
};

type UpdateAbsenceBody = {
  justified?: boolean;
  reason?: string;
};

export async function getAbsences(
  req: FastifyRequest<{ Querystring: AbsenceFilters }>,
  reply: FastifyReply,
) {
  const { sessionId, userId, role, justified } = req.query;

  const absences = await db.absence.findMany({
    where: {
      ...(sessionId && { sessionId }),
      ...(userId && { userId }),
      ...(role && { role }),
      ...(justified !== undefined && { justified }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return reply.send(absences);
}

export async function getAbsenceById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const absence = await db.absence.findUnique({ where: { id: req.params.id } });
  if (!absence) return reply.status(404).send({ error: 'Absence not found' });
  return reply.send(absence);
}

export async function createAbsence(
  req: FastifyRequest<{ Body: CreateAbsenceBody }>,
  reply: FastifyReply,
) {
  const { sessionId, userId, role, justified, reason } = req.body;

  const existing = await db.absence.findUnique({ where: { sessionId_userId: { sessionId, userId } } });
  if (existing) return reply.status(409).send({ error: 'Absence already recorded for this user and session' });

  const absence = await db.absence.create({
    data: { sessionId, userId, role, justified: justified ?? false, reason },
  });
  return reply.status(201).send(absence);
}

export async function updateAbsence(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateAbsenceBody }>,
  reply: FastifyReply,
) {
  const existing = await db.absence.findUnique({ where: { id: req.params.id } });
  if (!existing) return reply.status(404).send({ error: 'Absence not found' });

  const { justified, reason } = req.body;
  const absence = await db.absence.update({
    where: { id: req.params.id },
    data: {
      ...(justified !== undefined && { justified }),
      ...(reason !== undefined && { reason }),
    },
  });
  return reply.send(absence);
}

export async function deleteAbsence(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const existing = await db.absence.findUnique({ where: { id: req.params.id } });
  if (!existing) return reply.status(404).send({ error: 'Absence not found' });
  await db.absence.delete({ where: { id: req.params.id } });
  return reply.status(204).send();
}
