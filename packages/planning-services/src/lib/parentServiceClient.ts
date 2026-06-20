const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://localhost:3012';

type ChildrenResponse = { data: { studentId: string }[] };

/** Enfants rattachés à ce parent — utilisé pour restreindre absences/justifications (issue #81). */
export async function getChildIds(parentId: string): Promise<string[]> {
  const response = await fetch(`${PARENT_SERVICE_URL}/parent/children?parentId=${encodeURIComponent(parentId)}`);
  if (!response.ok) {
    console.warn(`[parentServiceClient] GET /parent/children?parentId=${parentId} returned ${response.status}`);
    return [];
  }
  const { data } = (await response.json()) as ChildrenResponse;
  return data.map((child) => child.studentId);
}
