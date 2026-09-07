import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { FastifyReply } from 'fastify';

mock.module('../../../shared/db', () => ({
  default: {
    parentStudent: { findMany: mock(), findUnique: mock() },
  },
}));

mock.module('../lib/authServiceClient', () => ({
  getUsersByIds: mock(() => Promise.resolve<{ id: string; name: string | null; email: string }[]>([])),
}));

const { getChildren, getChildById, getParentIds } = await import('../controllers/parentController');
const db = (await import('../../../shared/db')).default as unknown as {
  parentStudent: { findMany: ReturnType<typeof mock>; findUnique: ReturnType<typeof mock> };
};
const { getUsersByIds } = (await import('../lib/authServiceClient')) as unknown as {
  getUsersByIds: ReturnType<typeof mock>;
};

type GetChildrenRequest = Parameters<typeof getChildren>[0];
type GetChildByIdRequest = Parameters<typeof getChildById>[0];
type GetParentIdsRequest = Parameters<typeof getParentIds>[0];

function buildReply(): FastifyReply {
  return { status: mock().mockReturnThis(), send: mock().mockReturnThis() } as unknown as FastifyReply;
}

beforeEach(() => {
  db.parentStudent.findMany.mockReset();
  db.parentStudent.findUnique.mockReset();
  getUsersByIds.mockReset();
  getUsersByIds.mockResolvedValue([]);
});

/** Le garde de route attache `parentUser` ; les contrôleurs s'y fient désormais. */
function asParent(userId: string) {
  return { userId, email: `${userId}@skolr.local`, role: 'PARENT' };
}
function asAdmin() {
  return { userId: 'admin-1', email: 'admin@skolr.local', role: 'ADMIN' };
}

describe('getChildren', () => {
  it("ignore le parentId du client pour un PARENT et retombe sur son jeton", async () => {
    db.parentStudent.findMany.mockResolvedValue([]);
    const reply = buildReply();

    // Anciennement, fournir ?parentId= sautait entièrement le contrôle du jeton
    // et livrait les enfants du parent demandé (#241).
    await getChildren(
      { query: { parentId: 'parent-victime' }, parentUser: asParent('parent-jwt') } as unknown as GetChildrenRequest,
      reply,
    );

    expect(db.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 'parent-jwt' } }),
    );
  });

  it('utilise son propre identifiant quand aucun parentId n\'est fourni', async () => {
    db.parentStudent.findMany.mockResolvedValue([]);
    const reply = buildReply();

    await getChildren(
      { query: {}, parentUser: asParent('parent-jwt') } as unknown as GetChildrenRequest,
      reply,
    );

    expect(db.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 'parent-jwt' } }),
    );
  });

  it('honore le parentId pour un ADMIN', async () => {
    db.parentStudent.findMany.mockResolvedValue([
      { id: 'link-1', studentId: 'student-1', linkType: 'LEGAL_GUARDIAN', isPrimary: true },
    ]);
    const reply = buildReply();

    await getChildren(
      { query: { parentId: 'parent-1' }, parentUser: asAdmin() } as unknown as GetChildrenRequest,
      reply,
    );

    expect(db.parentStudent.findMany).toHaveBeenCalledWith({
      where: { parentId: 'parent-1' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    expect(reply.send).toHaveBeenCalled();
  });

  it('renvoie 400 pour un ADMIN sans parentId', async () => {
    const reply = buildReply();

    await getChildren(
      { query: {}, parentUser: asAdmin() } as unknown as GetChildrenRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(db.parentStudent.findMany).not.toHaveBeenCalled();
  });
});

describe('getChildById', () => {
  it("renvoie 403 si le parent n'a pas de lien vers ce studentId", async () => {
    db.parentStudent.findUnique.mockResolvedValue(null);
    const reply = buildReply();

    await getChildById(
      { params: { studentId: 'student-x' }, parentUser: asParent('parent-1') } as unknown as GetChildByIdRequest,
      reply,
    );

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('autorise un ADMIN sans vérifier de lien', async () => {
    getUsersByIds.mockResolvedValue([{ id: 'student-x', name: 'Eleve X', email: 'x@skolr.local' }]);
    const reply = buildReply();

    await getChildById(
      { params: { studentId: 'student-x' }, parentUser: asAdmin() } as unknown as GetChildByIdRequest,
      reply,
    );

    expect(db.parentStudent.findUnique).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith({ data: { id: 'student-x', name: 'Eleve X', email: 'x@skolr.local' } });
  });
});

describe('getParentIds', () => {
  it('renvoie 400 sans studentId', async () => {
    const reply = buildReply();

    await getParentIds({ query: {} } as unknown as GetParentIdsRequest, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
  });

  it('renvoie les parentId rattachés à un enfant', async () => {
    db.parentStudent.findMany.mockResolvedValue([
      { parentId: 'parent-1' },
      { parentId: 'parent-2' },
    ]);
    const reply = buildReply();

    await getParentIds({ query: { studentId: 'student-1' } } as unknown as GetParentIdsRequest, reply);

    expect(db.parentStudent.findMany).toHaveBeenCalledWith({ where: { studentId: 'student-1' } });
    expect(reply.send).toHaveBeenCalledWith({ data: ['parent-1', 'parent-2'] });
  });
});
