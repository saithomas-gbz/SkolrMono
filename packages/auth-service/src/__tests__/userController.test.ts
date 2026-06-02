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
