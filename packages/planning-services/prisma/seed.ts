import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Seeding planning database...");
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
