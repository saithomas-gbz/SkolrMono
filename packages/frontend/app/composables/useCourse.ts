import { normalizeApiError } from '~/composables/useClass';
import type { SubjectEntity } from '~/composables/useSubject';

export type CourseEntity = {
  id: string;
  name: string;
  description: string;
  subjectId: string | null;
  subject: SubjectEntity | null;
  relatedCourses: Array<{ id: string; name: string; description: string }>;
};

export type CourseApiResponse = {
  data: CourseEntity;
  message: string;
};

export type CourseListApiResponse = {
  data: CourseEntity[];
  message: string;
};

export type CreateCourseBody = {
  name: string;
  description: string;
  subjectId?: string;
};

export type UpdateCourseBody = {
  name?: string;
  description?: string;
  subjectId?: string | null;
};

export function useCourse() {
  const api = useApi();

  async function fetchCourses() {
    const response = await api<CourseListApiResponse>('/grade/courses');
    return response.data;
  }

  async function createCourse(body: CreateCourseBody) {
    const response = await api<CourseApiResponse>('/grade/courses', {
      method: 'POST',
      body,
    });
    return response.data;
  }

  async function updateCourse(id: string, body: UpdateCourseBody) {
    const response = await api<CourseApiResponse>(`/grade/courses/${id}`, {
      method: 'PUT',
      body,
    });
    return response.data;
  }

  async function deleteCourse(id: string) {
    const response = await api<CourseApiResponse>(`/grade/courses/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  async function addRelatedCourse(id: string, relatedCourseId: string) {
    const response = await api<CourseApiResponse>(`/grade/courses/${id}/related`, {
      method: 'POST',
      body: { relatedCourseId },
    });
    return response.data;
  }

  async function removeRelatedCourse(id: string, relatedId: string) {
    const response = await api<CourseApiResponse>(`/grade/courses/${id}/related/${relatedId}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  return {
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    addRelatedCourse,
    removeRelatedCourse,
    normalizeApiError,
  };
}
