import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DEV_PARENTS } from '../../../scripts/seed/dev-users';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.parentStudent.deleteMany(); // seed idempotent

    let linkCount = 0;
    for (const parent of DEV_PARENTS) {
      for (const child of parent.children) {
        await prisma.parentStudent.create({
          data: {
            parentId: parent.id,
            studentId: child.studentId,
            isPrimary: child.isPrimary,
          },
        });
        linkCount++;
      }
    }

    console.log(`Seed parent-service: ${linkCount} liens parent ↔ enfant prêts.`);
    for (const parent of DEV_PARENTS) {
      console.log(`  • ${parent.email} → ${parent.children.length} enfant(s)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
