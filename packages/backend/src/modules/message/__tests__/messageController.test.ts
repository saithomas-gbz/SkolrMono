import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import messageController from '../controllers/messageController';
import db from '../../../shared/db';
import { publish } from '../../../shared/events';
import * as presence from '../utils/presence';
import * as storageModule from '../lib/storage';
import type { FastifyRequest, FastifyReply } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    conversationParticipant: {
      findUnique: mock(),
      findMany: mock(),
    },
    message: {
      findMany: mock(),
      create: mock(),
      findUnique: mock(),
    },
    messageAttachment: {
      create: mock(),
      findUnique: mock(),
    },
  },
}));

mock.module('../../../shared/events', () => ({
  publish: mock(() => Promise.resolve()),
}));

const prismaMock = db as unknown as {
  conversationParticipant: { findUnique: ReturnType<typeof mock>; findMany: ReturnType<typeof mock> };
  message: { findMany: ReturnType<typeof mock>; create: ReturnType<typeof mock>; findUnique: ReturnType<typeof mock> };
  messageAttachment: { create: ReturnType<typeof mock>; findUnique: ReturnType<typeof mock> };
};
const publishMock = publish as unknown as ReturnType<typeof mock>;

let sendToUserSpy: ReturnType<typeof spyOn>;
let getStorageProviderSpy: ReturnType<typeof spyOn>;
const mockStorage = { save: mock(), read: mock() };

