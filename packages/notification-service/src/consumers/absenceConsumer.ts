import { consume, ROUTING_KEYS, type AbsenceCreatedEvent } from '@skolr/rabbitmq';
import { sendEmail } from '../notifiers/email.js';
import { sendSms } from '../notifiers/sms.js';

export async function startAbsenceConsumer(): Promise<void> {
  await consume<AbsenceCreatedEvent>(
    'notification.absence.created',
    ROUTING_KEYS.ABSENCE_CREATED,
    async (event) => {
      console.info('[notification-service] absence.created:', {
        absenceId: event.absenceId,
        userId: event.userId,
        role: event.role,
        justified: event.justified,
      });

      const subject = event.justified
        ? `Absence justifiée signalée`
        : `Absence non justifiée signalée — action requise`;

      const html = `
        <p>Une absence a été enregistrée pour l'élève (ID: <strong>${event.userId}</strong>).</p>
        <p>Statut : <strong>${event.justified ? 'Justifiée' : 'Non justifiée'}</strong></p>
        ${event.reason ? `<p>Motif : ${event.reason}</p>` : ''}
        <p>Date : ${new Date(event.createdAt).toLocaleString('fr-FR')}</p>
      `;

      await sendEmail({ to: `parent+${event.userId}@skolr.app`, subject, html });
      await sendSms({
        to: process.env.ADMIN_PHONE ?? '+33600000000',
        body: `Skolr — Absence ${event.justified ? 'justifiée' : 'non justifiée'} pour élève ${event.userId}.`,
      });
    },
  );
}
