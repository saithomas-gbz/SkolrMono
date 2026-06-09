-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Grade" ALTER COLUMN "status" SET DEFAULT 'PENDING';
