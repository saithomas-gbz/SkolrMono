import type { FastifyRequest, FastifyReply } from 'fastify';

interface GradeJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    gradeUser?: GradeJwtPayload;
  }
}

const STAFF_ROLES = ['TEACHER', 'STAFF', 'ADMIN'];

function verifyToken(request: FastifyRequest): GradeJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as GradeJwtPayload;
  } catch {
    return null;
  }
}

/** Authentifie n'importe quel rôle connu et attache `request.gradeUser`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  request.gradeUser = payload;
}

/** Réservé aux enseignants/staff/admin — création/modification de notes, devoirs, cours, matières, sujets. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (!STAFF_ROLES.includes(payload.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.gradeUser = payload;
}

/** Un élève ne peut consulter que ses propres notes (params.userId) ; TEACHER/STAFF/ADMIN voient tout. */
export async function requireSelfOrStaff(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (!STAFF_ROLES.includes(payload.role) && payload.userId !== request.params.userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.gradeUser = payload;
}
