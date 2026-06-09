import { normalizeApiError } from '~/composables/useClass';

export type SubjectEntity = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type SubjectApiResponse = {
  data: SubjectEntity;
  message: string;
};

export type SubjectListApiResponse = {
  data: SubjectEntity[];
  message: string;
};

export type CreateSubjectBody = {
  name: string;
  description: string;
};

export type UpdateSubjectBody = {
  name?: string;
  description?: string;
};

export function useSubject() {
  const api = useApi();

  async function fetchSubjects() {
    const response = await api<SubjectListApiResponse>('/grade/subjects');
    return response.data;
  }

  async function createSubject(body: CreateSubjectBody) {
    const response = await api<SubjectApiResponse>('/grade/subjects', {
      method: 'POST',
      body,
    });
    return response.data;
  }

  async function updateSubject(id: string, body: UpdateSubjectBody) {
    const response = await api<SubjectApiResponse>(`/grade/subjects/${id}`, {
      method: 'PUT',
      body,
    });
    return response.data;
  }

  async function deleteSubject(id: string) {
    const response = await api<SubjectApiResponse>(`/grade/subjects/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  return {
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
    normalizeApiError,
  };
}
