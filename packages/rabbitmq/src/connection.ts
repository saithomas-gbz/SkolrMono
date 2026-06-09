import amqplib from 'amqplib';
import { EXCHANGE } from './events.js';

let connection: amqplib.Connection | null = null;
let channel: amqplib.Channel | null = null;
let connecting = false;

const RECONNECT_DELAY_MS = 5000;

async function connect(url: string): Promise<amqplib.Channel> {
  if (channel) return channel;
  if (connecting) {
    await new Promise((r) => setTimeout(r, 500));
    return connect(url);
  }

  connecting = true;
  try {
    connection = await amqplib.connect(url);

    connection.on('error', (err) => {
      console.error('[RabbitMQ] Connection error:', err.message);
      channel = null;
      connection = null;
    });
    connection.on('close', () => {
      console.warn('[RabbitMQ] Connection closed, reconnecting in', RECONNECT_DELAY_MS, 'ms');
      channel = null;
      connection = null;
      setTimeout(() => connect(url), RECONNECT_DELAY_MS);
    });

    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

    console.info('[RabbitMQ] Connected and exchange asserted:', EXCHANGE);
    return channel;
  } finally {
    connecting = false;
  }
}

export async function getChannel(url?: string): Promise<amqplib.Channel> {
  const amqpUrl = url ?? process.env.RABBITMQ_URL;
  if (!amqpUrl) throw new Error('RABBITMQ_URL is not set');
  return connect(amqpUrl);
}

export async function closeConnection(): Promise<void> {
  try {
    await channel?.close();
    await connection?.close();
  } catch {
    // ignore close errors on shutdown
  }
  channel = null;
  connection = null;
}
