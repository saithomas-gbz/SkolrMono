import {
  getClassMemberIds as classGetClassMemberIds,
  getClassTeacherIds as classGetClassTeacherIds,
} from '../../class/service';

/**
 * Anciennement des appels HTTP vers class-service. Désormais des appels
 * intra-process au module class (#114). Signatures conservées pour ne pas toucher
 * consumers ni les tests qui mockent ce module.
 */
export async function getClassMemberIds(classId: string): Promise<string[]> {
  return classGetClassMemberIds(classId);
}

/** Enseignants d'une classe (issue #80). */
export async function getClassTeacherIds(classId: string): Promise<string[]> {
  return classGetClassTeacherIds(classId);
}
