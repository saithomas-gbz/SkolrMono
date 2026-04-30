/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `Class` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ClassTeacher" ADD CONSTRAINT "ClassTeacher_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "Class_id_key" ON "Class"("id");
