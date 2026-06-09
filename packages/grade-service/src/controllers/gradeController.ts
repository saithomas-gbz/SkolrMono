import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { teacherTeachesCourse } from '../lib/classServiceClient';

const gradeInclude = {
  user: true,
  class: true,
  course: true,
} as const;

export interface CreateGradeBody {
  assignmentId: string;
  userId: string;
  classId: string;
  courseId: string;
  value?: number;
  status?: string;
  comment?: string;
  teacherId: string;
}

export interface UpdateGradeBody {
  value?: number;
  status?: string;
  comment?: string;
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
      const { assignmentId, userId, classId, courseId, value, status, comment, teacherId } = request.body;

      if (!teacherId) {
        return reply.status(400).send({ error: 'teacherId is required' });
      }

      const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

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

      const allowed = await teacherTeachesCourse(classId, teacherId, courseId);
      if (!allowed) {
        return reply
          .status(403)
          .send({ error: 'Teacher is not allowed to grade this course in this class' });
      }

      const grade = await db.grade.create({
        data: {
          assignmentId,
          userId,
          classId,
          courseId,
          value: value ?? null,
          status: (status ?? 'GRADED') as 'GRADED',
          comment: comment ?? null,
        },
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
      const { value, status, comment } = request.body;

      const existing = await db.grade.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Grade not found' });
      }

      const grade = await db.grade.update({
        where: { id },
        data: {
          ...(value !== undefined ? { value } : {}),
          ...(status !== undefined ? { status: status as 'GRADED' } : {}),
          ...(comment !== undefined ? { comment } : {}),
        },
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
