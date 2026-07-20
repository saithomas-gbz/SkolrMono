import authController from '../controllers/authController';
import db from '../../../shared/db';
import { OAuth2Namespace } from '@fastify/oauth2';
import {
  googleCallbackRouteSchema,
  loginRouteSchema,
  registerRouteSchema,
  refreshRouteSchema,
  logoutRouteSchema,
} from '../schemas/authOpenApi';
import { ACCESS_TOKEN_EXPIRES_IN, issueRefreshToken } from '../lib/refreshTokenService';

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

function buildGoogleSuccessUrl(token: string, refreshToken: string): string {
  const base = process.env.GOOGLE_OAUTH_SUCCESS_URL ?? 'http://localhost:3003/auth/success';
  return `${base}?token=${token}&refreshToken=${refreshToken}`;
}

function buildGoogleErrorUrl(): string {
  return process.env.GOOGLE_OAUTH_ERROR_URL ?? 'http://localhost:3003/auth/error';
}

// Limites resserrées sur les routes d'authentification (anti brute-force),
// surchargeables par env. La limite globale s'applique par ailleurs.
const loginRateLimit = {
  rateLimit: { max: Number(process.env.RATE_LIMIT_LOGIN_MAX ?? 30), timeWindow: '1 minute' },
};
const registerRateLimit = {
  rateLimit: { max: Number(process.env.RATE_LIMIT_REGISTER_MAX ?? 10), timeWindow: '1 minute' },
};

const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/login', { schema: loginRouteSchema, config: loginRateLimit }, authController.login);
  fastify.post(
    '/register',
    { schema: registerRouteSchema, config: registerRateLimit },
    authController.register,
  );
  fastify.post(
    '/refresh',
    { schema: refreshRouteSchema, config: loginRateLimit },
    authController.refresh,
  );
  fastify.post('/logout', { schema: logoutRouteSchema }, authController.logout);

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
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      );
      const { token: refreshToken } = await issueRefreshToken(user.id);

      reply.redirect(buildGoogleSuccessUrl(jwtToken, refreshToken));
    } catch (error) {
      fastify.log.error(error);
      reply.redirect(buildGoogleErrorUrl());
    }
  });
};

export default authRoutes;
