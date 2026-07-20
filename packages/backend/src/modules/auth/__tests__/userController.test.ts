import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import userController from '../controllers/userController';
import bcrypt from 'bcrypt';
import db from '../../../shared/db';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User } from '../../../generated/prisma/client';

// Un mock Prisma couvrant tous les modèles touchés par l'orchestrateur RGPD
// (export + effacement traversent tous les schémas). `$transaction` exécute le
// callback interactif avec le mock lui-même comme client de transaction.
type ModelMock = Record<string, ReturnType<typeof mock>>;
const model = (): ModelMock => ({
  findUnique: mock(),
  findFirst: mock(),
  findMany: mock(),
  create: mock(),
  update: mock(),
  updateMany: mock(),
  delete: mock(),
  deleteMany: mock(),
});

const dbMock: Record<string, ModelMock> & {
  $transaction: (cb: (tx: unknown) => unknown) => Promise<unknown>;
} = {
  user: model(),
  account: model(),
  passwordResetToken: model(),
  invitationToken: model(),
  classTeacher: model(),
  classStudent: model(),
  gradeUser: model(),
  grade: model(),
  assignment: model(),
  session: model(),
  absence: model(),
  absenceJustification: model(),
  conversationParticipant: model(),
  message: model(),
  messageRead: model(),
  notification: model(),
  establishmentMember: model(),
  establishment: model(),
  parentStudent: model(),
  refreshToken: model(),
  $transaction: async (cb) => cb(dbMock),
};

mock.module('../../../shared/db', () => ({ default: dbMock }));

const prismaMock = db as unknown as typeof dbMock & { user: ModelMock };

const makeReply = () =>
  ({
    status: mock().mockReturnThis(),
    header: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  }) as unknown as FastifyReply;

const makeRequest = (overrides: Partial<FastifyRequest> = {}) =>
  ({
    body: {},
    params: {},
    user: null,
    log: { error: mock(), warn: mock(), info: mock() },
    ...overrides,
  }) as unknown as FastifyRequest;

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed-password',
  image: null,
  role: 'USER',
  oauthProvider: null,
  oauthId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const userWithoutPassword = (u: User) => {
  const { password, ...rest } = u;
  void password;
  return rest;
};

