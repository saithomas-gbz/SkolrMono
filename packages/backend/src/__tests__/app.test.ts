import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';

/**
 * Test d'intégration du monolithe : tous les modules sont montés sous leur préfixe
 * et la doc OpenAPI est agrégée. Ne touche pas la base (db mockée en NODE_ENV=test).
 */
describe('backend app integration', () => {
  let app: FastifyInstance;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret';
    app = await buildApp();
    // On écoute réellement : le refus d'auth d'un préhandler (via `reply.send`)
    // s'observe correctement en HTTP réel, alors que `light-my-request`
    // (`app.inject`) présente un artefact de double écriture d'en-têtes.
    baseUrl = await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('expose /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('monte chaque module sous son préfixe (OpenAPI agrégée)', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    expect(res.statusCode).toBe(200);
    const paths = Object.keys(res.json().paths ?? {});
    for (const prefix of [
      '/auth',
      '/class',
      '/grade',
      '/planning',
      '/message',
      '/notification',
      '/billing',
      '/parent',
    ]) {
      expect(paths.some((p) => p.startsWith(prefix))).toBe(true);
    }
  });

  it('protège les routes authentifiées (401 sans token)', async () => {
    const res = await fetch(`${baseUrl}/grade/courses`);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});
