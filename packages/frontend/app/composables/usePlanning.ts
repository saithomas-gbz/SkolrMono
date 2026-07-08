export type Session = {
  id: string;
  classId: string;
  courseId: string;
  teacherId: string;
  room: string | null;
  startAt: string;
  endAt: string;
  recurrenceRule: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Absence = {
  id: string;
  sessionId: string;
  userId: string;
  role: 'STUDENT' | 'TEACHER';
  justified: boolean;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSessionBody = {
  classId: string;
  courseId: string;
  teacherId: string;
  room?: string;
  startAt: string;
  endAt: string;
  recurrenceRule?: string;
};

export type UpdateSessionBody = {
  room?: string;
  startAt?: string;
  endAt?: string;
  recurrenceRule?: string;
  teacherId?: string;
};

export type SessionFilters = {
  classId?: string;
  studentId?: string;
  teacherId?: string;
  /** Enseignant : 'mine' (ses séances, défaut) ou 'class' (emploi du temps complet d'une de ses classes). */
  scope?: 'mine' | 'class';
  from?: string;
  to?: string;
};

export type CreateAbsenceBody = {
  sessionId: string;
  userId: string;
  role: 'STUDENT' | 'TEACHER';
  justified?: boolean;
  reason?: string;
};

export type AbsenceFilters = {
  sessionId?: string;
  userId?: string;
  role?: 'STUDENT' | 'TEACHER';
  justified?: boolean;
  teacherId?: string;
};

export type JustificationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type JustificationDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type AbsenceJustification = {
  id: string;
  studentId: string;
  status: JustificationStatus;
  reason: string;
  reviewerId: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents: JustificationDocument[];
};

export type JustificationFilters = {
  status?: JustificationStatus;
  studentId?: string;
  classId?: string;
};

export function usePlanning() {
  const api = useApi();

  // Sessions
  async function fetchSessions(filters?: SessionFilters): Promise<Session[]> {
    return api<Session[]>('/planning/sessions', { params: filters });
  }

  async function fetchSessionById(id: string): Promise<Session> {
    return api<Session>(`/planning/sessions/${id}`);
  }

  async function createSession(body: CreateSessionBody): Promise<Session> {
    return api<Session>('/planning/sessions', { method: 'POST', body });
  }

  async function updateSession(id: string, body: UpdateSessionBody): Promise<Session> {
    return api<Session>(`/planning/sessions/${id}`, { method: 'PATCH', body });
  }

  async function deleteSession(id: string): Promise<void> {
    await api(`/planning/sessions/${id}`, { method: 'DELETE' });
  }

  // Absences
  async function fetchAbsences(filters?: AbsenceFilters): Promise<Absence[]> {
    return api<Absence[]>('/planning/absences', { params: filters });
  }

  async function fetchAbsenceById(id: string): Promise<Absence> {
    return api<Absence>(`/planning/absences/${id}`);
  }

  async function createAbsence(body: CreateAbsenceBody): Promise<Absence> {
    return api<Absence>('/planning/absences', { method: 'POST', body });
  }

  async function justifyAbsence(id: string, reason?: string): Promise<Absence> {
    return api<Absence>(`/planning/absences/${id}`, {
      method: 'PATCH',
      body: { justified: true, reason },
    });
  }

  async function deleteAbsence(id: string): Promise<void> {
    await api(`/planning/absences/${id}`, { method: 'DELETE' });
  }

  // Justifications d'absence (issue #80)
  async function fetchAbsenceJustifications(filters?: JustificationFilters): Promise<AbsenceJustification[]> {
    return api<AbsenceJustification[]>('/planning/absence-justifications', { params: filters });
  }

  async function createAbsenceJustification(
    reason: string,
    absenceIds: string[],
    files: File[],
    /** Requis pour un PARENT déposant une demande au nom de l'enfant (issue #81). */
    studentId?: string,
  ): Promise<AbsenceJustification> {
    const formData = new FormData();
    formData.append('reason', reason);
    absenceIds.forEach((id) => formData.append('absenceIds', id));
    files.forEach((file) => formData.append('file', file, file.name));
    if (studentId) formData.append('studentId', studentId);
    return api<AbsenceJustification>('/planning/absence-justifications', { method: 'POST', body: formData });
  }

  async function submitAbsenceJustification(id: string): Promise<AbsenceJustification> {
    return api<AbsenceJustification>(`/planning/absence-justifications/${id}/submit`, { method: 'PATCH' });
  }

  async function reviewAbsenceJustification(
    id: string,
    action: 'approve' | 'reject',
    comment?: string,
  ): Promise<AbsenceJustification> {
    return api<AbsenceJustification>(`/planning/absence-justifications/${id}/review`, {
      method: 'PATCH',
      body: { action, comment },
    });
  }

  async function downloadJustificationDocument(
    justificationId: string,
    docId: string,
    fileName: string,
  ): Promise<void> {
    const blob = await api<Blob>(`/planning/absence-justifications/${justificationId}/documents/${docId}`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return {
    fetchSessions,
    fetchSessionById,
    createSession,
    updateSession,
    deleteSession,
    fetchAbsences,
    fetchAbsenceById,
    createAbsence,
    justifyAbsence,
    deleteAbsence,
    fetchAbsenceJustifications,
    createAbsenceJustification,
    submitAbsenceJustification,
    reviewAbsenceJustification,
    downloadJustificationDocument,
  };
}
