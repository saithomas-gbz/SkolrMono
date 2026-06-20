import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

mock.module('../db', () => ({
  default: {
    parentStudent: { findMany: mock(), findUnique: mock() },
  },
}));

mock.module('../lib/authServiceClient', () => ({
  getUsersByIds: mock(() => Promise.resolve<{ id: string; name: string | null; email: string }[]>([])),
}));

const { getChildren, getChildById } = await import('../controllers/parentController');
const db = (await import('../db')).default as unknown as {
  parentStudent: { findMany: ReturnType<typeof mock>; findUnique: ReturnType<typeof mock> };
};
const { getUsersByIds } = (await import('../lib/authServiceClient')) as unknown as {
  getUsersByIds: ReturnType<typeof mock>;
};

type GetChildrenRequest = Parameters<typeof getChildren>[0];
type GetChildByIdRequest = Parameters<typeof getChildById>[0];

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

beforeEach(() => {
  db.parentStudent.findMany.mockReset();
  db.parentStudent.findUnique.mockReset();
  getUsersByIds.mockReset();
  getUsersByIds.mockResolvedValue([]);
});

describe('getChildren', () => {
  it('utilise ?parentId= sans JWT pour un appel inter-services', async () => {
    db.parentStudent.findMany.mockResolvedValue([
      { id: 'link-1', studentId: 'student-1', linkType: 'LEGAL_GUARDIAN', isPrimary: true },
    ]);
    const reply = buildReply();

    await getChildren({ query: { parentId: 'parent-1' } } as unknown as GetChildrenRequest, reply);

    expect(db.parentStudent.findMany).toHaveBeenCalledWith({
      where: { parentId: 'parent-1' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    expect(reply.send).toHaveBeenCalled();
  });

  it('renvoie 401 sans parentId ni JWT valide', async () => {
    const reply = buildReply();

    await getChildren(
      { query: {}, server: { jwt: { verify: () => { throw new Error('no token'); } } }, headers: {} } as unknown as GetChildrenRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('utilise le JWT (role PARENT) quand parentId est absent', async () => {
    db.parentStudent.findMany.mockResolvedValue([]);
    const reply = buildReply();

    await getChildren(
      {
        query: {},
        headers: { authorization: 'Bearer t' },
        server: { jwt: { verify: () => ({ userId: 'parent-jwt', role: 'PARENT' }) } },
      } as unknown as GetChildrenRequest,
      reply,
    );

    expect(db.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 'parent-jwt' } }),
    );
  });
});

describe('getChildById', () => {
  it("renvoie 403 si le parent n'a pas de lien vers ce studentId", async () => {
    db.parentStudent.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await getChildById(
      {
        params: { studentId: 'student-x' },
        headers: { authorization: 'Bearer t' },
        server: { jwt: { verify: () => ({ userId: 'parent-1', role: 'PARENT' }) } },
      } as unknown as GetChildByIdRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('autorise un ADMIN sans vérifier de lien', async () => {
    getUsersByIds.mockResolvedValue([{ id: 'student-x', name: 'Eleve X', email: 'x@skolr.local' }]);
    const reply = buildReply();

    await getChildById(
      {
        params: { studentId: 'student-x' },
        headers: { authorization: 'Bearer t' },
        server: { jwt: { verify: () => ({ userId: 'admin-1', role: 'ADMIN' }) } },
      } as unknown as GetChildByIdRequest,
      reply,
    );

    expect(db.parentStudent.findUnique).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith({ data: { id: 'student-x', name: 'Eleve X', email: 'x@skolr.local' } });
  });
});
