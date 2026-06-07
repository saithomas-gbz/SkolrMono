-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClassTeacherToCourse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_id_key" ON "Course"("id");

-- CreateIndex
CREATE UNIQUE INDEX "_ClassTeacherToCourse_AB_unique" ON "_ClassTeacherToCourse"("A", "B");

-- CreateIndex
CREATE INDEX "_ClassTeacherToCourse_B_index" ON "_ClassTeacherToCourse"("B");

-- AddForeignKey
ALTER TABLE "_ClassTeacherToCourse" ADD CONSTRAINT "_ClassTeacherToCourse_A_fkey" FOREIGN KEY ("A") REFERENCES "ClassTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassTeacherToCourse" ADD CONSTRAINT "_ClassTeacherToCourse_B_fkey" FOREIGN KEY ("B") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
