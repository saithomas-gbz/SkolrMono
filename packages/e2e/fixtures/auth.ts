import { test as base, expect, type Page } from '@playwright/test';

/**
 * Comptes de démonstration seedés par `packages/backend/prisma/seed.ts`
 * (source de vérité : `scripts/seed/dev-users.ts`). Réutilisés tels quels par
 * les specs E2E — ne jamais reproduire ces mots de passe en clair en prod.
 */
export const DEV_ACCOUNTS = {
  admin: { email: 'dev.admin@skolr.local', password: 'dev-admin-123', role: 'ADMIN' },
  user: { email: 'dev.user@skolr.local', password: 'dev-user-123', role: 'USER' },
  teacher: { email: 'dev.teacher@skolr.local', password: 'dev-teacher-123', role: 'TEACHER' },
  student: { email: 'dev.student@skolr.local', password: 'dev-student-123', role: 'USER' },
} as const;

export type DevAccountKey = keyof typeof DEV_ACCOUNTS;

/**
 * Connexion par l'interface (formulaire `AuthLoginForm.vue`). Remplit email +
 * mot de passe puis soumet, et attend la redirection vers `/dashboard`.
 */
export async function loginAs(page: Page, account: DevAccountKey): Promise<void> {
  const { email, password } = DEV_ACCOUNTS[account];

  await page.goto('/auth/login');
  await page.locator('#login-email').fill(email);
  // PrimeVue Password : l'id est porté par le conteneur, l'input est à l'intérieur.
  await page.locator('#login-password input').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
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
