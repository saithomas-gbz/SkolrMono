import { consume, ROUTING_KEYS, type MessageReceivedEvent } from '@skolr/rabbitmq';

export async function startMessageConsumer(): Promise<void> {
  await consume<MessageReceivedEvent>(
    'notification.message.received',
    ROUTING_KEYS.MESSAGE_RECEIVED,
    async (event) => {
      console.info('[notification-service] message.received received:', {
        messageId: event.messageId,
        conversationId: event.conversationId,
        senderId: event.senderId,
      });
      // TODO: send push notification to recipient(s)
    },
  );
}
