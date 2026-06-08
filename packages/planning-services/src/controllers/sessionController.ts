import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

type SessionFilters = {
  classId?: string;
  teacherId?: string;
  from?: string;
  to?: string;
};

type CreateSessionBody = {
  classId: string;
  courseId: string;
  teacherId: string;
  room?: string;
  startAt: string;
  endAt: string;
  recurrenceRule?: string;
};

type UpdateSessionBody = {
  room?: string;
  startAt?: string;
  endAt?: string;
  recurrenceRule?: string;
  teacherId?: string;
};

export async function getSessions(
  req: FastifyRequest<{ Querystring: SessionFilters }>,
  reply: FastifyReply,
) {
  const { classId, teacherId, from, to } = req.query;

  const sessions = await db.session.findMany({
    where: {
      ...(classId && { classId }),
      ...(teacherId && { teacherId }),
      ...(from || to
        ? {
            startAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    },
    orderBy: { startAt: 'asc' },
  });

  return reply.send(sessions);
}

export async function getSessionById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const session = await db.session.findUnique({
    where: { id: req.params.id },
    include: { absences: true },
  });
  if (!session) return reply.status(404).send({ error: 'Session not found' });
  return reply.send(session);
}

export async function createSession(
  req: FastifyRequest<{ Body: CreateSessionBody }>,
  reply: FastifyReply,
) {
  const { classId, courseId, teacherId, room, startAt, endAt, recurrenceRule } = req.body;
  const session = await db.session.create({
    data: {
      classId,
      courseId,
      teacherId,
      room,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      recurrenceRule,
    },
  });
  return reply.status(201).send(session);
}

export async function updateSession(
  req: FastifyRequest<{ Params: { id: string }; Body: UpdateSessionBody }>,
  reply: FastifyReply,
) {
  const existing = await db.session.findUnique({ where: { id: req.params.id } });
  if (!existing) return reply.status(404).send({ error: 'Session not found' });

  const { room, startAt, endAt, recurrenceRule, teacherId } = req.body;
  const session = await db.session.update({
    where: { id: req.params.id },
    data: {
      ...(room !== undefined && { room }),
      ...(teacherId && { teacherId }),
      ...(startAt && { startAt: new Date(startAt) }),
      ...(endAt && { endAt: new Date(endAt) }),
      ...(recurrenceRule !== undefined && { recurrenceRule }),
    },
  });
  return reply.send(session);
}

export async function deleteSession(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const existing = await db.session.findUnique({ where: { id: req.params.id } });
  if (!existing) return reply.status(404).send({ error: 'Session not found' });
  await db.session.delete({ where: { id: req.params.id } });
  return reply.status(204).send();
}
