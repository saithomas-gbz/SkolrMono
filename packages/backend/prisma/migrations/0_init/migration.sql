-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "billing";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "class";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "grade";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "message";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "parent";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "planning";

-- CreateEnum
CREATE TYPE "auth"."Role" AS ENUM ('USER', 'TEACHER', 'STAFF', 'ADMIN', 'PLATFORM_ADMIN', 'PARENT');

-- CreateEnum
CREATE TYPE "grade"."AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "grade"."GradeStatus" AS ENUM ('PENDING', 'GRADED', 'ABSENT', 'EXEMPT');

-- CreateEnum
CREATE TYPE "planning"."AbsenceRole" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "planning"."JustificationStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "message"."MessageRole" AS ENUM ('USER', 'TEACHER', 'STAFF', 'ADMIN');

-- CreateEnum
CREATE TYPE "billing"."SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "billing"."PlanTier" AS ENUM ('STARTER', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "parent"."ParentLinkType" AS ENUM ('LEGAL_GUARDIAN', 'EMERGENCY_CONTACT', 'OTHER');

-- CreateTable
CREATE TABLE "auth"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "oauthProvider" TEXT,
    "oauthId" TEXT,
    "role" "auth"."Role" NOT NULL DEFAULT 'USER',
    "establishmentId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."InvitationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "auth"."Role" NOT NULL DEFAULT 'USER',
    "establishmentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class"."Class" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "establishmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class"."ClassTeacher" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "isPrincipal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClassTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class"."Course" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class"."ClassStudent" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."GradeUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "GradeUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."GradeClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."GradeCourse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subjectId" TEXT,

    CONSTRAINT "GradeCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."Topic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."Assignment" (
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
    "status" "grade"."AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade"."Grade" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "grade"."GradeStatus" NOT NULL DEFAULT 'PENDING',
    "value" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning"."Session" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "room" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning"."Absence" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "planning"."AbsenceRole" NOT NULL,
    "justified" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning"."AbsenceJustification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "planning"."JustificationStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbsenceJustification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planning"."AbsenceJustificationLink" (
    "justificationId" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "planning"."JustificationDocument" (
    "id" TEXT NOT NULL,
    "justificationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JustificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message"."Conversation" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message"."ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message"."MessageRead" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message"."MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."Establishment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."EstablishmentMember" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isBillingContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstablishmentMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."Subscription" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "planTier" "billing"."PlanTier" NOT NULL DEFAULT 'STARTER',
    "status" "billing"."SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent"."ParentStudent" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "linkType" "parent"."ParentLinkType" NOT NULL DEFAULT 'LEGAL_GUARDIAN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class"."_ClassTeacherToCourse" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassTeacherToCourse_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "grade"."_CourseRelations" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseRelations_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "auth"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationToken_token_key" ON "auth"."InvitationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "auth"."PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Class_id_key" ON "class"."Class"("id");

-- CreateIndex
CREATE INDEX "Class_name_idx" ON "class"."Class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacher_id_key" ON "class"."ClassTeacher"("id");

-- CreateIndex
CREATE INDEX "ClassTeacher_teacherId_idx" ON "class"."ClassTeacher"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTeacher_classId_teacherId_key" ON "class"."ClassTeacher"("classId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_id_key" ON "class"."Course"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ClassStudent_id_key" ON "class"."ClassStudent"("id");

-- CreateIndex
CREATE INDEX "ClassStudent_studentId_idx" ON "class"."ClassStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassStudent_classId_studentId_key" ON "class"."ClassStudent"("classId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "GradeUser_id_key" ON "grade"."GradeUser"("id");

-- CreateIndex
CREATE UNIQUE INDEX "GradeUser_email_key" ON "grade"."GradeUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GradeClass_id_key" ON "grade"."GradeClass"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_id_key" ON "grade"."Subject"("id");

-- CreateIndex
CREATE UNIQUE INDEX "GradeCourse_id_key" ON "grade"."GradeCourse"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_id_key" ON "grade"."Topic"("id");

-- CreateIndex
CREATE INDEX "Assignment_classId_courseId_idx" ON "grade"."Assignment"("classId", "courseId");

-- CreateIndex
CREATE INDEX "Assignment_assignedAt_idx" ON "grade"."Assignment"("assignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_id_key" ON "grade"."Grade"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_assignmentId_userId_key" ON "grade"."Grade"("assignmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_id_key" ON "planning"."Session"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Absence_id_key" ON "planning"."Absence"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Absence_sessionId_userId_key" ON "planning"."Absence"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "AbsenceJustification_studentId_idx" ON "planning"."AbsenceJustification"("studentId");

-- CreateIndex
CREATE INDEX "AbsenceJustification_status_idx" ON "planning"."AbsenceJustification"("status");

-- CreateIndex
CREATE INDEX "AbsenceJustificationLink_absenceId_idx" ON "planning"."AbsenceJustificationLink"("absenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceJustificationLink_justificationId_absenceId_key" ON "planning"."AbsenceJustificationLink"("justificationId", "absenceId");

-- CreateIndex
CREATE INDEX "JustificationDocument_justificationId_idx" ON "planning"."JustificationDocument"("justificationId");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_idx" ON "message"."ConversationParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "message"."ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "message"."Message"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "MessageRead_userId_idx" ON "message"."MessageRead"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageRead_messageId_userId_key" ON "message"."MessageRead"("messageId", "userId");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "message"."MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "notification"."Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "notification"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_slug_key" ON "billing"."Establishment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Establishment_stripeCustomerId_key" ON "billing"."Establishment"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentMember_establishmentId_userId_key" ON "billing"."EstablishmentMember"("establishmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_establishmentId_key" ON "billing"."Subscription"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "billing"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ParentStudent_parentId_idx" ON "parent"."ParentStudent"("parentId");

-- CreateIndex
CREATE INDEX "ParentStudent_studentId_idx" ON "parent"."ParentStudent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudent_parentId_studentId_key" ON "parent"."ParentStudent"("parentId", "studentId");

-- CreateIndex
CREATE INDEX "_ClassTeacherToCourse_B_index" ON "class"."_ClassTeacherToCourse"("B");

-- CreateIndex
CREATE INDEX "_CourseRelations_B_index" ON "grade"."_CourseRelations"("B");

-- AddForeignKey
ALTER TABLE "auth"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class"."ClassTeacher" ADD CONSTRAINT "ClassTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class"."ClassStudent" ADD CONSTRAINT "ClassStudent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "class"."Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."GradeUser" ADD CONSTRAINT "GradeUser_classId_fkey" FOREIGN KEY ("classId") REFERENCES "grade"."GradeClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."GradeCourse" ADD CONSTRAINT "GradeCourse_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "grade"."Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Topic" ADD CONSTRAINT "Topic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "grade"."GradeCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "grade"."GradeClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "grade"."GradeCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Grade" ADD CONSTRAINT "Grade_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "grade"."Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Grade" ADD CONSTRAINT "Grade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "grade"."GradeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Grade" ADD CONSTRAINT "Grade_classId_fkey" FOREIGN KEY ("classId") REFERENCES "grade"."GradeClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."Grade" ADD CONSTRAINT "Grade_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "grade"."GradeCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning"."Absence" ADD CONSTRAINT "Absence_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "planning"."Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning"."AbsenceJustificationLink" ADD CONSTRAINT "AbsenceJustificationLink_justificationId_fkey" FOREIGN KEY ("justificationId") REFERENCES "planning"."AbsenceJustification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning"."AbsenceJustificationLink" ADD CONSTRAINT "AbsenceJustificationLink_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "planning"."Absence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planning"."JustificationDocument" ADD CONSTRAINT "JustificationDocument_justificationId_fkey" FOREIGN KEY ("justificationId") REFERENCES "planning"."AbsenceJustification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message"."ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "message"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "message"."Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message"."MessageRead" ADD CONSTRAINT "MessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message"."MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message"."Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."EstablishmentMember" ADD CONSTRAINT "EstablishmentMember_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "billing"."Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."Subscription" ADD CONSTRAINT "Subscription_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "billing"."Establishment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class"."_ClassTeacherToCourse" ADD CONSTRAINT "_ClassTeacherToCourse_A_fkey" FOREIGN KEY ("A") REFERENCES "class"."ClassTeacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class"."_ClassTeacherToCourse" ADD CONSTRAINT "_ClassTeacherToCourse_B_fkey" FOREIGN KEY ("B") REFERENCES "class"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."_CourseRelations" ADD CONSTRAINT "_CourseRelations_A_fkey" FOREIGN KEY ("A") REFERENCES "grade"."GradeCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade"."_CourseRelations" ADD CONSTRAINT "_CourseRelations_B_fkey" FOREIGN KEY ("B") REFERENCES "grade"."GradeCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

