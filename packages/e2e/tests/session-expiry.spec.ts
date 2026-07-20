import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Sessions expirées / tokens invalides (issue #137), et rafraîchissement
 * silencieux via refresh token (issue #169/#170).
 *
 * Vérifie qu'un token d'accès qui n'est plus valide « éjecte » l'utilisateur
 * vers le login quand **aucun jeton de rafraîchissement valide** n'est
 * disponible non plus, via les deux mécanismes du correctif :
 *  - proactif : `isLoggedIn` décode le claim `exp` → les gardes de route
 *    (`middleware/auth.ts`, `guest.ts`) redirigent avant tout appel réseau,
 *    après avoir tenté un rafraîchissement silencieux (`refreshSession`) ;
 *  - réactif : l'interceptor `onResponseError` de `useApi` capte un 401/403 du
 *    backend, tente lui aussi un rafraîchissement, et si celui-ci échoue,
 *    nettoie la session et redirige vers `/auth/login?expired=1`.
 *
 * Quand un jeton de rafraîchissement valide EST disponible, le comportement
 * attendu est désormais différent : l'utilisateur reste connecté (voir le
 * dernier test de ce fichier).
 */

const AUTH_TOKEN_COOKIE = 'auth_token';
const AUTH_REFRESH_TOKEN_COOKIE = 'auth_refresh_token';

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
  test('token expiré + pas de refresh token valide → éjection proactive vers le login', async ({
    page,
    context,
  }) => {
    await loginAs(page, 'user');
    const { origin } = new URL(page.url());

    // Remplace le token par un JWT dont `exp` est dans le passé, et invalide le
    // jeton de rafraîchissement (sinon la session serait silencieusement
    // renouvelée — voir le test « refresh token valide » plus bas).
    await context.addCookies([
      { name: AUTH_TOKEN_COOKIE, value: makeJwt(nowSeconds() - 3600), url: origin },
    ]);
    await context.clearCookies({ name: AUTH_REFRESH_TOKEN_COOKIE });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('token retiré + pas de refresh token valide → éjection proactive vers le login', async ({
    page,
    context,
  }) => {
    await loginAs(page, 'user');

    // Supprime le cookie de token ET celui de rafraîchissement (la présence du
    // seul refresh token suffirait sinon à renouveler la session en silence).
    await context.clearCookies({ name: AUTH_TOKEN_COOKIE });
    await context.clearCookies({ name: AUTH_REFRESH_TOKEN_COOKIE });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('token rejeté par le backend + pas de refresh token valide → déconnexion réactive + toast', async ({
    page,
    context,
  }) => {
    await loginAs(page, 'user');
    const { origin } = new URL(page.url());

    // Token non expiré (passe la garde proactive) mais à signature invalide :
    // le backend le rejette (401) au premier fetch d'un panneau protégé. Le
    // refresh token est lui aussi invalidé pour empêcher le rétablissement
    // silencieux de la session sur ce 401.
    await context.addCookies([
      { name: AUTH_TOKEN_COOKIE, value: makeJwt(nowSeconds() + 3600), url: origin },
    ]);
    await context.clearCookies({ name: AUTH_REFRESH_TOKEN_COOKIE });

    await page.goto('/dashboard');

    // L'interceptor redirige vers le login en signalant l'expiration…
    await expect(page).toHaveURL(/\/auth\/login\?.*expired=1/);
    // …et la page login affiche le toast « Session expirée ».
    await expect(page.getByText('Session expirée')).toBeVisible();
  });

  test('token expiré + refresh token valide → rafraîchissement silencieux, session conservée', async ({
    page,
    context,
  }) => {
    await loginAs(page, 'user');
    const { origin } = new URL(page.url());

    // Seul le token d'accès est invalidé : le refresh token émis par `loginAs`
    // reste valide, donc la garde proactive doit le renouveler en silence
    // plutôt que d'éjecter l'utilisateur.
    await context.addCookies([
      { name: AUTH_TOKEN_COOKIE, value: makeJwt(nowSeconds() - 3600), url: origin },
    ]);

    // /dashboard redirige par rôle (ex. /student pour USER) — on vérifie
    // seulement l'absence d'éjection vers /auth/login.
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('button', { name: 'Se connecter' })).not.toBeVisible();
  });
});