describe('UserController', () => {
  let reply: FastifyReply;

  beforeEach(() => {
    reply = makeReply();
    // Réinitialise chaque modèle avec des valeurs par défaut sûres pour que les
    // fonctions de collecte/anonymisation (Promise.all) ne renvoient jamais undefined.
    for (const value of Object.values(prismaMock)) {
      if (typeof value !== 'object' || value === null) continue;
      const m = value as ModelMock;
      m.findMany?.mockReset().mockResolvedValue([]);
      m.findUnique?.mockReset().mockResolvedValue(null);
      m.findFirst?.mockReset().mockResolvedValue(null);
      m.create?.mockReset().mockResolvedValue({});
      m.update?.mockReset().mockResolvedValue({});
      m.updateMany?.mockReset().mockResolvedValue({ count: 0 });
      m.delete?.mockReset().mockResolvedValue({});
      m.deleteMany?.mockReset().mockResolvedValue({ count: 0 });
    }
  });

  // ---------------------------------------------------------------------------
  // me
  // ---------------------------------------------------------------------------
  describe('me', () => {
    it('should return the authenticated user', async () => {
      const request = makeRequest({ user: mockUser as unknown as FastifyRequest['user'] });
      await userController.me(request, reply);
      expect(reply.send).toHaveBeenCalledWith(mockUser);
    });
  });

  // ---------------------------------------------------------------------------
  // getUserById
  // ---------------------------------------------------------------------------
  describe('getUserById', () => {
    it('should return 200 with user when found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userWithoutPassword(mockUser));
      const request = makeRequest({ params: { id: 'user-1' } });

      await userController.getUserById(request, reply);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
      );
      expect(reply.send).toHaveBeenCalledWith(userWithoutPassword(mockUser));
    });

    it('should return 404 when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const request = makeRequest({ params: { id: 'ghost' } });

      await userController.getUserById(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ params: { id: 'user-1' } });

      await userController.getUserById(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // getUsersByIds
  // ---------------------------------------------------------------------------
  describe('getUsersByIds', () => {
    it('should return matching users for a comma-separated list of ids', async () => {
      const users = [
        userWithoutPassword(mockUser),
        userWithoutPassword({ ...mockUser, id: 'user-2', email: 'second@example.com' }),
      ];
      prismaMock.user.findMany.mockResolvedValue(users);
      const request = makeRequest({ query: { ids: 'user-1,user-2' } } as Partial<FastifyRequest>);

      await userController.getUsersByIds(request, reply);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['user-1', 'user-2'] } } })
      );
      expect(reply.send).toHaveBeenCalledWith({ data: users });
    });

    it('should trim whitespace and ignore empty ids', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      const request = makeRequest({ query: { ids: ' user-1 , , user-2 ' } } as Partial<FastifyRequest>);

      await userController.getUsersByIds(request, reply);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: { in: ['user-1', 'user-2'] } } })
      );
    });

    it('should return an empty array without querying when ids is missing', async () => {
      const request = makeRequest({ query: {} } as Partial<FastifyRequest>);

      await userController.getUsersByIds(request, reply);

      expect(prismaMock.user.findMany).not.toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith({ data: [] });
    });

    it('should query by role only when ids is missing', async () => {
      const users = [userWithoutPassword({ ...mockUser, role: 'TEACHER' })];
      prismaMock.user.findMany.mockResolvedValue(users);
      const request = makeRequest({ query: { role: 'TEACHER' } } as Partial<FastifyRequest>);

      await userController.getUsersByIds(request, reply);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'TEACHER' } })
      );
      expect(reply.send).toHaveBeenCalledWith({ data: users });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findMany.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ query: { ids: 'user-1' } } as Partial<FastifyRequest>);

      await userController.getUsersByIds(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // createUser
  // ---------------------------------------------------------------------------
  describe('createUser', () => {
    it('should create and return 201 with user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(userWithoutPassword(mockUser));
      spyOn(bcrypt, 'hash').mockResolvedValue('hashed-pw' as never);

      const request = makeRequest({
        body: { email: 'test@example.com', password: 'secret123', name: 'Test User' },
      });

      await userController.createUser(request, reply);

      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'test@example.com', password: 'hashed-pw' }),
        })
      );
      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(userWithoutPassword(mockUser));
    });

    it('should return 400 if email is already in use', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      const request = makeRequest({
        body: { email: 'test@example.com', password: 'secret123' },
      });

      await userController.createUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Email already in use' });
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should default name to email prefix when name is omitted', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(userWithoutPassword(mockUser));
      spyOn(bcrypt, 'hash').mockResolvedValue('hashed-pw' as never);

      const request = makeRequest({ body: { email: 'noname@example.com', password: 'secret123' } });

      await userController.createUser(request, reply);

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'noname' }),
        })
      );
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({
        body: { email: 'test@example.com', password: 'secret123' },
      });

      await userController.createUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // updateUser
  // ---------------------------------------------------------------------------
  describe('updateUser', () => {
    it('should update and return user when found', async () => {
      const updated = { ...userWithoutPassword(mockUser), name: 'Updated Name' };
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(updated);

      const request = makeRequest({
        params: { id: 'user-1' },
        body: { name: 'Updated Name' },
      });

      await userController.updateUser(request, reply);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } })
      );
      expect(reply.send).toHaveBeenCalledWith(updated);
    });

    it('should return 404 when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const request = makeRequest({ params: { id: 'ghost' }, body: { name: 'X' } });

      await userController.updateUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ params: { id: 'user-1' }, body: {} });

      await userController.updateUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should ignore role/establishmentId when the requester is not ADMIN/PLATFORM_ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(userWithoutPassword(mockUser));

      const request = makeRequest({
        params: { id: 'user-1' },
        body: { name: 'Updated Name', role: 'ADMIN', establishmentId: 'est-1' },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.updateUser(request, reply);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Updated Name', email: undefined },
        })
      );
    });

    it('should allow role/establishmentId changes when the requester is ADMIN', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(userWithoutPassword(mockUser));

      const request = makeRequest({
        params: { id: 'user-1' },
        body: { role: 'ADMIN', establishmentId: 'est-1' },
        authUser: { userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
      } as Partial<FastifyRequest>);

      await userController.updateUser(request, reply);

      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: undefined, email: undefined, role: 'ADMIN', establishmentId: 'est-1' },
        })
      );
    });

    it('should return 409 when the new email is already taken by another user', async () => {
      prismaMock.user.findUnique.mockImplementation(({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id === 'user-1') return Promise.resolve(mockUser);
        if (where.email === 'taken@example.com') return Promise.resolve({ ...mockUser, id: 'user-2' });
        return Promise.resolve(null);
      });

      const request = makeRequest({
        params: { id: 'user-1' },
        body: { email: 'taken@example.com' },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.updateUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Email already in use' });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should not treat the unchanged email as a conflict', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(userWithoutPassword(mockUser));

      const request = makeRequest({
        params: { id: 'user-1' },
        body: { email: mockUser.email },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.updateUser(request, reply);

      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
      expect(reply.status).not.toHaveBeenCalledWith(409);
    });
  });

  // ---------------------------------------------------------------------------
  // changePassword
  // ---------------------------------------------------------------------------
  describe('changePassword', () => {
    it('should update the password when the current password matches', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(userWithoutPassword(mockUser));
      spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      spyOn(bcrypt, 'hash').mockResolvedValue('new-hashed-pw' as never);

      const request = makeRequest({
        body: { currentPassword: 'old-pw', newPassword: 'new-secret' },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.changePassword(request, reply);

      expect(bcrypt.compare).toHaveBeenCalledWith('old-pw', mockUser.password);
      expect(bcrypt.hash).toHaveBeenCalledWith('new-secret', 10);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new-hashed-pw' },
      });
      expect(reply.send).toHaveBeenCalledWith({ message: 'Password updated successfully' });
    });

    it('should return 401 when the current password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const request = makeRequest({
        body: { currentPassword: 'wrong-pw', newPassword: 'new-secret' },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.changePassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Current password is incorrect' });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 when the account has no password (OAuth-only)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ ...mockUser, password: null });

      const request = makeRequest({
        body: { currentPassword: 'whatever', newPassword: 'new-secret' },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.changePassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Password change not available for this account',
      });
    });

    it('should return 404 when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const request = makeRequest({
        body: { currentPassword: 'old-pw', newPassword: 'new-secret' },
        authUser: { userId: 'ghost', email: 'ghost@example.com', role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.changePassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));

      const request = makeRequest({
        body: { currentPassword: 'old-pw', newPassword: 'new-secret' },
        authUser: { userId: 'user-1', email: mockUser.email, role: 'USER' },
      } as Partial<FastifyRequest>);

      await userController.changePassword(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteUser
  // ---------------------------------------------------------------------------
  describe('deleteUser', () => {
    it('should anonymize the user (soft-delete) and return success message', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: mockUser.email });

      const request = makeRequest({ params: { id: 'user-1' } });

      await userController.deleteUser(request, reply);

      // Plus de hard delete : la ligne est conservée et scrubbée.
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
      expect(prismaMock.account.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), password: null }),
        }),
      );
      expect(reply.send).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 404 when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const request = makeRequest({ params: { id: 'ghost' } });

      await userController.deleteUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ params: { id: 'user-1' } });

      await userController.deleteUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // massDeleteUsers
  // ---------------------------------------------------------------------------
  describe('massDeleteUsers', () => {
    it('should anonymize multiple users and return the count', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: mockUser.email });

      const request = makeRequest({ body: { ids: ['u1', 'u2', 'u3'] } });

      await userController.massDeleteUsers(request, reply);

      expect(prismaMock.user.update).toHaveBeenCalledTimes(3);
      expect(reply.send).toHaveBeenCalledWith({
        message: '3 user(s) deleted successfully',
        count: 3,
      });
    });

    it('should count only the users that existed', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce({ email: mockUser.email })
        .mockResolvedValueOnce(null);

      const request = makeRequest({ body: { ids: ['u1', 'ghost'] } });

      await userController.massDeleteUsers(request, reply);

      expect(reply.send).toHaveBeenCalledWith({
        message: '1 user(s) deleted successfully',
        count: 1,
      });
    });

    it('should return 400 when ids array is empty', async () => {
      const request = makeRequest({ body: { ids: [] } });

      await userController.massDeleteUsers(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'No IDs provided' });
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 when ids is missing', async () => {
      const request = makeRequest({ body: {} });

      await userController.massDeleteUsers(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'No IDs provided' });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ body: { ids: ['u1'] } });

      await userController.massDeleteUsers(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // exportMyData (RGPD — droit d'accès / portabilité)
  // ---------------------------------------------------------------------------
  describe('exportMyData', () => {
    const authUser = { userId: 'user-1', email: mockUser.email, role: 'USER' };

    it('should aggregate personal data across domains and set a download header', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userWithoutPassword(mockUser));
      prismaMock.notification.findMany.mockResolvedValue([
        { type: 'grade', title: 'Nouvelle note', body: '...', read: false, metadata: null, createdAt: new Date() },
      ]);

      const request = makeRequest({ authUser } as Partial<FastifyRequest>);

      await userController.exportMyData(request, reply);

      expect(reply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="skolr-export-user-1.json"',
      );
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: { userId: 'user-1', email: mockUser.email },
          exportedAt: expect.any(String),
          notification: { notifications: expect.arrayContaining([expect.objectContaining({ type: 'grade' })]) },
        }),
      );
    });

    it('should return 401 when unauthenticated', async () => {
      const request = makeRequest({ authUser: undefined } as Partial<FastifyRequest>);

      await userController.exportMyData(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ authUser } as Partial<FastifyRequest>);

      await userController.exportMyData(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  // ---------------------------------------------------------------------------
  // eraseMyAccount (RGPD — droit à l'effacement)
  // ---------------------------------------------------------------------------
  describe('eraseMyAccount', () => {
    const authUser = { userId: 'user-1', email: mockUser.email, role: 'USER' };

    it('should anonymize the account and clear duplicated PII', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ email: mockUser.email });

      const request = makeRequest({ authUser } as Partial<FastifyRequest>);

      await userController.eraseMyAccount(request, reply);

      expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
            name: null,
            oauthId: null,
            email: expect.stringContaining('@anonymized.skolr.local'),
          }),
        }),
      );
      // Copie d'identité dans le domaine grade anonymisée par email.
      expect(prismaMock.gradeUser.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: mockUser.email } }),
      );
      expect(reply.send).toHaveBeenCalledWith({ message: 'Account anonymized successfully' });
    });

    it('should return 404 when the user no longer exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const request = makeRequest({ authUser } as Partial<FastifyRequest>);

      await userController.eraseMyAccount(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 401 when unauthenticated', async () => {
      const request = makeRequest({ authUser: undefined } as Partial<FastifyRequest>);

      await userController.eraseMyAccount(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });
});
