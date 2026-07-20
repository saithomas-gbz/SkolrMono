import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import bcrypt from 'bcrypt';
import { publish } from '../../../shared/events';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
} from '../lib/refreshTokenService';

interface GoogleOAuthProfile {
  id: string;
  email: string;
  displayName: string;
  picture: string;
}

interface GoogleOAuthQuery {
  token: string;
  profile: GoogleOAuthProfile;
}

const authController = {
  login: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      const user = await db.user.findUnique({ where: { email } });

      // Un compte anonymisé (droit à l'effacement RGPD) ne peut plus se connecter.
      if (!user || !user.password || user.deletedAt) {
        request.log.warn({ email }, 'auth.login.failed');
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        request.log.warn({ email }, 'auth.login.failed');
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = request.server.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, establishmentId: user.establishmentId },
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
      );
      const { token: refreshToken } = await issueRefreshToken(user.id);

      request.log.info({ userId: user.id, email: user.email }, 'auth.login.success');

        return reply.send({
        token,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, establishmentId: user.establishmentId }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  register: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, name } = request.body as { email: string; password: string; name?: string };

      const existingUser = await db.user.findUnique({ where: { email } });

      if (existingUser) {
        request.log.warn({ email }, 'auth.register.duplicate');
        return reply.status(400).send({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0]
        }
      });

      const token = request.server.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, establishmentId: user.establishmentId },
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
      );
      const { token: refreshToken } = await issueRefreshToken(user.id);

      publish('user.created', {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch((err) => request.log.warn({ err }, 'Failed to publish user.created'));

      request.log.info({ userId: user.id, email: user.email }, 'auth.register.success');

      return reply.status(201).send({
        token,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, establishmentId: user.establishmentId }
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  googleCallback: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, profile } = request.query as GoogleOAuthQuery;

      let user = await db.user.findFirst({
        where: {
          oauthProvider: 'google',
          oauthId: profile.id
        }
      });

      if (!user) {
        user = await db.user.create({
          data: {
            email: profile.email,
            name: profile.displayName,
            image: profile.picture,
            oauthProvider: 'google',
            oauthId: profile.id,
            password: null // No password for OAuth users
          }
        });

        await db.account.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerId: profile.id
          }
        });
      }

      const jwtToken = request.server.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, establishmentId: user.establishmentId, oauthToken: token },
        { expiresIn: '1h' }
      );

      return reply.redirect(`http://localhost:3001/auth/callback?token=${jwtToken}`);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'OAuth callback failed' });
    }
  },

  refresh: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };

      const result = await rotateRefreshToken(refreshToken);
      if (!result.ok) {
        request.log.warn({ reason: result.reason }, 'auth.refresh.failed');
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      // Récupère l'état actuel de l'utilisateur : les claims du nouveau jeton
      // d'accès doivent refléter un rôle/établissement à jour, pas ceux figés au
      // moment de l'émission du jeton de rafraîchissement. Refuse aussi le
      // rafraîchissement d'un compte anonymisé entre-temps (RGPD) — un jeton
      // volé ne doit pas survivre à la suppression du compte.
      const user = await db.user.findUnique({ where: { id: result.userId } });
      if (!user || user.deletedAt) {
        await revokeAllForUser(result.userId);
        request.log.warn({ userId: result.userId }, 'auth.refresh.deleted_account');
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }

      const token = request.server.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, establishmentId: user.establishmentId },
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
      );

      request.log.info({ userId: user.id }, 'auth.refresh.success');

      return reply.send({
        token,
        refreshToken: result.token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, establishmentId: user.establishmentId },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  logout: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = request.body as { refreshToken: string };
      await revokeRefreshToken(refreshToken);
      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

export default authController;
