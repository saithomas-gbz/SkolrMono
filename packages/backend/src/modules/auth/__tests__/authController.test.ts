import { describe, it, expect, beforeEach, mock, spyOn } from 'bun:test';
import authController from '../controllers/authController';
import bcrypt from 'bcrypt';
import db from '../../../shared/db';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { User } from "../generated/prisma/client";

mock.module('../../../generated/prisma/client', () => ({
  PrismaClient: class {
    user = {
      findUnique: mock(),
      findFirst: mock(),
      create: mock()
    };
    account = {
      create: mock()
    };
  }
}));

mock.module('../../../shared/db', () => ({
  default: {
    user: {
      findUnique: mock(),
      findFirst: mock(),
      create: mock()
    },
    account: {
      create: mock()
    }
  }
}));

type MockedDb = {
  user: {
    findUnique: ReturnType<typeof mock>;
    findFirst: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
  };
  account: {
    create: ReturnType<typeof mock>;
  };
};

const prismaMock = db as MockedDb;

describe('AuthController', () => {
  const mockRequest = {
    body: {} as Record<string, unknown>,
    server: {
      jwt: {
        sign: mock(() => 'mocked-jwt-token')
      }
    },
    log: { error: mock(), warn: mock(), info: mock() }
  } as unknown as FastifyRequest;

  const mockReply = {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
    redirect: mock().mockReturnThis()
  } as unknown as FastifyReply;

  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.create.mockReset();
    prismaMock.account.create.mockReset();

    (mockRequest.server.jwt.sign as ReturnType<typeof mock>).mockReset();
    (mockRequest.server.jwt.sign as ReturnType<typeof mock>).mockReturnValue('mocked-jwt-token');

    (mockReply.status as ReturnType<typeof mock>).mockReset();
    (mockReply.send as ReturnType<typeof mock>).mockReset();
    (mockReply.redirect as ReturnType<typeof mock>).mockReset();

    (mockReply.status as ReturnType<typeof mock>).mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReturnThis();
    (mockReply.redirect as ReturnType<typeof mock>).mockReturnThis();

    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(null);
    prismaMock.account.create.mockResolvedValue(null);
  });

  describe('login', () => {
    it('should return 401 if user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      mockRequest.body = { email: 'nonexistent@example.com', password: 'password123' };

      await authController.login(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 401 if password does not match', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        password: 'hashed',
        name: 'Test User',
        role: 'USER'
      } as User);

      spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' };

      await authController.login(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
    });
  });

  describe('googleCallback', () => {
    it('should create a new user and account for new Google OAuth user', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'test-google@example.com',
        displayName: 'Test Google User',
        picture: 'http://example.com/pic.jpg'
      };

      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        email: 'test-google@example.com',
        name: 'Test Google User',
        image: 'http://example.com/pic.jpg',
        oauthProvider: 'google',
        oauthId: 'google123',
        password: null,
        role: 'USER'
      } as User);
      prismaMock.account.create.mockResolvedValue({});

      mockRequest.query = {
        token: 'google-access-token',
        profile: mockProfile
      };

      await authController.googleCallback(mockRequest, mockReply);

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(prismaMock.account.create).toHaveBeenCalled();
      expect(mockReply.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/auth/callback?token=mocked-jwt-token'
      );
    });

    it('should use existing user for returning Google OAuth user', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'test-google@example.com',
        displayName: 'Test Google User',
        picture: 'http://example.com/pic.jpg'
      };

      const existingUser = {
        id: '1',
        email: 'test-google@example.com',
        name: 'Test Google User',
        image: 'http://example.com/pic.jpg',
        oauthProvider: 'google',
        oauthId: 'google123',
        password: null,
        role: 'USER'
      } as User;

      prismaMock.user.findFirst.mockResolvedValue(existingUser);

      mockRequest.query = {
        token: 'google-access-token',
        profile: mockProfile
      };

      await authController.googleCallback(mockRequest, mockReply);

      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(prismaMock.account.create).not.toHaveBeenCalled();
      expect(mockReply.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/auth/callback?token=mocked-jwt-token'
      );
    });

    it('should return 500 if an error occurs during OAuth callback', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'test-google@example.com',
        displayName: 'Test Google User',
        picture: 'http://example.com/pic.jpg'
      };

      prismaMock.user.findFirst.mockRejectedValue(new Error('Database error'));

      mockRequest.query = {
        token: 'google-access-token',
        profile: mockProfile
      };

      await authController.googleCallback(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'OAuth callback failed'
      });
    });
  });
});
