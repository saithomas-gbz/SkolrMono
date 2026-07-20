import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import Fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';

/**
 * Durcissement sécurité (#144) : en-têtes helmet sur l'app réelle, et
 * comportement du rate-limiting (429 au-delà du seuil).
 */
describe('sécurité — en-têtes helmet', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret';
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('pose les en-têtes de sécurité (X-Content-Type-Options, CSP, HSTS)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it("ne fait pas confiance à X-Forwarded-For par défaut (TRUST_PROXY non activé)", () => {
    // trustProxy=false par défaut : sans ça, un client derrière un reverse proxy
    // pourrait usurper son IP apparente via cet en-tête et contourner le
    // rate-limiting par IP (R1). Vérifié sur la config résolue de l'app réelle.
    expect(app.initialConfig.trustProxy).toBeFalsy();
  });
});

describe('sécurité — TRUST_PROXY=true', () => {
  it('fait lire request.ip depuis X-Forwarded-For quand activé', async () => {
    process.env.JWT_SECRET ??= 'test-secret';
    const previous = process.env.TRUST_PROXY;
    process.env.TRUST_PROXY = 'true';

    // La constante TRUST_PROXY de app.ts est figée au premier import du module ;
    // on reproduit donc ici la même construction Fastify plutôt que de réimporter
    // buildApp (qui donnerait la valeur lue au tout premier chargement du process).
    const app = Fastify({ trustProxy: true });
    app.get('/whoami', async (request) => ({ ip: request.ip }));
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { 'x-forwarded-for': '203.0.113.42' },
    });

    expect(JSON.parse(res.body).ip).toBe('203.0.113.42');

    await app.close();
    process.env.TRUST_PROXY = previous;
  });
});

describe('sécurité — rate limiting', () => {
  it('renvoie 429 au-delà du seuil configuré', async () => {
    const app = Fastify();
    await app.register(fastifyRateLimit, { max: 1, timeWindow: '1 minute' });
    app.get('/ping', async () => ({ ok: true }));
    await app.ready();

    const first = await app.inject({ method: 'GET', url: '/ping' });
    const second = await app.inject({ method: 'GET', url: '/ping' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(429);

    await app.close();
  });
});
