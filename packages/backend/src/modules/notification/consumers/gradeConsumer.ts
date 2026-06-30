import { consume } from '../../../shared/events';
import db from '../../../shared/db';
import { resolveRecipients } from '../lib/resolveRecipients';

interface GradeCreatedEvent {
  gradeId: string;
  studentId: string;
  classId: string;
  courseId: string;
  value: number | null;
}

export async function startGradeConsumer() {
  await consume(
    'notification.grade.created',
    'grade.created',
    async (payload) => {
      const event = payload as GradeCreatedEvent;
      const valueLabel = event.value !== null ? `${event.value}/20` : 'en cours';
      const userIds = await resolveRecipients({ userId: event.studentId });
      const metadata = event as unknown as Record<string, unknown>;

      await db.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: 'grade.created',
          title: 'Nouvelle note reçue',
          body: `Vous avez reçu la note ${valueLabel}`,
          metadata,
        })),
      });
    },
  );
  console.log('[notification-service] Grade consumer started');
}
