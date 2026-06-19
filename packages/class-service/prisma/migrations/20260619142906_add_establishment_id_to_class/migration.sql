-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "establishmentId" TEXT;

-- AlterTable
ALTER TABLE "_ClassTeacherToCourse" ADD CONSTRAINT "_ClassTeacherToCourse_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ClassTeacherToCourse_AB_unique";
