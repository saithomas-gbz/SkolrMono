import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

export interface CreateCourseBody {
  name: string;
  description: string;
  subjectId?: string;
}

export interface UpdateCourseBody {
  name?: string;
  description?: string;
  subjectId?: string;
}

const courseInclude = { subject: true, relatedCourses: true };

export default {
  getAllCourses: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const courses = await db.course.findMany({ include: courseInclude });
      return reply.status(200).send({ data: courses, message: 'Courses fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getCourseById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const course = await db.course.findUnique({ where: { id }, include: courseInclude });

      if (!course) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      return reply.status(200).send({ data: course, message: 'Course fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  createCourse: async (
    request: FastifyRequest<{ Body: CreateCourseBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { name, description, subjectId } = request.body;

      const course = await db.course.create({ data: { name, description, subjectId } });
      return reply.status(201).send({ data: course, message: 'Course created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  updateCourse: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCourseBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { name, description, subjectId } = request.body;

      const existing = await db.course.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const course = await db.course.update({ where: { id }, data: { name, description, subjectId } });
      return reply.status(200).send({ data: course, message: 'Course updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  deleteCourse: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;

      const existing = await db.course.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const course = await db.course.delete({ where: { id } });
      return reply.status(200).send({ data: course, message: 'Course deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  massDeleteCourses: async (
    request: FastifyRequest<{ Body: { ids: string[] } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { ids } = request.body;

      if (!ids || ids.length === 0) {
        return reply.status(400).send({ error: 'No IDs provided' });
      }

      const result = await db.course.deleteMany({ where: { id: { in: ids } } });
      return reply.status(200).send({
        message: `${result.count} course(s) deleted successfully`,
        count: result.count,
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  addRelatedCourse: async (
    request: FastifyRequest<{ Params: { id: string }; Body: { relatedCourseId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { relatedCourseId } = request.body;

      if (id === relatedCourseId) {
        return reply.status(400).send({ error: 'A course cannot be linked to itself' });
      }

      const [course, related] = await Promise.all([
        db.course.findUnique({ where: { id } }),
        db.course.findUnique({ where: { id: relatedCourseId } }),
      ]);

      if (!course) {
        return reply.status(404).send({ error: 'Course not found' });
      }
      if (!related) {
        return reply.status(404).send({ error: 'Related course not found' });
      }

      const updated = await db.course.update({
        where: { id },
        data: { relatedCourses: { connect: { id: relatedCourseId } } },
        include: courseInclude,
      });

      return reply.status(200).send({ data: updated, message: 'Related course added successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  removeRelatedCourse: async (
    request: FastifyRequest<{ Params: { id: string; relatedId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id, relatedId } = request.params;

      const course = await db.course.findUnique({ where: { id } });
      if (!course) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const updated = await db.course.update({
        where: { id },
        data: { relatedCourses: { disconnect: { id: relatedId } } },
        include: courseInclude,
      });

      return reply.status(200).send({ data: updated, message: 'Related course removed successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
