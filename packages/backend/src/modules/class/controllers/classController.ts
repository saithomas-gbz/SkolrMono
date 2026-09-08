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
  /**
   * Liste les cours du module classe.
   *
   * Le module grade expose deja `GET /grade/courses`, mais sur une autre table :
   * les deux sont alimentees par le seed avec les memes identifiants, sans que
   * rien ne les tienne synchronisees. Un cours cree cote notes n'existe donc pas
   * cote classe, et l'affecter a un enseignant echoue. Cette route sert la seule
   * liste valide pour une affectation.
   */
  getAllCourses: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const courses = await db.course.findMany({ orderBy: { name: 'asc' } });
      return sendListOk(reply, courses, 'Courses fetched successfully');
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  },
  /**
   * Definit les cours qu'un enseignant assure dans une classe.
   *
   * La lecture existait (`getTeacherCoursesInClass`) sans son ecriture : on
   * pouvait consulter la repartition sans jamais la constituer autrement qu'en
   * base. `set` remplace la liste en un appel, ce qui rend l'operation
   * idempotente et evite d'avoir a diffuser les ajouts et retraits.
   */
  setTeacherCoursesInClass: async (
    request: FastifyRequest<{
      Params: { classId: string; teacherId: string };
      Body: { courseIds: string[] };
    }>,
    reply: FastifyReply,
  ) => {
    try {
      const { classId, teacherId } = request.params;
      const { courseIds } = request.body;

      const assignment = await db.classTeacher.findUnique({
        where: { classId_teacherId: { classId, teacherId } },
      });
      if (!assignment) {
        return reply.status(404).send({ error: 'Teacher is not assigned to this class' });
      }

      // Des identifiants inconnus passeraient en silence via `connect`, laissant
      // croire a une affectation qui n'a pas eu lieu.
      const existants = await db.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true },
      });
      if (existants.length !== new Set(courseIds).size) {
        return reply.status(400).send({ error: 'Unknown course in list' });
      }

      const updated = await db.classTeacher.update({
        where: { id: assignment.id },
        data: { courses: { set: courseIds.map((id) => ({ id })) } },
        include: { courses: true },
      });

      return sendListOk(reply, updated.courses, 'Teacher courses updated successfully');
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

      // Un `deleteMany` suivi d'un `create` reconstruisait toute la liste. La
      // ligne ClassTeacher porte la relation `courses` : reaffecter les
      // enseignants effacait donc, sans le dire, qui enseignait quoi dans la
      // classe — y compris pour les enseignants deja presents et simplement
      // reconduits. On ne retire que les absents et n'ajoute que les nouveaux.
      const existants = await db.classTeacher.findMany({ where: { classId: id } });
      const idsExistants = new Set(existants.map((t) => t.teacherId));
      const idsVoulus = new Set(teacherIds);

      const aRetirer = existants.filter((t) => !idsVoulus.has(t.teacherId)).map((t) => t.id);
      const aAjouter = teacherIds.filter((teacherId) => !idsExistants.has(teacherId));
      const principal = teacherIds[0];

      const updatedClass = await db.class.update({
        where: { id },
        data: {
          classTeachers: {
            ...(aRetirer.length > 0 && { deleteMany: { id: { in: aRetirer } } }),
            ...(aAjouter.length > 0 && {
              create: aAjouter.map((teacherId) => ({
                id: randomUUID(),
                teacherId,
                isPrincipal: teacherId === principal,
              })),
            }),
            // Le professeur principal peut changer sans que la liste bouge.
            updateMany: existants
              .filter((t) => idsVoulus.has(t.teacherId))
              .map((t) => ({
                where: { id: t.id },
                data: { isPrincipal: t.teacherId === principal },
              })),
          },
        },
        include: {
          classTeachers: { include: { courses: true } },
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

      // Meme correction que pour les enseignants : ne retirer que les partants,
      // n'ajouter que les arrivants. Reconstruire la liste entiere faisait
      // repartir la date d'inscription de chaque eleve reconduit, et emettait un
      // `student.enrolled` pour toute la classe a chaque modification — donc une
      // notification par eleve deja inscrit.
      const inscrits = await db.classStudent.findMany({ where: { classId: id } });
      const idsInscrits = new Set(inscrits.map((e) => e.studentId));
      const idsVoulus = new Set(studentIds);

      const aRetirer = inscrits.filter((e) => !idsVoulus.has(e.studentId)).map((e) => e.id);
      const aAjouter = studentIds.filter((studentId) => !idsInscrits.has(studentId));

      const updatedClass = await db.class.update({
        where: { id },
        data: {
          students: {
            ...(aRetirer.length > 0 && { deleteMany: { id: { in: aRetirer } } }),
            ...(aAjouter.length > 0 && {
              create: aAjouter.map((studentId) => ({ id: randomUUID(), studentId })),
            }),
          },
        },
        include: {
          classTeachers: true,
          students: true,
        },
      });

      // N'annoncer que les inscriptions reelles.
      for (const studentId of aAjouter) {
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