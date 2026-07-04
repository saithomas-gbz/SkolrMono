import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

let db: PrismaClient;

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
  throw new Error('DATABASE_URL is not set in the environment variables.');
}

if (process.env.NODE_ENV === 'test') {
  db = {} as PrismaClient; // Replaced by mocks in unit tests.
} else {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  db = new PrismaClient({ adapter });
}

export async function testDatabaseConnection() {
  try {
    await db.$connect();
    console.log('Database connection successful!');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export default db;
