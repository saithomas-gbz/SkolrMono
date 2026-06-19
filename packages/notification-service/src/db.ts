import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let db: PrismaClient;

if (process.env.NODE_ENV === 'test') {
  db = {} as PrismaClient;
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set in the environment variables.");
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  db = new PrismaClient({ adapter });
}

export async function testDatabaseConnection() {
  try {
    await db.$connect();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

export default db;
