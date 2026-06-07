import { normalizeApiError } from '~/composables/useClass';

/** Aligné sur `gradeOpenApi` (`gradeUser`). */
export type GradeUser = {
  id: string;
  name: string;
  email: string;
  classId: string;
};

/** Aligné sur `gradeOpenApi` (`gradeClass`). */
export type GradeClass = {
  id: string;
  name: string;
  description: string;
};

/** Aligné sur `gradeOpenApi` (`gradeCourse`). */
export type GradeCourse = {
  id: string;
  name: string;
  description: string;
};

/** Aligné sur `gradeOpenApi` (`gradeEntity`). */
export type GradeEntity = {
  id: string;
  userId: string;
  classId: string;
  courseId: string;
  value: number;
  createdAt: string;
  updatedAt: string;
  user?: GradeUser;
  class?: GradeClass;
  course?: GradeCourse;
};

export type GradeApiResponse = {
  data: GradeEntity;
  message: string;
};

export type GradeListApiResponse = {
  data: GradeEntity[];
  message: string;
};

export type CourseListApiResponse = {
  data: GradeCourse[];
  message: string;
};

export type CreateGradeBody = {
  userId: string;
  classId: string;
  courseId: string;
  value: number;
  teacherId: string;
};

export type UpdateGradeBody = {
  value: number;
};

export type HistogramBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
};

export function averageGradeValues(grades: Pick<GradeEntity, 'value'>[]): number | null {
  if (grades.length === 0) {
    return null;
  }
  const sum = grades.reduce((acc, grade) => acc + grade.value, 0);
  return sum / grades.length;
}

/**
 * Répartition en tranches [min, max) sur l’échelle des notes (défaut 0–20).
 * La dernière tranche inclut la borne max.
 */
export function histogramBuckets(
  grades: Pick<GradeEntity, 'value'>[],
  options?: { min?: number; max?: number; bucketCount?: number },
): HistogramBucket[] {
  const min = options?.min ?? 0;
  const max = options?.max ?? 20;
  const bucketCount = Math.max(1, options?.bucketCount ?? 5);
  const span = max - min;
  const step = span / bucketCount;

  const buckets: HistogramBucket[] = [];
  for (let i = 0; i < bucketCount; i += 1) {
    const bucketMin = min + step * i;
    const bucketMax = i === bucketCount - 1 ? max : min + step * (i + 1);
    const label = `${roundScore(bucketMin)}–${roundScore(bucketMax)}`;
    buckets.push({ label, min: bucketMin, max: bucketMax, count: 0 });
  }

  for (const grade of grades) {
    const value = grade.value;
    if (value < min || value > max) {
      continue;
    }
    const index =
      value === max ? bucketCount - 1 : Math.min(bucketCount - 1, Math.floor((value - min) / step));
    const bucket = buckets[index];
    if (bucket) {
      bucket.count += 1;
    }
  }

  return buckets;
}

function roundScore(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function useGrade() {
  const api = useApi();

  async function fetchAllGrades() {
    const response = await api<GradeListApiResponse>('/grade/grades');
    return response.data;
  }

  async function fetchGradeById(id: string) {
    const response = await api<GradeApiResponse>(`/grade/grades/${id}`);
    return response.data;
  }

  async function fetchGradesByClassId(classId: string) {
    const response = await api<GradeListApiResponse>(`/grade/grades/class/${classId}`);
    return response.data; 
  }

  async function fetchGradesByUserId(userId: string) {
    const response = await api<GradeListApiResponse>(`/grade/grades/user/${userId}`);
    return response.data;
  }

  async function fetchCourses() {
    const response = await api<CourseListApiResponse>('/grade/courses');
    return response.data;
  }

  async function createGrade(body: CreateGradeBody) {
    const response = await api<GradeApiResponse>('/grade/grades', {
      method: 'POST',
      body,
    });
    return response.data;
  }

  async function updateGrade(id: string, body: UpdateGradeBody) {
    const response = await api<GradeApiResponse>(`/grade/grades/${id}`, {
      method: 'PATCH',
      body,
    });
    return response.data;
  }

  async function deleteGrade(id: string) {
    const response = await api<GradeApiResponse>(`/grade/grades/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  return {
    fetchAllGrades,
    fetchGradeById,
    fetchGradesByClassId,
    fetchGradesByUserId,
    fetchCourses,
    createGrade,
    updateGrade,
    deleteGrade,
    averageGradeValues,
    histogramBuckets,
    normalizeApiError,
  };
}
