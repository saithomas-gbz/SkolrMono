import { describe, expect, test } from 'bun:test';
import { averageGradeValues, histogramBuckets, roundScore, type GradeEntity } from './useGrade';

type PartialGrade = Pick<GradeEntity, 'value' | 'status'>;

function grade(value: number | null, status: PartialGrade['status'] = 'GRADED'): PartialGrade {
  return { value, status };
}

describe('averageGradeValues', () => {
  test('moyenne des notes GRADED uniquement', () => {
    expect(averageGradeValues([grade(10), grade(20), grade(15)])).toBe(15);
  });

  test('exclut les notes non GRADED (PENDING/ABSENT/EXEMPT)', () => {
    const grades = [grade(20, 'GRADED'), grade(0, 'PENDING'), grade(0, 'ABSENT'), grade(0, 'EXEMPT')];
    expect(averageGradeValues(grades)).toBe(20);
  });

  test('exclut une note GRADED avec value=null (régression #146 gradedCount)', () => {
    expect(averageGradeValues([grade(10), grade(null, 'GRADED')])).toBe(10);
  });

  test('null si aucune note exploitable', () => {
    expect(averageGradeValues([])).toBeNull();
    expect(averageGradeValues([grade(0, 'PENDING')])).toBeNull();
  });
});

describe('histogramBuckets', () => {
  test('répartit sur 5 tranches par défaut (0-20)', () => {
    const buckets = histogramBuckets([{ value: 2 }, { value: 9 }, { value: 15 }, { value: 20 }]);
    expect(buckets).toHaveLength(5);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(4);
  });

  test('la valeur max (borne) va dans la dernière tranche', () => {
    const buckets = histogramBuckets([{ value: 20 }], { bucketCount: 4 });
    expect(buckets[3].count).toBe(1);
    expect(buckets.slice(0, 3).every((b) => b.count === 0)).toBe(true);
  });

  test('ignore les valeurs hors bornes ou nulles', () => {
    const buckets = histogramBuckets([{ value: -5 }, { value: 25 }, { value: null }, { value: undefined as never }]);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  test('bucketCount personnalisé et bornes personnalisées', () => {
    const buckets = histogramBuckets([{ value: 5 }], { min: 0, max: 10, bucketCount: 2 });
    expect(buckets).toHaveLength(2);
    expect(buckets[1].count).toBe(1); // 5 est dans [5,10]
  });
});

describe('roundScore', () => {
  test('arrondit à une décimale', () => {
    expect(roundScore(14.567)).toBe('14.6');
    expect(roundScore(10)).toBe('10');
    expect(roundScore(0.04)).toBe('0');
  });
});
