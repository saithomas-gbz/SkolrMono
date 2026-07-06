import { normalizeApiError } from '~/composables/useClass';

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type GradeStatus = 'PENDING' | 'GRADED' | 'ABSENT' | 'EXEMPT';

export type AssignmentClassRef = { id: string; name: string };
export type AssignmentCourseRef = { id: string; name: string };

export type AssignmentEntity = {
  id: string;
  title: string;
  description?: string | null;
  classId: string;
  courseId: string;
  teacherId: string;
  assignedAt: string;
  dueAt?: string | null;
  maxScore: number;
  coefficient: number;
  status: AssignmentStatus;
  class?: AssignmentClassRef;
  course?: AssignmentCourseRef;
  gradedCount: number;
  totalCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GradeInGrid = {
  id: string;
  status: GradeStatus;
  value: number | null;
  comment: string | null;
};

export type GradeGridRow = {
  userId: string;
  name: string;
  grade: GradeInGrid;
};

export type GradeGridData = {
  assignment: AssignmentEntity;
  rows: GradeGridRow[];
  gradedCount: number;
  totalCount: number;
};

export type GradebookStudent = { userId: string; name: string };

export type GradebookGradeRef = {
  id: string;
  status: GradeStatus;
  value: number | null;
  comment: string | null;
};

export type GradebookData = {
  classId: string;
  courseId: string | null;
  assignments: AssignmentEntity[];
  students: GradebookStudent[];
  grades: Record<string, Record<string, GradebookGradeRef>>;
};

export type CreateAssignmentBody = {
  title: string;
  description?: string;
  classId: string;
  courseId: string;
  teacherId: string;
  assignedAt: string;
  dueAt?: string;
  maxScore?: number;
  coefficient?: number;
};

export type UpdateAssignmentBody = {
  title?: string;
  description?: string;
  assignedAt?: string;
  dueAt?: string;
  maxScore?: number;
  coefficient?: number;
  status?: AssignmentStatus;
};

export type BatchGradeEntry = {
  userId: string;
  status: GradeStatus;
  value?: number;
  comment?: string;
};

type AssignmentApiResponse = { data: AssignmentEntity; message: string };
type AssignmentListApiResponse = { data: AssignmentEntity[]; message: string };
type GradeGridApiResponse = { data: GradeGridData; message: string };
type GradebookApiResponse = { data: GradebookData; message: string };

export function averageGrades(rows: GradeGridRow[]): number | null {
  const graded = rows.filter((r) => r.grade.status === 'GRADED' && r.grade.value !== null);
  if (graded.length === 0) return null;
  const sum = graded.reduce((acc, r) => acc + (r.grade.value ?? 0), 0);
  return Math.round((sum / graded.length) * 10) / 10;
}

export function gradebookAverage(
  grades: Record<string, GradebookGradeRef>,
  assignments: AssignmentEntity[],
): number | null {
  const entries = assignments
    .map((a) => ({ grade: grades[a.id], coefficient: a.coefficient }))
    .filter((e): e is { grade: GradebookGradeRef; coefficient: number } =>
      !!e.grade && e.grade.status === 'GRADED' && e.grade.value !== null,
    );
  if (entries.length === 0) return null;
  const weightedSum = entries.reduce((acc, e) => acc + (e.grade.value ?? 0) * e.coefficient, 0);
  const totalCoef = entries.reduce((acc, e) => acc + e.coefficient, 0);
  return Math.round((weightedSum / totalCoef) * 10) / 10;
}

export function useAssignment() {
  const api = useApi();

  async function fetchAssignments(params?: {
    classId?: string;
    courseId?: string;
    teacherId?: string;
    status?: AssignmentStatus;
  }) {
    const query = new URLSearchParams();
    if (params?.classId) query.set('classId', params.classId);
    if (params?.courseId) query.set('courseId', params.courseId);
    if (params?.teacherId) query.set('teacherId', params.teacherId);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    const response = await api<AssignmentListApiResponse>(`/grade/assignments${qs ? `?${qs}` : ''}`);
    return response.data;
  }

  async function fetchAssignmentById(id: string) {
    const response = await api<AssignmentApiResponse>(`/grade/assignments/${id}`);
    return response.data;
  }

  async function createAssignment(body: CreateAssignmentBody) {
    const response = await api<AssignmentApiResponse>('/grade/assignments', { method: 'POST', body });
    return response.data;
  }

  async function updateAssignment(id: string, body: UpdateAssignmentBody) {
    const response = await api<AssignmentApiResponse>(`/grade/assignments/${id}`, { method: 'PATCH', body });
    return response.data;
  }

  async function deleteAssignment(id: string) {
    await api(`/grade/assignments/${id}`, { method: 'DELETE' });
  }

  async function publishAssignment(id: string) {
    const response = await api<AssignmentApiResponse>(`/grade/assignments/${id}/publish`, { method: 'POST' });
    return response.data;
  }

  async function fetchGradeGrid(assignmentId: string) {
    const response = await api<GradeGridApiResponse>(`/grade/assignments/${assignmentId}/grade-grid`);
    return response.data;
  }

  async function batchUpdateGrades(assignmentId: string, entries: BatchGradeEntry[]) {
    await api(`/grade/assignments/${assignmentId}/grades/batch`, { method: 'PATCH', body: { entries } });
  }

  async function fetchGradebook(classId: string, courseId?: string) {
    const qs = courseId ? `?courseId=${courseId}` : '';
    const response = await api<GradebookApiResponse>(`/grade/classes/${classId}/gradebook${qs}`);
    return response.data;
  }

  return {
    fetchAssignments,
    fetchAssignmentById,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    publishAssignment,
    fetchGradeGrid,
    batchUpdateGrades,
    fetchGradebook,
    averageGrades,
    gradebookAverage,
    normalizeApiError,
  };
}
