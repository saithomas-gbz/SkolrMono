const PARENT_SERVICE_URL = process.env.PARENT_SERVICE_URL || 'http://localhost:3012';

type ParentIdsResponse = { data: string[] };

/** Parents rattachés à cet élève — utilisé pour les notifier sur les événements d'absence (issue #81). */
export async function getParentIds(studentId: string): Promise<string[]> {
  const response = await fetch(`${PARENT_SERVICE_URL}/parents?studentId=${encodeURIComponent(studentId)}`);
  if (!response.ok) {
    console.warn(`[parentServiceClient] GET /parents?studentId=${studentId} returned ${response.status}`);
    return [];
  }
  const { data } = (await response.json()) as ParentIdsResponse;
  return data;
}
