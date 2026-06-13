const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

type UserRef = { id: string };
type UsersResponse = { data: UserRef[] };

export async function getUserIdsByRole(role: string): Promise<string[]> {
  const url = `${AUTH_SERVICE_URL}/users?role=${encodeURIComponent(role)}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`[authServiceClient] GET /users?role=${role} returned ${response.status}`);
    return [];
  }
  const body = (await response.json()) as UsersResponse;
  return body.data.map((u) => u.id);
}
