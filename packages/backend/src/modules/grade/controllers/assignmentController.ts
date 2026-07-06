import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { teacherTeachesCourse } from '../lib/classServiceClient';

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
type GradeStatus = 'PENDING' | 'GRADED' | 'ABSENT' | 'EXEMPT';

export interface CreateAssignmentBody {
  title: string;
  description?: string;
  classId: string;
  courseId: string;
  teacherId: string;
  assignedAt: string;
  dueAt?: string;
  maxScore?: number;
  coefficient?: number;
}

export interface UpdateAssignmentBody {
  title?: string;
  description?: string;
  assignedAt?: string;
  dueAt?: string;
  maxScore?: number;
  coefficient?: number;
  status?: AssignmentStatus;
}

export interface BatchGradeEntry {
  userId: string;
  status: GradeStatus;
  value?: number;
  comment?: string;
}

export interface BatchUpdateGradesBody {
  entries: BatchGradeEntry[];
}

interface AssignmentQuerystring {
  classId?: string;
  courseId?: string;
  teacherId?: string;
  status?: AssignmentStatus;
}

interface GradebookQuerystring {
  courseId?: string;
}

const assignmentInclude = {
  class: { select: { id: true, name: true } },
  course: { select: { id: true, name: true } },
} as const;

export default {
  createAssignment: async (
    request: FastifyRequest<{ Body: CreateAssignmentBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { title, description, classId, courseId, teacherId, assignedAt, dueAt, maxScore, coefficient } =
        request.body;

      const classExists = await db.class.findUnique({ where: { id: classId } });
      if (!classExists) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const courseExists = await db.course.findUnique({ where: { id: courseId } });
      if (!courseExists) {
        return reply.status(404).send({ error: 'Course not found' });
      }

      const allowed = await teacherTeachesCourse(classId, teacherId, courseId);
      if (!allowed) {
        return reply.status(403).send({ error: 'Teacher is not allowed to create an assignment for this course in this class' });
      }

      const assignment = await db.assignment.create({
        data: {
          title,
          description,
          classId,
          courseId,
          teacherId,
          assignedAt: new Date(assignedAt),
          dueAt: dueAt ? new Date(dueAt) : undefined,
          maxScore: maxScore ?? 20,
          coefficient: coefficient ?? 1,
        },
        include: assignmentInclude,
      });

      return reply.status(201).send({ data: assignment, message: 'Assignment created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getAssignments: async (
    request: FastifyRequest<{ Querystring: AssignmentQuerystring }>,
    reply: FastifyReply,
  ) => {
    try {
      const { classId, courseId, teacherId, status } = request.query;

      const assignments = await db.assignment.findMany({
        where: {
          ...(classId ? { classId } : {}),
          ...(courseId ? { courseId } : {}),
          ...(teacherId ? { teacherId } : {}),
          ...(status ? { status: status as AssignmentStatus } : {}),
        },
        include: { ...assignmentInclude, grades: { select: { status: true } } },
        orderBy: { assignedAt: 'desc' },
      });

      const data = assignments.map(({ grades, ...assignment }) => ({
        ...assignment,
        gradedCount: grades.filter((g) => g.status === 'GRADED').length,
        totalCount: grades.length,
      }));

      return reply.status(200).send({ data, message: 'Assignments fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getAssignmentById: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const assignment = await db.assignment.findUnique({
        where: { id },
        include: assignmentInclude,
      });
      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }
      return reply.status(200).send({ data: assignment, message: 'Assignment fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  updateAssignment: async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateAssignmentBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { title, description, assignedAt, dueAt, maxScore, coefficient, status } = request.body;

      const existing = await db.assignment.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      if (existing.status === 'CLOSED' && status !== 'CLOSED') {
        return reply.status(400).send({ error: 'Closed assignment cannot be reopened' });
      }

      const assignment = await db.assignment.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(assignedAt !== undefined ? { assignedAt: new Date(assignedAt) } : {}),
          ...(dueAt !== undefined ? { dueAt: new Date(dueAt) } : {}),
          ...(maxScore !== undefined ? { maxScore } : {}),
          ...(coefficient !== undefined ? { coefficient } : {}),
          ...(status !== undefined ? { status: status as AssignmentStatus } : {}),
        },
        include: assignmentInclude,
      });

      return reply.status(200).send({ data: assignment, message: 'Assignment updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  deleteAssignment: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const existing = await db.assignment.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      await db.assignment.delete({ where: { id } });
      return reply.status(200).send({ data: existing, message: 'Assignment deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  publishAssignment: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const assignment = await db.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }
      if (assignment.status !== 'DRAFT') {
        return reply.status(400).send({ error: 'Only DRAFT assignments can be published' });
      }

      // Get all students in the class from the grade-service User table
      const students = await db.user.findMany({ where: { classId: assignment.classId } });

      await db.$transaction(async (tx) => {
        await tx.assignment.update({ where: { id }, data: { status: 'PUBLISHED' } });
        for (const student of students) {
          await tx.grade.upsert({
            where: { assignmentId_userId: { assignmentId: id, userId: student.id } },
            create: {
              assignmentId: id,
              userId: student.id,
              classId: assignment.classId,
              courseId: assignment.courseId,
              status: 'PENDING',
            },
            update: {},
          });
        }
      });

      const updated = await db.assignment.findUnique({ where: { id }, include: assignmentInclude });
      return reply.status(200).send({ data: updated, message: 'Assignment published successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getGradeGrid: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const assignment = await db.assignment.findUnique({
        where: { id },
        include: assignmentInclude,
      });
      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }

      const grades = await db.grade.findMany({
        where: { assignmentId: id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: 'asc' } },
      });

      const rows = grades.map((g) => ({
        userId: g.userId,
        name: g.user.name,
        grade: { id: g.id, status: g.status, value: g.value, comment: g.comment },
      }));

      const gradedCount = grades.filter((g) => g.status === 'GRADED').length;

      return reply.status(200).send({
        data: { assignment, rows, gradedCount, totalCount: grades.length },
        message: 'Grade grid fetched successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  batchUpdateGrades: async (
    request: FastifyRequest<{ Params: { id: string }; Body: BatchUpdateGradesBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { entries } = request.body;

      const assignment = await db.assignment.findUnique({ where: { id } });
      if (!assignment) {
        return reply.status(404).send({ error: 'Assignment not found' });
      }
      if (assignment.status === 'CLOSED') {
        return reply.status(400).send({ error: 'Assignment is closed, grades are read-only' });
      }

      for (const entry of entries) {
        if (entry.status === 'GRADED') {
          if (entry.value === undefined || entry.value === null) {
            return reply.status(400).send({ error: `value is required for GRADED status (userId: ${entry.userId})` });
          }
          if (entry.value < 0 || entry.value > assignment.maxScore) {
            return reply.status(400).send({
              error: `value must be between 0 and ${assignment.maxScore} (userId: ${entry.userId})`,
            });
          }
        }
      }

      await db.$transaction(async (tx) => {
        for (const entry of entries) {
          const value = entry.status === 'GRADED' ? entry.value : null;
          await tx.grade.upsert({
            where: { assignmentId_userId: { assignmentId: id, userId: entry.userId } },
            create: {
              assignmentId: id,
              userId: entry.userId,
              classId: assignment.classId,
              courseId: assignment.courseId,
              status: entry.status as GradeStatus,
              value: value ?? null,
              comment: entry.comment ?? null,
            },
            update: {
              status: entry.status as GradeStatus,
              value: value ?? null,
              comment: entry.comment ?? null,
            },
          });
        }
      });

      return reply.status(200).send({ message: 'Grades updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },

  getGradebook: async (
    request: FastifyRequest<{ Params: { classId: string }; Querystring: GradebookQuerystring }>,
    reply: FastifyReply,
  ) => {
    try {
      const { classId } = request.params;
      const { courseId } = request.query;

      const classExists = await db.class.findUnique({ where: { id: classId } });
      if (!classExists) {
        return reply.status(404).send({ error: 'Class not found' });
      }

      const assignments = await db.assignment.findMany({
        where: {
          classId,
          ...(courseId ? { courseId } : {}),
          status: { in: ['PUBLISHED', 'CLOSED'] },
        },
        include: assignmentInclude,
        orderBy: { assignedAt: 'asc' },
      });

      const students = await db.user.findMany({
        where: { classId },
        orderBy: { name: 'asc' },
      });

      const grades = await db.grade.findMany({
        where: {
          classId,
          assignmentId: { in: assignments.map((a) => a.id) },
        },
      });

      const gradesMap: Record<string, Record<string, { id: string; status: string; value: number | null; comment: string | null }>> = {};
      for (const g of grades) {
        if (!gradesMap[g.userId]) {
          gradesMap[g.userId] = {};
        }
        gradesMap[g.userId]![g.assignmentId] = {
          id: g.id,
          status: g.status,
          value: g.value,
          comment: g.comment,
        };
      }

      return reply.status(200).send({
        data: {
          classId,
          courseId: courseId ?? null,
          assignments,
          students: students.map((s) => ({ userId: s.id, name: s.name })),
          grades: gradesMap,
        },
        message: 'Gradebook fetched successfully',
      });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
