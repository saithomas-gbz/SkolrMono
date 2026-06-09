import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function setRefreshToken(token: string, userId: string, ttlSeconds: number): Promise<void> {
  await redis.set(`refresh:${token}`, userId, 'EX', ttlSeconds);
}

export async function getRefreshToken(token: string): Promise<string | null> {
  return redis.get(`refresh:${token}`);
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await redis.del(`refresh:${token}`);
}

export default redis;
