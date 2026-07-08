import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import type { AbsenceRole } from '../../../generated/prisma/client';
import { publish } from '../../../shared/events';
import { getChildIds } from '../lib/parentServiceClient';
import { getClassIdsForTeacher } from '../lib/classServiceClient';

export type AbsenceFilters = {
  sessionId?: string;
  userId?: string;
  role?: AbsenceRole;
  justified?: boolean;
  teacherId?: string;
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
  const { sessionId, userId, role, justified, teacherId } = req.query;
  const planningUser = req.planningUser;

  /** Un élève (`USER`) ne voit que ses propres absences, quel que soit le `userId` demandé (issue #80). */
  let userIdFilter: string | { in: string[] } | undefined = userId;
  if (planningUser?.role === 'USER') {
    userIdFilter = planningUser.userId;
  } else if (planningUser?.role === 'PARENT') {
    const childIds = await getChildIds(planningUser.userId);
    if (userId) {
      if (!childIds.includes(userId)) return reply.status(403).send({ error: 'Forbidden' });
      userIdFilter = userId;
    } else {
      userIdFilter = { in: childIds };
    }
  }

  /** Restreint aux absences des classes de ce prof (dashboard enseignant, issue #97). */
  let sessionFilter: { classId: { in: string[] } } | undefined;
  if (teacherId) {
    const teacherClassIds = await getClassIdsForTeacher(teacherId);
    sessionFilter = { classId: { in: teacherClassIds } };
  }

  const absences = await db.absence.findMany({
    where: {
      ...(sessionId && { sessionId }),
      ...(userIdFilter && { userId: userIdFilter }),
      ...(role && { role }),
      ...(justified !== undefined && { justified }),
      ...(sessionFilter && { session: sessionFilter }),
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

  const planningUser = req.planningUser;
  if (planningUser?.role === 'USER' && absence.userId !== planningUser.userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  if (planningUser?.role === 'PARENT') {
    const childIds = await getChildIds(planningUser.userId);
    if (!childIds.includes(absence.userId)) return reply.status(403).send({ error: 'Forbidden' });
  }

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

  publish('absence.created', {
    absenceId: absence.id,
    sessionId: absence.sessionId,
    userId: absence.userId,
    role: absence.role,
    justified: absence.justified,
  }).catch((err) => req.log.warn({ err }, 'Failed to publish absence.created'));

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
