import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import bcrypt from 'bcrypt';

type Role = 'USER' | 'TEACHER' | 'STAFF' | 'ADMIN';

const userController = {
  me: async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(request.user);
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
      const { ids } = request.query as { ids?: string };

      const idList = (ids ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      if (idList.length === 0) {
        return reply.send({ data: [] });
      }

      const users = await db.user.findMany({
        where: { id: { in: idList } },
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
      const { email, password, name, role } = request.body as {
        email: string;
        password: string;
        name?: string;
        role?: Role;
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
      const { name, email, role } = request.body as {
        name?: string;
        email?: string;
        role?: Role;
      };

      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const user = await db.user.update({
        where: { id },
        data: { name, email, role },
        omit: { password: true },
      });

      return reply.send(user);
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  deleteUser: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await db.user.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'User not found' });
      }

      await db.user.delete({ where: { id } });
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

      const result = await db.user.deleteMany({
        where: { id: { in: ids } },
      });

      return reply.send({
        message: `${result.count} user(s) deleted successfully`,
        count: result.count,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};

export default userController;
