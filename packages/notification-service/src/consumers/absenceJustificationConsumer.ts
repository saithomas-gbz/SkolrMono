import { consume } from '@skolr/rabbitmq';
import db from '../db';
import { getClassTeacherIds } from '../lib/classServiceClient';
import { getUserIdsByRole } from '../lib/authServiceClient';
import { resolveRecipients } from '../lib/resolveRecipients';
import { getParentIds } from '../lib/parentServiceClient';

interface JustificationSubmittedEvent {
  justificationId: string;
  studentId: string;
  classId?: string;
}

interface JustificationReviewedEvent {
  justificationId: string;
  studentId: string;
  reviewComment: string | null;
}

async function notifyRecipients(
  recipientUserIds: string[],
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown>,
) {
  if (recipientUserIds.length === 0) return;
  await db.notification.createMany({
    data: recipientUserIds.map((userId) => ({ userId, type, title, body, metadata })),
  });
}

export async function startAbsenceJustificationConsumer() {
  await consume(
    'notification.absence.justification.submitted',
    'absence.justification.submitted',
    async (payload) => {
      const event = payload as JustificationSubmittedEvent;
      const teacherIds = event.classId ? await getClassTeacherIds(event.classId) : [];
      const staffIds = await getUserIdsByRole('STAFF');
      const recipientUserIds = [...new Set([...teacherIds, ...staffIds])];

      await notifyRecipients(
        recipientUserIds,
        'absence.justification.submitted',
        'Nouvelle demande de justification',
        'Un élève a déposé une demande de justification à valider.',
        event as unknown as Record<string, unknown>,
      );
    },
  );

  await consume(
    'notification.absence.justification.approved',
    'absence.justification.approved',
    async (payload) => {
      const event = payload as JustificationReviewedEvent;
      const studentIds = await resolveRecipients({ userId: event.studentId });
      const parentIds = await getParentIds(event.studentId);
      const recipientUserIds = [...new Set([...studentIds, ...parentIds])];
      await notifyRecipients(
        recipientUserIds,
        'absence.justification.approved',
        'Justification acceptée',
        'Votre demande de justification a été approuvée.',
        event as unknown as Record<string, unknown>,
      );
    },
  );

  await consume(
    'notification.absence.justification.rejected',
    'absence.justification.rejected',
    async (payload) => {
      const event = payload as JustificationReviewedEvent;
      const studentIds = await resolveRecipients({ userId: event.studentId });
      const parentIds = await getParentIds(event.studentId);
      const recipientUserIds = [...new Set([...studentIds, ...parentIds])];
      await notifyRecipients(
        recipientUserIds,
        'absence.justification.rejected',
        'Justification refusée',
        event.reviewComment
          ? `Votre demande de justification a été refusée : ${event.reviewComment}`
          : 'Votre demande de justification a été refusée.',
        event as unknown as Record<string, unknown>,
      );
    },
  );

  console.log('[notification-service] Absence justification consumer started');
}
