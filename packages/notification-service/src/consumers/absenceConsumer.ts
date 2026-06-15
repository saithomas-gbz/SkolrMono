import { consume } from '@skolr/rabbitmq';
import db from '../db';
import { resolveRecipients } from '../lib/resolveRecipients';

interface AbsenceCreatedEvent {
  absenceId: string;
  sessionId: string;
  userId: string;
  role: string;
  justified: boolean;
}

export async function startAbsenceConsumer() {
  await consume(
    'notification.absence.created',
    'absence.created',
    async (payload) => {
      const event = payload as AbsenceCreatedEvent;
      const userIds = await resolveRecipients({ userId: event.userId });
      const metadata = event as unknown as Record<string, unknown>;

      await db.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: 'absence.created',
          title: 'Absence enregistrée',
          body: event.justified
            ? 'Une absence justifiée a été enregistrée sur votre compte.'
            : 'Une absence a été enregistrée sur votre compte.',
          metadata,
        })),
      });
    },
  );
  console.log('[notification-service] Absence consumer started');
}
