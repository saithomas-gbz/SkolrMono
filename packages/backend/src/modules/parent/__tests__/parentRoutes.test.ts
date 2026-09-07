import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';

// Tests de route : ils frappent un vrai serveur HTTP et exercent donc réellement
// les `preHandler`. Les tests unitaires voisins appellent les contrôleurs avec un
// faux `request`, ce qui ne peut structurellement pas révéler un garde absent —
// c'est la raison pour laquelle ces trois routes ont pu rester ouvertes (#241).

mock.module('../../../shared/db', () => ({
  default: {
    parentStudent: { findMany: mock(), findUnique: mock() },
  },
}));

mock.module('../lib/authServiceClient', () => ({
  getUsersByIds: mock(() => Promise.resolve<{ id: string; name: string | null; email: string }[]>([])),
}));

const parentRoutes = (await import('../routes/parentRoutes')).default;
const db = (await import('../../../shared/db')).default as unknown as {
  parentStudent: { findMany: ReturnType<typeof mock>; findUnique: ReturnType<typeof mock> };
};

/**
 * Serveur réel sur port éphémère, plutôt que `app.inject`.
 *
 * `deny()` fait `await reply.send(...)`, ce qui passe par `Reply.then` et
 * s'abonne à `eos(reply.raw)`. Sous light-my-request ce flux rejette une fois la
 * réponse écrite : Fastify repasse par son error handler et tente un second
 * writeHead (ERR_HTTP_HEADERS_SENT), erreur asynchrone qui fait échouer le test
 * alors que le client a bien reçu son 401/403. Sur une vraie socket le flux se
 * termine normalement et le problème n'existe pas — c'est aussi ce qui se passe
 * en production. On teste donc contre un vrai serveur.
 */
async function buildTestApp() {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: 'test-secret' });
  await app.register(parentRoutes);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as { port: number };
  return Object.assign(app, { baseUrl: `http://127.0.0.1:${port}` });
}

type TestApp = Awaited<ReturnType<typeof buildTestApp>>;

function authHeader(app: TestApp, payload: Record<string, unknown>) {
  return { authorization: `Bearer ${app.jwt.sign(payload)}` };
}

/** Équivalent d'`app.inject` sur le serveur réel. */
async function get(app: TestApp, url: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${app.baseUrl}${url}`, { headers });
  const text = await res.text();
  return {
    statusCode: res.status,
    json: () => JSON.parse(text) as unknown,
  };
}

const parent = { userId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'parent@skolr.local', role: 'PARENT' };
const admin = { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN' };
const teacher = { userId: 'teacher-1', email: 'prof@skolr.local', role: 'TEACHER' };
const student = { userId: 'user-1', email: 'eleve@skolr.local', role: 'USER' };

beforeEach(() => {
  db.parentStudent.findMany.mockReset();
  db.parentStudent.findMany.mockResolvedValue([]);
  db.parentStudent.findUnique.mockReset();
});

describe('Authentification des routes parent', () => {
  const routes = [
    '/children',
    '/children?parentId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '/children/cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '/parents?studentId=cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  ];

  for (const url of routes) {
    it(`GET ${url} refuse une requête sans jeton`, async () => {
      const app = await buildTestApp();
      const res = await get(app, url);
      expect(res.statusCode).toBe(401);
      expect(db.parentStudent.findMany).not.toHaveBeenCalled();
      await app.close();
    });
  }

  it('GET /children?parentId= ne livre plus les enfants d\'un autre parent', async () => {
    const app = await buildTestApp();
    const res = await get(app, '/children?parentId=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', authHeader(app, parent));

    expect(res.statusCode).toBe(200);
    // Le paramètre est ignoré : la requête porte sur le parent du jeton.
    expect(db.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' } }),
    );
    await app.close();
  });

  it('GET /children accepte un ADMIN avec un parentId explicite', async () => {
    const app = await buildTestApp();
    const res = await get(app, '/children?parentId=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', authHeader(app, admin));

    expect(res.statusCode).toBe(200);
    expect(db.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' } }),
    );
    await app.close();
  });

  for (const role of [teacher, student]) {
    it(`GET /children refuse le rôle ${role.role}`, async () => {
      const app = await buildTestApp();
      const res = await get(app, '/children?parentId=dddddddd-dddd-4ddd-8ddd-dddddddddddd', authHeader(app, role));
      expect(res.statusCode).toBe(403);
      expect(db.parentStudent.findMany).not.toHaveBeenCalled();
      await app.close();
    });
  }

  it('GET /parents reste ouverte à un ADMIN', async () => {
    db.parentStudent.findMany.mockResolvedValue([{ parentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }]);
    const app = await buildTestApp();
    const res = await get(app, '/parents?studentId=cccccccc-cccc-4ccc-8ccc-cccccccccccc', authHeader(app, admin));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: ['dddddddd-dddd-4ddd-8ddd-dddddddddddd'] });
    await app.close();
  });

  for (const role of [parent, teacher, student]) {
    it(`GET /parents refuse le rôle ${role.role}`, async () => {
      const app = await buildTestApp();
      const res = await get(app, '/parents?studentId=cccccccc-cccc-4ccc-8ccc-cccccccccccc', authHeader(app, role));
      expect(res.statusCode).toBe(403);
      await app.close();
    });
  }
});
