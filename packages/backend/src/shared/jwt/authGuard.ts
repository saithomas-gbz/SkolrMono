import type { FastifyRequest, FastifyReply } from 'fastify';

interface AuthJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): AuthJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as AuthJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Termine la requête depuis un préhandler asynchrone. Le `await` est essentiel :
 * sans lui, Fastify poursuit vers le handler de route malgré la réponse déjà
 * envoyée (le handler s'exécute alors indûment et peut déclencher un double envoi).
 */
async function deny(reply: FastifyReply, status: number, error: string): Promise<void> {
  await reply.status(status).send({ error });
}

/**
 * Invitations réservées à l'ADMIN de son propre établissement — jamais au PLATFORM_ADMIN,
 * qui n'appartient à aucun établissement et ne doit pas créer de comptes à la place d'un client.
 */
export async function requireEstablishmentAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (payload.role !== 'ADMIN' || !payload.establishmentId) {
    return deny(reply, 403, 'Forbidden');
  }
  request.authUser = payload;
}

const ADMIN_ROLES = ['ADMIN', 'PLATFORM_ADMIN'];

/** Authentifie n'importe quel rôle connu et attache `request.authUser`. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  request.authUser = payload;
}

/** Un utilisateur ne peut modifier que son propre profil (params.id) ; ADMIN/PLATFORM_ADMIN peuvent gérer tous les comptes. */
export async function requireSelfOrAdmin(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const payload = verifyToken(request);
  if (!payload) {
    return deny(reply, 401, 'Unauthorized');
  }
  if (!ADMIN_ROLES.includes(payload.role) && payload.userId !== request.params.id) {
    return deny(reply, 403, 'Forbidden');
  }
  request.authUser = payload;
}
