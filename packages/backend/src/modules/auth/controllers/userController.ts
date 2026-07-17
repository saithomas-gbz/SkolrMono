import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import bcrypt from 'bcrypt';
import { collectPersonalData, anonymizeUser } from '../lib/rgpdService';

type Role = 'USER' | 'TEACHER' | 'STAFF' | 'ADMIN' | 'PLATFORM_ADMIN' | 'PARENT';

const userController = {
  me: async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(request.user);
  },

  // RGPD — droit d'accès / portabilité (art. 15 & 20) : export JSON de toutes
  // les données personnelles de l'utilisateur authentifié.
  exportMyData: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = request.authUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const data = await collectPersonalData(auth.userId, auth.email);

      return reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="skolr-export-${auth.userId}.json"`)
        .send(data);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  // RGPD — droit à l'effacement (art. 17) : anonymise le compte de l'utilisateur
  // authentifié (soft-delete + scrub PII), les enregistrements liés sont conservés.
  eraseMyAccount: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const auth = request.authUser;
      if (!auth) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const erased = await anonymizeUser(auth.userId);
      if (!erased) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ message: 'Account anonymized successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getUserById: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const user = await db.user.findUnique({
        where: { id },
        omit: { password: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getUsersByIds: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ids, role } = request.query as { ids?: string; role?: string };

      const idList = (ids ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      const where = {
        ...(idList.length > 0 ? { id: { in: idList } } : {}),
        ...(role ? { role: role as Role } : {}),
      };

      if (idList.length === 0 && !role) {
        return reply.send({ data: [] });
      }

      const users = await db.user.findMany({
        where,
        omit: { password: true },
      });

      return reply.send({ data: users });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  createUser: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, name, role, establishmentId } = request.body as {
        email: string;
        password: string;
        name?: string;
        role?: Role;
        establishmentId?: string;
      };

      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(400).send({ error: 'Email already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name ?? email.split('@')[0],
          role: role ?? 'USER',
          establishmentId,
        },
        omit: { password: true },
      });

      return reply.status(201).send(user);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  updateUser: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, email, role, establishmentId } = request.body as {
        name?: string;
        email?: string;
        role?: Role;
        establishmentId?: string;
      };

      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (email && email !== existing.email) {
        const emailTaken = await db.user.findUnique({ where: { email } });
        if (emailTaken) {
          return reply.status(409).send({ error: 'Email already in use' });
        }
      }

      // Seul un ADMIN/PLATFORM_ADMIN peut changer le rôle ou l'établissement d'un compte
      // (un utilisateur ne doit jamais pouvoir s'auto-promouvoir via son propre profil).
      const isPrivileged = request.authUser?.role === 'ADMIN' || request.authUser?.role === 'PLATFORM_ADMIN';

      const user = await db.user.update({
        where: { id },
        data: {
          name,
          email,
          ...(isPrivileged ? { role, establishmentId } : {}),
        },
        omit: { password: true },
      });

      return reply.send(user);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  changePassword: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { currentPassword, newPassword } = request.body as {
        currentPassword: string;
        newPassword: string;
      };

      const userId = request.authUser?.userId;
      const existing = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
      if (!existing) {
        return reply.status(404).send({ error: 'User not found' });
      }

      if (!existing.password) {
        return reply.status(400).send({ error: 'Password change not available for this account' });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, existing.password);
      if (!passwordMatch) {
        return reply.status(401).send({ error: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return reply.send({ message: 'Password updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  // Suppression admin — anonymisation RGPD (soft-delete) plutôt que hard delete :
  // supprime les comptes/jetons, scrub la PII et conserve la ligne pour ne pas
  // orpheliner les données cross-schema (grades, absences, messages…).
  deleteUser: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const erased = await anonymizeUser(id);
      if (!erased) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ message: 'User deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  massDeleteUsers: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ids } = request.body as { ids: string[] };

      if (!ids || ids.length === 0) {
        return reply.status(400).send({ error: 'No IDs provided' });
      }

      const results = await Promise.all(ids.map((id) => anonymizeUser(id)));
      const count = results.filter(Boolean).length;

      return reply.send({
        message: `${count} user(s) deleted successfully`,
        count,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

export default userController;
