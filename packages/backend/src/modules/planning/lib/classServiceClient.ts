import {
  getClassIdsForTeacher as classGetClassIdsForTeacher,
  getClassIdsForStudent as classGetClassIdsForStudent,
} from '../../class/service';

/**
 * Anciennement des appels HTTP vers class-service. Désormais des appels
 * intra-process au module class (#114). Signatures conservées pour ne pas
 * toucher les controllers ni les tests qui mockent ce module.
 */

/** Classes où ce teacherId enseigne — restreint la file de validation au staff/prof concerné. */
export async function getClassIdsForTeacher(teacherId: string): Promise<string[]> {
  return classGetClassIdsForTeacher(teacherId);
}

/** Classes où ce studentId est inscrit — résout le filtre studentId des sessions. */
export async function getClassIdsForStudent(studentId: string): Promise<string[]> {
  return classGetClassIdsForStudent(studentId);
}
