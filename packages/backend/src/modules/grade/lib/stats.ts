type GradeStatus = 'PENDING' | 'GRADED' | 'ABSENT' | 'EXEMPT';

export function groupGradesByCourse<G extends { courseId: string; course: { name: string; subject: { name: string } | null } }, T>(
  grades: G[],
  mapEntry: (g: G) => T,
): Map<string, { courseId: string; courseName: string; subjectName: string | null; entries: T[] }> {
  const map = new Map<string, { courseId: string; courseName: string; subjectName: string | null; entries: T[] }>();
  for (const g of grades) {
    let group = map.get(g.courseId);
    if (!group) {
      group = { courseId: g.courseId, courseName: g.course.name, subjectName: g.course.subject?.name ?? null, entries: [] };
      map.set(g.courseId, group);
    }
    group.entries.push(mapEntry(g));
  }
  return map;
}

export function weightedAverage(
  entries: { value: number | null; coefficient: number; status: GradeStatus }[],
): number | null {
  const graded = entries.filter((e) => e.status === 'GRADED' && e.value !== null);
  if (graded.length === 0) return null;
  const totalWeight = graded.reduce((acc, e) => acc + e.coefficient, 0);
  const weightedSum = graded.reduce((acc, e) => acc + (e.value ?? 0) * e.coefficient, 0);
  return weightedSum / totalWeight;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function rankOf(
  averages: { id: string; average: number }[],
  id: string,
): { position: number; totalStudents: number } | null {
  const self = averages.find((a) => a.id === id);
  if (!self) return null;
  const position = 1 + averages.filter((a) => a.average > self.average).length;
  return { position, totalStudents: averages.length };
}

export type DistributionBucket = { label: string; min: number; max: number; count: number };

/** Même découpage 5 tranches [0,20] que `histogramBuckets()` côté frontend (useGrade.ts). */
export function gradeDistributionBuckets(
  values: number[],
  options?: { min?: number; max?: number; bucketCount?: number },
): DistributionBucket[] {
  const min = options?.min ?? 0;
  const max = options?.max ?? 20;
  const bucketCount = Math.max(1, options?.bucketCount ?? 5);
  const span = max - min;
  const step = span / bucketCount;

  const buckets: DistributionBucket[] = [];
  for (let i = 0; i < bucketCount; i += 1) {
    const bucketMin = min + step * i;
    const bucketMax = i === bucketCount - 1 ? max : min + step * (i + 1);
    const label = `${roundScore(bucketMin)}–${roundScore(bucketMax)}`;
    buckets.push({ label, min: bucketMin, max: bucketMax, count: 0 });
  }

  for (const value of values) {
    if (value < min || value > max) continue;
    const index = value === max ? bucketCount - 1 : Math.min(bucketCount - 1, Math.floor((value - min) / step));
    const bucket = buckets[index];
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function roundScore(value: number): string {
  return String(Math.round(value * 10) / 10);
}
