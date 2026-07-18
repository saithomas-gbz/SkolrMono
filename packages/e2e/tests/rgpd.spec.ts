import { test, expect } from '../fixtures/auth';
import { loginApi, loginAs } from '../fixtures/auth';

/**
 * RGPD (issue #145) — droit d'accès / portabilité (`GET /auth/me/export`) et
 * droit à l'effacement (`DELETE /auth/me`). Les tests d'export s'appuient sur un
 * compte seedé (non destructif) ; l'effacement crée un compte jetable pour ne
 * pas corrompre les données de démonstration.
 */
test.describe('RGPD — export & effacement', () => {
  test('401 : export sans token', async ({ request }) => {
    const res = await request.get('/api/auth/me/export');
    expect(res.status()).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  test('export : agrège les données personnelles en JSON téléchargeable', async ({ request }) => {
    const { token, userId } = await loginApi(request, 'student');

    const res = await request.get('/api/auth/me/export', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    expect(res.headers()['content-disposition']).toContain('skolr-export');

    const body = (await res.json()) as {
      subject: { userId: string; email: string };
      grade: { grades: unknown[] };
      auth: { profile: Record<string, unknown> };
    };
    expect(body.subject.userId).toBe(userId);
    expect(body.subject.email).toBe('dev.student@skolr.local');
    // Le mot de passe n'est jamais exporté (donnée de sécurité, pas de portabilité).
    expect(body.auth.profile).not.toHaveProperty('password');
    // L'élève a des notes seedées, retrouvées via l'email (copie grade.GradeUser).
    expect(Array.isArray(body.grade.grades)).toBe(true);
  });

  test('effacement : anonymise le compte et bloque la reconnexion', async ({ request }) => {
    const email = `rgpd.e2e.${Date.now()}@skolr.local`;
    const password = 'e2e-rgpd-123';

    const reg = await request.post('/api/auth/register', {
      data: { email, password, name: 'E2E RGPD' },
    });
    expect(reg.status()).toBe(201);
    const { token } = (await reg.json()) as { token: string };

    const del = await request.delete('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(del.status()).toBe(200);
    expect(await del.json()).toEqual({ message: 'Account anonymized successfully' });

    // Le compte anonymisé ne peut plus se connecter.
    const relogin = await request.post('/api/auth/login', { data: { email, password } });
    expect(relogin.status()).toBe(401);
  });

  test("UI : le bouton d'export télécharge le fichier JSON depuis le profil", async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Mes données (RGPD)')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger mes données' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('skolr-export.json');
  });
});
