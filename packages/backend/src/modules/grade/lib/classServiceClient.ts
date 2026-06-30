import { teacherTeachesCourse as classTeacherTeachesCourse } from '../../class/service';

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
