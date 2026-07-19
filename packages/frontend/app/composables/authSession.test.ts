import { describe, expect, test } from 'bun:test';
import { authUserFromToken, isTokenExpired } from './authSession';

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Forge un JWT de forme valide (header/payload/signature factice) — mêmes
 * hypothèses que `packages/e2e/tests/session-expiry.spec.ts::makeJwt` :
 * ces fonctions ne décodent le payload que côté client, sans vérifier la
 * signature (le backend, lui, la vérifie). */
function makeJwt(payload: Record<string, unknown>): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.sig`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('authUserFromToken', () => {
  test('dérive un AuthUser depuis un JWT valide et complet', () => {
    const token = makeJwt({
      userId: 'u1',
      email: 'dev.user@skolr.local',
      role: 'USER',
      exp: nowSeconds() + 3600,
    });

    expect(authUserFromToken(token)).toEqual({
      id: 'u1',
      email: 'dev.user@skolr.local',
      role: 'USER',
    });
  });

  test('retourne null si un claim requis manque (userId)', () => {
    const token = makeJwt({ email: 'dev.user@skolr.local', role: 'USER' });
    expect(authUserFromToken(token)).toBeNull();
  });

  test('retourne null pour un token malformé (pas 3 segments / payload non-JSON)', () => {
    expect(authUserFromToken('not-a-jwt')).toBeNull();
    expect(authUserFromToken('header.not-base64-json.sig')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  test('false pour un token dont exp est dans le futur', () => {
    const token = makeJwt({ exp: nowSeconds() + 3600 });
    expect(isTokenExpired(token)).toBe(false);
  });

  test('true pour un token dont exp est dans le passé (régression #137)', () => {
    const token = makeJwt({ exp: nowSeconds() - 3600 });
    expect(isTokenExpired(token)).toBe(true);
  });

  test('true si le claim exp est absent', () => {
    const token = makeJwt({ userId: 'u1' });
    expect(isTokenExpired(token)).toBe(true);
  });

  test('true pour un token indécodable', () => {
    expect(isTokenExpired('garbage')).toBe(true);
  });
});
