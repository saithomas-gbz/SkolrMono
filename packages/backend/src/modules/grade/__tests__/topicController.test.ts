import { describe, it, expect, beforeEach, mock } from 'bun:test';
import topicController from '../controllers/topicController';
import db from '../db';
import type { FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';

mock.module('../db', () => ({
  default: {
    topic: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
    },
    course: {
      findUnique: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  topic: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
    create: ReturnType<typeof mock>;
    update: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  course: {
    findUnique: ReturnType<typeof mock>;
  };
};

const sampleTopic = {
  id: 'topic-1',
  name: 'Fractions',
  description: 'Addition et soustraction de fractions',
  courseId: 'course-1',
};

const sampleCourse = { id: 'course-1', name: 'Mathématiques' };

function createMockRequest<RouteGeneric extends RouteGenericInterface = RouteGenericInterface>(
  overrides: Partial<Pick<FastifyRequest<RouteGeneric>, 'body' | 'params' | 'query'>> = {},
): FastifyRequest<RouteGeneric> {
  return {
    body: (overrides.body ?? {}) as FastifyRequest<RouteGeneric>['body'],
    params: (overrides.params ?? {}) as FastifyRequest<RouteGeneric>['params'],
    query: (overrides.query ?? {}) as FastifyRequest<RouteGeneric>['query'],
    log: { error: mock() },
  } as FastifyRequest<RouteGeneric>;
}

describe('TopicController', () => {
  const mockReply = {
    status: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  } as unknown as FastifyReply;

  beforeEach(() => {
    prismaMock.topic.findUnique.mockReset();
    prismaMock.topic.findMany.mockReset();
    prismaMock.topic.create.mockReset();
    prismaMock.topic.update.mockReset();
    prismaMock.topic.delete.mockReset();
    prismaMock.course.findUnique.mockReset();

    (mockReply.status as ReturnType<typeof mock>).mockReset();
    (mockReply.send as ReturnType<typeof mock>).mockReset();
    (mockReply.status as ReturnType<typeof mock>).mockReturnThis();
    (mockReply.send as ReturnType<typeof mock>).mockReturnThis();
  });

  describe('getAllTopics', () => {
    it('should return all topics when no courseId filter is given', async () => {
      prismaMock.topic.findMany.mockResolvedValue([sampleTopic]);
      const req = createMockRequest<{ Querystring: { courseId?: string } }>();
      await topicController.getAllTopics(req, mockReply);
      expect(prismaMock.topic.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'asc' },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: [sampleTopic],
        message: 'Topics fetched successfully',
      });
    });

    it('should filter topics by courseId when provided', async () => {
      prismaMock.topic.findMany.mockResolvedValue([sampleTopic]);
      const req = createMockRequest<{ Querystring: { courseId?: string } }>({
        query: { courseId: 'course-1' },
      });
      await topicController.getAllTopics(req, mockReply);
      expect(prismaMock.topic.findMany).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        orderBy: { createdAt: 'asc' },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on database error', async () => {
      prismaMock.topic.findMany.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Querystring: { courseId?: string } }>();
      await topicController.getAllTopics(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getTopicById', () => {
    it('should return a topic by id', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(sampleTopic);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'topic-1' } });
      await topicController.getTopicById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleTopic,
        message: 'Topic fetched successfully',
      });
    });

    it('should return 404 when topic is not found', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await topicController.getTopicById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Topic not found' });
    });

    it('should return 500 on database error', async () => {
      prismaMock.topic.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'topic-1' } });
      await topicController.getTopicById(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('createTopic', () => {
    it('should create and return a topic when the course exists', async () => {
      prismaMock.course.findUnique.mockResolvedValue(sampleCourse);
      prismaMock.topic.create.mockResolvedValue(sampleTopic);
      const req = createMockRequest<{ Body: { name: string; description: string; courseId: string } }>({
        body: { name: 'Fractions', description: 'Addition et soustraction de fractions', courseId: 'course-1' },
      });
      await topicController.createTopic(req, mockReply);
      expect(prismaMock.topic.create).toHaveBeenCalledWith({
        data: { name: 'Fractions', description: 'Addition et soustraction de fractions', courseId: 'course-1' },
      });
      expect(mockReply.status).toHaveBeenCalledWith(201);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleTopic,
        message: 'Topic created successfully',
      });
    });

    it('should return 404 when the course does not exist', async () => {
      prismaMock.course.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Body: { name: string; description: string; courseId: string } }>({
        body: { name: 'Fractions', description: 'Addition et soustraction de fractions', courseId: 'missing' },
      });
      await topicController.createTopic(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Course not found' });
      expect(prismaMock.topic.create).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.course.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Body: { name: string; description: string; courseId: string } }>({
        body: { name: 'Fractions', description: 'Addition et soustraction de fractions', courseId: 'course-1' },
      });
      await topicController.createTopic(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('updateTopic', () => {
    it('should update and return the topic', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(sampleTopic);
      const updated = { ...sampleTopic, name: 'Fractions avancées' };
      prismaMock.topic.update.mockResolvedValue(updated);
      const req = createMockRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>({
        params: { id: 'topic-1' },
        body: { name: 'Fractions avancées' },
      });
      await topicController.updateTopic(req, mockReply);
      expect(prismaMock.topic.update).toHaveBeenCalledWith({
        where: { id: 'topic-1' },
        data: { name: 'Fractions avancées', description: undefined },
      });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: updated,
        message: 'Topic updated successfully',
      });
    });

    it('should return 404 when topic is not found', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>({
        params: { id: 'missing' },
        body: { name: 'Fractions avancées' },
      });
      await topicController.updateTopic(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Topic not found' });
      expect(prismaMock.topic.update).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.topic.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>({
        params: { id: 'topic-1' },
        body: { name: 'Fractions avancées' },
      });
      await topicController.updateTopic(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('deleteTopic', () => {
    it('should delete and return the topic', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(sampleTopic);
      prismaMock.topic.delete.mockResolvedValue(sampleTopic);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'topic-1' } });
      await topicController.deleteTopic(req, mockReply);
      expect(prismaMock.topic.delete).toHaveBeenCalledWith({ where: { id: 'topic-1' } });
      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith({
        data: sampleTopic,
        message: 'Topic deleted successfully',
      });
    });

    it('should return 404 when topic is not found', async () => {
      prismaMock.topic.findUnique.mockResolvedValue(null);
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'missing' } });
      await topicController.deleteTopic(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(404);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Topic not found' });
      expect(prismaMock.topic.delete).not.toHaveBeenCalled();
    });

    it('should return 500 on database error', async () => {
      prismaMock.topic.findUnique.mockRejectedValue(new Error('db error'));
      const req = createMockRequest<{ Params: { id: string } }>({ params: { id: 'topic-1' } });
      await topicController.deleteTopic(req, mockReply);
      expect(mockReply.status).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
