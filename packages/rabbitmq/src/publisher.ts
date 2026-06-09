import { getChannel } from './connection.js';
import { EXCHANGE, type RoutingKey, type SkolrEvent } from './events.js';

export async function publish(routingKey: RoutingKey, payload: SkolrEvent): Promise<void> {
  try {
    const ch = await getChannel();
    const content = Buffer.from(JSON.stringify(payload));
    ch.publish(EXCHANGE, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error('[RabbitMQ] Failed to publish event', routingKey, err);
  }
}
