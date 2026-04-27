import type { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { randomUUID } from 'crypto';

export interface ClassData {
  name: string;
  description: string;
  teacherIds?: string[];
  studentIds?: string[];
}

type CreateClassBodyData = Required<ClassData>;

export default {
  getAllClasses: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const classes = await db.class.findMany({
        include: {
          classTeachers: true,
          students: true,
        },
      });
      return reply.status(200).send({ data: classes, message: 'Classes fetched successfully' });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  getClassById: async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const classData = await db.class.findUnique({
        where: { id },
        include: {
          classTeachers: true,
          students: true,
        },
      });
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
      return reply.status(200).send({ data: classData, message: 'Class fetched successfully' });
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