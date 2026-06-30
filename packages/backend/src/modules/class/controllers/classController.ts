import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../../../shared/db';
import { randomUUID } from 'crypto';
import { RESERVED_CLASS_PATH_IDS, sendListOk } from '../lib/listResponse';
import { publish } from '../../../shared/events';

export interface ClassData {
  name: string;
  description: string;
  teacherIds?: string[];
  studentIds?: string[];
}

type CreateClassBodyData = Required<ClassData>;

export default {
  getClassesSummary: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const classes = await db.class.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              classTeachers: true,
              students: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      const data = Array.isArray(classes)
        ? classes.map((c) => ({
            id: c.id,
            name: c.name,
            teacherCount: c._count.classTeachers,
            studentCount: c._count.students,
          }))
        : [];
      return sendListOk(reply, data, 'Classes summary fetched successfully');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  getAllClasses: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const classes = await db.class.findMany({
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return sendListOk(reply, classes, 'Classes fetched successfully');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  getClassById: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      if (RESERVED_CLASS_PATH_IDS.has(id)) {
        return reply.status(404).send({ error: 'Class not found' });
      }
      const classData = await db.class.findUnique({
        where: { id },
        include: {
          classTeachers: true,
          students: true,
        },
      });
      if (!classData) {
        return reply.status(404).send({ error: 'Class not found' });
      }
      return reply.status(200).send({ data: classData, message: 'Class fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  getClassByTeacherId: async (request: FastifyRequest<{ Params: { teacherId: string } }>, reply: FastifyReply) => {
    try {
      const { teacherId } = request.params;
      const classData = await db.class.findMany({
        where: { classTeachers: { some: { teacherId } } },
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return sendListOk(reply, classData, 'Classes fetched successfully');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  getClassesByStudentId: async (request: FastifyRequest<{ Params: { studentId: string } }>, reply: FastifyReply) => {
    try {
      const { studentId } = request.params;
      const classData = await db.class.findMany({
        where: { students: { some: { studentId } } },
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return sendListOk(reply, classData, 'Classes fetched successfully');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  getTeacherCoursesInClass: async (
    request: FastifyRequest<{ Params: { classId: string; teacherId: string } }>,
    reply: FastifyReply,
  ) => {
    try {
      const { classId, teacherId } = request.params;
      const assignment = await db.classTeacher.findUnique({
        where: { classId_teacherId: { classId, teacherId } },
        include: { courses: true },
      });
      if (!assignment) {
        return reply.status(404).send({ error: 'Teacher is not assigned to this class' });
      }
      return sendListOk(reply, assignment.courses, 'Teacher courses fetched successfully');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  createClass: async (request: FastifyRequest<{ Body: CreateClassBodyData }>, reply: FastifyReply) => {
    try {
      const { name, description, teacherIds, studentIds } = request.body;
      const newClass = await db.class.create({
        data: {
          name,
          description,
          classTeachers: {
            create: teacherIds.map((teacherId) => ({
              id: randomUUID(),
              teacherId,
              isPrincipal: teacherId === teacherIds[0],
            })),
          },
          students: {
            create: studentIds.map((studentId) => ({
              id: randomUUID(),
              studentId,
            })),
          },
        },
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return reply.status(201).send({ data: newClass, message: 'Class created successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  updateClassNameOrDescription: async (
    request: FastifyRequest<{ Params: { id: string }, 
    Body: ClassData }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { name, description } = request.body;
      const updatedClass = await db.class.update({
        where: { id },
        data: { name, description },
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return reply.status(200).send({ data: updatedClass, message: 'Class updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  updateClassTeacherList: async (request: FastifyRequest<{ Params: { id: string }, Body: { teacherIds: string[] } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { teacherIds } = request.body;
      const updatedClass = await db.class.update({
        where: { id },
        data: {
          classTeachers: {
            deleteMany: {},
            create: teacherIds.map((teacherId) => ({
              id: randomUUID(),
              teacherId,
              isPrincipal: teacherId === teacherIds[0],
            })),
          },
        },
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return reply.status(200).send({ data: updatedClass, message: 'Class updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    } 
  },
  updateClassStudentList: async (request: FastifyRequest<{ Params: { id: string }, Body: { studentIds: string[] } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const { studentIds } = request.body;
      const updatedClass = await db.class.update({
        where: { id },
        data: {
          students: {
            deleteMany: {},
            create: studentIds.map((studentId) => ({ id: randomUUID(), studentId })),
          },
        },
        include: {
          classTeachers: true,
          students: true,
        },
      });

      for (const studentId of studentIds) {
        publish('student.enrolled', { studentId, classId: id }).catch((err) =>
          request.log.warn({ err }, 'Failed to publish student.enrolled'),
        );
      }

      return reply.status(200).send({ data: updatedClass, message: 'Class updated successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  deleteClass: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const deletedClass = await db.class.delete({ where: { id } });
      return reply.status(200).send({ data: deletedClass, message: 'Class deleted successfully' });
    } catch (error) {

      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
}