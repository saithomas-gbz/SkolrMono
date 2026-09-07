import type { FastifyRequest, FastifyReply } from 'fastify';
import { teacherTeachesCourse, getClassIdsForTeacher } from './classServiceClient';
import db from '../db';

/**
 * Périmètre d'écriture et de lecture d'un enseignant sur le carnet de notes.
 *
 * Le garde `requireStaff` place TEACHER, STAFF et ADMIN au même niveau : il
 * répond « est-ce un membre du personnel ? », jamais « ce personnel-là a-t-il
 * affaire à cette classe ? ». Sans ce second contrôle, n'importe quel
 * enseignant agit sur les devoirs et les notes de tout l'établissement (#234).
 *
 * Deux règles seulement :
 *   - STAFF et ADMIN gardent le pass-through, comme dans les autres modules ;
 *   - TEACHER est restreint au couple (classe, cours) qu'il enseigne, ou à
 *     défaut aux classes où il intervient.
 *
 * L'identité vient toujours de `request.gradeUser`, jamais du corps de la
 * requête : un `teacherId` fourni par le client rend le contrôle
 * auto-déclaratif, donc inopérant.
 */

const SCOPED_ROLE = 'TEACHER';

/** Identifiant de l'enseignant authentifié, ou `null` si le rôle n'est pas restreint. */
export function scopedTeacherId(request: FastifyRequest): string | null {
  const gradeUser = request.gradeUser;
  return gradeUser?.role === SCOPED_ROLE ? gradeUser.userId : null;
}

/**
 * Refuse un enseignant qui n'enseigne pas ce cours dans cette classe.
 * Renvoie `true` si la réponse a été envoyée — l'appelant doit alors sortir.
 */
export async function denyOutsideCourseScope(
  request: FastifyRequest,
  reply: FastifyReply,
  classId: string,
  courseId: string,
): Promise<boolean> {
  const teacherId = scopedTeacherId(request);
  if (!teacherId) return false;

  if (await teacherTeachesCourse(classId, teacherId, courseId)) return false;

  await reply.status(403).send({ error: 'Forbidden' });
  return true;
}

/**
 * Refuse un enseignant qui n'intervient pas dans cette classe. Utilisé là où la
 * granularité pertinente est la classe et non le cours — le carnet complet, par
 * exemple, couvre toutes les matières d'une classe.
 */
export async function denyOutsideClassScope(
  request: FastifyRequest,
  reply: FastifyReply,
  classId: string,
): Promise<boolean> {
  const teacherId = scopedTeacherId(request);
  if (!teacherId) return false;

  const classIds = await getClassIdsForTeacher(teacherId);
  if (classIds.includes(classId)) return false;

  await reply.status(403).send({ error: 'Forbidden' });
  return true;
}

/**
 * Périmètre de LECTURE des devoirs, tous rôles confondus.
 *
 * Les deux routes de lecture (`getAssignments`, `getAssignmentById`) sont en
 * `requireAuth` : élèves et parents y accèdent légitimement, pour consulter leurs
 * devoirs. Mais elles ne filtraient rien pour ces rôles — un élève recevait la
 * liste de tous les devoirs de l'établissement, brouillons compris. Après le
 * périmètre enseignant, un professeur s'y trouvait plus restreint qu'un élève.
 *
 * Renvoie `null` quand l'accès n'est pas restreint (STAFF, ADMIN).
 */
export async function assignmentReadScope(
  request: FastifyRequest,
): Promise<{ classIds: string[]; publishedOnly: boolean } | null> {
  const gradeUser = request.gradeUser;
  if (!gradeUser) return { classIds: [], publishedOnly: true };

  if (gradeUser.role === SCOPED_ROLE) {
    // Un enseignant voit ses classes, brouillons compris : il les rédige.
    return { classIds: await getClassIdsForTeacher(gradeUser.userId), publishedOnly: false };
  }

  if (gradeUser.role === 'USER') {
    const student = await db.user.findUnique({ where: { id: gradeUser.userId } });
    return { classIds: student?.classId ? [student.classId] : [], publishedOnly: true };
  }

  if (gradeUser.role === 'PARENT') {
    const links = await db.parentStudent.findMany({
      where: { parentId: gradeUser.userId },
      select: { studentId: true },
    });
    const children = await db.user.findMany({
      where: { id: { in: links.map((l) => l.studentId) } },
      select: { classId: true },
    });
    const classIds = [...new Set(children.map((c) => c.classId).filter((id): id is string => !!id))];
    return { classIds, publishedOnly: true };
  }

  return null;
}
