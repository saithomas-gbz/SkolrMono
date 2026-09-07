import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';

// Tests de route (et non de contrôleur) : ils passent par `app.inject` pour
// exercer réellement les `preHandler`. C'est le seul niveau où l'absence d'un
// garde se voit — les tests unitaires de contrôleur appellent le handler
// directement et ne l'auraient jamais détectée (#233).

mock.module('../../../shared/db', () => ({
  default: {
    session: { findUnique: mock(), create: mock(), update: mock(), delete: mock() },
    absence: { findUnique: mock(), create: mock(), update: mock(), delete: mock() },
  },
}));

mock.module('../../../shared/events', () => ({
  publish: mock(() => Promise.resolve()),
}));

mock.module('../lib/classServiceClient', () => ({
  getClassIdsForTeacher: mock(() => Promise.resolve<string[]>([])),
  getClassIdsForStudent: mock(() => Promise.resolve<string[]>([])),
}));

mock.module('../lib/parentServiceClient', () => ({
  getChildIds: mock(() => Promise.resolve<string[]>([])),
}));

const sessionRoutes = (await import('../routes/sessionRoutes')).default;
const absenceRoutes = (await import('../routes/absenceRoutes')).default;
const db = (await import('../../../shared/db')).default as unknown as {
  session: Record<'findUnique' | 'create' | 'update' | 'delete', ReturnType<typeof mock>>;
  absence: Record<'findUnique' | 'create' | 'update' | 'delete', ReturnType<typeof mock>>;
};
const { getClassIdsForTeacher } = (await import('../lib/classServiceClient')) as unknown as {
  getClassIdsForTeacher: ReturnType<typeof mock>;
};

async function buildTestApp() {
  const app = Fastify();

  // Artefact du harnais, pas du code applicatif : sur une route DELETE, `deny()`
  // fait `await reply.send(...)`, et `Reply.then` s'abonne à `eos(reply.raw)` —
  // que light-my-request fait rejeter une fois la réponse écrite. Fastify
  // repasse alors par son error handler et tente un second writeHead
  // (ERR_HTTP_HEADERS_SENT). Le statut renvoyé au client est bien 401/403.
  // Comportement préexistant, reproductible sur `DELETE /class/classes/:id`
  // qui n'est pas touché par cette PR : on l'ignore ici plutôt que d'affaiblir
  // la couverture des routes DELETE.
  app.setErrorHandler((err, _request, reply) => {
    if ((err as { code?: string }).code === 'ERR_HTTP_HEADERS_SENT') return reply;
    return reply.status(500).send({ error: err.message });
  });

  await app.register(fastifyJwt, { secret: 'test-secret' });
  await app.register(sessionRoutes);
  await app.register(absenceRoutes);
  await app.ready();
  return app;
}

type TestApp = Awaited<ReturnType<typeof buildTestApp>>;

function authHeader(app: TestApp, payload: Record<string, unknown>) {
  return { authorization: `Bearer ${app.jwt.sign(payload)}` };
}

const teacher = { userId: '66666666-6666-4666-8666-666666666666', email: 'prof@skolr.local', role: 'TEACHER' };
const student = { userId: '77777777-7777-4777-8777-777777777777', email: 'eleve@skolr.local', role: 'USER' };
const parent = { userId: '99999999-9999-4999-8999-999999999999', email: 'parent@skolr.local', role: 'PARENT' };
const admin = { userId: '88888888-8888-4888-8888-888888888888', email: 'admin@skolr.local', role: 'ADMIN' };

