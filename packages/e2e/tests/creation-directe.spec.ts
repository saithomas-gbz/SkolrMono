import { test, expect, loginAs, loginApi } from '../fixtures/auth';

/**
 * Creation directe d'un compte par un administrateur, sans email de
 * confirmation, avec mot de passe provisoire a remplacer a la premiere
 * connexion.
 */

const SUFFIXE = Date.now() % 1000000;
const EMAIL = `recrue.${SUFFIXE}@skolr.local`;
const PROVISOIRE = 'Provisoire-2026';
const DEFINITIF = 'Definitif-2026';

test.describe.configure({ mode: 'serial' });

test("1. l'admin cree un compte depuis l'interface", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/users');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Créer un compte' }).click();
  await page.locator('#creer-email').fill(EMAIL);
  await page.locator('#creer-nom').fill('Recrue Test');
  await page.locator('#creer-role').click();
  await page.getByRole('option', { name: 'Enseignant' }).click();
  await page.locator('#creer-mdp').fill(PROVISOIRE);

  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.getByText(`Compte créé pour ${EMAIL}`)).toBeVisible({ timeout: 20_000 });
});

test('2. la nouvelle recrue est cantonnee au changement de mot de passe', async ({ page }) => {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password input').fill(PROVISOIRE);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/auth\/change-password/, { timeout: 20_000 });

  // Toute tentative de navigation ailleurs ramene ici : c'est le cantonnement.
  await page.goto('/planning');
  await expect(page).toHaveURL(/\/auth\/change-password/, { timeout: 15_000 });
});

test('3. resoumettre le mot de passe provisoire est refuse', async ({ request }) => {
  const res = await request.post('/api/auth/login', {
    data: { email: EMAIL, password: PROVISOIRE },
  });
  const { token } = (await res.json()) as { token: string };

  const change = await request.patch('/api/auth/users/me/password', {
    headers: { authorization: `Bearer ${token}` },
    data: { currentPassword: PROVISOIRE, newPassword: PROVISOIRE },
  });
  expect(change.status(), 'un mot de passe identique viderait l obligation').toBe(400);
});

test('4. apres changement, la session est liberee', async ({ page }) => {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password input').fill(PROVISOIRE);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/auth\/change-password/, { timeout: 20_000 });

  await page.locator('#cp-actuel input').fill(PROVISOIRE);
  await page.locator('#cp-nouveau input').fill(DEFINITIF);
  await page.locator('#cp-confirmation input').fill(DEFINITIF);
  await page.getByRole('button', { name: 'Enregistrer et continuer' }).click();

  await expect(page).not.toHaveURL(/\/auth\/change-password/, { timeout: 20_000 });
  await page.goto('/planning');
  await expect(page).toHaveURL(/\/planning/, { timeout: 15_000 });
});

test('5. le drapeau ne revient pas a la connexion suivante', async ({ page }) => {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#login-email').fill(EMAIL);
  await page.locator('#login-password input').fill(DEFINITIF);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).not.toHaveURL(/\/auth\/change-password/, { timeout: 20_000 });
});

test("6. un lien d'invitation reste utilisable si quelqu'un est deja connecte", async ({ page, request }) => {
  const { token } = await loginApi(request, 'admin');
  const invite = await request.post('/api/auth/invite', {
    headers: { authorization: `Bearer ${token}` },
    data: { email: `invite.${SUFFIXE}@skolr.local`, role: 'USER' },
  });
  expect(invite.status()).toBe(201);

  // Session active sur le poste : la page etait auparavant protegee par le
  // middleware `guest`, qui redirigeait l'invite sans explication.
  await loginAs(page, 'admin');
  await page.goto('/auth/accept-invitation?token=jeton-quelconque');
  await expect(page).toHaveURL(/\/auth\/accept-invitation/, { timeout: 15_000 });
});

test.afterAll(async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const liste = await request.get('/api/auth/users', {
    headers: { authorization: `Bearer ${token}` },
  });
  const { data } = (await liste.json()) as { data: { id: string; email: string }[] };
  for (const u of data.filter((x) => x.email.endsWith(`${SUFFIXE}@skolr.local`))) {
    await request.delete(`/api/auth/users/${u.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }
});
