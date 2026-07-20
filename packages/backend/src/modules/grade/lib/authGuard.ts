import type { FastifyRequest, FastifyReply } from 'fastify';
import { deny } from '../../../shared/jwt/authGuard';
import db from '@/modules/grade/db';

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
    return deny(reply, 401, 'Unauthorized');
  }
  request.gradeUser = payload;
}

/** Réservé aux enseignants/staff/admin — création/modification de notes, devoirs, cours, matières, sujets. */
export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (!STAFF_ROLES.includes(payload.role)) {
    return deny(reply, 403, 'Forbidden');
  }
  request.gradeUser = payload;
}

/**
 * Un élève ne peut consulter que ses propres notes (params.userId) ; TEACHER/STAFF/ADMIN
 * voient tout ; un PARENT peut consulter les notes d'un élève auquel il est lié
 * (table `parentStudent`, cf. gestion des liens parents ↔ enfants côté admin).
 */
export async function requireSelfOrStaff(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (STAFF_ROLES.includes(payload.role) || payload.userId === request.params.userId) {
    request.gradeUser = payload;
    return;
  }
  if (payload.role === 'PARENT') {
    const link = await db.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: payload.userId, studentId: request.params.userId } },
    });
    if (link) {
      request.gradeUser = payload;
      return;
    }
  }
  return deny(reply, 403, 'Forbidden');
}