const sampleSession = {
  id: '11111111-1111-4111-8111-111111111111',
  classId: '33333333-3333-4333-8333-333333333333',
  courseId: '55555555-5555-4555-8555-555555555555',
  teacherId: '66666666-6666-4666-8666-666666666666',
  room: 'B12',
  startAt: '2026-01-05T08:00:00.000Z',
  endAt: '2026-01-05T09:00:00.000Z',
  recurrenceRule: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createSessionBody = {
  classId: '33333333-3333-4333-8333-333333333333',
  courseId: '55555555-5555-4555-8555-555555555555',
  teacherId: '66666666-6666-4666-8666-666666666666',
  startAt: '2026-01-05T08:00:00.000Z',
  endAt: '2026-01-05T09:00:00.000Z',
};

const sampleAbsence = {
  id: '22222222-2222-4222-8222-222222222222',
  sessionId: '11111111-1111-4111-8111-111111111111',
  userId: '77777777-7777-4777-8777-777777777777',
  role: 'STUDENT',
  justified: false,
  reason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createAbsenceBody = { sessionId: '11111111-1111-4111-8111-111111111111', userId: '77777777-7777-4777-8777-777777777777', role: 'STUDENT' };

beforeEach(() => {
  for (const model of [db.session, db.absence]) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  getClassIdsForTeacher.mockReset();
  getClassIdsForTeacher.mockResolvedValue([]);
});

describe('Écritures de séances', () => {
  const writes = [
    { method: 'POST' as const, url: '/sessions', payload: createSessionBody },
    { method: 'PATCH' as const, url: '/sessions/11111111-1111-4111-8111-111111111111', payload: { room: 'A01' } },
    { method: 'DELETE' as const, url: '/sessions/11111111-1111-4111-8111-111111111111', payload: undefined },
  ];

  for (const { method, url, payload } of writes) {
    it(`${method} ${url} refuse une requête sans jeton`, async () => {
      const app = await buildTestApp();
      const res = await app.inject({ method, url, payload });
      expect(res.statusCode).toBe(401);
      expect(db.session.create).not.toHaveBeenCalled();
      expect(db.session.update).not.toHaveBeenCalled();
      expect(db.session.delete).not.toHaveBeenCalled();
      await app.close();
    });

    for (const role of [student, parent]) {
      it(`${method} ${url} refuse le rôle ${role.role}`, async () => {
        const app = await buildTestApp();
        const res = await app.inject({ method, url, payload, headers: authHeader(app, role) });
        expect(res.statusCode).toBe(403);
        expect(db.session.create).not.toHaveBeenCalled();
        expect(db.session.update).not.toHaveBeenCalled();
        expect(db.session.delete).not.toHaveBeenCalled();
        await app.close();
      });
    }
  }

  it('POST /sessions accepte un enseignant dans une de ses classes', async () => {
    getClassIdsForTeacher.mockResolvedValue(['33333333-3333-4333-8333-333333333333']);
    db.session.create.mockResolvedValue(sampleSession);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: createSessionBody,
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(201);
    expect(db.session.create).toHaveBeenCalled();
    await app.close();
  });

  it('POST /sessions refuse un enseignant hors de ses classes', async () => {
    getClassIdsForTeacher.mockResolvedValue(['44444444-4444-4444-8444-444444444444']);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/sessions',
      payload: createSessionBody,
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.session.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('PATCH /sessions/:id refuse un enseignant hors de ses classes', async () => {
    getClassIdsForTeacher.mockResolvedValue(['44444444-4444-4444-8444-444444444444']);
    db.session.findUnique.mockResolvedValue(sampleSession);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/sessions/11111111-1111-4111-8111-111111111111',
      payload: { room: 'A01' },
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.session.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('DELETE /sessions/:id refuse un enseignant hors de ses classes', async () => {
    getClassIdsForTeacher.mockResolvedValue(['44444444-4444-4444-8444-444444444444']);
    db.session.findUnique.mockResolvedValue(sampleSession);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'DELETE',
      url: '/sessions/11111111-1111-4111-8111-111111111111',
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(403);
    expect(db.session.delete).not.toHaveBeenCalled();
    await app.close();
  });

  it('PATCH /sessions/:id laisse passer un ADMIN sans vérifier son périmètre', async () => {
    db.session.findUnique.mockResolvedValue(sampleSession);
    db.session.update.mockResolvedValue({ ...sampleSession, room: 'A01' });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/sessions/11111111-1111-4111-8111-111111111111',
      payload: { room: 'A01' },
      headers: authHeader(app, admin),
    });
    expect(res.statusCode).toBe(200);
    expect(getClassIdsForTeacher).not.toHaveBeenCalled();
    await app.close();
  });
});

describe('Écritures d\'absences', () => {
  const writes = [
    { method: 'POST' as const, url: '/absences', payload: createAbsenceBody },
    { method: 'PATCH' as const, url: '/absences/22222222-2222-4222-8222-222222222222', payload: { justified: true } },
    { method: 'DELETE' as const, url: '/absences/22222222-2222-4222-8222-222222222222', payload: undefined },
  ];

  for (const { method, url, payload } of writes) {
    it(`${method} ${url} refuse une requête sans jeton`, async () => {
      const app = await buildTestApp();
      const res = await app.inject({ method, url, payload });
      expect(res.statusCode).toBe(401);
      expect(db.absence.create).not.toHaveBeenCalled();
      expect(db.absence.update).not.toHaveBeenCalled();
      expect(db.absence.delete).not.toHaveBeenCalled();
      await app.close();
    });

    for (const role of [student, parent]) {
      it(`${method} ${url} refuse le rôle ${role.role}`, async () => {
        const app = await buildTestApp();
        const res = await app.inject({ method, url, payload, headers: authHeader(app, role) });
        expect(res.statusCode).toBe(403);
        expect(db.absence.create).not.toHaveBeenCalled();
        expect(db.absence.update).not.toHaveBeenCalled();
        expect(db.absence.delete).not.toHaveBeenCalled();
        await app.close();
      });
    }
  }

  it('POST /absences accepte un enseignant', async () => {
    db.absence.findUnique.mockResolvedValue(null);
    db.absence.create.mockResolvedValue(sampleAbsence);
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/absences',
      payload: createAbsenceBody,
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(201);
    expect(db.absence.create).toHaveBeenCalled();
    await app.close();
  });

  it('PATCH /absences/:id accepte un enseignant', async () => {
    db.absence.findUnique.mockResolvedValue(sampleAbsence);
    db.absence.update.mockResolvedValue({ ...sampleAbsence, justified: true });
    const app = await buildTestApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/absences/22222222-2222-4222-8222-222222222222',
      payload: { justified: true },
      headers: authHeader(app, teacher),
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('les lectures restent ouvertes à un élève authentifié', async () => {
    const app = await buildTestApp();
    db.absence.findUnique.mockResolvedValue(sampleAbsence);
    const res = await app.inject({
      method: 'GET',
      url: '/absences/22222222-2222-4222-8222-222222222222',
      headers: authHeader(app, student),
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
