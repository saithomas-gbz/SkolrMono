import { describe, it, expect } from 'bun:test';
import { weightedAverage, median, rankOf, gradeDistributionBuckets, groupGradesByCourse } from '../lib/stats';

describe('weightedAverage', () => {
  it('renvoie null sans note GRADED', () => {
    expect(weightedAverage([{ value: null, coefficient: 1, status: 'PENDING' }])).toBeNull();
    expect(weightedAverage([])).toBeNull();
  });

  it('ignore les notes non GRADED', () => {
    const result = weightedAverage([
      { value: 10, coefficient: 1, status: 'GRADED' },
      { value: 0, coefficient: 5, status: 'ABSENT' },
    ]);
    expect(result).toBe(10);
  });

  it('pondère par coefficient', () => {
    const result = weightedAverage([
      { value: 10, coefficient: 1, status: 'GRADED' },
      { value: 20, coefficient: 2, status: 'GRADED' },
    ]);
    // (10*1 + 20*2) / (1+2) = 50/3
    expect(result).toBeCloseTo(50 / 3, 5);
  });
});

describe('median', () => {
  it('renvoie null pour un tableau vide', () => {
    expect(median([])).toBeNull();
  });

  it('nombre impair de valeurs', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('nombre pair de valeurs (moyenne des deux médianes)', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('rankOf', () => {
  it("renvoie null si l'id n'est pas dans la liste", () => {
    expect(rankOf([{ id: 'a', average: 10 }], 'missing')).toBeNull();
  });

  it('classe par moyenne décroissante', () => {
    const averages = [
      { id: 'a', average: 15 },
      { id: 'b', average: 10 },
      { id: 'c', average: 18 },
    ];
    expect(rankOf(averages, 'c')).toEqual({ position: 1, totalStudents: 3 });
    expect(rankOf(averages, 'a')).toEqual({ position: 2, totalStudents: 3 });
    expect(rankOf(averages, 'b')).toEqual({ position: 3, totalStudents: 3 });
  });

  it('gère les égalités (même rang pour des moyennes égales)', () => {
    const averages = [
      { id: 'a', average: 12 },
      { id: 'b', average: 12 },
      { id: 'c', average: 8 },
    ];
    expect(rankOf(averages, 'a')?.position).toBe(1);
    expect(rankOf(averages, 'b')?.position).toBe(1);
    expect(rankOf(averages, 'c')?.position).toBe(3);
  });
});

describe('gradeDistributionBuckets', () => {
  it('répartit sur 5 tranches par défaut (0-20)', () => {
    const buckets = gradeDistributionBuckets([2, 9, 9, 15, 20]);
    expect(buckets).toHaveLength(5);
    expect(buckets.reduce((acc, b) => acc + b.count, 0)).toBe(5);
    // dernière tranche inclut la borne max (20)
    expect(buckets[4]!.count).toBe(1);
  });

  it('ignore les valeurs hors bornes', () => {
    const buckets = gradeDistributionBuckets([-1, 25]);
    expect(buckets.reduce((acc, b) => acc + b.count, 0)).toBe(0);
  });
});

describe('groupGradesByCourse', () => {
  const course1 = { name: 'Mathématiques', subject: { name: 'Sciences' } };
  const course2 = { name: 'Français', subject: null };

  it('groupe les notes par courseId et applique le mapper à chaque entrée', () => {
    const grades = [
      { courseId: 'course-1', course: course1, value: 10 },
      { courseId: 'course-1', course: course1, value: 20 },
      { courseId: 'course-2', course: course2, value: 15 },
    ];
    const groups = groupGradesByCourse(grades, (g) => ({ value: g.value }));

    expect(groups.size).toBe(2);
    expect(groups.get('course-1')).toEqual({
      courseId: 'course-1',
      courseName: 'Mathématiques',
      subjectName: 'Sciences',
      entries: [{ value: 10 }, { value: 20 }],
    });
    expect(groups.get('course-2')?.subjectName).toBeNull();
  });
});
