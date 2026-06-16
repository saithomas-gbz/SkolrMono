import { consume } from '@skolr/rabbitmq';
import db from '../db';
import { getUsersByIds } from '../lib/authServiceClient';

interface MessageReceivedEvent {
  messageId: string;
  conversationId: string;
  senderId: string;
  content: string;
  recipientIds: string[];
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export async function startMessageConsumer() {
  await consume(
    'notification.message.received',
    'message.received',
    async (payload) => {
      const event = payload as MessageReceivedEvent;
      if (event.recipientIds.length === 0) return;

      const [sender] = await getUsersByIds([event.senderId]);
      const senderName = sender?.name ?? sender?.email ?? "Quelqu'un";
      const metadata = event as unknown as Record<string, unknown>;

      await db.notification.createMany({
        data: event.recipientIds.map((userId) => ({
          userId,
          type: 'message.received',
          title: 'Nouveau message',
          body: `${senderName} : ${truncate(event.content)}`,
          metadata,
        })),
      });
    },
  );
  console.log('[notification-service] Message consumer started');
}
