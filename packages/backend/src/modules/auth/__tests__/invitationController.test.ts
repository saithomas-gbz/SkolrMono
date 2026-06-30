import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import bcrypt from 'bcrypt';
import invitationController from '../controllers/invitationController';
import db from '../../../shared/db';
import { sendMail } from '../lib/mailer';
import { publish } from '../../../shared/events';
import type { FastifyRequest, FastifyReply } from 'fastify';

mock.module('../../../generated/prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: mock(), create: mock() };
    invitationToken = { create: mock(), findUnique: mock(), update: mock() };
  },
}));

mock.module('../../../shared/db', () => ({
  default: {
    user: { findUnique: mock(), create: mock() },
    invitationToken: { create: mock(), findUnique: mock(), update: mock() },
  },
}));

mock.module('../lib/mailer', () => ({
  sendMail: mock(() => Promise.resolve()),
}));

mock.module('../../../shared/events', () => ({
  publish: mock(() => Promise.resolve()),
}));

type MockedDb = {
  user: {
    findUnique: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
  };
  invitationToken: {
    create: ReturnType<typeof mock>;
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
};

const prismaMock = db as MockedDb;
const sendMailMock = sendMail as ReturnType<typeof mock>;
const publishMock = publish as ReturnType<typeof mock>;

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('invitationController', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.invitationToken.create.mockReset();
    prismaMock.invitationToken.findUnique.mockReset();
    prismaMock.invitationToken.update.mockReset();
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue(undefined);
    publishMock.mockReset();
    publishMock.mockResolvedValue(undefined);
  });

  describe('createInvitation', () => {
    it('renvoie 400 pour un rôle non invitable (ADMIN)', async () => {
      const request = {
        body: { email: 'new@skolr.local', role: 'ADMIN' },
        authUser: { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await invitationController.createInvitation(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.invitationToken.create).not.toHaveBeenCalled();
    });

    it('renvoie 400 si un utilisateur existe déjà avec cet email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'existing@skolr.local' });

      const request = {
        body: { email: 'existing@skolr.local', role: 'USER' },
        authUser: { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await invitationController.createInvitation(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.invitationToken.create).not.toHaveBeenCalled();
    });

    it("crée le token et envoie l'email d'invitation", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.invitationToken.create.mockResolvedValue({ id: 'inv-1' });

      const request = {
        body: { email: 'new@skolr.local', role: 'TEACHER' },
        authUser: { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN', establishmentId: 'est-1' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await invitationController.createInvitation(request, reply);

      expect(prismaMock.invitationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@skolr.local',
            role: 'TEACHER',
            establishmentId: 'est-1',
          }),
        }),
      );
      expect(reply.status).toHaveBeenCalledWith(201);
      await Promise.resolve();
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'new@skolr.local' }),
      );
    });
  });

  describe('getInvitationByToken', () => {
    it("renvoie 404 si l'invitation n'existe pas", async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue(null);
      const request = { params: { token: 'unknown' } } as unknown as FastifyRequest<{ Params: { token: string } }>;
      const reply = buildReply();

      await invitationController.getInvitationByToken(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('renvoie 404 si le token est expiré', async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue({
        email: 'new@skolr.local',
        role: 'USER',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      const request = { params: { token: 'expired' } } as unknown as FastifyRequest<{ Params: { token: string } }>;
      const reply = buildReply();

      await invitationController.getInvitationByToken(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('renvoie 404 si le token a déjà été utilisé', async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue({
        email: 'new@skolr.local',
        role: 'USER',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });
      const request = { params: { token: 'used' } } as unknown as FastifyRequest<{ Params: { token: string } }>;
      const reply = buildReply();

      await invitationController.getInvitationByToken(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });

    it('renvoie email/role pour un token valide', async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue({
        email: 'new@skolr.local',
        role: 'USER',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000),
      });
      const request = { params: { token: 'valid' } } as unknown as FastifyRequest<{ Params: { token: string } }>;
      const reply = buildReply();

      await invitationController.getInvitationByToken(request, reply);

      expect(reply.send).toHaveBeenCalledWith({ email: 'new@skolr.local', role: 'USER' });
    });
  });

  describe('acceptInvitation', () => {
    it("renvoie 400 si l'invitation est invalide ou expirée", async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue(null);
      const request = {
        body: { token: 'bad', password: 'password123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await invitationController.acceptInvitation(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('renvoie 400 si un compte existe déjà pour cet email', async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'new@skolr.local',
        role: 'USER',
        establishmentId: 'est-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000),
      });
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'new@skolr.local' });

      const request = {
        body: { token: 'valid', password: 'password123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await invitationController.acceptInvitation(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('crée le compte, marque le token utilisé et renvoie un JWT', async () => {
      prismaMock.invitationToken.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'new@skolr.local',
        role: 'TEACHER',
        establishmentId: 'est-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000),
      });
      prismaMock.user.findUnique.mockResolvedValue(null);
      spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      prismaMock.user.create.mockResolvedValue({
        id: 'u1',
        email: 'new@skolr.local',
        name: 'new',
        role: 'TEACHER',
        establishmentId: 'est-1',
      });
      prismaMock.invitationToken.update.mockResolvedValue({});

      const jwtSign = mock(() => 'mocked-jwt-token');
      const request = {
        body: { token: 'valid', password: 'password123' },
        server: { jwt: { sign: jwtSign } },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await invitationController.acceptInvitation(request, reply);

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@skolr.local',
            role: 'TEACHER',
            establishmentId: 'est-1',
          }),
        }),
      );
      expect(prismaMock.invitationToken.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'mocked-jwt-token' }),
      );
      await Promise.resolve();
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({ to: 'new@skolr.local' }));
    });
  });
});
