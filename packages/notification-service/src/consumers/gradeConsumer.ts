import { consume, ROUTING_KEYS, type GradeCreatedEvent } from '@skolr/rabbitmq';
import { sendEmail } from '../notifiers/email.js';

export async function startGradeConsumer(): Promise<void> {
  await consume<GradeCreatedEvent>(
    'notification.grade.created',
    ROUTING_KEYS.GRADE_CREATED,
    async (event) => {
      console.info('[notification-service] grade.created:', {
        gradeId: event.gradeId,
        userId: event.userId,
        classId: event.classId,
        value: event.value,
      });

      const gradeDisplay = event.value !== undefined ? `${event.value}/20` : 'en attente de correction';

      await sendEmail({
        to: `student+${event.userId}@skolr.app`,
        subject: `Nouvelle note enregistrée`,
        html: `
          <p>Une nouvelle note a été enregistrée pour votre bulletin.</p>
          <p>Note : <strong>${gradeDisplay}</strong></p>
          <p>Date : ${new Date(event.createdAt).toLocaleString('fr-FR')}</p>
        `,
      });
    },
  );
}
