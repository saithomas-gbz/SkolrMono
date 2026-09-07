import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { teacherTeachesCourse, getClassIdsForTeacher } from '../lib/classServiceClient';
import { denyOutsideClassScope, denyOutsideCourseScope, scopedTeacherId } from '../lib/teacherScope';
import { publish } from '../../../shared/events';
import { invalidate } from '../lib/ttlCache';

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
  /** Ignoré pour un TEACHER : son identité vient du jeton. */
  teacherId?: string;
}

export interface UpdateGradeBody {
  value?: number;
  status?: string;
  comment?: string;
}

export default {
  getAllGrades: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Un enseignant ne voit que les notes de ses classes ; on filtre plutôt que
      // de renvoyer 403 pour ne pas casser l'usage administrateur de la route.
      const scopedTeacher = scopedTeacherId(request);
      const where = scopedTeacher
        ? { classId: { in: await getClassIdsForTeacher(scopedTeacher) } }
        : {};

      const grades = await db.grade.findMany({ where, include: gradeInclude });
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
      if (await denyOutsideCourseScope(request, reply, grade.classId, grade.courseId)) {
        return;
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
      if (await denyOutsideClassScope(request, reply, classId)) {
        return;
      }

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

      // `requireSelfOrStaff` laisse passer l'élève lui-même, un parent lié, et
      // TOUT membre du personnel — dont n'importe quel enseignant. Sans le filtre
      // ci-dessous, un prof de maths de CM2-A lisait les notes de n'importe quel
      // élève, toutes classes et toutes matières confondues : c'est la route de
      // lecture la plus large du module, et elle échappait au périmètre (#234).
      // Granularité classe, cohérente avec `getGradesByClassId` et le carnet.
      const scopedTeacher = scopedTeacherId(request);
      const where = scopedTeacher
        ? { userId, classId: { in: await getClassIdsForTeacher(scopedTeacher) } }
        : { userId };

      const grades = await db.grade.findMany({
        where,
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
      const { assignmentId, userId, classId, courseId, value, status, comment } = request.body;

      // Identité prise dans le jeton pour un enseignant : un `teacherId` fourni
      // par le client rendrait le contrôle `teacherTeachesCourse` ci-dessous
      // auto-déclaratif, donc contournable (#234). STAFF et ADMIN peuvent
      // encore noter au nom d'un enseignant.
      const teacherId = scopedTeacherId(request) ?? request.body.teacherId;
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

      // Le couple (classe, cours) du corps doit être celui du devoir. C'est
      // `teacherTeachesCourse` qui décide du droit d'écrire, et il l'évalue sur ce
      // couple : le laisser diverger du devoir permettait à un enseignant
      // légitime sur class-1/course-1 de rattacher une note à un devoir d'une
      // autre classe, en déclarant son propre couple. La ligne apparaissait alors
      // dans la grille du devoir visé, `getGradeGrid` filtrant sur le seul
      // `assignmentId` (#234).
      if (assignment.classId !== classId || assignment.courseId !== courseId) {
        return reply
          .status(400)
          .send({ error: 'classId and courseId must match the assignment' });
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

      publish('grade.created', {
        gradeId: grade.id,
        studentId: grade.userId,
        classId: grade.classId,
        courseId: grade.courseId,
        value: grade.value,
      }).catch((err) => request.log.warn({ err }, 'Failed to publish grade.created'));

      invalidate(`user:${grade.userId}`);
      invalidate(`class:${grade.classId}`);
      invalidate(`assignment:${grade.assignmentId}`);

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
      if (await denyOutsideCourseScope(request, reply, existing.classId, existing.courseId)) {
        return;
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

      invalidate(`user:${grade.userId}`);
      invalidate(`class:${grade.classId}`);
      invalidate(`assignment:${grade.assignmentId}`);

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
      if (await denyOutsideCourseScope(request, reply, existing.classId, existing.courseId)) {
        return;
      }

      const grade = await db.grade.delete({
        where: { id },
        include: gradeInclude,
      });

      invalidate(`user:${grade.userId}`);
      invalidate(`class:${grade.classId}`);
      invalidate(`assignment:${grade.assignmentId}`);

      return reply.status(200).send({ data: grade, message: 'Grade deleted successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
};
