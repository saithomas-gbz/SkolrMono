import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import userController from '../controllers/userController';
import bcrypt from 'bcrypt';
import db from '../db';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User } from '../generated/prisma/client';

mock.module('../db', () => ({
  default: {
    user: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      deleteMany: mock(),
    },
  },
}));

type MockedDb = {
  user: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
    deleteMany: ReturnType<typeof mock>;
  };
};

const prismaMock = db as unknown as MockedDb;

const makeReply = () =>
  ({
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  }) as unknown as FastifyReply;

const makeRequest = (overrides: Partial<FastifyRequest> = {}) =>
  ({
    body: {},
    params: {},
    user: null,
    log: { error: mock() },
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
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.user.update.mockReset();
    prismaMock.user.delete.mockReset();
    prismaMock.user.deleteMany.mockReset();
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
    it('should delete user and return success message', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.delete.mockResolvedValue(mockUser);

      const request = makeRequest({ params: { id: 'user-1' } });

      await userController.deleteUser(request, reply);

      expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(reply.send).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });

    it('should return 404 when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const request = makeRequest({ params: { id: 'ghost' } });

      await userController.deleteUser(request, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
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
    it('should delete multiple users and return count', async () => {
      prismaMock.user.deleteMany.mockResolvedValue({ count: 3 });

      const request = makeRequest({ body: { ids: ['u1', 'u2', 'u3'] } });

      await userController.massDeleteUsers(request, reply);

      expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['u1', 'u2', 'u3'] } },
      });
      expect(reply.send).toHaveBeenCalledWith({
        message: '3 user(s) deleted successfully',
        count: 3,
      });
    });

    it('should return 400 when ids array is empty', async () => {
      const request = makeRequest({ body: { ids: [] } });

      await userController.massDeleteUsers(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'No IDs provided' });
      expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 when ids is missing', async () => {
      const request = makeRequest({ body: {} });

      await userController.massDeleteUsers(request, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith({ error: 'No IDs provided' });
    });

    it('should return 500 on unexpected error', async () => {
      prismaMock.user.deleteMany.mockRejectedValue(new Error('DB failure'));
      const request = makeRequest({ body: { ids: ['u1'] } });

      await userController.massDeleteUsers(request, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
