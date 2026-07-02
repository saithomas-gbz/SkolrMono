import { test as base, expect, type Page } from '@playwright/test';

/**
 * Comptes de démonstration seedés par `packages/backend/prisma/seed.ts`
 * (source de vérité : `scripts/seed/dev-users.ts`). Réutilisés tels quels par
 * les specs E2E — ne jamais reproduire ces mots de passe en clair en prod.
 */
const DEV_ACCOUNTS = {
  admin: { email: 'dev.admin@skolr.local', password: 'dev-admin-123', role: 'ADMIN' },
  user: { email: 'dev.user@skolr.local', password: 'dev-user-123', role: 'USER' },
  teacher: { email: 'dev.teacher@skolr.local', password: 'dev-teacher-123', role: 'TEACHER' },
  student: { email: 'dev.student@skolr.local', password: 'dev-student-123', role: 'USER' },
} as const;

type DevAccountKey = keyof typeof DEV_ACCOUNTS;

/**
 * Connexion par l'interface (formulaire `AuthLoginForm.vue`). Remplit email +
 * mot de passe puis soumet, et attend la redirection vers `/dashboard`.
 */
export async function loginAs(page: Page, account: DevAccountKey): Promise<void> {
  const { email, password } = DEV_ACCOUNTS[account];

  await page.goto('/auth/login');
  // Nuxt sert d'abord le HTML côté serveur ; le clic n'a d'effet qu'une fois
  // l'app Vue hydratée côté client (tous les chunks JS chargés/exécutés). Sans
  // cette attente, le clic sur "Se connecter" tombe sur un DOM inerte : aucune
  // requête /auth/login n'est jamais envoyée (voir #114).
  await page.waitForLoadState('networkidle');

  await page.locator('#login-email').fill(email);
  // PrimeVue Password : l'id est porté par le conteneur, l'input est à l'intérieur.
  await page.locator('#login-password input').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  // La page /dashboard charge ses propres chunks JS (widgets, i18n, ...) après
  // la redirection : prévoir plus large que le timeout d'assertion par défaut.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

/**
 * Fixture `authenticatedPage` : une page déjà connectée en tant que `dev.user`
 * (rôle USER/élève). Les specs qui ont besoin d'un autre rôle appellent
 * directement `loginAs(page, '<role>')`.
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await loginAs(page, 'user');
    await use(page);
  },
});

export { expect };
