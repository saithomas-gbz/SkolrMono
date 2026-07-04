import { randomUUID } from 'crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { publish } from '../../../shared/events';
import db from '../../../shared/db';
import { getUserId } from './conversationController';
import * as presence from '../utils/presence';
import { getStorageProvider } from '../lib/storage';

const MAX_FILE_SIZE = Number(process.env.MESSAGE_MAX_FILE_SIZE_BYTES) || 5_242_880;
const ALLOWED_MIME_TYPES = (
  process.env.MESSAGE_ALLOWED_MIME_TYPES ||
  'application/pdf,image/jpeg,image/png,image/gif,image/webp'
).split(',');

export default {
  getMessages: async (
    request: FastifyRequest<{ Params: { conversationId: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: request.params.conversationId,
          userId,
        },
      },
    });
    if (!participant) return reply.status(403).send({ error: 'Forbidden' });

    const messages = await db.message.findMany({
      where: { conversationId: request.params.conversationId },
      orderBy: { sentAt: 'asc' },
      include: { reads: true, attachments: true },
    });

    return reply.status(200).send({ data: messages });
  },

  sendMessage: async (
    request: FastifyRequest<{ Params: { conversationId: string }; Body: { content?: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: request.params.conversationId,
          userId,
        },
      },
    });
    if (!participant) return reply.status(403).send({ error: 'Forbidden' });

    let content = '';
    const files: { fileName: string; mimeType: string; buffer: Buffer }[] = [];

    if (request.isMultipart()) {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
            return reply.status(400).send({ error: `Type de fichier non pris en charge : ${part.mimetype}` });
          }
          const buffer = await part.toBuffer();
          if (buffer.length > MAX_FILE_SIZE) {
            return reply.status(400).send({ error: `Fichier ${part.filename} trop volumineux (max ${MAX_FILE_SIZE} octets)` });
          }
          files.push({ fileName: part.filename ?? 'fichier', mimeType: part.mimetype, buffer });
        } else if (part.fieldname === 'content') {
          content = String(part.value);
        }
      }
    } else {
      content = (request.body as { content?: string })?.content ?? '';
    }

    if (!content.trim() && files.length === 0) {
      return reply.status(400).send({ error: 'Le message doit contenir du texte ou au moins un fichier' });
    }

    const message = await db.message.create({
      data: {
        conversationId: request.params.conversationId,
        senderId: userId,
        content,
      },
      include: { reads: true, attachments: true },
    });

    if (files.length > 0) {
      const storage = getStorageProvider();
      for (const file of files) {
        const storageKey = await storage.save(file.buffer, `${message.id}/${randomUUID()}-${file.fileName}`);
        await db.messageAttachment.create({
          data: {
            messageId: message.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            sizeBytes: file.buffer.length,
            storageKey,
          },
        });
      }
    }

    const fullMessage = await db.message.findUnique({
      where: { id: message.id },
      include: { reads: true, attachments: true },
    });

    const participants = await db.conversationParticipant.findMany({
      where: { conversationId: request.params.conversationId },
      select: { userId: true },
    });
    const recipientIds = participants.map((p) => p.userId).filter((id) => id !== userId);

    await publish('message.received', {
      messageId: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      recipientIds,
    }).catch((err) => console.error('[message-service] RabbitMQ publish failed:', err));

    for (const recipientId of recipientIds) {
      presence.sendToUser(recipientId, { type: 'message', data: fullMessage });
    }

    return reply.status(201).send({ data: fullMessage });
  },

  downloadAttachment: async (
    request: FastifyRequest<{ Params: { conversationId: string; attachmentId: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });

    const participant = await db.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: request.params.conversationId,
          userId,
        },
      },
    });
    if (!participant) return reply.status(403).send({ error: 'Forbidden' });

    const attachment = await db.messageAttachment.findUnique({
      where: { id: request.params.attachmentId },
      include: { message: true },
    });
    if (!attachment) return reply.status(404).send({ error: 'Pièce jointe introuvable' });
    if (attachment.message.conversationId !== request.params.conversationId) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const buffer = await getStorageProvider().read(attachment.storageKey);
    reply.header('Content-Type', attachment.mimeType);
    reply.header('Content-Disposition', `inline; filename="${attachment.fileName}"`);
    return reply.send(buffer);
  },
};
