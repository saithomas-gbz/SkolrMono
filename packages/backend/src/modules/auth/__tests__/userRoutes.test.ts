import { describe, it, expect, beforeEach, mock } from 'bun:test';
import Fastify from 'fastify';
import userRoutes from '../routes/userRoutes';
import db from '../../../shared/db';

mock.module('../../../generated/prisma/client', () => ({
  PrismaClient: class {
    user = { findUnique: mock(), findMany: mock(), create: mock(), update: mock(), delete: mock(), deleteMany: mock() };
  },
}));

mock.module('../../../shared/db', () => ({
  default: {
    user: {
      findUnique: mock(),
      findMany: mock(),
      create: mock(),
      update: mock(),
      delete: mock(),
      deleteMany: mock(),
    },
  },
}));

const prismaMock = db as {
  user: {
    findUnique: ReturnType<typeof mock>;
    findMany: ReturnType<typeof mock>;
  };
};

async function buildTestApp() {
  const app = Fastify();
  await app.register(userRoutes);
  await app.ready();
  return app;
}

describe('UserRoutes', () => {
  beforeEach(() => {
    prismaMock.user.findMany.mockReset();
  });

  it('GET /users?role=TEACHER passe la validation de schéma (sans ids)', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'teacher@skolr.local', name: 'Prof', role: 'TEACHER' },
    ]);
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/users?role=TEACHER' });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });

  it('GET /users?ids=... continue de fonctionner', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'a@skolr.local', name: 'A', role: 'USER' },
    ]);
    const app = await buildTestApp();

    const res = await app.inject({ method: 'GET', url: '/users?ids=u1' });

    expect(res.statusCode).toBe(200);
    expect(res.json().data).toHaveLength(1);
  });
});
