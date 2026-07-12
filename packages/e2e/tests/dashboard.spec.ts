import { test, expect, loginAs } from '../fixtures/auth';

test('le dashboard et la barre applicative s’affichent après connexion', async ({
  authenticatedPage: page,
}) => {
  await expect(page).toHaveURL(/\/student/);

  // Lien messagerie du NavRail (libellé `nav.messages`).
  await expect(page.getByRole('link', { name: 'Messages' })).toBeVisible();
  // Cloche de notifications (aria-label `notifications.aria_label`).
  await expect(page.getByRole('button', { name: /^Notifications/ })).toBeVisible();
});

test.describe('/dashboard redirige vers la page dédiée au rôle (issue #97)', () => {
  test('ADMIN → /admin', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('TEACHER → /teacher', async ({ page }) => {
    await loginAs(page, 'teacher');
    await expect(page).toHaveURL(/\/teacher/);
  });

  test('USER (élève) → /student', async ({ page }) => {
    await loginAs(page, 'user');
    await expect(page).toHaveURL(/\/student/);
  });

  test('PARENT → /parent', async ({ page }) => {
    await loginAs(page, 'parent');
    await expect(page).toHaveURL(/\/parent/);
  });
});

test('le tableau de bord enseignant affiche les widgets de synthèse (issue #97)', async ({ page }) => {
  await loginAs(page, 'teacher');
  await expect(page).toHaveURL(/\/teacher/);

  await expect(page.getByText('Sessions du jour', { exact: true })).toBeVisible();
  await expect(page.getByText('Absences non justifiées', { exact: true })).toBeVisible();
  await expect(page.getByText('Devoirs récents', { exact: true })).toBeVisible();
  await expect(page.getByText('Moyenne de classe', { exact: true })).toBeVisible();
});
