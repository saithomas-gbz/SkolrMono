import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { collectRgpdData, anonymizeGradeUserByEmail } from '../service';
import db from '../../../shared/db';

mock.module('../../../shared/db', () => ({
  default: {
    gradeUser: {
      findUnique: mock(),
      updateMany: mock(),
    },
    grade: {
      findMany: mock(),
    },
    assignment: {
      findMany: mock(),
    },
  },
}));

const prismaMock = db as unknown as {
  gradeUser: { findUnique: ReturnType<typeof mock>; updateMany: ReturnType<typeof mock> };
  grade: { findMany: ReturnType<typeof mock> };
  assignment: { findMany: ReturnType<typeof mock> };
};

describe('grade service', () => {
  beforeEach(() => {
    prismaMock.gradeUser.findUnique.mockReset();
    prismaMock.gradeUser.updateMany.mockReset();
    prismaMock.grade.findMany.mockReset();
    prismaMock.assignment.findMany.mockReset();
  });

  describe('collectRgpdData', () => {
    it('should collect the local GradeUser record plus grades and assignments when the user exists', async () => {
      const gradeUser = { id: 'grade-user-1', name: 'Léa Martin', email: 'lea@skolr.local', classId: 'class-1' };
      prismaMock.gradeUser.findUnique.mockResolvedValue(gradeUser);
      const grades = [{ assignmentId: 'a-1', classId: 'class-1', courseId: 'c-1', status: 'GRADED', value: 15, comment: null, createdAt: new Date() }];
      prismaMock.grade.findMany.mockResolvedValue(grades);
      prismaMock.assignment.findMany.mockResolvedValue([]);

      const result = await collectRgpdData({ userId: 'user-1', email: 'lea@skolr.local' });

      expect(prismaMock.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'grade-user-1' } }),
      );
      expect(result).toEqual({ gradeUser, grades, assignments: [] });
    });

    it('should return an empty grades array without querying grades when no GradeUser matches the email', async () => {
      prismaMock.gradeUser.findUnique.mockResolvedValue(null);
      prismaMock.assignment.findMany.mockResolvedValue([]);

      const result = await collectRgpdData({ userId: 'user-1', email: 'unknown@skolr.local' });

      expect(prismaMock.grade.findMany).not.toHaveBeenCalled();
      expect(result).toEqual({ gradeUser: null, grades: [], assignments: [] });
    });

    it('should fetch assignments created by the user regardless of GradeUser match', async () => {
      prismaMock.gradeUser.findUnique.mockResolvedValue(null);
      const assignments = [{ id: 'a-1', title: 'Contrôle', classId: 'class-1', courseId: 'c-1', assignedAt: new Date(), dueAt: null }];
      prismaMock.assignment.findMany.mockResolvedValue(assignments);

      const result = await collectRgpdData({ userId: 'teacher-1', email: 'prof@skolr.local' });

      expect(prismaMock.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teacherId: 'teacher-1' } }),
      );
      expect(result.assignments).toEqual(assignments);
    });
  });

  describe('anonymizeGradeUserByEmail', () => {
    it('should anonymize the GradeUser matching the given email', async () => {
      prismaMock.gradeUser.updateMany.mockResolvedValue({ count: 1 });

      await anonymizeGradeUserByEmail('lea@skolr.local', 'deleted-abc@anonymized.skolr.local');

      expect(prismaMock.gradeUser.updateMany).toHaveBeenCalledWith({
        where: { email: 'lea@skolr.local' },
        data: { email: 'deleted-abc@anonymized.skolr.local', name: 'Utilisateur supprimé' },
      });
    });

    it('should use the provided transaction client when given', async () => {
      const txUpdateMany = mock().mockResolvedValue({ count: 1 });
      const tx = { gradeUser: { updateMany: txUpdateMany } } as unknown as Parameters<
        typeof anonymizeGradeUserByEmail
      >[2];

      await anonymizeGradeUserByEmail('lea@skolr.local', 'deleted-abc@anonymized.skolr.local', tx);

      expect(txUpdateMany).toHaveBeenCalled();
      expect(prismaMock.gradeUser.updateMany).not.toHaveBeenCalled();
    });
  });
});
