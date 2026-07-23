import { describe, expect, test } from 'bun:test';
import { normalizeApiError } from './useClass';

describe('normalizeApiError', () => {
  test('retourne le message d’erreur structuré renvoyé par l’API', () => {
    expect(normalizeApiError({ data: { error: 'Classe introuvable' } })).toBe('Classe introuvable');
  });

  test('retourne le message d’une instance Error', () => {
    expect(normalizeApiError(new Error('boom'))).toBe('boom');
  });

  test('priorité au message API structuré sur Error.message', () => {
    const e = Object.assign(new Error('générique'), { data: { error: 'précis' } });
    expect(normalizeApiError(e)).toBe('précis');
  });

  test('ignore data.error quand ce n’est pas une chaîne', () => {
    expect(normalizeApiError({ data: { error: 42 } })).toContain('Impossible de joindre le service');
  });

  test('fallback lisible pour une erreur non structurée (null, string brute)', () => {
    expect(normalizeApiError(null)).toContain('Impossible de joindre le service');
    expect(normalizeApiError('oops')).toContain('Impossible de joindre le service');
  });
});
