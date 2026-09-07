import type { FastifyRequest, FastifyReply } from 'fastify';
import { teacherTeachesCourse, getClassIdsForTeacher } from './classServiceClient';

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
