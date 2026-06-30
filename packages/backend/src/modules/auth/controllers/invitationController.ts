import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db from '../../../shared/db';
import { publish } from '../../../shared/events';
import { sendMail } from '../lib/mailer';
import { invitationEmail, welcomeEmail } from '../lib/mailTemplates';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Rôles qu'un ADMIN peut attribuer par invitation — exclut ADMIN/PLATFORM_ADMIN (anti-escalade). */
const INVITABLE_ROLES = ['USER', 'TEACHER', 'STAFF', 'PARENT'] as const;
type InvitableRole = (typeof INVITABLE_ROLES)[number];

function buildInvitationUrl(token: string): string {
  const base = process.env.INVITATION_URL ?? 'http://localhost:3003/auth/accept-invitation';
  return `${base}?token=${token}`;
}

const invitationController = {
  createInvitation: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, role } = request.body as { email: string; role: InvitableRole };

      if (!INVITABLE_ROLES.includes(role)) {
        return reply.status(400).send({ error: 'Invalid role' });
      }

      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      const token = crypto.randomBytes(32).toString('hex');

      await db.invitationToken.create({
        data: {
          token,
          email,
          role,
          establishmentId: request.authUser?.establishmentId ?? null,
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
      });

      const { subject, html } = invitationEmail({ inviteUrl: buildInvitationUrl(token) });
      sendMail({ to: email, subject, html }).catch((err) =>
        request.log.warn({ err }, 'Failed to send invitation email'),
      );

      return reply.status(201).send({ message: 'Invitation sent' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getInvitationByToken: async (
    request: FastifyRequest<{ Params: { token: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { token } = request.params;
      const invitation = await db.invitationToken.findUnique({ where: { token } });

      if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
        return reply.status(404).send({ error: 'Invitation not found or expired' });
      }

      return reply.send({ email: invitation.email, role: invitation.role });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  acceptInvitation: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, password, name } = request.body as {
        token: string;
        password: string;
        name?: string;
      };

      const invitation = await db.invitationToken.findUnique({ where: { token } });
      if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Invitation not found or expired' });
      }

      const existingUser = await db.user.findUnique({ where: { email: invitation.email } });
      if (existingUser) {
        return reply.status(400).send({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db.user.create({
        data: {
          email: invitation.email,
          password: hashedPassword,
          name: name?.trim() || invitation.email.split('@')[0],
          role: invitation.role,
          establishmentId: invitation.establishmentId,
        },
      });

      await db.invitationToken.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      });

      const jwtToken = request.server.jwt.sign(
        { userId: user.id, email: user.email, role: user.role, establishmentId: user.establishmentId },
        { expiresIn: '1h' },
      );

      publish('user.created', {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }).catch((err) => request.log.warn({ err }, 'Failed to publish user.created'));

      const { subject, html } = welcomeEmail({ name: user.name ?? user.email });
      sendMail({ to: user.email, subject, html }).catch((err) =>
        request.log.warn({ err }, 'Failed to send welcome email'),
      );

      return reply.status(201).send({
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          establishmentId: user.establishmentId,
        },
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

export default invitationController;
