import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Deux régressions du parcours emploi du temps (#247), toutes deux invisibles
 * pour les tests unitaires : l'une tient au comportement d'un composant tiers,
 * l'autre à un appel qui ne part qu'au rendu serveur de la page.
 */

test("un eleve ouvre son emploi du temps sans perdre sa session", async ({ page }) => {
  await loginAs(page, 'student');
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');

  // La page chargeait `/class/classes`, réservé au staff. Le 403 renvoyé était
  // interprété par `useApi` comme une session invalide, et l'élève se retrouvait
  // sur `/auth/login?expired=1` en cliquant sur un lien de sa propre navigation.
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await expect(page.getByRole('main').getByText('Emploi du temps', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
});

test("un eleve voit l emploi du temps de sa classe sans action d edition", async ({ page }) => {
  await loginAs(page, 'student');
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('.fc')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Ajouter' })).toHaveCount(0);
});

test("la date saisie dans le dialog de seance n est pas perdue", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.locator('#sd-start')).toBeVisible({ timeout: 10_000 });

  // Le champ ne doit plus accepter la saisie clavier : en 24 h, le parseur de
  // PrimeVue lève une exception avalée silencieusement et la valeur tapée est
  // perdue, la séance étant alors créée à l'heure préremplie.
  const startInput = page.locator('#sd-start input');
  await expect(startInput).toHaveAttribute('readonly', '');
  await expect(page.locator('#sd-end input')).toHaveAttribute('readonly', '');
});
