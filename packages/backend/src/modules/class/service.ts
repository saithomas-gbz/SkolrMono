import db from '../../shared/db';

/**
 * Le professeur enseigne-t-il ce cours dans cette classe ?
 *
 * Service intra-process exposé par le module class — remplace l'appel HTTP
 * vers l'ancien class-service (`GET /classes/:classId/teachers/:teacherId/courses`).
 */
export async function teacherTeachesCourse(
  classId: string,
  teacherId: string,
  courseId: string,
): Promise<boolean> {
  const link = await db.classTeacher.findUnique({
    where: { classId_teacherId: { classId, teacherId } },
    include: { courses: { where: { id: courseId }, select: { id: true } } },
  });
  return (link?.courses.length ?? 0) > 0;
}

/** Identifiants des classes où ce professeur enseigne. */
export async function getClassIdsForTeacher(teacherId: string): Promise<string[]> {
  const rows = await db.classTeacher.findMany({
    where: { teacherId },
    select: { classId: true },
  });
  return rows.map((r) => r.classId);
}

/** Identifiants des classes où cet élève est inscrit. */
export async function getClassIdsForStudent(studentId: string): Promise<string[]> {
  const rows = await db.classStudent.findMany({
    where: { studentId },
    select: { classId: true },
  });
  return rows.map((r) => r.classId);
}

/** Ids de tous les membres d'une classe (profs + élèves), dédoublonnés. */
export async function getClassMemberIds(classId: string): Promise<string[]> {
  const data = await db.class.findUnique({
    where: { id: classId },
    select: {
      classTeachers: { select: { teacherId: true } },
      students: { select: { studentId: true } },
    },
  });
  if (!data) return [];
  const teacherIds = data.classTeachers.map((ct) => ct.teacherId);
  const studentIds = data.students.map((s) => s.studentId);
  return [...new Set([...teacherIds, ...studentIds])];
}

/** Ids des enseignants d'une classe, dédoublonnés (issue #80). */
export async function getClassTeacherIds(classId: string): Promise<string[]> {
  const rows = await db.classTeacher.findMany({
    where: { classId },
    select: { teacherId: true },
  });
  return [...new Set(rows.map((r) => r.teacherId))];
}