function buildRequest(
  body: { content?: string } = {},
  params: Record<string, string> = {},
  multipart?: { content: string; files: { filename: string; mimetype: string; buffer: Buffer }[] },
) {
  if (multipart) {
    const mp = multipart;
    async function* parts() {
      if (mp.content !== undefined) {
        yield { type: 'field', fieldname: 'content', value: mp.content };
      }
      for (const file of mp.files) {
        yield {
          type: 'file',
          filename: file.filename,
          mimetype: file.mimetype,
          toBuffer: mock(async () => file.buffer),
        };
      }
    }
    return {
      headers: { authorization: 'Bearer valid-token' },
      server: {
        jwt: { verify: mock(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' })) },
      },
      params: { conversationId: 'conv-1', ...params },
      body,
      isMultipart: mock(() => true),
      parts,
    } as unknown as FastifyRequest<{ Params: { conversationId: string }; Body: { content: string } }>;
  }
  return {
    headers: { authorization: 'Bearer valid-token' },
    server: {
      jwt: { verify: mock(() => ({ userId: 'user-1', email: 'a@a.com', role: 'TEACHER' })) },
    },
    params: { conversationId: 'conv-1', ...params },
    body,
    isMultipart: mock(() => false),
  } as unknown as FastifyRequest<{ Params: { conversationId: string }; Body: { content: string } }>;
}

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
    header: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('messageController.sendMessage', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findUnique.mockReset();
    prismaMock.conversationParticipant.findMany.mockReset();
    prismaMock.message.create.mockReset();
    prismaMock.message.findUnique.mockReset();
    prismaMock.messageAttachment.create.mockReset();
    publishMock.mockReset();
    mockStorage.save.mockReset();
    mockStorage.read.mockReset();
    sendToUserSpy = spyOn(presence, 'sendToUser').mockImplementation(() => {});
    getStorageProviderSpy = spyOn(storageModule, 'getStorageProvider').mockReturnValue(mockStorage as never);
  });

  afterEach(() => {
    sendToUserSpy.mockRestore();
    getStorageProviderSpy.mockRestore();
  });

  it('broadcasts the new message over WS to every other participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({
      id: 'p-1',
      conversationId: 'conv-1',
      userId: 'user-1',
    });
    const message = { id: 'm-1', conversationId: 'conv-1', senderId: 'user-1', content: 'hello', sentAt: new Date(), reads: [], attachments: [] };
    prismaMock.message.create.mockResolvedValue(message);
    prismaMock.message.findUnique.mockResolvedValue(message);
    prismaMock.conversationParticipant.findMany.mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
      { userId: 'user-3' },
    ]);
    publishMock.mockResolvedValue(undefined);

    const request = buildRequest({ content: 'hello' });
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(sendToUserSpy).toHaveBeenCalledTimes(2);
    expect(sendToUserSpy).toHaveBeenCalledWith('user-2', { type: 'message', data: message });
    expect(sendToUserSpy).toHaveBeenCalledWith('user-3', { type: 'message', data: message });
    expect(reply.status).toHaveBeenCalledWith(201);
  });

  it('returns 403 and does not broadcast when the sender is not a participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue(null);
    const request = buildRequest({ content: 'hello' });
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(sendToUserSpy).not.toHaveBeenCalled();
  });

  it('multipart: crée le message et la pièce jointe, retourne 201', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });
    const message = { id: 'm-2', conversationId: 'conv-1', senderId: 'user-1', content: 'cf. doc', sentAt: new Date(), reads: [], attachments: [] };
    const fullMessage = { ...message, attachments: [{ id: 'att-1', fileName: 'test.pdf', mimeType: 'application/pdf', sizeBytes: 100, storageKey: 'm-2/uuid-test.pdf', uploadedAt: new Date() }] };
    prismaMock.message.create.mockResolvedValue(message);
    prismaMock.message.findUnique.mockResolvedValue(fullMessage);
    prismaMock.conversationParticipant.findMany.mockResolvedValue([{ userId: 'user-1' }]);
    publishMock.mockResolvedValue(undefined);
    mockStorage.save.mockResolvedValue('m-2/uuid-test.pdf');
    prismaMock.messageAttachment.create.mockResolvedValue({ id: 'att-1' });

    const buffer = Buffer.from('fake pdf content');
    const request = buildRequest(
      {},
      {},
      { content: 'cf. doc', files: [{ filename: 'test.pdf', mimetype: 'application/pdf', buffer }] },
    );
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ content: 'cf. doc' }) }),
    );
    expect(mockStorage.save).toHaveBeenCalledWith(buffer, expect.stringContaining('m-2/'));
    expect(prismaMock.messageAttachment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ messageId: 'm-2', fileName: 'test.pdf', mimeType: 'application/pdf' }) }),
    );
    expect(reply.status).toHaveBeenCalledWith(201);
  });

  it('multipart: retourne 400 si le fichier est trop lourd', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });

    const bigBuffer = Buffer.alloc(6_000_000);
    const request = buildRequest(
      {},
      {},
      { content: 'texte', files: [{ filename: 'big.pdf', mimetype: 'application/pdf', buffer: bigBuffer }] },
    );
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });

  it('multipart: retourne 400 si le MIME est non autorisé', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });

    const request = buildRequest(
      {},
      {},
      { content: 'texte', files: [{ filename: 'virus.exe', mimetype: 'application/x-msdownload', buffer: Buffer.from('MZ') }] },
    );
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });

  it('multipart: retourne 400 si contenu vide et aucun fichier', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });

    const request = buildRequest({}, {}, { content: '', files: [] });
    const reply = buildReply();

    await messageController.sendMessage(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(prismaMock.message.create).not.toHaveBeenCalled();
  });
});

