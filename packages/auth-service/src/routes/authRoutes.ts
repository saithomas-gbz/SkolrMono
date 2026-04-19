import authController from '../controllers/authController';
import db from '../db';
import { OAuth2Namespace } from '@fastify/oauth2';

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

const authRoutes = async (fastify: FastifyInstance) => {
  fastify.post("/login", authController.login);
  fastify.post("/register", authController.register);


  fastify.get('/login/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
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

      const jwtToken = fastify.jwt.sign({ id: user.id, email: user.email });

      // reply.redirect(process.env.GOOGLE_CALLBACK_URI)
      reply.redirect(`http://votre-frontend.com/auth/success?token=${jwtToken}`);
    } catch (error) {
      console.error("error google prisma callback : " , error)
      fastify.log.error(error);
      reply.redirect('http://votre-fronte//nd.com/auth/error');
    }
  });
}

export default authRoutes;
