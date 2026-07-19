import { describe, expect, test } from 'bun:test';
import { normalizeAuthError, AUTH_EMAIL_FORMAT_REGEX, AUTH_PASSWORD_MIN_LENGTH } from './useAuth';

// useAuthCredentialPolicy n'est pas testé ici : elle attend des Ref Vue et
// appelle `computed` en tant qu'auto-import Nuxt (non disponible sous
// bun:test sans polyfill global) — hors scope de cette passe, voir la PR.

describe('normalizeAuthError', () => {
  test('traduit un message serveur connu', () => {
    expect(normalizeAuthError({ data: { error: 'Invalid credentials' } })).toBe(
      'Identifiants incorrects.',
    );
  });

  test('retombe sur le message brut pour un message serveur inconnu', () => {
    expect(normalizeAuthError({ data: { error: 'Some other error' } })).toBe('Some other error');
  });

  test('utilise Error.message si pas de forme $fetch reconnue', () => {
    expect(normalizeAuthError(new Error('boom'))).toBe('boom');
  });

  test("message générique en dernier recours", () => {
    expect(normalizeAuthError('not an error object')).toBe('Erreur inconnue');
  });
});

describe('constantes de politique de credentials', () => {
  test('AUTH_PASSWORD_MIN_LENGTH aligné sur le backend (6)', () => {
    expect(AUTH_PASSWORD_MIN_LENGTH).toBe(6);
  });

  test('AUTH_EMAIL_FORMAT_REGEX valide un email simple et rejette un format invalide', () => {
    expect(AUTH_EMAIL_FORMAT_REGEX.test('dev.user@skolr.local')).toBe(true);
    expect(AUTH_EMAIL_FORMAT_REGEX.test('pas-un-email')).toBe(false);
    expect(AUTH_EMAIL_FORMAT_REGEX.test('a@b')).toBe(false);
  });
});
