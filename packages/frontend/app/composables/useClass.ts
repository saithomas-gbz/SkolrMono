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
  students?: Array<{ id: string; studentId: string; classId: string; joinedAt?: string }>;
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

export type ClassCourse = {
  id: string;
  name: string;
  description: string;
};

export type ClassCoursesApiResponse = {
  data: ClassCourse[];
  message: string;
};

type FetchErrorLike = { data?: { error?: string }; statusMessage?: string };

export function normalizeApiError(e: unknown): string {
  const err = e as FetchErrorLike | null;
  if (err?.data?.error && typeof err.data.error === 'string') {
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

  async function fetchTeacherCourses(classId: string, teacherId: string) {
    const response = await api<ClassCoursesApiResponse>(
      `/class/classes/${classId}/teachers/${teacherId}/courses`,
    );
    return response.data;
  }

  /**
   * Cours affectables à un enseignant.
   *
   * Sert `/class/courses` et non `/grade/courses` : les deux modules portent
   * leur propre table, alimentées par le seed avec les mêmes identifiants mais
   * sans synchronisation. Un cours créé côté notes n'existe pas côté classe et
   * son affectation échouerait — la liste doit venir du module qui la valide.
   */
  async function fetchAssignableCourses() {
    const response = await api<ClassCoursesApiResponse>('/class/courses');
    return response.data;
  }

  /**
   * Inscrit un élève dans une classe, sans toucher aux autres.
   *
   * L'API attend la liste complète : elle remplace l'inscription plutôt que de
   * la compléter. On lit donc l'existant avant d'y ajouter l'élève — envoyer le
   * seul nouvel identifiant viderait la classe.
   */
  async function enrollStudent(classId: string, studentId: string) {
    const classe = await fetchClassById(classId);
    const actuels = (classe?.students ?? []).map((e) => e.studentId);
    if (actuels.includes(studentId)) {
      return classe;
    }
    const response = await api<ClassApiResponse>(`/class/classes/${classId}/students`, {
      method: 'PUT',
      body: { studentIds: [...actuels, studentId] },
    });
    return response.data;
  }

  /** Rattache un enseignant à une classe, en préservant l'équipe en place. */
  async function assignTeacher(classId: string, teacherId: string) {
    const classe = await fetchClassById(classId);
    const actuels = (classe?.classTeachers ?? []).map((t) => t.teacherId);
    if (actuels.includes(teacherId)) {
      return classe;
    }
    const response = await api<ClassApiResponse>(`/class/classes/${classId}/teachers`, {
      method: 'PUT',
      body: { teacherIds: [...actuels, teacherId] },
    });
    return response.data;
  }

  /**
   * Remplace la liste des cours qu'un enseignant assure dans une classe.
   *
   * L'appel est idempotent : il porte la liste voulue, pas un delta.
   */
  async function setTeacherCourses(classId: string, teacherId: string, courseIds: string[]) {
    const response = await api<ClassCoursesApiResponse>(
      `/class/classes/${classId}/teachers/${teacherId}/courses`,
      { method: 'PUT', body: { courseIds } },
    );
    return response.data;
  }

  return {
    fetchClassesSummary,
    fetchClassById,
    fetchClasses,
    fetchClassesByStudentId,
    fetchClassesByTeacherId,
    fetchTeacherCourses,
    fetchAssignableCourses,
    enrollStudent,
    assignTeacher,
    setTeacherCourses,
  };
}
