import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import bcrypt from 'bcrypt';
import passwordResetController from '../controllers/passwordResetController';
import db from '../../../shared/db';
import { sendMail } from '../lib/mailer';
import type { FastifyRequest, FastifyReply } from 'fastify';

mock.module('../../../generated/prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: mock(), update: mock() };
    passwordResetToken = { create: mock(), findUnique: mock(), update: mock() };
  },
}));

mock.module('../../../shared/db', () => ({
  default: {
    user: { findUnique: mock(), update: mock() },
    passwordResetToken: { create: mock(), findUnique: mock(), update: mock() },
  },
}));

mock.module('../lib/mailer', () => ({
  sendMail: mock(() => Promise.resolve()),
}));

type MockedDb = {
  user: {
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
  passwordResetToken: {
    create: ReturnType<typeof mock>;
    findUnique: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
  };
};

const prismaMock = db as MockedDb;
const sendMailMock = sendMail as ReturnType<typeof mock>;

function buildReply(): FastifyReply {
  return {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;
}

describe('passwordResetController', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.passwordResetToken.create.mockReset();
    prismaMock.passwordResetToken.findUnique.mockReset();
    prismaMock.passwordResetToken.update.mockReset();
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue(undefined);
  });

  describe('forgotPassword', () => {
    it("renvoie 200 et ne crée pas de token si l'utilisateur n'existe pas", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const request = {
        body: { email: 'unknown@skolr.local' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.forgotPassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(sendMailMock).not.toHaveBeenCalled();
    });

    it("crée un token et envoie l'email si l'utilisateur existe", async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'existing@skolr.local' });
      prismaMock.passwordResetToken.create.mockResolvedValue({ id: 'prt-1' });

      const request = {
        body: { email: 'existing@skolr.local' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.forgotPassword(request, reply);

      expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'u1' }),
        }),
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      await Promise.resolve();
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'existing@skolr.local' }),
      );
    });

    it("renvoie le même message de succès, qu'un utilisateur existe ou non", async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      const replyUnknown = buildReply();
      await passwordResetController.forgotPassword(
        { body: { email: 'unknown@skolr.local' }, log: { error: mock(), warn: mock() } } as unknown as FastifyRequest,
        replyUnknown,
      );

      prismaMock.passwordResetToken.create.mockResolvedValue({ id: 'prt-2' });
      prismaMock.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'existing@skolr.local' });
      const replyExisting = buildReply();
      await passwordResetController.forgotPassword(
        { body: { email: 'existing@skolr.local' }, log: { error: mock(), warn: mock() } } as unknown as FastifyRequest,
        replyExisting,
      );

      expect(replyUnknown.send).toHaveBeenCalledWith(replyExisting.send.mock.calls[0]?.[0]);
    });

    it('renvoie 500 en cas d’erreur interne', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db down'));

      const request = {
        body: { email: 'existing@skolr.local' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.forgotPassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
    });
  });

  describe('resetPassword', () => {
    it("renvoie 400 si le token n'existe pas", async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

      const request = {
        body: { token: 'unknown', password: 'newpassword123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.resetPassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('renvoie 400 si le token est expiré', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'u1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      const request = {
        body: { token: 'expired', password: 'newpassword123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.resetPassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('renvoie 400 si le token a déjà été utilisé', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'u1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      const request = {
        body: { token: 'used', password: 'newpassword123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.resetPassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('met à jour le mot de passe, marque le token utilisé et renvoie 200', async () => {
      prismaMock.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'u1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000),
      });
      spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      prismaMock.user.update.mockResolvedValue({ id: 'u1' });
      prismaMock.passwordResetToken.update.mockResolvedValue({});

      const request = {
        body: { token: 'valid', password: 'newpassword123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.resetPassword(request, reply);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { password: 'hashed-password' },
      });
      expect(prismaMock.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'prt-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(reply.status).toHaveBeenCalledWith(200);
    });

    it('renvoie 500 en cas d’erreur interne', async () => {
      prismaMock.passwordResetToken.findUnique.mockRejectedValue(new Error('db down'));

      const request = {
        body: { token: 'valid', password: 'newpassword123' },
        log: { error: mock(), warn: mock() },
      } as unknown as FastifyRequest;
      const reply = buildReply();

      await passwordResetController.resetPassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
    });
  });
});
