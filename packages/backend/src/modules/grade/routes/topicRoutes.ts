import type { FastifyInstance } from 'fastify';
import topicController from '../controllers/topicController';
import { requireAuth, requireStaff } from '../lib/authGuard';
import {
  getAllTopicsSchema,
  getTopicByIdSchema,
  createTopicSchema,
  updateTopicSchema,
  deleteTopicSchema,
} from '../schemas/topicOpenApi';

export default async function topicRoutes(fastify: FastifyInstance) {
  fastify.get('/topics', { schema: getAllTopicsSchema, preHandler: requireAuth }, topicController.getAllTopics);
  fastify.get(
    '/topics/:id',
    { schema: getTopicByIdSchema, preHandler: requireAuth },
    topicController.getTopicById,
  );
  fastify.post('/topics', { schema: createTopicSchema, preHandler: requireStaff }, topicController.createTopic);
  fastify.put('/topics/:id', { schema: updateTopicSchema, preHandler: requireStaff }, topicController.updateTopic);
  fastify.delete(
    '/topics/:id',
    { schema: deleteTopicSchema, preHandler: requireStaff },
    topicController.deleteTopic,
  );
}
