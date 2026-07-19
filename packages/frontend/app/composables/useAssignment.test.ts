import { describe, expect, test } from 'bun:test';
import { averageGrades, gradebookAverage, type AssignmentEntity, type GradeGridRow, type GradebookGradeRef } from './useAssignment';

function row(userId: string, value: number | null, status: GradeGridRow['grade']['status'] = 'GRADED'): GradeGridRow {
  return { userId, name: userId, grade: { id: userId, status, value, comment: null } };
}

describe('averageGrades', () => {
  test('moyenne arrondie à 1 décimale, notes GRADED uniquement', () => {
    expect(averageGrades([row('a', 12), row('b', 15), row('c', 14)])).toBe(13.7);
  });

  test('exclut PENDING/ABSENT/EXEMPT et les value=null', () => {
    const rows = [row('a', 20), row('b', 0, 'PENDING'), row('c', null, 'GRADED')];
    expect(averageGrades(rows)).toBe(20);
  });

  test('null si aucune ligne GRADED', () => {
    expect(averageGrades([])).toBeNull();
    expect(averageGrades([row('a', 0, 'ABSENT')])).toBeNull();
  });
});

function assignment(id: string, coefficient: number): AssignmentEntity {
  return {
    id,
    title: id,
    classId: 'c1',
    courseId: 'co1',
    teacherId: 't1',
    assignedAt: '2026-01-01',
    maxScore: 20,
    coefficient,
    status: 'PUBLISHED',
    gradedCount: 0,
    totalCount: 0,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };
}

function gradeRef(value: number | null, status: GradebookGradeRef['status'] = 'GRADED'): GradebookGradeRef {
  return { id: 'g1', status, value, comment: null };
}

describe('gradebookAverage', () => {
  test('moyenne pondérée par coefficient', () => {
    const assignments = [assignment('a1', 1), assignment('a2', 3)];
    const grades = { a1: gradeRef(10), a2: gradeRef(20) };
    // (10*1 + 20*3) / (1+3) = 70/4 = 17.5
    expect(gradebookAverage(grades, assignments)).toBe(17.5);
  });

  test('ignore les devoirs sans note ou non gradés', () => {
    const assignments = [assignment('a1', 1), assignment('a2', 1)];
    const grades = { a1: gradeRef(10) }; // a2 absent de "grades"
    expect(gradebookAverage(grades, assignments)).toBe(10);
  });

  test('null si aucun devoir noté', () => {
    expect(gradebookAverage({}, [assignment('a1', 1)])).toBeNull();
  });
});
