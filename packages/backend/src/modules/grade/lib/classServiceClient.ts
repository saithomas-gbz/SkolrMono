import {
  teacherTeachesCourse as classTeacherTeachesCourse,
  getClassIdsForTeacher as classGetClassIdsForTeacher,
} from '../../class/service';

/**
 * Anciennement un appel HTTP vers class-service. Désormais un appel intra-process
 * direct au module class (#114). La signature est conservée pour ne pas toucher les
 * controllers ni les tests qui mockent ce module.
 */
export async function teacherTeachesCourse(
  classId: string,
  teacherId: string,
  courseId: string,
): Promise<boolean> {
  return classTeacherTeachesCourse(classId, teacherId, courseId);
}

/** Classes où ce teacherId enseigne — utilisé pour scoper les stats de classe (issue #96). */
export async function getClassIdsForTeacher(teacherId: string): Promise<string[]> {
  return classGetClassIdsForTeacher(teacherId);
}
