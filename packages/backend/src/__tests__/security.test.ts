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
