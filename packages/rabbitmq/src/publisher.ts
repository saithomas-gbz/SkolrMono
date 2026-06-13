import { getChannel } from './connection';

export const EXCHANGE = 'skolr.events';

export async function publish(routingKey: string, payload: unknown): Promise<void> {
  const ch = await getChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  ch.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    contentType: 'application/json',
  });
}
