const CLASS_SERVICE_URL = process.env.CLASS_SERVICE_URL || 'http://localhost:3002';

type CourseRef = { id: string };

type TeacherCoursesResponse = {
  data: CourseRef[];
};

export async function teacherTeachesCourse(
  classId: string,
  teacherId: string,
  courseId: string,
): Promise<boolean> {
  const url = `${CLASS_SERVICE_URL}/classes/${classId}/teachers/${teacherId}/courses`;
  const response = await fetch(url);
  if (response.status === 404) {
    return false;
  }
  if (!response.ok) {
    throw new Error(`class-service returned ${response.status}`);
  }
  const body = (await response.json()) as TeacherCoursesResponse;
  return body.data.some((course) => course.id === courseId);
}
