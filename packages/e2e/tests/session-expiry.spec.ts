import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Sessions expirées / tokens invalides (issue #137).
 *
 * Vérifie qu'un token qui n'est plus valide « éjecte » l'utilisateur vers le
 * login, via les deux mécanismes du correctif :
 *  - proactif : `isLoggedIn` décode le claim `exp` → les gardes de route
 *    (`middleware/auth.ts`, `guest.ts`) redirigent avant tout appel réseau ;
 *  - réactif : l'interceptor `onResponseError` de `useApi` capte un 401/403 du
 *    backend, nettoie la session et redirige vers `/auth/login?expired=1`.
 */

const AUTH_TOKEN_COOKIE = 'auth_token';

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/**
 * Forge un JWT de forme valide (header/payload/signature) que le client peut
 * décoder. La signature est factice : le client ne vérifie que `exp`, tandis
 * que le backend, lui, la rejette (401) — ce qui sert le scénario réactif.
 */
function makeJwt(expSeconds: number): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    userId: 'e2e-user',
    email: 'dev.user@skolr.local',
    role: 'USER',
    exp: expSeconds,
  });
  return `${header}.${payload}.sig`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

test.describe('Sessions expirées / tokens invalides (#137)', () => {
  test('token expiré → éjection proactive vers le login', async ({ page, context }) => {
    await loginAs(page, 'user');
    const { origin } = new URL(page.url());

    // Remplace le token par un JWT dont `exp` est dans le passé.
    await context.addCookies([
      { name: AUTH_TOKEN_COOKIE, value: makeJwt(nowSeconds() - 3600), url: origin },
    ]);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('token retiré → éjection proactive vers le login', async ({ page, context }) => {
    await loginAs(page, 'user');

    // Supprime uniquement le cookie de token (la présence ne suffit plus).
    await context.clearCookies({ name: AUTH_TOKEN_COOKIE });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('token rejeté par le backend → déconnexion réactive + toast', async ({ page, context }) => {
    await loginAs(page, 'user');
    const { origin } = new URL(page.url());

    // Token non expiré (passe la garde proactive) mais à signature invalide :
    // le backend le rejette (401) au premier fetch d'un panneau protégé.
    await context.addCookies([
      { name: AUTH_TOKEN_COOKIE, value: makeJwt(nowSeconds() + 3600), url: origin },
    ]);

    await page.goto('/dashboard');

    // L'interceptor redirige vers le login en signalant l'expiration…
    await expect(page).toHaveURL(/\/auth\/login\?.*expired=1/);
    // …et la page login affiche le toast « Session expirée ».
    await expect(page.getByText('Session expirée')).toBeVisible();
  });
});
