import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

export interface CreateSubjectBody {
  name: string;
  description: string;
}

export interface UpdateSubjectBody {
  name?: string;
  description?: string;
}

const subjectInclude = { courses: true };

export default {
  getAllSubjects: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const subjects = await db.subject.findMany();
      return reply.status(200).send({ data: subjects, message: 'Subjects fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getSubjectById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const subject = await db.subject.findUnique({ where: { id }, include: subjectInclude });

      if (!subject) {
        return reply.status(404).send({ error: 'Subject not found' });
      }

      return reply.status(200).send({ data: subject, message: 'Subject fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  createSubject: async (
    request: FastifyRequest<{ Body: CreateSubjectBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { name, description } = request.body;
      const subject = await db.subject.create({ data: { name, description } });
      return reply.status(201).send({ data: subject, message: 'Subject created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  updateSubject: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateSubjectBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { name, description } = request.body;

      const existing = await db.subject.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Subject not found' });
      }

      const subject = await db.subject.update({ where: { id }, data: { name, description } });
      return reply.status(200).send({ data: subject, message: 'Subject updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  deleteSubject: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;

      const existing = await db.subject.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Subject not found' });
      }

      const subject = await db.subject.delete({ where: { id } });
      return reply.status(200).send({ data: subject, message: 'Subject deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
