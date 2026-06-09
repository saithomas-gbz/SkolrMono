import { consume, ROUTING_KEYS, type MessageReceivedEvent } from '@skolr/rabbitmq';
import { sendEmail } from '../notifiers/email.js';

export async function startMessageConsumer(): Promise<void> {
  await consume<MessageReceivedEvent>(
    'notification.message.received',
    ROUTING_KEYS.MESSAGE_RECEIVED,
    async (event) => {
      console.info('[notification-service] message.received:', {
        messageId: event.messageId,
        conversationId: event.conversationId,
        senderId: event.senderId,
        recipientCount: event.recipientIds.length,
      });

      await Promise.all(
        event.recipientIds.map((recipientId) =>
          sendEmail({
            to: `user+${recipientId}@skolr.app`,
            subject: `Nouveau message reçu`,
            html: `
              <p>Vous avez reçu un nouveau message dans la conversation <strong>${event.conversationId}</strong>.</p>
              <p>De : ${event.senderId}</p>
              <p>Date : ${new Date(event.sentAt).toLocaleString('fr-FR')}</p>
            `,
          }),
        ),
      );
    },
  );
}
