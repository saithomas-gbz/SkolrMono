import { test, expect } from '@playwright/test';
import { loginApi } from '../fixtures/auth';

// Léa Martin — enfant principal de parent.martin (scripts/seed/dev-users.ts,
// DEV_GENERATED_STUDENTS[0]). Hardcodé comme les emails/mots de passe de
// fixtures/auth.ts plutôt qu'importé du backend, pour ne pas coupler l'e2e au
// build du monorepo.
const LEA_MARTIN_ID = '44444444-4444-4444-4444-000000000001';

test.describe('GET /grade/users/:userId/bulletin — matrice auth', () => {
  test('401 sans token', async ({ request }) => {
    const res = await request.get(
      '/api/grade/users/00000000-0000-0000-0000-000000000000/bulletin',
    );
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  test("403 : un élève ne peut pas récupérer le bulletin d'un autre élève", async ({ request }) => {
    const { token } = await loginApi(request, 'user');
    const { userId: otherStudentId } = await loginApi(request, 'student');
    const res = await request.get(`/api/grade/users/${otherStudentId}/bulletin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  // Régression du gap fonctionnel : un parent authentifié, demandant le
  // bulletin de SON PROPRE enfant, se voit refuser l'accès (PARENT n'est pas
  // dans STAFF_ROLES et payload.userId !== params.userId dans
  // requireSelfOrStaff). À corriger côté backend si besoin métier ; ce test
  // fige le comportement actuel pour qu'un changement soit délibéré.
  test("403 (gap connu) : un parent ne peut pas récupérer le bulletin de son enfant", async ({
    request,
  }) => {
    const { token } = await loginApi(request, 'parent');
    const res = await request.get(`/api/grade/users/${LEA_MARTIN_ID}/bulletin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
  });

  test("404 : utilisateur inexistant, requête d'un membre du staff", async ({ request }) => {
    const { token } = await loginApi(request, 'admin');
    const res = await request.get(
      '/api/grade/users/ffffffff-ffff-ffff-ffff-ffffffffffff/bulletin',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: 'User not found' });
  });

  test('200 : un élève récupère son propre bulletin (PDF valide)', async ({ request }) => {
    const { token, userId } = await loginApi(request, 'user');
    const res = await request.get(`/api/grade/users/${userId}/bulletin`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    expect(res.headers()['content-disposition']).toMatch(/attachment;.*\.pdf"/);
    const body = await res.body();
    expect(body.subarray(0, 4).toString()).toBe('%PDF');
  });

  test("200 : un enseignant (staff) récupère le bulletin d'un élève", async ({ request }) => {
    const { token: teacherToken } = await loginApi(request, 'teacher');
    const { userId: studentId } = await loginApi(request, 'student');
    const res = await request.get(`/api/grade/users/${studentId}/bulletin`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
  });

  // Non couvert ici : "200 + PDF quasi vide pour un utilisateur sans aucune
  // note". Aucun GradeUser seedé n'a 0 ligne de Grade (chaque élève inscrit a
  // ≥2 notes ; dev.teacher/dev.admin n'ont pas de GradeUser du tout → 404, pas
  // 200). Voir bulletin-ui.spec.ts pour une couverture équivalente côté front
  // via interception réseau.
});
