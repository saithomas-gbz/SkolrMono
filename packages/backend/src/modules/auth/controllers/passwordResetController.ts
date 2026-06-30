import type { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import db from '../../../shared/db';
import { sendMail } from '../lib/mailer';
import { passwordResetEmail } from '../lib/mailTemplates';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function buildResetUrl(token: string): string {
  const base = process.env.PASSWORD_RESET_URL ?? 'http://localhost:3003/auth/reset-password';
  return `${base}?token=${token}`;
}

const passwordResetController = {
  forgotPassword: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = request.body as { email: string };

      const user = await db.user.findUnique({ where: { email } });

      if (user) {
        const token = crypto.randomBytes(32).toString('hex');

        await db.passwordResetToken.create({
          data: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
          },
        });

        const { subject, html } = passwordResetEmail({ resetUrl: buildResetUrl(token) });
        sendMail({ to: user.email, subject, html }).catch((err) =>
          request.log.warn({ err }, 'Failed to send password reset email'),
        );
      }

      return reply.status(200).send({
        message: 'If an account exists for this email, a reset link has been sent.',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  resetPassword: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, password } = request.body as { token: string; password: string };

      const resetToken = await db.passwordResetToken.findUnique({ where: { token } });

      if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
        return reply.status(400).send({ error: 'Invalid or expired token' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      await db.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      return reply.status(200).send({ message: 'Password updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

export default passwordResetController;
