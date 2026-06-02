export type SkolrClassSummary = {
  id: string;
  name: string;
  teacherCount: number;
  studentCount: number;
};

export type SkolrClass = {
  id: string;
  name: string;
  description: string;
  classTeachers?: Array<{ id: string; teacherId: string; classId: string }>;
  students?: Array<{ id: string; studentId: string; classId: string }>;
};

export type ClassesSummaryApiResponse = {
  data: SkolrClassSummary[];
  message: string;
};

export type ClassesApiResponse = {
  data: SkolrClass[];
  message: string;
};

export type ClassApiResponse = {
  data: SkolrClass | null;
  message: string;
};

type FetchErrorLike = { data?: { error?: string }; statusMessage?: string };

export function normalizeApiError(e: unknown): string {
  const err = e as FetchErrorLike;
  if (err.data?.error && typeof err.data.error === 'string') {
    return err.data.error;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return 'Impossible de joindre le service. Vérifiez que Docker (gateway + class-service) est démarré.';
}

export function useClass() {
  const api = useApi();

  async function fetchClassesSummary() {
    const response = await api<ClassesSummaryApiResponse>('/class/classes/summary');
    return response.data;
  }

  async function fetchClassById(id: string) {
    const response = await api<ClassApiResponse>(`/class/classes/${id}`, {
      method: 'GET',
    });
    return response.data;
  }

  /** Liste complète (éviter côté UI si beaucoup de classes). */
  async function fetchClasses() {
    const response = await api<ClassesApiResponse>('/class/classes');
    return response.data;
  }

  async function fetchClassesByStudentId(studentId: string) {
    const response = await api<ClassesApiResponse>(`/class/classes/student/${studentId}`);
    return response.data;
  }

  async function fetchClassesByTeacherId(teacherId: string) {
    const response = await api<ClassesApiResponse>(`/class/classes/teacher/${teacherId}`);
    return response.data;
  }

  return {
    fetchClassesSummary,
    fetchClassById,
    fetchClasses,
    fetchClassesByStudentId,
    fetchClassesByTeacherId,
  };
}
