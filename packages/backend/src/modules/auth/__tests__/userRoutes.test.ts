import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import userRoutes from '../routes/userRoutes';
import db from '../../../shared/db';

type ModelMock = Record<string, ReturnType<typeof mock>>;
const model = (): ModelMock => ({
  findUnique: mock(),
  findFirst: mock(),
  findMany: mock(),
  create: mock(),
  update: mock(),
  updateMany: mock(),
  delete: mock(),
  deleteMany: mock(),
});

const dbMock: Record<string, ModelMock> & {
  $transaction: (cb: (tx: unknown) => unknown) => Promise<unknown>;
} = {
  user: model(),
  account: model(),
  passwordResetToken: model(),
  invitationToken: model(),
  classTeacher: model(),
  classStudent: model(),
  gradeUser: model(),
  grade: model(),
  assignment: model(),
  session: model(),
  absence: model(),
  absenceJustification: model(),
  conversationParticipant: model(),
  message: model(),
  messageRead: model(),
  notification: model(),
  establishmentMember: model(),
  establishment: model(),
  parentStudent: model(),
  refreshToken: model(),
  $transaction: async (cb) => cb(dbMock),
};

mock.module('../../../generated/prisma/client', () => ({
  PrismaClient: class {},
}));

mock.module('../../../shared/db', () => ({ default: dbMock }));

const prismaMock = db as unknown as typeof dbMock;

const JWT_SECRET = 'test-secret';

async function buildTestApp() {
  const app = Fastify();
  await app.register(fastifyJwt, { secret: JWT_SECRET });
  await app.register(userRoutes);
  await app.ready();
  return app;
}

function authHeader(app: Awaited<ReturnType<typeof buildTestApp>>, userId = 'user-1') {
  const token = app.jwt.sign({ userId, email: 'user@skolr.local', role: 'USER' });
  return { authorization: `Bearer ${token}` };
}

describe('UserRoutes', () => {
  beforeEach(() => {
    for (const value of Object.values(prismaMock)) {
      if (typeof value !== 'object' || value === null) continue;
      const m = value as ModelMock;
      m.findMany?.mockReset().mockResolvedValue([]);
      m.findUnique?.mockReset().mockResolvedValue(null);
      m.updateMany?.mockReset().mockResolvedValue({ count: 0 });
      m.update?.mockReset().mockResolvedValue({});
      m.deleteMany?.mockReset().mockResolvedValue({ count: 0 });
    }
  });

  it('GET /users?role=TEACHER passe la validation de schéma (sans ids)', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'teacher@skolr.local', name: 'Prof', role: 'TEACHER' },
    ]);
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/users?role=TEACHER', headers: authHeader(app) });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  it('GET /users?ids=... continue de fonctionner', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@skolr.local', name: 'A', role: 'USER' },
    ]);
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/users?ids=u1', headers: authHeader(app) });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  // RGPD --------------------------------------------------------------------
  // Note : le rejet d'auth (401 sans token) est couvert par authGuard.test.ts et
  // par les tests unitaires du contrôleur. On ne l'injecte pas ici car le rejet
  // d'un préhandler via app.inject déclenche un artefact de light-my-request
  // (ERR_HTTP_HEADERS_SENT) propre au harnais de test bun.

  it('GET /me/export renvoie un JSON téléchargeable avec un token valide', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@skolr.local', role: 'USER' });
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'GET',
      url: '/me/export',
      headers: authHeader(app),
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('skolr-export-user-1.json');
    expect(res.json().subject).toEqual({ userId: 'user-1', email: 'user@skolr.local' });
  });

  it('DELETE /me anonymise le compte avec un token valide', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ email: 'user@skolr.local' });
    const app = await buildTestApp();

    const res = await app.inject({
      method: 'DELETE',
      url: '/me',
      headers: authHeader(app),
    });

    expect(res.statusCode).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
    expect(res.json()).toEqual({ message: 'Account anonymized successfully' });
  });
});
