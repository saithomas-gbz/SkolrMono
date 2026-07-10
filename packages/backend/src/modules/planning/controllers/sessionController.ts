import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import { getClassIdsForStudent, getClassIdsForTeacher } from '../lib/classServiceClient';
import { getChildIds } from '../lib/parentServiceClient';

type SessionFilters = {
  classId?: string;
  studentId?: string;
  teacherId?: string;
  scope?: 'mine' | 'class';
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
  const { classId, studentId, teacherId, scope, from, to } = req.query;
  const planningUser = req.planningUser;

  // Filtre effectif dérivé du rôle (RBAC serveur, issue #77) : on ne fait pas
  // confiance aux query params bruts — chaque rôle est restreint à son périmètre.
  // Session n'a pas de champ par élève : on résout studentId/enfants -> classId(s)
  // via le module class pour que le filtre ait un effet réel.
  let classWhere: { equals: string } | { in: string[] } | undefined;
  let teacherWhere: string | undefined;

  if (planningUser && (planningUser.role === 'USER' || planningUser.role === 'PARENT')) {
    // Élève : ses classes ; Parent : classes de ses enfants.
    const students =
      planningUser.role === 'USER' ? [planningUser.userId] : await getChildIds(planningUser.userId);
    const classIdLists = await Promise.all(students.map((id) => getClassIdsForStudent(id)));
    const allowedClassIds = [...new Set(classIdLists.flat())];
    if (classId) {
      if (!allowedClassIds.includes(classId)) return reply.send([]);
      classWhere = { equals: classId };
    } else {
      classWhere = { in: allowedClassIds };
    }
  } else if (planningUser && (planningUser.role === 'TEACHER' || planningUser.role === 'STAFF')) {
    if (scope === 'class' && classId) {
      // Vue « Emploi du temps de la classe » : autorisée seulement si le prof y enseigne.
      const teacherClassIds = await getClassIdsForTeacher(planningUser.userId);
      if (!teacherClassIds.includes(classId)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      classWhere = { equals: classId };
    } else {
      // Vue « Mes matières » (défaut) : uniquement ses propres séances.
      teacherWhere = planningUser.userId;
    }
  } else {
    // ADMIN / PLATFORM_ADMIN : pass-through des filtres fournis.
    if (studentId) {
      const studentClassIds = await getClassIdsForStudent(studentId);
      if (classId && !studentClassIds.includes(classId)) {
        return reply.send([]);
      }
      classWhere = classId ? { equals: classId } : { in: studentClassIds };
    } else if (classId) {
      classWhere = { equals: classId };
    }
    if (teacherId) teacherWhere = teacherId;
  }

  const sessions = await db.session.findMany({
    where: {
      ...(classWhere && { classId: classWhere }),
      ...(teacherWhere && { teacherId: teacherWhere }),
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
