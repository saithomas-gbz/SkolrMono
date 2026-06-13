import amqp from 'amqplib';
import type { Connection, Channel } from 'amqplib';

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function getChannel(): Promise<Channel> {
  if (channel) return channel;

  const url = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
  connection = await amqp.connect(url);
  channel = await connection.createChannel();

  connection.on('error', () => {
    connection = null;
    channel = null;
  });
  connection.on('close', () => {
    connection = null;
    channel = null;
  });

  return channel;
}
