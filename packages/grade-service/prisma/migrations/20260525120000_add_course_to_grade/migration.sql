-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_id_key" ON "Course"("id");

-- Default course for existing grades (seed uses the same stable id).
INSERT INTO "Course" ("id", "name", "description")
VALUES (
    '33333333-3333-3333-3333-333333333301',
    'Cours général',
    'Cours par défaut pour les notes existantes'
);

-- Add nullable column first so existing rows can be backfilled.
ALTER TABLE "Grade" ADD COLUMN "courseId" TEXT;

UPDATE "Grade"
SET "courseId" = '33333333-3333-3333-3333-333333333301'
WHERE "courseId" IS NULL;

ALTER TABLE "Grade" ALTER COLUMN "courseId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
