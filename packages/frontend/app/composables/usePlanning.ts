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
  teacherId?: string;
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
  };
}
