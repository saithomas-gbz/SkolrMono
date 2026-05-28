import type { FastifyReply } from 'fastify';

/** Segments réservés pour les routes statiques (`/classes/summary`, `/classes/teacher/...`, `/classes/student/...`). */
export const RESERVED_CLASS_PATH_IDS = new Set(['summary', 'teacher', 'student']);

/** Réponse liste : `data` est toujours un tableau (jamais un objet seul). */
function toListData<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function sendListOk<T>(reply: FastifyReply, value: unknown, message: string) {
  return reply.status(200).send({ data: toListData<T>(value), message });
}
