const CLASS_SERVICE_URL = process.env.CLASS_SERVICE_URL || 'http://localhost:3002';

type ClassListResponse = { data: { id: string }[] };

/** Classes où ce teacherId enseigne — utilisé pour restreindre la file de validation au staff/prof concerné. */
export async function getClassIdsForTeacher(teacherId: string): Promise<string[]> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/teacher/${teacherId}`);
  if (!response.ok) {
    console.warn(`[classServiceClient] GET /classes/teacher/${teacherId} returned ${response.status}`);
    return [];
  }
  const { data } = (await response.json()) as ClassListResponse;
  return data.map((c) => c.id);
}

/** Classes où ce studentId est inscrit — utilisé pour résoudre le filtre studentId des sessions. */
export async function getClassIdsForStudent(studentId: string): Promise<string[]> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/student/${studentId}`);
  if (!response.ok) {
    console.warn(`[classServiceClient] GET /classes/student/${studentId} returned ${response.status}`);
    return [];
  }
  const { data } = (await response.json()) as ClassListResponse;
  return data.map((c) => c.id);
}
