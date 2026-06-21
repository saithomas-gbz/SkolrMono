-- CreateEnum
CREATE TYPE "ParentLinkType" AS ENUM ('LEGAL_GUARDIAN', 'EMERGENCY_CONTACT', 'OTHER');

-- CreateTable
CREATE TABLE "ParentStudent" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "linkType" "ParentLinkType" NOT NULL DEFAULT 'LEGAL_GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentStudent_parentId_idx" ON "ParentStudent"("parentId");

-- CreateIndex
CREATE INDEX "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");
