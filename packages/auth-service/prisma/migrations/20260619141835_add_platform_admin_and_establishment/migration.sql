-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PLATFORM_ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "establishmentId" TEXT;
