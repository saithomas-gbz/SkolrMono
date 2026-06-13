import { getClassMemberIds } from './classServiceClient';
import { getUserIdsByRole } from './authServiceClient';

export type NotificationTarget =
  | { userId: string }
  | { classId: string }
  | { role: string };

export async function resolveRecipients(target: NotificationTarget): Promise<string[]> {
  if ('userId' in target) {
    return [target.userId];
  }
  if ('classId' in target) {
    return getClassMemberIds(target.classId);
  }
  if ('role' in target) {
    return getUserIdsByRole(target.role);
  }
  return [];
}