describe('messageController.getMessages', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findUnique.mockReset();
    prismaMock.message.findMany.mockReset();
  });

  it('returns 401 when unauthenticated', async () => {
    const request = {
      headers: { authorization: '' },
      server: {
        jwt: {
          verify: mock(() => {
            throw new Error('invalid token');
          }),
        },
      },
      params: { conversationId: 'conv-1' },
      isMultipart: mock(() => false),
    } as unknown as FastifyRequest<{ Params: { conversationId: string } }>;
    const reply = buildReply();

    await messageController.getMessages(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('returns 403 when the requester is not a participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue(null);
    const request = buildRequest();
    const reply = buildReply();

    await messageController.getMessages(request, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(prismaMock.message.findMany).not.toHaveBeenCalled();
  });

  it('returns the conversation messages ordered by sentAt ascending', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({
      id: 'p-1',
      conversationId: 'conv-1',
      userId: 'user-1',
    });
    const messages = [
      { id: 'm-1', conversationId: 'conv-1', senderId: 'user-2', content: 'hi', sentAt: new Date('2026-01-01') },
      { id: 'm-2', conversationId: 'conv-1', senderId: 'user-1', content: 'salut', sentAt: new Date('2026-01-02') },
    ];
    prismaMock.message.findMany.mockResolvedValue(messages);

    const request = buildRequest();
    const reply = buildReply();

    await messageController.getMessages(request, reply);

    expect(prismaMock.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      orderBy: { sentAt: 'asc' },
      include: { reads: true, attachments: true },
    });
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(reply.send).toHaveBeenCalledWith({ data: messages });
  });
});

describe('messageController.downloadAttachment', () => {
  beforeEach(() => {
    prismaMock.conversationParticipant.findUnique.mockReset();
    prismaMock.messageAttachment.findUnique.mockReset();
    mockStorage.read.mockReset();
    getStorageProviderSpy = spyOn(storageModule, 'getStorageProvider').mockReturnValue(mockStorage as never);
  });

  afterEach(() => {
    getStorageProviderSpy.mockRestore();
  });

  it('retourne 401 si non authentifié', async () => {
    const request = {
      headers: { authorization: '' },
      server: { jwt: { verify: mock(() => { throw new Error('invalid token'); }) } },
      params: { conversationId: 'conv-1', attachmentId: 'att-1' },
    } as unknown as FastifyRequest<{ Params: { conversationId: string; attachmentId: string } }>;
    const reply = buildReply();

    await messageController.downloadAttachment(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('retourne 403 si non participant', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue(null);
    const request = buildRequest({}, { conversationId: 'conv-1', attachmentId: 'att-1' });
    const reply = buildReply();

    await messageController.downloadAttachment(request as never, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('retourne 404 si la pièce jointe est inconnue', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });
    prismaMock.messageAttachment.findUnique.mockResolvedValue(null);

    const request = buildRequest({}, { conversationId: 'conv-1', attachmentId: 'att-missing' });
    const reply = buildReply();

    await messageController.downloadAttachment(request as never, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
  });

  it('retourne 403 si la pièce jointe appartient à une autre conversation', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });
    prismaMock.messageAttachment.findUnique.mockResolvedValue({
      id: 'att-1',
      fileName: 'secret.pdf',
      mimeType: 'application/pdf',
      storageKey: 'other-msg/uuid.pdf',
      message: { conversationId: 'conv-OTHER' },
    });

    const request = buildRequest({}, { conversationId: 'conv-1', attachmentId: 'att-1' });
    const reply = buildReply();

    await messageController.downloadAttachment(request as never, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('retourne 200 avec les bons headers pour une pièce jointe valide', async () => {
    prismaMock.conversationParticipant.findUnique.mockResolvedValue({ id: 'p-1', conversationId: 'conv-1', userId: 'user-1' });
    const fileBuffer = Buffer.from('%PDF-1.4 ...');
    prismaMock.messageAttachment.findUnique.mockResolvedValue({
      id: 'att-1',
      fileName: 'devoir.pdf',
      mimeType: 'application/pdf',
      storageKey: 'm-1/uuid-devoir.pdf',
      message: { conversationId: 'conv-1' },
    });
    mockStorage.read.mockResolvedValue(fileBuffer);

    const request = buildRequest({}, { conversationId: 'conv-1', attachmentId: 'att-1' });
    const reply = buildReply();

    await messageController.downloadAttachment(request as never, reply);

    expect(mockStorage.read).toHaveBeenCalledWith('m-1/uuid-devoir.pdf');
    expect(reply.header).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(reply.header).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="devoir.pdf"');
    expect(reply.send).toHaveBeenCalledWith(fileBuffer);
  });
});
