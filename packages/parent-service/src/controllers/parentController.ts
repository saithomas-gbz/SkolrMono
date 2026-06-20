import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { getUsersByIds } from '../lib/authServiceClient';
import { verifyToken } from '../lib/authGuard';

type GetChildrenQuery = { parentId?: string };
type GetChildByIdParams = { studentId: string };

export async function getChildren(
  req: FastifyRequest<{ Querystring: GetChildrenQuery }>,
  reply: FastifyReply,
) {
  let parentId = req.query.parentId;

  if (!parentId) {
    const payload = verifyToken(req);
    if (!payload) return reply.status(401).send({ error: 'Unauthorized' });
    if (payload.role !== 'PARENT') return reply.status(403).send({ error: 'Forbidden' });
    parentId = payload.userId;
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
  const payload = verifyToken(req);
  if (!payload) return reply.status(401).send({ error: 'Unauthorized' });

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
