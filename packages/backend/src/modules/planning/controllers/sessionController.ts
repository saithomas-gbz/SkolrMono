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

/**
 * Un TEACHER n'écrit que sur les classes où il enseigne ; STAFF et ADMIN gardent
 * le pass-through. Symétrique du filtrage déjà appliqué en lecture par
 * `getSessions` — sans quoi le garde `requireStaff` laisserait n'importe quel
 * prof déplacer ou supprimer les séances d'un collègue (#233).
 */
async function denyIfOutsideTeacherScope(
  req: FastifyRequest,
  reply: FastifyReply,
  classId: string,
): Promise<boolean> {
  const planningUser = req.planningUser;
  if (planningUser?.role !== 'TEACHER') return false;

  const teacherClassIds = await getClassIdsForTeacher(planningUser.userId);
  if (teacherClassIds.includes(classId)) return false;

  await reply.status(403).send({ error: 'Forbidden' });
  return true;
}

/**
 * Un même créneau ne doit être occupé ni par le même enseignant ni par la même
 * classe (#245) : deux requêtes séparées plutôt qu'un OR unique, pour distinguer
 * le message d'erreur et parce que Prisma ne permet pas de savoir laquelle des
 * deux branches d'un OR a matché sans requêter à nouveau.
 * Chevauchement strict : deux créneaux adjacents (10:00-11:00 / 11:00-12:00) ne
 * sont PAS en conflit, d'où les comparaisons `<` / `>` (et non `<=` / `>=`).
 */
async function findScheduleConflict(params: {
  classId: string;
  teacherId: string;
  startAt: Date;
  endAt: Date;
  excludeId?: string;
}): Promise<'teacher' | 'class' | null> {
  const { classId, teacherId, startAt, endAt, excludeId } = params;
  const overlapsWindow = { startAt: { lt: endAt }, endAt: { gt: startAt } };

  const [teacherConflict, classConflict] = await Promise.all([
    db.session.findFirst({
      where: {
        teacherId,
        ...(excludeId && { id: { not: excludeId } }),
        ...overlapsWindow,
      },
    }),
    db.session.findFirst({
      where: {
        classId,
        ...(excludeId && { id: { not: excludeId } }),
        ...overlapsWindow,
      },
    }),
  ]);

  if (teacherConflict) return 'teacher';
  if (classConflict) return 'class';
  return null;
}

const conflictMessage: Record<'teacher' | 'class', string> = {
  teacher: 'This teacher already has a session overlapping this time slot',
  class: 'This class already has a session overlapping this time slot',
};

export async function createSession(
  req: FastifyRequest<{ Body: CreateSessionBody }>,
  reply: FastifyReply,
) {
  const { classId, courseId, teacherId, room, startAt, endAt, recurrenceRule } = req.body;

  if (await denyIfOutsideTeacherScope(req, reply, classId)) return;

  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (endDate <= startDate) {
    return reply.status(400).send({ error: 'endAt must be strictly after startAt' });
  }

  const conflict = await findScheduleConflict({
    classId,
    teacherId,
    startAt: startDate,
    endAt: endDate,
  });
  if (conflict) return reply.status(409).send({ error: conflictMessage[conflict] });

  const session = await db.session.create({
    data: {
      classId,
      courseId,
      teacherId,
      room,
      startAt: startDate,
      endAt: endDate,
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

  if (await denyIfOutsideTeacherScope(req, reply, existing.classId)) return;

  const { room, startAt, endAt, recurrenceRule, teacherId } = req.body;

  // La détection de conflit doit porter sur les horaires/enseignant EFFECTIFS
  // après modification, pas seulement sur les champs fournis dans le body —
  // sinon déplacer uniquement `startAt` ne serait jamais comparé au bon `endAt`.
  const effectiveStart = startAt ? new Date(startAt) : existing.startAt;
  const effectiveEnd = endAt ? new Date(endAt) : existing.endAt;
  const effectiveTeacherId = teacherId ?? existing.teacherId;

  if (effectiveEnd <= effectiveStart) {
    return reply.status(400).send({ error: 'endAt must be strictly after startAt' });
  }

  if (startAt || endAt || teacherId) {
    const conflict = await findScheduleConflict({
      classId: existing.classId,
      teacherId: effectiveTeacherId,
      startAt: effectiveStart,
      endAt: effectiveEnd,
      excludeId: existing.id,
    });
    if (conflict) return reply.status(409).send({ error: conflictMessage[conflict] });
  }

  const session = await db.session.update({
    where: { id: req.params.id },
    data: {
      ...(room !== undefined && { room }),
      ...(teacherId && { teacherId }),
      ...(startAt && { startAt: effectiveStart }),
      ...(endAt && { endAt: effectiveEnd }),
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

  if (await denyIfOutsideTeacherScope(req, reply, existing.classId)) return;

  await db.session.delete({ where: { id: req.params.id } });
  return reply.status(204).send();
}
