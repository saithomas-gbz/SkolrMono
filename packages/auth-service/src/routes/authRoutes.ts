import authController from '../controllers/authController';
import db from '../db';
import { OAuth2Namespace } from '@fastify/oauth2';
import {
  googleCallbackRouteSchema,
  loginRouteSchema,
  registerRouteSchema,
} from '../schemas/authOpenApi';

import type { FastifyInstance } from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Extend FastifyInstance to include plugin properties
declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

interface GoogleUserInfo {
  email: string;
  name: string;
}

function buildGoogleSuccessUrl(token: string): string {
  const base = process.env.GOOGLE_OAUTH_SUCCESS_URL ?? 'http://localhost:3003/auth/success';
  return `${base}?token=${token}`;
}

function buildGoogleErrorUrl(): string {
  return process.env.GOOGLE_OAUTH_ERROR_URL ?? 'http://localhost:3003/auth/error';
}

const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/login', { schema: loginRouteSchema }, authController.login);
  fastify.post('/register', { schema: registerRouteSchema }, authController.register);

  fastify.get(
    '/login/google/callback',
    { schema: googleCallbackRouteSchema },
    async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      const accessToken = token.token.access_token;

      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userInfo: GoogleUserInfo = await response.json();

      let user = await db.user.findUnique({
        where: { email: userInfo.email },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            oauthProvider: 'google',
            oauthId: userInfo.email,
          },
        });
      }

      const jwtToken = fastify.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, establishmentId: user.establishmentId },
        { expiresIn: '1h' },
      );

      reply.redirect(buildGoogleSuccessUrl(jwtToken));
    } catch (error) {
      fastify.log.error(error);
      reply.redirect(buildGoogleErrorUrl());
    }
  });
};

export default authRoutes;
