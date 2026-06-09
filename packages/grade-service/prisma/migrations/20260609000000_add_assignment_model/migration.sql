-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('PENDING', 'GRADED', 'ABSENT', 'EXEMPT');

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "classId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assignment_classId_courseId_idx" ON "Assignment"("classId", "courseId");

-- CreateIndex
CREATE INDEX "Assignment_assignedAt_idx" ON "Assignment"("assignedAt");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: add nullable assignmentId, status, comment to Grade
ALTER TABLE "Grade" ADD COLUMN "assignmentId" TEXT;
ALTER TABLE "Grade" ADD COLUMN "status" "GradeStatus" NOT NULL DEFAULT 'GRADED';
ALTER TABLE "Grade" ADD COLUMN "comment" TEXT;

-- AlterTable: make value nullable
ALTER TABLE "Grade" ALTER COLUMN "value" DROP NOT NULL;

-- DataMigration: create one CLOSED "Notes importées" assignment per (classId, courseId)
INSERT INTO "Assignment" ("id", "title", "classId", "courseId", "teacherId", "assignedAt", "status", "updatedAt")
SELECT
    gen_random_uuid()::text,
    'Notes importées',
    "classId",
    "courseId",
    '00000000-0000-0000-0000-000000000000',
    MIN("createdAt"),
    'CLOSED'::"AssignmentStatus",
    NOW()
FROM "Grade"
WHERE "assignmentId" IS NULL
GROUP BY "classId", "courseId";

-- DataMigration: link existing grades to their legacy assignment
UPDATE "Grade" g
SET "assignmentId" = a."id"
FROM "Assignment" a
WHERE a."classId" = g."classId"
    AND a."courseId" = g."courseId"
    AND a."title" = 'Notes importées'
    AND g."assignmentId" IS NULL;

-- DataMigration: keep only the latest grade when duplicates exist per (assignmentId, userId)
DELETE FROM "Grade"
WHERE "id" NOT IN (
    SELECT DISTINCT ON ("assignmentId", "userId") "id"
    FROM "Grade"
    WHERE "assignmentId" IS NOT NULL
    ORDER BY "assignmentId", "userId", "createdAt" DESC
)
AND "assignmentId" IS NOT NULL;

-- AlterTable: make assignmentId NOT NULL
ALTER TABLE "Grade" ALTER COLUMN "assignmentId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: unique constraint
CREATE UNIQUE INDEX "Grade_assignmentId_userId_key" ON "Grade"("assignmentId", "userId");
