import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

function getUserId(request: FastifyRequest): string | null {
  try {
    const payload = request.server.jwt.verify(
      (request.headers.authorization ?? '').replace('Bearer ', ''),
    ) as JwtPayload;
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export default {
  getNotifications: async (request: FastifyRequest<{ Querystring: { unread?: string } }>, reply: FastifyReply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const unreadOnly = request.query.unread === 'true';
    const notifications = await db.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.status(200).send({ data: notifications });
  },

  getUnreadCount: async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const count = await db.notification.count({ where: { userId, read: false } });
    return reply.status(200).send({ count });
  },

  markAsRead: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const existing = await db.notification.findUnique({ where: { id: request.params.id } });
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    const notification = await db.notification.update({
      where: { id: request.params.id },
      data: { read: true },
    });
    return reply.status(200).send({ data: notification });
  },

  markAllAsRead: async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return reply.status(200).send({ message: 'All notifications marked as read' });
  },
};
