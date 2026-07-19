import { describe, it, expect, beforeEach, mock } from 'bun:test';
import bulletinController from '../controllers/bulletinController';
import db from '../db';
import type { FastifyRequest, FastifyReply } from 'fastify';

mock.module('../db', () => ({
  default: {
    user: { findUnique: mock() },
    grade: { findMany: mock() },
  },
}));

const prismaMock = db as unknown as {
  user: { findUnique: ReturnType<typeof mock> };
  grade: { findMany: ReturnType<typeof mock> };
};

const makeReply = () =>
  ({
    status: mock().mockReturnThis(),
    header: mock().mockReturnThis(),
    send: mock().mockReturnThis(),
  }) as unknown as FastifyReply;

const makeRequest = (userId: string) =>
  ({
    params: { userId },
    log: { error: mock() },
  }) as unknown as FastifyRequest<{ Params: { userId: string } }>;

const sampleGrades = [
  {
    id: 'grade-1',
    userId: 'user-1',
    courseId: 'course-1',
    value: 15,
    status: 'GRADED',
    assignment: {
      title: 'Contrôle 1',
      assignedAt: new Date('2026-01-10'),
      maxScore: 20,
      coefficient: 2,
    },
    course: { name: 'Mathématiques', subject: { name: 'Sciences' } },
  },
  {
    id: 'grade-2',
    userId: 'user-1',
    courseId: 'course-1',
    value: null,
    status: 'ABSENT',
    assignment: {
      title: 'Contrôle 2',
      assignedAt: new Date('2026-01-17'),
      maxScore: 20,
      coefficient: 1,
    },
    course: { name: 'Mathématiques', subject: { name: 'Sciences' } },
  },
  {
    id: 'grade-3',
    userId: 'user-1',
    courseId: 'course-2',
    value: null,
    status: 'PENDING',
    assignment: {
      title: 'Devoir maison',
      assignedAt: new Date('2026-02-01'),
      maxScore: 10,
      coefficient: 1,
    },
    course: { name: 'Histoire', subject: null },
  },
];

describe('BulletinController', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.grade.findMany.mockReset();
  });

  describe('getBulletinPdf', () => {
    it('should return 404 when the student does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const reply = makeReply();
      await bulletinController.getBulletinPdf(makeRequest('missing'), reply);
      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should generate a PDF bulletin grouped by course for a student with grades', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Léa Martin',
        class: { name: '6e A' },
      });
      prismaMock.grade.findMany.mockResolvedValue(sampleGrades);
      const reply = makeReply();

      await bulletinController.getBulletinPdf(makeRequest('user-1'), reply);

      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(reply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="bulletin-Léa-Martin.pdf"',
      );
      const sentBuffer = (reply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
      expect(Buffer.isBuffer(sentBuffer)).toBe(true);
      expect(sentBuffer.length).toBeGreaterThan(0);
    });

    it('should default to "Classe inconnue" when the student has no class', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', name: 'Sans Classe', class: null });
      prismaMock.grade.findMany.mockResolvedValue([]);
      const reply = makeReply();

      await bulletinController.getBulletinPdf(makeRequest('user-1'), reply);

      expect(reply.header).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      const sentBuffer = (reply.send as ReturnType<typeof mock>).mock.calls[0]?.[0];
      expect(Buffer.isBuffer(sentBuffer)).toBe(true);
    });

    it('should sanitize special characters in the filename', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: "O'Brien / Test",
        class: { name: '6e A' },
      });
      prismaMock.grade.findMany.mockResolvedValue([]);
      const reply = makeReply();

      await bulletinController.getBulletinPdf(makeRequest('user-1'), reply);

      expect(reply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="bulletin-O-Brien---Test.pdf"',
      );
    });

    it('should return 500 on database error', async () => {
      prismaMock.user.findUnique.mockRejectedValue(new Error('db error'));
      const reply = makeReply();

      await bulletinController.getBulletinPdf(makeRequest('user-1'), reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });
});
