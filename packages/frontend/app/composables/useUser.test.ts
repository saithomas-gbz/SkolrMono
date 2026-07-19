import { describe, expect, test } from 'bun:test';
import { normalizeUserError, userOptionLabel } from './useUser';

describe('userOptionLabel', () => {
  test('utilise le nom si présent et non vide', () => {
    expect(userOptionLabel({ id: '1', name: '  Alice Dupont  ', email: 'a@skolr.local' })).toBe(
      'Alice Dupont',
    );
  });

  test("retombe sur l'email si le nom est absent ou vide", () => {
    expect(userOptionLabel({ id: '1', name: null, email: 'a@skolr.local' })).toBe('a@skolr.local');
    expect(userOptionLabel({ id: '1', name: '   ', email: 'a@skolr.local' })).toBe('a@skolr.local');
  });
});

describe('normalizeUserError', () => {
  test('traduit un message serveur connu en libellé utilisateur', () => {
    const err = { data: { error: 'Email already in use' } };
    expect(normalizeUserError(err)).toBe('Cet email est déjà utilisé par un autre compte.');
  });

  test('retombe sur le message brut pour une erreur serveur inconnue', () => {
    const err = { data: { error: 'Something unexpected' } };
    expect(normalizeUserError(err)).toBe('Something unexpected');
  });

  test('retombe sur un message générique en dernier recours', () => {
    expect(normalizeUserError({})).toContain('Docker');
  });
});
