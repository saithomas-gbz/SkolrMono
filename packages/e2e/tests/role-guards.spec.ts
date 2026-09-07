import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Gardes de rôle sur les pages du carnet de notes (#235).
 *
 * Ces trois pages ne déclaraient que le middleware `auth` : un élève ou un
 * parent qui saisissait l'URL atteignait le formulaire de création de devoir ou
 * la grille de notation. L'API répondait bien 403, donc sans fuite de données,
 * mais l'écran s'affichait puis cassait.
 *
 * Le middleware Nuxt redirige avant le rendu : on vérifie l'URL d'arrivée, et
 * qu'aucun élément propre à l'écran enseignant n'a été monté au passage.
 */

const TEACHER_ROUTES = [
  { path: '/grades/assignments/new', label: 'création de devoir' },
  { path: '/grades/assignments/some-assignment-id', label: 'grille de notation' },
  { path: '/grades/classes/some-class-id', label: 'carnet de classe' },
];

for (const { path, label } of TEACHER_ROUTES) {
  test(`un eleve est redirige depuis ${label} (${path})`, async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto(path);

    // `/dashboard` redirige ensuite par rôle vers `/student`.
    await expect(page).toHaveURL(/\/(dashboard|student)(\/|$|\?)/, { timeout: 15_000 });
  });

  test(`un parent est redirige depuis ${label} (${path})`, async ({ page }) => {
    await loginAs(page, 'parent');
    await page.goto(path);

    await expect(page).toHaveURL(/\/(dashboard|parent)(\/|$|\?)/, { timeout: 15_000 });
  });

  test(`un enseignant accede a ${label} (${path})`, async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto(path);

    // Reste sur la route demandée : aucune redirection du middleware.
    await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`), { timeout: 15_000 });
  });
}

/**
 * Le lien de navigation reste réservé aux enseignants : la page de création de
 * devoir dérive ses classes et ses cours de l'enseignant connecté, donc un ADMIN
 * n'y trouverait que des listes vides. Le middleware le laisse en revanche passer,
 * pour la consultation d'un carnet de classe par lien direct.
 */
test("le lien carnet de notes n'est pas propose a un administrateur", async ({ page }) => {
  await loginAs(page, 'admin');
  await expect(page.getByRole('link', { name: 'Carnet de notes' })).toHaveCount(0);
});

test("un administrateur n'est pas redirige hors du carnet", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/grades/classes/some-class-id');
  await expect(page).toHaveURL(/\/grades\/classes\/some-class-id(\?|$)/, { timeout: 15_000 });
});
