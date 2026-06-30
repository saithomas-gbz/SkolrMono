import type { FastifyPluginAsync } from 'fastify';
import fastifyOauth2 from '@fastify/oauth2';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import invitationRoutes from './routes/invitationRoutes';
import passwordResetRoutes from './routes/passwordResetRoutes';
import { authTag } from './schemas/authOpenApi';
import { invitationTag } from './schemas/invitationOpenApi';
import { passwordResetTag } from './schemas/passwordResetOpenApi';

/**
 * Module Auth — monté sous le préfixe `/auth`. Regroupe l'authentification
 * (login/register + Google OAuth), la gestion des utilisateurs, les invitations
 * et la réinitialisation de mot de passe.
 */
const authModule: FastifyPluginAsync = async (fastify) => {
  // Google OAuth est optionnel : si les identifiants ne sont pas configurés, on
  // démarre quand même le backend (les autres modules ne doivent pas en dépendre).
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    await fastify.register(fastifyOauth2, {
      name: 'googleOAuth2',
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET,
        },
        auth: fastifyOauth2.GOOGLE_CONFIGURATION,
      },
      scope: ['profile', 'email'],
      startRedirectPath: '/login/google',
      callbackUri: process.env.GOOGLE_CALLBACK_URI!,
      callbackUriParams: {
        access_type: 'offline',
      },
      pkce: 'S256',
    });
  } else {
    fastify.log.warn('[auth] Google OAuth désactivé (GOOGLE_CLIENT_ID/SECRET absents)');
  }

  await fastify.register(authRoutes);
  await fastify.register(userRoutes);
  await fastify.register(invitationRoutes);
  await fastify.register(passwordResetRoutes);
};

export const authOpenApiTags = [
  { name: authTag, description: 'Authentication' },
  { name: invitationTag, description: 'User invitations' },
  { name: passwordResetTag, description: 'Password reset' },
];

export default authModule;
