import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import { getUsersByIds } from '../lib/authServiceClient';

type GetChildrenQuery = { parentId?: string };
type GetChildByIdParams = { studentId: string };
type GetParentIdsQuery = { studentId?: string };

export async function getChildren(
  req: FastifyRequest<{ Querystring: GetChildrenQuery }>,
  reply: FastifyReply,
) {
  const user = req.parentUser!;

  // Le `parentId` du client n'est honoré que pour un ADMIN ou un STAFF. Un PARENT
  // est toujours ramené à son propre identifiant : auparavant le contrôle du jeton
  // vivait dans un `if (!parentId)`, si bien que fournir le paramètre sautait
  // l'authentification et livrait les enfants de n'importe quel parent — avec leur
  // fiche complète, nom et e-mail compris (#241).
  const parentId = user.role === 'PARENT' ? user.userId : req.query.parentId;
  if (!parentId) {
    return reply.status(400).send({ error: 'parentId is required' });
  }

  const links = await db.parentStudent.findMany({
    where: { parentId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  const students = await getUsersByIds(links.map((link) => link.studentId));
  const studentsById = new Map(students.map((s) => [s.id, s]));

  const data = links.map((link) => ({
    id: link.id,
    studentId: link.studentId,
    linkType: link.linkType,
    isPrimary: link.isPrimary,
    student: studentsById.get(link.studentId) ?? null,
  }));

  return reply.send({ data });
}

export async function getChildById(
  req: FastifyRequest<{ Params: GetChildByIdParams }>,
  reply: FastifyReply,
) {
  const { studentId } = req.params;
  const payload = req.parentUser!;

  if (payload.role === 'PARENT') {
    const link = await db.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: payload.userId, studentId } },
    });
    if (!link) return reply.status(403).send({ error: 'Forbidden' });
  } else if (!['ADMIN', 'STAFF'].includes(payload.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  const [student] = await getUsersByIds([studentId]);
  if (!student) return reply.status(404).send({ error: 'Student not found' });
  return reply.send({ data: student });
}

/**
 * Recherche inverse « parents de cet enfant ». Le commentaire précédent la disait
 * volontairement non protégée, au titre d'un appel inter-services — justification
 * caduque depuis #114 : les modules `notification` et `planning` passent par
 * `parent/service.ts`, en intra-process. La route HTTP n'a plus d'appelant et
 * reconstitue le graphe des responsables légaux : réservée à l'administration.
 */
export async function getParentIds(
  req: FastifyRequest<{ Querystring: GetParentIdsQuery }>,
  reply: FastifyReply,
) {
  const { studentId } = req.query;
  if (!studentId) return reply.status(400).send({ error: 'studentId is required' });

  const links = await db.parentStudent.findMany({ where: { studentId } });
  return reply.send({ data: links.map((link) => link.parentId) });
}
