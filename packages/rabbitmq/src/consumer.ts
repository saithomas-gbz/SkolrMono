import { getChannel } from './connection';
import { EXCHANGE } from './publisher';

export async function consume(
  queue: string,
  routingKey: string,
  handler: (payload: unknown) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, EXCHANGE, routingKey);
  ch.prefetch(1);

  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as unknown;
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error(`[RabbitMQ] Error processing message on queue ${queue}:`, err);
      ch.nack(msg, false, false);
    }
  });
}
