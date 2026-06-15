const CLASS_SERVICE_URL = process.env.CLASS_SERVICE_URL || 'http://localhost:3002';

type ClassTeacher = { teacherId: string };
type ClassStudent = { studentId: string };
type ClassResponse = { data: { classTeachers: ClassTeacher[]; students: ClassStudent[] } };

async function fetchClass(classId: string): Promise<ClassResponse['data'] | null> {
  const response = await fetch(`${CLASS_SERVICE_URL}/classes/${classId}`);
  if (!response.ok) {
    console.warn(`[classServiceClient] GET /classes/${classId} returned ${response.status}`);
    return null;
  }
  return ((await response.json()) as ClassResponse).data;
}

export async function getClassMemberIds(classId: string): Promise<string[]> {
  const data = await fetchClass(classId);
  if (!data) return [];
  const teacherIds = data.classTeachers.map((ct) => ct.teacherId);
  const studentIds = data.students.map((s) => s.studentId);
  return [...new Set([...teacherIds, ...studentIds])];
}
