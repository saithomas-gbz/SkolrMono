import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import authController from '../controllers/authController';
import db from '../db';
import bcrypt from 'bcrypt';

// Mock Fastify request and reply objects
type MockRequest = {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  log: {
    error: jest.Mock;
  };
  server: {
    jwt: {
      sign: jest.Mock;
    };
  };
};

type MockReply = {
  status: jest.Mock;
  send: jest.Mock;
  redirect: jest.Mock;
};

describe('AuthController', () => {
  let mockRequest: MockRequest;
  let mockReply: MockReply;

  beforeAll(() => {
    mockRequest = {
      body: {},
      query: {},
      log: {
        error: jest.fn(),
      },
      server: {
        jwt: {
          sign: jest.fn().mockReturnValue('mocked-jwt-token'),
        },
      },
    };

    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return 401 if user does not exist', async () => {
      jest.spyOn(db.user, 'findUnique').mockResolvedValue(null);

      mockRequest.body = { email: 'nonexistent@example.com', password: 'password123' };

      await authController.login(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return 401 if password is incorrect', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        name: 'Test User',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        oauthProvider: null,
        oauthId: null,
        role: 'USER' as const,
      };

      jest.spyOn(db.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' };

      await authController.login(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    });

    it('should return a token if credentials are valid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        password: await bcrypt.hash('correctpassword', 10),
        name: 'Test User',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        oauthProvider: null,
        oauthId: null,
        role: 'USER' as const,
      };

      jest.spyOn(db.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

      mockRequest.body = { email: 'test@example.com', password: 'correctpassword' };

      await authController.login(mockRequest as any, mockReply as any);

      expect(mockReply.send).toHaveBeenCalledWith({
        token: 'mocked-jwt-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      });
    });
  });

  describe('register', () => {
    it('should return 400 if user already exists', async () => {
      const mockUser = {
        id: '1',
        email: 'existing@example.com',
        password: await bcrypt.hash('password', 10),
        name: 'Existing User',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        oauthProvider: null,
        oauthId: null,
        role: 'USER' as const,
      };

      jest.spyOn(db.user, 'findUnique').mockResolvedValue(mockUser);

      mockRequest.body = { email: 'existing@example.com', password: 'password123', name: 'New User' };

      await authController.register(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'User already exists' });
    });

    it('should create a new user and return a token', async () => {
      jest.spyOn(db.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(db.user, 'create').mockResolvedValue({
        id: '2',
        email: 'new@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'new',
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        oauthProvider: null,
        oauthId: null,
        role: 'USER' as const,
      });

      mockRequest.body = { email: 'new@example.com', password: 'password123', name: 'New User' };

      await authController.register(mockRequest as any, mockReply as any);

      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        token: 'mocked-jwt-token',
        user: {
          id: '2',
          email: 'new@example.com',
          name: 'new',
          role: 'USER',
        },
      });
    });
  });

  describe('googleCallback', () => {
    it('should create a new user for Google OAuth if not exists', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'google@example.com',
        displayName: 'Google User',
        picture: 'http://example.com/picture.jpg',
      };

      jest.spyOn(db.user, 'findFirst').mockResolvedValue(null);
      jest.spyOn(db.user, 'create').mockResolvedValue({
        id: '3',
        email: 'google@example.com',
        name: 'Google User',
        image: 'http://example.com/picture.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        oauthProvider: 'google',
        oauthId: 'google123',
        password: null,
        role: 'USER' as const,
      });
      jest.spyOn(db.account, 'create').mockResolvedValue({} as any);

      mockRequest.query = { token: 'google-token', profile: mockProfile };

      await authController.googleCallback(mockRequest as any, mockReply as any);

      expect(mockReply.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/auth/callback?token=mocked-jwt-token'
      );
    });

    it('should redirect with JWT token for existing Google OAuth user', async () => {
      const mockProfile = {
        id: 'google123',
        email: 'google@example.com',
        displayName: 'Google User',
        picture: 'http://example.com/picture.jpg',
      };

      const mockUser = {
        id: '3',
        email: 'google@example.com',
        name: 'Google User',
        image: 'http://example.com/picture.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
        oauthProvider: 'google',
        oauthId: 'google123',
        password: null,
        role: 'USER' as const,
      };

      jest.spyOn(db.user, 'findFirst').mockResolvedValue(mockUser);

      mockRequest.query = { token: 'google-token', profile: mockProfile };

      await authController.googleCallback(mockRequest as any, mockReply as any);

      expect(mockReply.redirect).toHaveBeenCalledWith(
        'http://localhost:3001/auth/callback?token=mocked-jwt-token'
      );
    });
  });
});
