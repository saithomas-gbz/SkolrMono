import type { FastifyRequest, FastifyReply } from 'fastify';

interface BillingJwtPayload {
  userId: string;
  email: string;
  role: string;
  establishmentId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    billingUser?: BillingJwtPayload;
  }
}

function verifyToken(request: FastifyRequest): BillingJwtPayload | null {
  try {
    return request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as BillingJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Routes établissement (statut, plans, checkout, portail) : réservées à l'ADMIN
 * de l'établissement lui-même — jamais au PLATFORM_ADMIN, qui ne doit pas pouvoir
 * payer à la place d'un client (cf. issue #83). L'establishmentId vient uniquement
 * du JWT, jamais d'un paramètre client.
 */
export async function requireEstablishmentAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (payload.role !== 'ADMIN' || !payload.establishmentId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.billingUser = payload;
}

/** Routes plateforme (liste des établissements) : réservées à PLATFORM_ADMIN. */
export async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  const payload = verifyToken(request);
  if (!payload) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  if (payload.role !== 'PLATFORM_ADMIN') {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  request.billingUser = payload;
}
