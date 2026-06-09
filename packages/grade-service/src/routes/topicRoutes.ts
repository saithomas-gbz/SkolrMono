import type { FastifyInstance } from 'fastify';
import topicController from '../controllers/topicController';
import {
  getAllTopicsSchema,
  getTopicByIdSchema,
  createTopicSchema,
  updateTopicSchema,
  deleteTopicSchema,
} from '../schemas/topicOpenApi';

export default async function topicRoutes(fastify: FastifyInstance) {
  fastify.get('/topics', { schema: getAllTopicsSchema }, topicController.getAllTopics);
  fastify.get('/topics/:id', { schema: getTopicByIdSchema }, topicController.getTopicById);
  fastify.post('/topics', { schema: createTopicSchema }, topicController.createTopic);
  fastify.put('/topics/:id', { schema: updateTopicSchema }, topicController.updateTopic);
  fastify.delete('/topics/:id', { schema: deleteTopicSchema }, topicController.deleteTopic);
}
