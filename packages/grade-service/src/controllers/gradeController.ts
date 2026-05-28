import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

const gradeInclude = {
  user: true,
  class: true,
  course: true,
} as const;

export interface CreateGradeBody {
  userId: string;
  classId: string;
  courseId: string;
  value: number;
}

export interface UpdateGradeBody {
  value: number;
}

export default {
  getAllGrades: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const grades = await db.grade.findMany({ include: gradeInclude });
      return reply.status(200).send({ data: grades, message: 'Grades fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getGradeById: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const grade = await db.grade.findUnique({
        where: { id },
        include: gradeInclude,
      });
      if (!grade) {
        return reply.status(404).send({ error: 'Grade not found' });
      }
      return reply.status(200).send({ data: grade, message: 'Grade fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getGradesByClassId: async (
    request: FastifyRequest<{ Params: { classId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { classId } = request.params;
      const grades = await db.grade.findMany({
        where: { classId },
        include: gradeInclude,
      });
      return reply.status(200).send({ data: grades, message: 'Grades fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getGradesByUserId: async (
    request: FastifyRequest<{ Params: { userId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId } = request.params;
      const grades = await db.grade.findMany({
        where: { userId },
        include: gradeInclude,
      });
      return reply.status(200).send({ data: grades, message: 'Grades fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  createGrade: async (
    request: FastifyRequest<{ Body: CreateGradeBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { userId, classId, courseId, value } = request.body;

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      const classExists = await db.class.findUnique({ where: { id: classId } });
      if (!classExists) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const courseExists = await db.course.findUnique({ where: { id: courseId } });
      if (!courseExists) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      if (user.classId !== classId) {
        return reply.status(400).send({ error: 'User does not belong to this class' });
      }

      const grade = await db.grade.create({
        data: { userId, classId, courseId, value },
        include: gradeInclude,
      });
      return reply.status(201).send({ data: grade, message: 'Grade created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  updateGrade: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateGradeBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { value } = request.body;

      const existing = await db.grade.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Grade not found' });
      }

      const grade = await db.grade.update({
        where: { id },
        data: { value },
        include: gradeInclude,
      });
      return reply.status(200).send({ data: grade, message: 'Grade updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  deleteGrade: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const existing = await db.grade.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Grade not found' });
      }

      const grade = await db.grade.delete({
        where: { id },
        include: gradeInclude,
      });
      return reply.status(200).send({ data: grade, message: 'Grade deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
