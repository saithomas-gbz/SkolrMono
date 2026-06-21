-- CreateEnum
CREATE TYPE "JustificationStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "AbsenceJustification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "JustificationStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenceJustification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceJustificationLink" (
    "justificationId" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "JustificationDocument" (
    "id" TEXT NOT NULL,
    "justificationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JustificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AbsenceJustification_studentId_idx" ON "AbsenceJustification"("studentId");

-- CreateIndex
CREATE INDEX "AbsenceJustification_status_idx" ON "AbsenceJustification"("status");

-- CreateIndex
CREATE INDEX "AbsenceJustificationLink_absenceId_idx" ON "AbsenceJustificationLink"("absenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceJustificationLink_justificationId_absenceId_key" ON "AbsenceJustificationLink"("justificationId", "absenceId");

-- CreateIndex
CREATE INDEX "JustificationDocument_justificationId_idx" ON "JustificationDocument"("justificationId");

-- AddForeignKey
ALTER TABLE "AbsenceJustificationLink" ADD CONSTRAINT "AbsenceJustificationLink_justificationId_fkey" FOREIGN KEY ("justificationId") REFERENCES "AbsenceJustification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceJustificationLink" ADD CONSTRAINT "AbsenceJustificationLink_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JustificationDocument" ADD CONSTRAINT "JustificationDocument_justificationId_fkey" FOREIGN KEY ("justificationId") REFERENCES "AbsenceJustification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
