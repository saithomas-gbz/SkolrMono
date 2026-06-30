import type { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import db from '../../../shared/db';
import { publish } from '../../../shared/events';
import { getClassIdsForTeacher } from '../lib/classServiceClient';
import { getChildIds } from '../lib/parentServiceClient';
import { getStorageProvider } from '../lib/storage';
import type { JustificationStatus } from '../../../generated/prisma/client';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export type ListFilters = {
  status?: JustificationStatus;
  studentId?: string;
  classId?: string;
};

const justificationInclude = {
  documents: true,
  absences: { include: { absence: { include: { session: true } } } },
} as const;

export async function listAbsenceJustifications(
  req: FastifyRequest<{ Querystring: ListFilters }>,
  reply: FastifyReply,
) {
  const { status, studentId, classId } = req.query;
  const user = req.planningUser!;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (user.role === 'USER') {
    where.studentId = user.userId;
  } else if (user.role === 'PARENT') {
    const childIds = await getChildIds(user.userId);
    if (studentId) {
      if (!childIds.includes(studentId)) return reply.status(403).send({ error: 'Forbidden' });
      where.studentId = studentId;
    } else {
      where.studentId = { in: childIds };
    }
  } else {
    if (studentId) where.studentId = studentId;

    if (user.role === 'TEACHER') {
      const teacherClassIds = await getClassIdsForTeacher(user.userId);
      if (classId && !teacherClassIds.includes(classId)) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      where.absences = {
        some: { absence: { session: { classId: { in: classId ? [classId] : teacherClassIds } } } },
      };
    } else if (classId) {
      where.absences = { some: { absence: { session: { classId } } } };
    }
  }

  const justifications = await db.absenceJustification.findMany({
    where,
    include: justificationInclude,
    orderBy: { createdAt: 'desc' },
  });
  return reply.send(justifications);
}

export async function getAbsenceJustificationById(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = req.planningUser!;
  const justification = await db.absenceJustification.findUnique({
    where: { id: req.params.id },
    include: justificationInclude,
  });
  if (!justification) return reply.status(404).send({ error: 'Justification not found' });

  if (user.role === 'USER' && justification.studentId !== user.userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  if (user.role === 'PARENT') {
    const childIds = await getChildIds(user.userId);
    if (!childIds.includes(justification.studentId)) return reply.status(403).send({ error: 'Forbidden' });
  }
  if (user.role === 'TEACHER') {
    const teacherClassIds = await getClassIdsForTeacher(user.userId);
    const classIds = justification.absences.map((link) => link.absence.session.classId);
    if (!classIds.some((classId) => teacherClassIds.includes(classId))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  }

  return reply.send(justification);
}

export async function createAbsenceJustification(req: FastifyRequest, reply: FastifyReply) {
  const user = req.planningUser!;
  if (!['USER', 'PARENT'].includes(user.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  if (!req.isMultipart()) {
    return reply.status(400).send({ error: 'Expected multipart/form-data' });
  }

  let reason: string | undefined;
  let studentId: string | undefined;
  const absenceIds: string[] = [];
  const files: { fileName: string; mimeType: string; buffer: Buffer }[] = [];

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      if (!ALLOWED_MIME_TYPES.includes(part.mimetype)) {
        return reply.status(400).send({ error: `Unsupported file type: ${part.mimetype}` });
      }
      const buffer = await part.toBuffer();
      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return reply.status(400).send({ error: `File ${part.filename} exceeds 5 Mo` });
      }
      files.push({ fileName: part.filename, mimeType: part.mimetype, buffer });
    } else if (part.fieldname === 'reason') {
      reason = String(part.value);
    } else if (part.fieldname === 'absenceIds') {
      absenceIds.push(String(part.value));
    } else if (part.fieldname === 'studentId') {
      studentId = String(part.value);
    }
  }

  if (user.role === 'USER') {
    studentId = user.userId;
  } else {
    /** PARENT : déposer "au nom de l'enfant" — studentId requis et doit être un enfant rattaché. */
    if (!studentId) return reply.status(400).send({ error: 'studentId is required' });
    const childIds = await getChildIds(user.userId);
    if (!childIds.includes(studentId)) return reply.status(403).send({ error: 'Forbidden' });
  }

  if (!reason || absenceIds.length === 0) {
    return reply.status(400).send({ error: 'reason and absenceIds are required' });
  }

  const ownedAbsences = await db.absence.findMany({
    where: { id: { in: absenceIds }, userId: studentId },
  });
  if (ownedAbsences.length !== absenceIds.length) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  const justification = await db.absenceJustification.create({
    data: {
      studentId: studentId!,
      reason,
      absences: { create: absenceIds.map((absenceId) => ({ absenceId })) },
    },
  });

  const storage = getStorageProvider();
  for (const file of files) {
    const storageKey = await storage.save(file.buffer, `${justification.id}/${randomUUID()}-${file.fileName}`);
    await db.justificationDocument.create({
      data: {
        justificationId: justification.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.buffer.length,
        storageKey,
      },
    });
  }

  const created = await db.absenceJustification.findUnique({
    where: { id: justification.id },
    include: justificationInclude,
  });
  return reply.status(201).send(created);
}

export async function submitAbsenceJustification(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const user = req.planningUser!;
  const justification = await db.absenceJustification.findUnique({
    where: { id: req.params.id },
    include: justificationInclude,
  });
  if (!justification) return reply.status(404).send({ error: 'Justification not found' });
  if (user.role === 'PARENT') {
    const childIds = await getChildIds(user.userId);
    if (!childIds.includes(justification.studentId)) return reply.status(403).send({ error: 'Forbidden' });
  } else if (justification.studentId !== user.userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  if (justification.status !== 'DRAFT') {
    return reply.status(409).send({ error: 'Justification is not in DRAFT status' });
  }

  const updated = await db.absenceJustification.update({
    where: { id: justification.id },
    data: { status: 'PENDING' },
  });

  const classId = justification.absences[0]?.absence.session.classId;
  publish('absence.justification.submitted', {
    justificationId: updated.id,
    studentId: updated.studentId,
    classId,
  }).catch((err) => req.log.warn({ err }, 'Failed to publish absence.justification.submitted'));

  return reply.send(updated);
}

export async function reviewAbsenceJustification(
  req: FastifyRequest<{ Params: { id: string }; Body: { action: 'approve' | 'reject'; comment?: string } }>,
  reply: FastifyReply,
) {
  const user = req.planningUser!;
  const { action, comment } = req.body;

  if (action === 'reject' && !comment) {
    return reply.status(400).send({ error: 'comment is required when rejecting' });
  }

  const justification = await db.absenceJustification.findUnique({
    where: { id: req.params.id },
    include: justificationInclude,
  });
  if (!justification) return reply.status(404).send({ error: 'Justification not found' });
  if (justification.status !== 'PENDING') {
    return reply.status(409).send({ error: 'Justification is not PENDING' });
  }

  if (user.role === 'TEACHER') {
    const teacherClassIds = await getClassIdsForTeacher(user.userId);
    const classIds = justification.absences.map((link) => link.absence.session.classId);
    if (!classIds.some((classId) => teacherClassIds.includes(classId))) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
  const updated = await db.absenceJustification.update({
    where: { id: justification.id },
    data: {
      status: newStatus,
      reviewerId: user.userId,
      reviewComment: comment ?? null,
      reviewedAt: new Date(),
    },
  });

  if (action === 'approve') {
    await db.absence.updateMany({
      where: { id: { in: justification.absences.map((link) => link.absenceId) } },
      data: { justified: true },
    });
  }

  publish(`absence.justification.${action === 'approve' ? 'approved' : 'rejected'}`, {
    justificationId: updated.id,
    studentId: updated.studentId,
    reviewComment: updated.reviewComment,
  }).catch((err) => req.log.warn({ err }, 'Failed to publish justification review event'));

  return reply.send(updated);
}

export async function downloadJustificationDocument(
  req: FastifyRequest<{ Params: { id: string; docId: string } }>,
  reply: FastifyReply,
) {
  const user = req.planningUser!;
  const justification = await db.absenceJustification.findUnique({ where: { id: req.params.id } });
  if (!justification) return reply.status(404).send({ error: 'Justification not found' });
  if (user.role === 'USER' && justification.studentId !== user.userId) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  if (user.role === 'PARENT') {
    const childIds = await getChildIds(user.userId);
    if (!childIds.includes(justification.studentId)) return reply.status(403).send({ error: 'Forbidden' });
  }

  const document = await db.justificationDocument.findUnique({ where: { id: req.params.docId } });
  if (!document || document.justificationId !== justification.id) {
    return reply.status(404).send({ error: 'Document not found' });
  }

  const buffer = await getStorageProvider().read(document.storageKey);
  reply.header('Content-Type', document.mimeType);
  reply.header('Content-Disposition', `attachment; filename="${document.fileName}"`);
  return reply.send(buffer);
}
