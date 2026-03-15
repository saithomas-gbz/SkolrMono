import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import bcrypt from 'bcrypt';

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

      if (!user || !user.password) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      const token = request.server.jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        { expiresIn: '1h' }
      );

        return reply.send({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
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
        { userId: user.id, email: user.email, role: user.role },
        { expiresIn: '1h' }
      );

      return reply.status(201).send({
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
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
        { userId: user.id, email: user.email, role: user.role, oauthToken: token },
        { expiresIn: '1h' }
      );

      return reply.redirect(`http://localhost:3001/auth/callback?token=${jwtToken}`);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'OAuth callback failed' });
    }
  }
};

export default authController;
