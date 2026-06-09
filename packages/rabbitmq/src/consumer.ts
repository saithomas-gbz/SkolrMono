import { getChannel } from './connection.js';
import { EXCHANGE, type RoutingKey } from './events.js';

export async function consume<T>(
  queue: string,
  routingKey: RoutingKey,
  handler: (payload: T) => Promise<void>,
): Promise<void> {
  const ch = await getChannel();

  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, EXCHANGE, routingKey);
  ch.prefetch(1);

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as T;
      await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error('[RabbitMQ] Handler error on queue', queue, err);
      ch.nack(msg, false, false);
    }
  });

  console.info('[RabbitMQ] Consuming queue:', queue, '← routing key:', routingKey);
}
