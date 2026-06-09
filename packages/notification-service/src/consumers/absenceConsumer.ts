import { consume, ROUTING_KEYS, type AbsenceCreatedEvent } from '@skolr/rabbitmq';

export async function startAbsenceConsumer(): Promise<void> {
  await consume<AbsenceCreatedEvent>(
    'notification.absence.created',
    ROUTING_KEYS.ABSENCE_CREATED,
    async (event) => {
      console.info('[notification-service] absence.created received:', {
        absenceId: event.absenceId,
        userId: event.userId,
        role: event.role,
        justified: event.justified,
      });
      // TODO: send SMS/email to parents via external provider
    },
  );
}
