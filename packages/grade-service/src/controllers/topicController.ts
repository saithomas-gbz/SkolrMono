import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

export interface CreateTopicBody {
  name: string;
  description: string;
  courseId: string;
}

export interface UpdateTopicBody {
  name?: string;
  description?: string;
}

export default {
  getAllTopics: async (
    request: FastifyRequest<{ Querystring: { courseId?: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { courseId } = request.query;
      const topics = await db.topic.findMany({
        where: courseId ? { courseId } : undefined,
        orderBy: { createdAt: 'asc' },
      });
      return reply.status(200).send({ data: topics, message: 'Topics fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getTopicById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const topic = await db.topic.findUnique({ where: { id } });
      if (!topic) {
        return reply.status(404).send({ error: 'Topic not found' });
      }
      return reply.status(200).send({ data: topic, message: 'Topic fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  createTopic: async (
    request: FastifyRequest<{ Body: CreateTopicBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { name, description, courseId } = request.body;

      const course = await db.course.findUnique({ where: { id: courseId } });
      if (!course) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const topic = await db.topic.create({ data: { name, description, courseId } });
      return reply.status(201).send({ data: topic, message: 'Topic created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  updateTopic: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTopicBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { name, description } = request.body;

      const existing = await db.topic.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Topic not found' });
      }

      const topic = await db.topic.update({ where: { id }, data: { name, description } });
      return reply.status(200).send({ data: topic, message: 'Topic updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  deleteTopic: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;

      const existing = await db.topic.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Topic not found' });
      }

      const topic = await db.topic.delete({ where: { id } });
      return reply.status(200).send({ data: topic, message: 'Topic deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
