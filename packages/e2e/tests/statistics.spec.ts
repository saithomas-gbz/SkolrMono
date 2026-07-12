import { test, expect, loginAs } from '../fixtures/auth';

test.describe('/statistics accessible uniquement à ADMIN/TEACHER/STAFF (issue #96)', () => {
  test('TEACHER accède à /statistics', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/statistics');
    await expect(page).toHaveURL(/\/statistics/);
    // Scopé au contenu : le NavRail expose aussi un lien « Statistiques ».
    await expect(page.getByRole('main').getByText('Statistiques', { exact: true })).toBeVisible();
  });

  test('ADMIN accède à /statistics', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/statistics');
    await expect(page).toHaveURL(/\/statistics/);
  });

  test('USER (élève) est redirigé hors de /statistics', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/statistics');
    await expect(page).not.toHaveURL(/\/statistics/);
    await expect(page).toHaveURL(/\/student/);
  });

  test('PARENT est redirigé hors de /statistics', async ({ page }) => {
    await loginAs(page, 'parent');
    await page.goto('/statistics');
    await expect(page).not.toHaveURL(/\/statistics/);
    await expect(page).toHaveURL(/\/parent/);
  });
});
